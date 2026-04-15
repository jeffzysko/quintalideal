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

/**
 * Send a WhatsApp notification using platform credentials (never franchise own instance).
 * Fails silently — errors are logged but never propagated.
 */
async function sendPlatformWhatsApp(
  supabase: ReturnType<typeof createClient>,
  franchiseId: string,
  message: string
) {
  try {
    // Get franchise WhatsApp number
    const { data: franchise } = await supabase
      .from("franchises")
      .select("whatsapp")
      .eq("id", franchiseId)
      .maybeSingle();

    const phone = franchise?.whatsapp;
    if (!phone) {
      console.log(`[stripe-webhook] No WhatsApp number for franchise ${franchiseId}, skipping notification`);
      return;
    }

    // Normalize phone
    let normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone.startsWith("55")) {
      normalizedPhone = "55" + normalizedPhone;
    }

    // Use platform credentials
    const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
    const zapiToken = Deno.env.get("ZAPI_TOKEN");
    const securityToken = Deno.env.get("ZAPI_SECURITY_TOKEN");

    if (!instanceId || !zapiToken) {
      console.warn("[stripe-webhook] Platform Z-API credentials not configured, skipping notification");
      return;
    }

    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (securityToken) headers["Client-Token"] = securityToken;

    const res = await fetch(zapiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: normalizedPhone, message }),
    });

    const result = await res.json();
    const success = res.ok && !result.error;

    // Log message
    await supabase.from("whatsapp_messages").insert({
      franchise_id: franchiseId,
      phone: normalizedPhone,
      message_text: message,
      status: success ? "sent" : "failed",
      zapi_message_id: result?.messageId || result?.zapiMessageId || null,
      error_message: success ? null : JSON.stringify(result),
      template_key: "stripe_notification",
    });

    if (success) {
      console.log(`[stripe-webhook] WhatsApp notification sent to franchise ${franchiseId}`);
    } else {
      console.error(`[stripe-webhook] WhatsApp notification failed for franchise ${franchiseId}:`, result);
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error sending WhatsApp notification for franchise ${franchiseId}:`, err);
  }
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
    const platformUrl = Deno.env.get("PLATFORM_URL") || "https://quintalideal.lovable.app";

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

      // Send WhatsApp notification
      await sendPlatformWhatsApp(
        supabase,
        franchiseId,
        `✅ *Plano WhatsApp Próprio ativado!*\n\nOlá! Seu plano foi confirmado com sucesso.\n\nAgora acesse as configurações da sua franquia no Quintal Ideal, vá até a aba WhatsApp e clique em *Conectar WhatsApp* para vincular seu número.\n\nQualquer dúvida, é só chamar! 🌱`
      );

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

        // Send WhatsApp notification
        await sendPlatformWhatsApp(
          supabase,
          franchiseId,
          `⚠️ *Atenção: falha no pagamento*\n\nNão conseguimos processar o pagamento do seu plano WhatsApp Próprio.\n\nPor favor, atualize seu método de pagamento para evitar a suspensão do serviço. Acesse: ${platformUrl}/settings?tab=whatsapp\n\nCaso precise de ajuda, é só falar! 🌱`
        );

        console.log(`[stripe-webhook] invoice.payment_failed for franchise ${franchiseId}`);
      }
    }

    // ─── customer.subscription.deleted ───
    if (eventType === "customer.subscription.deleted") {
      const subscription = event.data.object;
      const franchiseId = subscription.metadata?.franchiseId;

      if (franchiseId) {
        // Send notification BEFORE deactivating (so we can still fetch franchise data)
        await sendPlatformWhatsApp(
          supabase,
          franchiseId,
          `📴 *Plano WhatsApp encerrado*\n\nSeu plano WhatsApp Próprio foi cancelado. A partir de agora, as notificações da sua franquia voltam a ser enviadas pelo número da plataforma normalmente.\n\nSe quiser reativar no futuro, acesse as configurações a qualquer momento. 🌱`
        );

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
