import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutoSendRequest {
  trigger_event: string;
  lead_id?: string;
  proposal_id?: string;
  franchise_id?: string;
}

function formatWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function buildZapiUrl(instanceId: string, token: string, endpoint: string) {
  return `https://api.z-api.io/instances/${instanceId}/token/${token}/${endpoint}`;
}

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body: AutoSendRequest = await req.json();
    const { trigger_event, lead_id, proposal_id, franchise_id } = body;

    if (!trigger_event) {
      return jsonResp({ error: "trigger_event é obrigatório" }, 400);
    }

    // Check template exists and is active
    const { data: tplRow } = await supabase
      .from("whatsapp_templates")
      .select("message_text, is_active")
      .eq("template_key", trigger_event)
      .maybeSingle();

    if (tplRow && !tplRow.is_active) {
      return jsonResp({ skipped: true, reason: `Template '${trigger_event}' desativado` });
    }

    // Check is_active (global Z-API toggle)
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("instance_id, token, security_token, is_active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!config?.is_active) {
      return jsonResp({ skipped: true, reason: "WhatsApp desativado" });
    }

    const instanceId = config.instance_id || Deno.env.get("ZAPI_INSTANCE_ID");
    const zapiToken = config.token || Deno.env.get("ZAPI_TOKEN");
    const securityToken = config.security_token || Deno.env.get("ZAPI_SECURITY_TOKEN");

    if (!instanceId || !zapiToken) {
      return jsonResp({ skipped: true, reason: "Z-API não configurada" });
    }

    // Build context based on trigger_event
    let phone = "";
    let vars: Record<string, string> = {};
    let resolvedFranchiseId = franchise_id || "";
    let resolvedLeadId = lead_id || "";

    const fetchLead = async (lid: string) => {
      const { data } = await supabase.from("leads").select("nome, telefone, cidade, franquia_id, lead_origin, pontuacao_quintal, modelo_recomendado").eq("id", lid).maybeSingle();
      return data;
    };

    const fetchFranchise = async (fid: string) => {
      const { data } = await supabase.from("franchises").select("nome_franquia, whatsapp").eq("id", fid).maybeSingle();
      return data;
    };

    const fetchProposal = async (pid: string) => {
      const { data } = await supabase.from("proposals").select("id, lead_id, franchise_id, client_name, client_phone, public_token, validity_date, status").eq("id", pid).maybeSingle();
      return data;
    };

    if (trigger_event === "lead_created" || trigger_event === "lead_welcome") {
      if (!lead_id) return jsonResp({ skipped: true, reason: "lead_id ausente" });
      const lead = await fetchLead(lead_id);
      if (!lead) return jsonResp({ skipped: true, reason: "Lead não encontrado" });

      const fid = franchise_id || lead.franquia_id;
      if (!fid) return jsonResp({ skipped: true, reason: "Franquia não vinculada" });
      resolvedFranchiseId = fid;
      resolvedLeadId = lead_id;

      const franchise = await fetchFranchise(fid);
      const franchiseName = franchise?.nome_franquia || "Quintal Ideal";
      const franchisePhone = franchise?.whatsapp ? formatWhatsAppPhone(franchise.whatsapp) : "";

      if (trigger_event === "lead_created") {
        if (!franchise?.whatsapp) return jsonResp({ skipped: true, reason: "Franquia sem WhatsApp" });
        phone = formatWhatsAppPhone(franchise.whatsapp);
        const origem = lead.lead_origin === "quiz" ? "Quiz Quintal Ideal" : "Manual";
        vars = { nome: lead.nome || "Sem nome", telefone: lead.telefone || "Não informado", origem };
      } else {
        if (!lead.telefone) return jsonResp({ skipped: true, reason: "Lead sem telefone" });
        phone = formatWhatsAppPhone(lead.telefone);
        const waLink = franchisePhone ? `https://wa.me/${franchisePhone}` : "";
        vars = { nome: lead.nome || "", franquia: franchiseName, link_whatsapp: waLink };
      }
    } else if (
      trigger_event === "proposal_sent" ||
      trigger_event === "proposal_accepted" ||
      trigger_event === "proposal_viewed_followup" ||
      trigger_event === "proposal_expiring"
    ) {
      if (!proposal_id) return jsonResp({ skipped: true, reason: "proposal_id ausente" });
      const proposal = await fetchProposal(proposal_id);
      if (!proposal) return jsonResp({ skipped: true, reason: "Proposta não encontrada" });

      resolvedFranchiseId = proposal.franchise_id;
      resolvedLeadId = proposal.lead_id || "";

      let leadPhone = proposal.client_phone || "";
      let leadName = proposal.client_name || "";
      if (proposal.lead_id) {
        const lead = await fetchLead(proposal.lead_id);
        if (lead) {
          leadPhone = leadPhone || lead.telefone || "";
          leadName = leadName || lead.nome || "";
        }
      }
      if (!leadPhone) return jsonResp({ skipped: true, reason: "Destinatário sem telefone" });
      phone = formatWhatsAppPhone(leadPhone);

      const franchise = await fetchFranchise(proposal.franchise_id);
      const franchiseName = franchise?.nome_franquia || "Quintal Ideal";
      const franchisePhone = franchise?.whatsapp ? formatWhatsAppPhone(franchise.whatsapp) : "";
      const waLink = franchisePhone ? `https://wa.me/${franchisePhone}` : "";
      const publicUrl = `https://quintalideal.com.br/proposta/${proposal.public_token}`;
      const validityText = proposal.validity_date || "consulte";

      vars = {
        nome: leadName,
        franquia: franchiseName,
        link_whatsapp: waLink,
        link_proposta: publicUrl,
        validade: validityText,
      };
    } else if (trigger_event === "lead_negotiation") {
      if (!lead_id) return jsonResp({ skipped: true, reason: "lead_id ausente" });
      const lead = await fetchLead(lead_id);
      if (!lead) return jsonResp({ skipped: true, reason: "Lead não encontrado" });
      if (!lead.telefone) return jsonResp({ skipped: true, reason: "Lead sem telefone" });

      const fid = franchise_id || lead.franquia_id;
      if (!fid) return jsonResp({ skipped: true, reason: "Franquia não vinculada" });
      resolvedFranchiseId = fid;
      resolvedLeadId = lead_id;

      phone = formatWhatsAppPhone(lead.telefone);
      const franchise = await fetchFranchise(fid);
      const franchiseName = franchise?.nome_franquia || "Quintal Ideal";
      const franchisePhone = franchise?.whatsapp ? formatWhatsAppPhone(franchise.whatsapp) : "";
      const waLink = franchisePhone ? `https://wa.me/${franchisePhone}` : "";
      vars = { nome: lead.nome || "", franquia: franchiseName, link_whatsapp: waLink };
    } else {
      return jsonResp({ skipped: true, reason: `Evento desconhecido: ${trigger_event}` });
    }

    if (!phone) {
      return jsonResp({ skipped: true, reason: "Telefone vazio" });
    }

    // Build message: use DB template if available, else fallback
    let message = "";
    if (tplRow?.message_text) {
      message = replaceVars(tplRow.message_text, vars);
    } else {
      // Fallback hardcoded (should not happen if DB is seeded)
      message = Object.entries(vars).reduce(
        (msg, [k, v]) => msg + `${k}: ${v}\n`,
        `[${trigger_event}]\n`
      );
    }

    if (!message) {
      return jsonResp({ skipped: true, reason: "Mensagem vazia" });
    }

    // Duplicate protection: check if same event was sent in last 23h
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    let dupQuery = supabase
      .from("whatsapp_messages")
      .select("id")
      .eq("template_key", trigger_event)
      .eq("status", "sent")
      .gte("created_at", twentyThreeHoursAgo);

    if (resolvedLeadId) {
      dupQuery = dupQuery.eq("lead_id", resolvedLeadId);
    } else {
      dupQuery = dupQuery.eq("phone", phone);
    }

    const { data: existingMsg } = await dupQuery.limit(1);
    if (existingMsg && existingMsg.length > 0) {
      // Log as skipped
      await supabase.from("whatsapp_messages").insert({
        franchise_id: resolvedFranchiseId,
        lead_id: resolvedLeadId || null,
        proposal_id: proposal_id || null,
        phone,
        template_key: trigger_event,
        message_text: message,
        status: "skipped",
        error_message: "Duplicate prevented",
        sent_by: null,
      });
      return jsonResp({ skipped: true, reason: "duplicate" });
    }

    // Business hours check (08:00-20:00 Brasília)
    const nowBrasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hour = nowBrasilia.getHours();
    if (hour < 8 || hour >= 20) {
      // Schedule for next available 08:00
      const scheduled = new Date(nowBrasilia);
      if (hour >= 20) {
        scheduled.setDate(scheduled.getDate() + 1);
      }
      scheduled.setHours(8, 0, 0, 0);
      // Convert back to UTC-ish by creating proper ISO
      const offsetMs = scheduled.getTime() - nowBrasilia.getTime() + Date.now();
      const scheduledUtc = new Date(offsetMs);

      await supabase.from("whatsapp_messages").insert({
        franchise_id: resolvedFranchiseId,
        lead_id: resolvedLeadId || null,
        proposal_id: proposal_id || null,
        phone,
        template_key: trigger_event,
        message_text: message,
        status: "scheduled",
        scheduled_for: scheduledUtc.toISOString(),
        error_message: null,
        sent_by: null,
      });
      return jsonResp({ skipped: true, reason: "outside_business_hours", scheduled_for: scheduledUtc.toISOString() });
    }

    // Send via Z-API
    const zapiUrl = buildZapiUrl(instanceId, zapiToken, "send-text");
    const zapiHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (securityToken) zapiHeaders["Client-Token"] = securityToken;

    const zapiResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: zapiHeaders,
      body: JSON.stringify({ phone, message }),
    });
    const zapiResult = await zapiResponse.json();
    const success = zapiResponse.ok && !zapiResult.error;
    const status = success ? "sent" : "failed";

    // Log
    await supabase.from("whatsapp_messages").insert({
      franchise_id: resolvedFranchiseId,
      lead_id: resolvedLeadId || null,
      proposal_id: proposal_id || null,
      phone,
      template_key: trigger_event,
      message_text: message,
      status,
      zapi_message_id: zapiResult?.messageId || zapiResult?.zapiMessageId || null,
      error_message: success ? null : JSON.stringify(zapiResult),
      sent_by: null,
    });

    if (!success) {
      console.error(`Z-API error for ${trigger_event}:`, zapiResult);
    }

    return new Response(
      JSON.stringify({ success, trigger_event, messageId: zapiResult?.messageId || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-whatsapp-auto error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  function jsonResp(data: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
