import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const { franchiseId } = await req.json();
    if (!franchiseId) {
      return new Response(JSON.stringify({ error: "franchiseId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user belongs to this franchise
    const { data: profile } = await supabase
      .from("profiles")
      .select("franquia_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile || profile.franquia_id !== franchiseId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get franchise data
    const { data: franchise } = await supabase
      .from("franchises")
      .select("id, nome_franquia, email, stripe_customer_id")
      .eq("id", franchiseId)
      .maybeSingle();

    if (!franchise) {
      return new Response(JSON.stringify({ error: "Franchise not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const priceId = Deno.env.get("STRIPE_PRICE_ID")!;
    const platformUrl = Deno.env.get("PLATFORM_URL") || "https://quintalideal.lovable.app";

    let customerId = franchise.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name: franchise.nome_franquia,
          ...(franchise.email ? { email: franchise.email } : {}),
          "metadata[franchiseId]": franchiseId,
        }),
      });
      const customer = await customerRes.json();
      if (customer.error) {
        throw new Error(customer.error.message);
      }
      customerId = customer.id;

      // Save customer ID using service role client
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient
        .from("franchises")
        .update({ stripe_customer_id: customerId })
        .eq("id", franchiseId);
    }

    // Create Checkout Session
    const params = new URLSearchParams({
      mode: "subscription",
      customer: customerId!,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${platformUrl}/settings?tab=whatsapp&status=success`,
      cancel_url: `${platformUrl}/settings?tab=whatsapp&status=canceled`,
      "metadata[franchiseId]": franchiseId,
      "subscription_data[metadata][franchiseId]": franchiseId,
    });

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await sessionRes.json();
    if (session.error) {
      throw new Error(session.error.message);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
