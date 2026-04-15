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

    const body = await req.json();
    const { franchiseId, planType } = body;
    const plan: "whatsapp" | "orcamento" = planType === "orcamento" ? "orcamento" : "whatsapp";

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

    // Get franchise customer IDs
    const { data: franchise } = await supabase
      .from("franchises")
      .select("stripe_customer_id, orcamento_stripe_customer_id")
      .eq("id", franchiseId)
      .maybeSingle();

    const customerId = plan === "orcamento"
      ? (franchise as any)?.orcamento_stripe_customer_id
      : franchise?.stripe_customer_id;

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: "Nenhuma assinatura encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const platformUrl = Deno.env.get("PLATFORM_URL") || "https://quintalideal.lovable.app";

    const returnUrl = plan === "orcamento"
      ? `${platformUrl}/propostas`
      : `${platformUrl}/settings?tab=whatsapp`;

    // Create Billing Portal Session
    const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: returnUrl,
      }),
    });

    const portalSession = await portalRes.json();
    if (portalSession.error) {
      throw new Error(portalSession.error.message);
    }

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-portal-session error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
