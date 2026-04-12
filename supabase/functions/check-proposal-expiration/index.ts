import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // 1. Mark expired proposals (validity_date < today, status not terminal)
    const { data: expired, error: expErr } = await supabase
      .from("proposals")
      .select("id, client_name, franchise_id, validity_date")
      .lt("validity_date", todayStr)
      .not("status", "in", '("aceita","recusada")')
      .not("validity_date", "is", null);

    let expiredCount = 0;
    if (!expErr && expired?.length) {
      for (const p of expired) {
        // We can't set 'expirada' since the enum doesn't have it - mark as recusada with reason
        await supabase
          .from("proposals")
          .update({
            status: "recusada" as any,
            refused_at: now.toISOString(),
            refused_reason: "Proposta expirada automaticamente",
            updated_at: now.toISOString(),
          })
          .eq("id", p.id);

        // Notify franchise
        await supabase.from("notifications").insert({
          franchise_id: p.franchise_id,
          title: "Proposta expirada",
          message: `A proposta para ${p.client_name} expirou em ${p.validity_date}. Considere estender a validade ou criar uma nova proposta.`,
          type: "proposal_expired",
        });

        expiredCount++;
      }
    }

    // 2. Warn about proposals expiring tomorrow
    const { data: expiringSoon, error: soonErr } = await supabase
      .from("proposals")
      .select("id, client_name, franchise_id, validity_date")
      .eq("validity_date", tomorrowStr)
      .not("status", "in", '("aceita","recusada")');

    let warningCount = 0;
    if (!soonErr && expiringSoon?.length) {
      for (const p of expiringSoon) {
        // Check if we already sent a warning in the last 24h
        const { data: recentNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("franchise_id", p.franchise_id)
          .eq("type", "proposal_expiring_soon")
          .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentNotif && recentNotif.length > 0) continue;

        await supabase.from("notifications").insert({
          franchise_id: p.franchise_id,
          title: "Proposta expira amanhã!",
          message: `A proposta para ${p.client_name} expira amanhã (${p.validity_date}). Aja agora para não perder a venda!`,
          type: "proposal_expiring_soon",
          metadata: { proposal_id: p.id },
        });

        warningCount++;
      }
    }

    return new Response(
      JSON.stringify({
        expired: expiredCount,
        warnings: warningCount,
        checked_at: now.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
