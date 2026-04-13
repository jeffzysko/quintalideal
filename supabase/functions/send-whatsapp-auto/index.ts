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
      return new Response(JSON.stringify({ error: "trigger_event é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check is_active
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("instance_id, token, security_token, is_active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!config?.is_active) {
      return new Response(JSON.stringify({ skipped: true, reason: "WhatsApp desativado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instanceId = config.instance_id || Deno.env.get("ZAPI_INSTANCE_ID");
    const zapiToken = config.token || Deno.env.get("ZAPI_TOKEN");
    const securityToken = config.security_token || Deno.env.get("ZAPI_SECURITY_TOKEN");

    if (!instanceId || !zapiToken) {
      return new Response(JSON.stringify({ skipped: true, reason: "Z-API não configurada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context based on trigger_event
    let phone = "";
    let message = "";
    let resolvedFranchiseId = franchise_id || "";
    let resolvedLeadId = lead_id || "";

    // Helper: fetch lead
    const fetchLead = async (lid: string) => {
      const { data } = await supabase.from("leads").select("nome, telefone, cidade, franquia_id, lead_origin, pontuacao_quintal, modelo_recomendado").eq("id", lid).maybeSingle();
      return data;
    };

    // Helper: fetch franchise
    const fetchFranchise = async (fid: string) => {
      const { data } = await supabase.from("franchises").select("nome_franquia, whatsapp").eq("id", fid).maybeSingle();
      return data;
    };

    // Helper: fetch proposal with lead
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
        // Send to franchise
        if (!franchise?.whatsapp) return jsonResp({ skipped: true, reason: "Franquia sem WhatsApp" });
        phone = formatWhatsAppPhone(franchise.whatsapp);
        const origem = lead.lead_origin === "quiz" ? "Quiz Quintal Ideal" : "Manual";
        message = `Novo lead recebido! 🏊\n*Nome:* ${lead.nome || "Sem nome"}\n*Telefone:* ${lead.telefone || "Não informado"}\n*Origem:* ${origem}\nAcesse o painel para iniciar o atendimento.`;
      } else {
        // lead_welcome — send to lead
        if (!lead.telefone) return jsonResp({ skipped: true, reason: "Lead sem telefone" });
        phone = formatWhatsAppPhone(lead.telefone);
        const waLink = franchisePhone ? `https://wa.me/${franchisePhone}` : "";
        message = `Olá, ${lead.nome || ""}! 😊\nRecebemos seu interesse em um projeto de piscina e em breve um consultor da *${franchiseName}* vai entrar em contato.${waLink ? `\nSe preferir falar agora, é só clicar aqui:\n👉 ${waLink}` : ""}`;
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

      // Get lead phone
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

      if (trigger_event === "proposal_sent") {
        const validityText = proposal.validity_date || "consulte";
        message = `Olá, ${leadName}!\nSua proposta personalizada está pronta. Acesse o link para visualizar:\n👉 ${publicUrl}\nVálida até *${validityText}*.`;
      } else if (trigger_event === "proposal_accepted") {
        message = `Olá, ${leadName}! 🎉\nSua proposta foi aceita! Estamos muito felizes em ter você como cliente.\nNossa equipe entrará em contato em breve para os próximos passos.\n— *${franchiseName}*`;
      } else if (trigger_event === "proposal_viewed_followup") {
        message = `Olá, ${leadName}!\nVimos que você conferiu sua proposta. Ficou com alguma dúvida ou quer conversar sobre o projeto?\n${waLink ? `👉 ${waLink}\n` : ""}— *${franchiseName}*`;
      } else if (trigger_event === "proposal_expiring") {
        const validityText = proposal.validity_date || "";
        message = `Olá, ${leadName}!\nSua proposta vence em *2 dias*, no dia *${validityText}*. Após essa data os valores podem ser alterados.\nPara garantir, fale com a gente:\n${waLink ? `👉 ${waLink}\n` : ""}— *${franchiseName}*`;
      }
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
      message = `Olá, ${lead.nome || ""}!\nEstamos à disposição para tirar qualquer dúvida sobre sua proposta ou ajustar algum detalhe do projeto.\n${waLink ? `👉 ${waLink}\n` : ""}— *${franchiseName}*`;
    } else {
      return jsonResp({ skipped: true, reason: `Evento desconhecido: ${trigger_event}` });
    }

    if (!phone || !message) {
      return jsonResp({ skipped: true, reason: "Telefone ou mensagem vazia" });
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

  function jsonResp(data: Record<string, unknown>) {
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
