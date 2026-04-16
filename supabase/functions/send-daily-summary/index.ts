import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logError } from "../_shared/error-monitor.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildZapiUrl(instanceId: string, token: string, endpoint: string) {
  return `https://api.z-api.io/instances/${instanceId}/token/${token}/${endpoint}`;
}

async function resolveZapiCredentials(
  supabase: ReturnType<typeof createClient>,
  franchise: any
): Promise<{ instanceId: string; zapiToken: string; securityToken: string | null } | null> {
  const useOwnInstance =
    franchise?.whatsapp_plan_active === true &&
    franchise?.whatsapp_mode === "own" &&
    franchise?.zapi_instance_active === true;

  const instanceId = useOwnInstance ? franchise.zapi_instance_id : Deno.env.get("ZAPI_INSTANCE_ID");
  const zapiToken = useOwnInstance ? franchise.zapi_token : Deno.env.get("ZAPI_TOKEN");
  const securityToken = useOwnInstance ? null : Deno.env.get("ZAPI_SECURITY_TOKEN") || null;

  if (!instanceId || !zapiToken) return null;
  return { instanceId, zapiToken, securityToken };
}

function todayBR(): string {
  return new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Fetch all active franchises
    const { data: franchises, error: fErr } = await supabase
      .from("franchises")
      .select("id, nome_franquia, responsavel, whatsapp, whatsapp_mode, whatsapp_plan_active, zapi_instance_active, zapi_instance_id, zapi_token")
      .eq("ativa", true);

    if (fErr) throw fErr;

    const results: any[] = [];
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
    const threeDaysAgo = new Date(now); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    for (const franchise of franchises ?? []) {
      try {
        if (!franchise.whatsapp) {
          results.push({ franchise: franchise.nome_franquia, skipped: "no whatsapp" });
          continue;
        }

        // Check user preference for any user of this franchise (use any profile of the franchise)
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("franquia_id", franchise.id)
          .limit(1)
          .maybeSingle();

        if (profile?.user_id) {
          const { data: pref } = await supabase
            .from("notification_preferences")
            .select("preferences")
            .eq("user_id", profile.user_id)
            .maybeSingle();
          const prefs = (pref?.preferences as any) ?? {};
          const dailySummary = prefs?.daily_whatsapp_summary;
          // Default ON: only skip if explicitly disabled
          if (dailySummary && dailySummary.whatsapp === false) {
            results.push({ franchise: franchise.nome_franquia, skipped: "disabled by user" });
            continue;
          }
        }

        // 1. New leads since yesterday
        const { count: newLeads } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("franquia_id", franchise.id)
          .eq("status_lead", "novo")
          .gte("created_at", yesterday.toISOString());

        // 2. Cold leads (contatado/em_negociacao without recent followup)
        const { data: coldLeadsData } = await supabase
          .from("leads")
          .select("id, updated_at")
          .eq("franquia_id", franchise.id)
          .in("status_lead", ["contatado", "em_negociacao"])
          .lt("updated_at", threeDaysAgo.toISOString());
        const coldLeads = coldLeadsData?.length ?? 0;

        // 3. Proposals sent awaiting response
        const { count: pendingProposals } = await supabase
          .from("proposals")
          .select("id", { count: "exact", head: true })
          .eq("franchise_id", franchise.id)
          .in("status", ["enviada", "visualizada"]);

        // 4. Followups scheduled for today
        const { count: todayFollowups } = await supabase
          .from("lead_followups")
          .select("id", { count: "exact", head: true })
          .eq("franchise_id", franchise.id)
          .eq("completed", false)
          .gte("scheduled_at", todayStart.toISOString())
          .lte("scheduled_at", todayEnd.toISOString());

        const total = (newLeads ?? 0) + coldLeads + (pendingProposals ?? 0) + (todayFollowups ?? 0);
        if (total === 0) {
          results.push({ franchise: franchise.nome_franquia, skipped: "no activity" });
          continue;
        }

        const nome = franchise.responsavel?.split(" ")[0] ?? franchise.nome_franquia;
        const message = `☀️ Bom dia, ${nome}!

Aqui está seu resumo do dia ${todayBR()}:

📥 Novos leads: ${newLeads ?? 0}
🔥 Leads precisando de contato: ${coldLeads}
📋 Propostas aguardando resposta: ${pendingProposals ?? 0}
📅 Follow-ups agendados para hoje: ${todayFollowups ?? 0}

👉 Acesse sua plataforma: https://quintalideal.com.br/hoje

Quintal Ideal, sua máquina de vendas de piscinas 🏊`;

        // Send via Z-API directly using credentials
        const credentials = await resolveZapiCredentials(supabase, franchise);
        if (!credentials) {
          results.push({ franchise: franchise.nome_franquia, error: "no zapi credentials" });
          continue;
        }

        let phone = franchise.whatsapp.replace(/\D/g, "");
        if (!phone.startsWith("55")) phone = "55" + phone;

        const zapiUrl = buildZapiUrl(credentials.instanceId, credentials.zapiToken, "send-text");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (credentials.securityToken) headers["Client-Token"] = credentials.securityToken;

        const zapiRes = await fetch(zapiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ phone, message }),
        });
        const zapiResult = await zapiRes.json();
        const success = zapiRes.ok && !zapiResult.error;

        await supabase.from("whatsapp_messages").insert({
          franchise_id: franchise.id,
          phone,
          template_key: "daily_summary",
          message_text: message,
          status: success ? "sent" : "failed",
          zapi_message_id: zapiResult?.messageId || zapiResult?.zapiMessageId || null,
          error_message: success ? null : JSON.stringify(zapiResult),
        });

        results.push({ franchise: franchise.nome_franquia, success, total });
      } catch (innerErr) {
        console.error(`Error for franchise ${franchise.nome_franquia}:`, innerErr);
        results.push({ franchise: franchise.nome_franquia, error: String(innerErr) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-daily-summary error:", err);
    await logError({
      supabaseUrl,
      serviceKey,
      functionName: "send-daily-summary",
      message: "Erro ao processar resumo diário",
      error: err,
      severity: "critical",
      alertAdmin: true,
    });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
