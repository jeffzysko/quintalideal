import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  return crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function createVapidJwt(
  audience: string,
  subject: string,
  privateKey: CryptoKey,
  publicKeyBase64Url: string,
  expSeconds = 86400,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + expSeconds, sub: subject };
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)).buffer);
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)).buffer);
  const unsigned = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsigned)
  );
  const rawSig = derToRaw(new Uint8Array(signature));
  return `${unsigned}.${base64UrlEncode(rawSig.buffer)}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  if (der[0] !== 0x30) return der;
  const raw = new Uint8Array(64);
  let offset = 2;
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 32 + (32 - sLen) : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: CryptoKey,
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createVapidJwt(
    audience,
    "mailto:contato@quintalideal.com.br",
    vapidPrivateKey,
    vapidPublicKey,
  );
  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    },
    body: new TextEncoder().encode(payload),
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
    const vapidPrivateKey = await importVapidKeys(vapidPrivateKeyRaw, vapidPublicKey);

    const { franchise_id, title, message, url: pushUrl, notification_key, user_id_filter } = await req.json();

    if (!franchise_id || !title) {
      return new Response(
        JSON.stringify({ error: "franchise_id and title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions — optionally filtered to a single user (for test sends)
    let subsQuery = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("franchise_id", franchise_id);

    if (user_id_filter) {
      subsQuery = subsQuery.eq("user_id", user_id_filter);
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

    const results = await Promise.allSettled(
      subs.map(async (sub: any) => {
        // Check user preference if notification_key is provided
        if (notification_key) {
          const allowed = await getUserPushPreference(supabase, sub.user_id, notification_key);
          if (!allowed) {
            return { endpoint: sub.endpoint, status: "skipped_by_preference" };
          }
        }

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        };

        try {
          const res = await sendWebPush(pushSubscription, payload, vapidPublicKey, vapidPrivateKey);

          if (res.status === 404 || res.status === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            await res.text().catch(() => {});
            return { endpoint: sub.endpoint, status: "expired_removed" };
          }

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            console.error(`Push failed (${res.status}) for ${sub.endpoint}:`, errText);
            return { endpoint: sub.endpoint, status: "error", error: `HTTP ${res.status}` };
          }

          await res.text().catch(() => {});
          return { endpoint: sub.endpoint, status: "sent" };
        } catch (err: any) {
          console.error(`Push error for ${sub.endpoint}:`, err.message);
          return { endpoint: sub.endpoint, status: "error", error: err.message };
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).status === "sent"
    ).length;
    const skipped = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).status === "skipped_by_preference"
    ).length;

    return new Response(
      JSON.stringify({ sent, skipped, total: subs.length, results }),
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
