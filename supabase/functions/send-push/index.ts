import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Native VAPID / Web Push helpers (no npm deps) ----

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

async function importVapidPrivateKey(base64Url: string): Promise<CryptoKey> {
  const raw = base64UrlDecode(base64Url);
  // VAPID private key is 32 bytes raw; wrap it in PKCS8
  const pkcs8 = buildPkcs8FromRaw(raw);
  return crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

function buildPkcs8FromRaw(raw: Uint8Array): Uint8Array {
  // PKCS8 wrapper for EC P-256 private key (32 bytes raw)
  const header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  // We need the public key for the footer, but for signing we can omit it
  // Actually, Deno's SubtleCrypto needs the full structure. Let's use JWK instead.
  void header;
  void footer;
  // Fallback: not used, we'll import via JWK
  return new Uint8Array(0);
}

async function importVapidKeys(privateKeyBase64Url: string, publicKeyBase64Url: string) {
  const rawPrivate = base64UrlDecode(privateKeyBase64Url);
  const rawPublic = base64UrlDecode(publicKeyBase64Url);

  // Build JWK from raw keys
  const x = base64UrlEncode(rawPublic.slice(1, 33).buffer);
  const y = base64UrlEncode(rawPublic.slice(33, 65).buffer);
  const d = base64UrlEncode(rawPrivate.buffer);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d,
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  return key;
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
  const payload = {
    aud: audience,
    exp: now + expSeconds,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)).buffer);
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)).buffer);
  const unsigned = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsigned)
  );

  // Convert DER signature to raw r||s (64 bytes)
  const rawSig = derToRaw(new Uint8Array(signature));
  const sigB64 = base64UrlEncode(rawSig.buffer);

  return `${unsigned}.${sigB64}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  if (der[0] !== 0x30) return der; // already raw?
  const raw = new Uint8Array(64);

  let offset = 2;
  // R
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;

  // S
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

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    },
    body: new TextEncoder().encode(payload),
  });

  return response;
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

    const { franchise_id, title, message, url: pushUrl } = await req.json();

    if (!franchise_id || !title) {
      return new Response(
        JSON.stringify({ error: "franchise_id and title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all push subscriptions for this franchise
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("franchise_id", franchise_id);

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
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        };

        try {
          const res = await sendWebPush(pushSubscription, payload, vapidPublicKey, vapidPrivateKey);

          if (res.status === 404 || res.status === 410) {
            // Subscription expired, clean up
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

    return new Response(
      JSON.stringify({ sent, total: subs.length, results }),
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
