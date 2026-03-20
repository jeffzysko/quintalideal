import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { franchise_id, title, message, url } = await req.json();

    if (!franchise_id || !title) {
      return new Response(
        JSON.stringify({ error: "franchise_id and title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(
      "mailto:contato@quintalideal.com.br",
      vapidPublicKey,
      vapidPrivateKey
    );

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
      url: url || "/",
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
          await webpush.sendNotification(pushSubscription, payload);
          return { endpoint: sub.endpoint, status: "sent" };
        } catch (err: any) {
          // 404 or 410 = subscription expired, clean up
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
            return { endpoint: sub.endpoint, status: "expired_removed" };
          }
          console.error(`Push failed for ${sub.endpoint}:`, err.message);
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
