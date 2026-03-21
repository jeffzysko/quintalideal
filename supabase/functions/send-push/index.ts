import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PUSH_CONTACT = "mailto:contato@quintalideal.com.br";

type StoredSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

type PushRequestBody = {
  franchise_id?: string;
  title?: string;
  message?: string;
  url?: string;
  notification_key?: string;
  user_id_filter?: string;
  type?: string; // new_lead | followup | status_change | sale | alert | system | test
};

function isApplePushEndpoint(endpoint: string): boolean {
  try {
    return new URL(endpoint).hostname === "web.push.apple.com";
  } catch {
    return false;
  }
}

// ---- VAPID helpers ----

function base64UrlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importVapidKeys(privateKeyBase64Url: string, publicKeyBase64Url: string) {
  const rawPrivate = base64UrlDecode(privateKeyBase64Url);
  const rawPublic = base64UrlDecode(publicKeyBase64Url);
  const x = base64UrlEncode(rawPublic.slice(1, 33).buffer);
  const y = base64UrlEncode(rawPublic.slice(33, 65).buffer);
  const d = base64UrlEncode(rawPrivate.buffer);
  return webpush.importVapidKeys({
    publicKey: { kty: "EC", crv: "P-256", x, y },
    privateKey: { kty: "EC", crv: "P-256", x, y, d },
  });
}

async function sendWebPush(
  appServer: webpush.ApplicationServer,
  subscription: StoredSubscription,
  payload: string,
): Promise<void> {
  const subscriber = appServer.subscribe({
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth_key,
    },
  });

  await subscriber.pushTextMessage(payload, {
    ttl: 86400,
    urgency: webpush.Urgency.High,
    ...(isApplePushEndpoint(subscription.endpoint) ? {} : { topic: "quintal-ideal" }),
  });
}

// ---- Preference check helper ----

async function getUserPushPreference(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  notificationKey: string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("notification_preferences")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data?.preferences) return true; // no prefs saved = default ON

    const prefs = data.preferences as Record<string, { push?: boolean }>;
    const keyPref = prefs[notificationKey];
    if (!keyPref || keyPref.push === undefined) return true; // key not configured = default ON
    return keyPref.push;
  } catch {
    return true; // on error, default to sending
  }
}

// ---- Main handler ----

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKeyRaw = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const vapidKeys = await importVapidKeys(vapidPrivateKeyRaw, vapidPublicKey);
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: PUSH_CONTACT,
      vapidKeys,
    });

    const {
      franchise_id,
      title,
      message,
      url: pushUrl,
      notification_key,
      user_id_filter,
      type: notificationType,
    }: PushRequestBody = await req.json();

    if (!franchise_id || !title) {
      return new Response(
        JSON.stringify({ error: "franchise_id and title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions — when user_id_filter is set (test mode), query by user only
    let subsQuery = supabase
      .from("push_subscriptions")
      .select("*");

    if (user_id_filter) {
      subsQuery = subsQuery.eq("user_id", user_id_filter);
    } else {
      subsQuery = subsQuery.eq("franchise_id", franchise_id);
    }

    const { data: subs, error } = await subsQuery;

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body: message || "",
      url: pushUrl || "/",
    });

    const results = await Promise.all(
      (subs as StoredSubscription[]).map(async (sub) => {
        // Check user preference if notification_key is provided
        if (notification_key) {
          const allowed = await getUserPushPreference(supabase, sub.user_id, notification_key);
          if (!allowed) {
            return { endpoint: sub.endpoint, status: "skipped_by_preference" };
          }
        }

        try {
          await sendWebPush(appServer, sub, payload);
          return { endpoint: sub.endpoint, status: "sent" };
        } catch (err: any) {
          if (err instanceof webpush.PushMessageError) {
            const errText = await err.response.text().catch(() => "");

            if (err.isGone()) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              return { endpoint: sub.endpoint, status: "expired_removed" };
            }

            console.error(`Push failed (${err.response.status}) for ${sub.endpoint}:`, errText);
            return {
              endpoint: sub.endpoint,
              status: "error",
              error: errText || `HTTP ${err.response.status}`,
            };
          }

          console.error(`Push error for ${sub.endpoint}:`, err.message);
          return { endpoint: sub.endpoint, status: "error", error: err.message };
        }
      })
    );

    const sent = results.filter((result) => result.status === "sent").length;
    const skipped = results.filter((result) => result.status === "skipped_by_preference").length;
    const failed = results.filter((result) => result.status === "error").length;

    return new Response(
      JSON.stringify({ sent, skipped, failed, total: subs.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-push error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
