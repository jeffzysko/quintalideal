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

    // 3. WhatsApp: proposal_expiring (2 days before validity)
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const twoDaysStr = twoDaysFromNow.toISOString().split("T")[0];
    const { data: expiringIn2Days } = await supabase
      .from("proposals")
      .select("id, franchise_id")
      .eq("validity_date", twoDaysStr)
      .not("status", "in", '("aceita","recusada")');

    let waExpiringCount = 0;
    if (expiringIn2Days?.length) {
      const autoUrl = `${supabaseUrl}/functions/v1/send-whatsapp-auto`;
      const autoHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` };
      for (const p of expiringIn2Days) {
        try {
          await fetch(autoUrl, { method: "POST", headers: autoHeaders, body: JSON.stringify({ trigger_event: "proposal_expiring", proposal_id: p.id, franchise_id: p.franchise_id }) });
          waExpiringCount++;
        } catch (e) { console.error("WA proposal_expiring error:", e); }
      }
    }

    // 4. WhatsApp: proposal_viewed_followup (24h after visualizada without advancement)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: viewedProposals } = await supabase
      .from("proposals")
      .select("id, franchise_id, updated_at")
      .eq("status", "visualizada")
      .lt("updated_at", twentyFourHoursAgo);

    let waFollowupCount = 0;
    if (viewedProposals?.length) {
      const autoUrl = `${supabaseUrl}/functions/v1/send-whatsapp-auto`;
      const autoHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` };
      for (const p of viewedProposals) {
        // Check if we already sent this followup (dedup by checking whatsapp_messages)
        const { data: alreadySent } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("proposal_id", p.id)
          .eq("template_key", "proposal_viewed_followup")
          .limit(1);
        if (alreadySent && alreadySent.length > 0) continue;
        try {
          await fetch(autoUrl, { method: "POST", headers: autoHeaders, body: JSON.stringify({ trigger_event: "proposal_viewed_followup", proposal_id: p.id, franchise_id: p.franchise_id }) });
          waFollowupCount++;
        } catch (e) { console.error("WA proposal_viewed_followup error:", e); }
      }
    }

    // 5. Process scheduled WhatsApp messages (business hours queue) — multi-instance aware
    let waScheduledCount = 0;
    const { data: scheduledMsgs } = await supabase
      .from("whatsapp_messages")
      .select("id, phone, message_text, template_key, franchise_id, lead_id, proposal_id")
      .eq("status", "scheduled")
      .lte("scheduled_for", now.toISOString())
      .limit(50);

    if (scheduledMsgs?.length) {
      // Group messages by franchise_id to resolve credentials per franchise
      const byFranchise: Record<string, typeof scheduledMsgs> = {};
      for (const msg of scheduledMsgs) {
        if (!byFranchise[msg.franchise_id]) byFranchise[msg.franchise_id] = [];
        byFranchise[msg.franchise_id].push(msg);
      }

      for (const [fId, msgs] of Object.entries(byFranchise)) {
        // Resolve credentials for this franchise (multi-instance)
        const { data: franchise } = await supabase
          .from("franchises")
          .select("whatsapp_mode, zapi_instance_id, zapi_token, zapi_client_token, zapi_instance_active, whatsapp_plan_active")
          .eq("id", fId)
          .maybeSingle();

        let instanceId: string | undefined;
        let zapiToken: string | undefined;
        let securityToken: string | null = null;

        if (
          franchise?.whatsapp_mode === "own" &&
          franchise?.whatsapp_plan_active &&
          franchise?.zapi_instance_active &&
          franchise?.zapi_instance_id &&
          franchise?.zapi_token
        ) {
          instanceId = franchise.zapi_instance_id;
          zapiToken = franchise.zapi_token;
          securityToken = franchise.zapi_client_token || null;
        } else {
          // Fallback to central config
          const { data: waConfig } = await supabase
            .from("whatsapp_config")
            .select("instance_id, token, security_token, is_active")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!waConfig?.is_active) continue;
          instanceId = waConfig.instance_id || Deno.env.get("ZAPI_INSTANCE_ID");
          zapiToken = waConfig.token || Deno.env.get("ZAPI_TOKEN");
          securityToken = waConfig.security_token || Deno.env.get("ZAPI_SECURITY_TOKEN") || null;
        }

        if (!instanceId || !zapiToken) continue;

        const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`;
        const zapiHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (securityToken) zapiHeaders["Client-Token"] = securityToken;

        for (const msg of msgs) {
          try {
            const resp = await fetch(zapiUrl, {
              method: "POST",
              headers: zapiHeaders,
              body: JSON.stringify({ phone: msg.phone, message: msg.message_text }),
            });
            const result = await resp.json();
            const ok = resp.ok && !result.error;

            await supabase
              .from("whatsapp_messages")
              .update({
                status: ok ? "sent" : "failed",
                scheduled_for: null,
                zapi_message_id: result?.messageId || result?.zapiMessageId || null,
                error_message: ok ? null : JSON.stringify(result),
              })
              .eq("id", msg.id);

            if (ok) waScheduledCount++;
          } catch (e) {
            console.error("Scheduled send error:", e);
            await supabase
              .from("whatsapp_messages")
              .update({ status: "failed", scheduled_for: null, error_message: String(e) })
              .eq("id", msg.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        expired: expiredCount,
        warnings: warningCount,
        wa_expiring: waExpiringCount,
        wa_followup: waFollowupCount,
        wa_scheduled: waScheduledCount,
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
