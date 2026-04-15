import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<any> {
  const parts = sigHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    throw new Error("Invalid signature header");
  }

  // Check timestamp tolerance (5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    throw new Error("Timestamp outside tolerance");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );
  const expectedSig = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!signatures.includes(expectedSig)) {
    throw new Error("Signature verification failed");
  }

  return JSON.parse(payload);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const body = await req.text();
    const sigHeader = req.headers.get("stripe-signature");
    if (!sigHeader) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: any;
    try {
      event = await verifyStripeSignature(body, sigHeader, webhookSecret);
    } catch (err) {
      console.error("[stripe-webhook] Signature verification failed:", err.message);
      return new Response("Invalid signature", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const eventType = event.type;
    console.log(`[stripe-webhook] Processing event: ${eventType}`);

    // ─── checkout.session.completed ───
    if (eventType === "checkout.session.completed") {
      const session = event.data.object;
      const franchiseId = session.metadata?.franchiseId;
      if (!franchiseId) {
        console.warn("[stripe-webhook] No franchiseId in session metadata");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const subscriptionId = session.subscription;

      // Calculate expiration (1 month from now)
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await supabase
        .from("franchises")
        .update({
          stripe_subscription_id: subscriptionId,
          stripe_subscription_status: "active",
          whatsapp_plan_active: true,
          whatsapp_plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", franchiseId);

      // Create Z-API instance
      try {
        await fetch(`${supabaseUrl}/functions/v1/zapi-instance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ action: "create", franchiseId }),
        });
        console.log(`[stripe-webhook] Z-API instance creation triggered for ${franchiseId}`);
      } catch (err) {
        console.error("[stripe-webhook] Failed to trigger zapi-instance create:", err);
      }

      console.log(`[stripe-webhook] checkout.session.completed for franchise ${franchiseId}`);
    }

    // ─── invoice.payment_succeeded ───
    if (eventType === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      const franchiseId = invoice.subscription_details?.metadata?.franchiseId
        || invoice.lines?.data?.[0]?.metadata?.franchiseId;

      if (!franchiseId) {
        console.warn("[stripe-webhook] No franchiseId in invoice metadata");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      await supabase
        .from("franchises")
        .update({
          stripe_subscription_status: "active",
          whatsapp_plan_active: true,
          whatsapp_plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", franchiseId);

      console.log(`[stripe-webhook] invoice.payment_succeeded for franchise ${franchiseId}`);
    }

    // ─── invoice.payment_failed ───
    if (eventType === "invoice.payment_failed") {
      const invoice = event.data.object;
      const franchiseId = invoice.subscription_details?.metadata?.franchiseId
        || invoice.lines?.data?.[0]?.metadata?.franchiseId;

      if (franchiseId) {
        await supabase
          .from("franchises")
          .update({ stripe_subscription_status: "past_due" })
          .eq("id", franchiseId);

        console.log(`[stripe-webhook] invoice.payment_failed for franchise ${franchiseId}`);
      }
    }

    // ─── customer.subscription.deleted ───
    if (eventType === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const franchiseId = subscription.metadata?.franchiseId;

      if (franchiseId) {
        await supabase
          .from("franchises")
          .update({
            stripe_subscription_status: "canceled",
            stripe_subscription_id: null,
            whatsapp_plan_active: false,
            whatsapp_mode: "platform",
          })
          .eq("id", franchiseId);

        // Delete Z-API instance
        try {
          await fetch(`${supabaseUrl}/functions/v1/zapi-instance`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ action: "delete", franchiseId }),
          });
          console.log(`[stripe-webhook] Z-API instance deletion triggered for ${franchiseId}`);
        } catch (err) {
          console.error("[stripe-webhook] Failed to trigger zapi-instance delete:", err);
        }

        console.log(`[stripe-webhook] customer.subscription.deleted for franchise ${franchiseId}`);
      }
    }

    // ─── customer.subscription.updated ───
    if (eventType === "customer.subscription.updated") {
      const subscription = event.data.object;
      const franchiseId = subscription.metadata?.franchiseId;

      if (franchiseId) {
        await supabase
          .from("franchises")
          .update({ stripe_subscription_status: subscription.status })
          .eq("id", franchiseId);

        console.log(`[stripe-webhook] customer.subscription.updated for franchise ${franchiseId}: ${subscription.status}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[stripe-webhook] error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
