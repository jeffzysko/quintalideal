import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Delete analytics events older than 12 months
    const analyticsCutoff = new Date();
    analyticsCutoff.setMonth(analyticsCutoff.getMonth() - 12);
    const analyticsCutoffISO = analyticsCutoff.toISOString();

    const { count: analyticsDeleted, error: analyticsError } = await supabase
      .from("analytics_events")
      .delete({ count: "exact" })
      .lt("created_at", analyticsCutoffISO);

    if (analyticsError) {
      console.error("Analytics cleanup error:", analyticsError.message);
    }

    // Delete webhook logs older than 3 months
    const webhookCutoff = new Date();
    webhookCutoff.setMonth(webhookCutoff.getMonth() - 3);
    const webhookCutoffISO = webhookCutoff.toISOString();

    const { count: webhooksDeleted, error: webhookError } = await supabase
      .from("webhook_logs")
      .delete({ count: "exact" })
      .lt("created_at", webhookCutoffISO);

    if (webhookError) {
      console.error("Webhook cleanup error:", webhookError.message);
    }

    const result = {
      success: true,
      analytics: { deleted: analyticsDeleted ?? 0, cutoff: analyticsCutoffISO, error: analyticsError?.message ?? null },
      webhook_logs: { deleted: webhooksDeleted ?? 0, cutoff: webhookCutoffISO, error: webhookError?.message ?? null },
    };

    console.log("Cleanup complete:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Cleanup failed:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
