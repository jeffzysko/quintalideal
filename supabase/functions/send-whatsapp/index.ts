import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendRequest {
  phone: string;
  message: string;
  template_key?: string;
  lead_id?: string;
  proposal_id?: string;
  franchise_id: string;
}

// Z-API base URL builder
function buildZapiUrl(instanceId: string, token: string, endpoint: string) {
  return `https://api.z-api.io/instances/${instanceId}/token/${token}/${endpoint}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const body: SendRequest = await req.json();
    const { phone, message, template_key, lead_id, proposal_id, franchise_id } = body;

    if (!phone || !message || !franchise_id) {
      return new Response(
        JSON.stringify({ error: "phone, message e franchise_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone: ensure country code 55
    let normalizedPhone = phone.replace(/\D/g, "");
    if (!normalizedPhone.startsWith("55")) {
      normalizedPhone = "55" + normalizedPhone;
    }

    // --- FASE 2 ready: check franchise-specific config first ---
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: franchiseConfig } = await serviceClient
      .from("whatsapp_config")
      .select("instance_id, token, security_token, is_active")
      .eq("franchise_id", franchise_id)
      .eq("is_active", true)
      .maybeSingle();

    // Use franchise config if available (Fase 2), otherwise use central credentials (Fase 1)
    const instanceId = franchiseConfig?.instance_id || Deno.env.get("ZAPI_INSTANCE_ID");
    const zapiToken = franchiseConfig?.token || Deno.env.get("ZAPI_TOKEN");
    const securityToken = franchiseConfig?.security_token || Deno.env.get("ZAPI_SECURITY_TOKEN");

    if (!instanceId || !zapiToken) {
      return new Response(
        JSON.stringify({ error: "Z-API não configurada. Verifique as credenciais." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send message via Z-API
    const zapiUrl = buildZapiUrl(instanceId, zapiToken, "send-text");
    const zapiHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (securityToken) {
      zapiHeaders["Client-Token"] = securityToken;
    }

    const zapiResponse = await fetch(zapiUrl, {
      method: "POST",
      headers: zapiHeaders,
      body: JSON.stringify({
        phone: normalizedPhone,
        message,
      }),
    });

    const zapiResult = await zapiResponse.json();

    const success = zapiResponse.ok && !zapiResult.error;
    const status = success ? "sent" : "failed";

    // Log message in database
    await serviceClient.from("whatsapp_messages").insert({
      franchise_id,
      lead_id: lead_id || null,
      proposal_id: proposal_id || null,
      phone: normalizedPhone,
      template_key: template_key || null,
      message_text: message,
      status,
      zapi_message_id: zapiResult?.messageId || zapiResult?.zapiMessageId || null,
      error_message: success ? null : JSON.stringify(zapiResult),
      sent_by: userId,
    });

    if (!success) {
      console.error("Z-API error:", zapiResult);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar mensagem", details: zapiResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: zapiResult?.messageId || zapiResult?.zapiMessageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-whatsapp error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
