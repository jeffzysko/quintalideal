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

function buildZapiUrl(instanceId: string, token: string, endpoint: string) {
  return `https://api.z-api.io/instances/${instanceId}/token/${token}/${endpoint}`;
}

/**
 * Resolve Z-API credentials: franchise-specific > central config > env secrets
 */
async function resolveZapiCredentials(
  supabase: ReturnType<typeof createClient>,
  franchiseId: string
): Promise<{ instanceId: string; zapiToken: string; securityToken: string | null } | null> {
  // 1. Check franchise-specific credentials (multi-instance)
  const { data: franchise } = await supabase
    .from("franchises")
    .select("whatsapp_mode, zapi_instance_id, zapi_token, zapi_client_token, zapi_instance_active, whatsapp_plan_active")
    .eq("id", franchiseId)
    .maybeSingle();

  if (
    franchise?.whatsapp_mode === "own" &&
    franchise?.whatsapp_plan_active === true &&
    franchise?.zapi_instance_active === true &&
    franchise?.zapi_instance_id &&
    franchise?.zapi_token
  ) {
    return {
      instanceId: franchise.zapi_instance_id,
      zapiToken: franchise.zapi_token,
      securityToken: franchise.zapi_client_token || null,
    };
  }

  // 2. Fallback: check franchise-specific whatsapp_config row
  const { data: franchiseConfig } = await supabase
    .from("whatsapp_config")
    .select("instance_id, token, security_token, is_active")
    .eq("franchise_id", franchiseId)
    .maybeSingle();

  if (franchiseConfig && !franchiseConfig.is_active) {
    // Check central config too
    const { data: centralConfig } = await supabase
      .from("whatsapp_config")
      .select("is_active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (centralConfig && !centralConfig.is_active) {
      return null; // All disabled
    }
  }

  const activeConfig = franchiseConfig?.is_active ? franchiseConfig : null;

  // 3. Central config / env fallback
  if (!activeConfig) {
    const { data: centralConfig } = await supabase
      .from("whatsapp_config")
      .select("instance_id, token, security_token, is_active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!centralConfig?.is_active) return null;

    const instanceId = centralConfig.instance_id || Deno.env.get("ZAPI_INSTANCE_ID");
    const zapiToken = centralConfig.token || Deno.env.get("ZAPI_TOKEN");
    const securityToken = centralConfig.security_token || Deno.env.get("ZAPI_SECURITY_TOKEN");

    if (!instanceId || !zapiToken) return null;
    return { instanceId, zapiToken, securityToken: securityToken || null };
  }

  const instanceId = activeConfig.instance_id || Deno.env.get("ZAPI_INSTANCE_ID");
  const zapiToken = activeConfig.token || Deno.env.get("ZAPI_TOKEN");
  const securityToken = activeConfig.security_token || Deno.env.get("ZAPI_SECURITY_TOKEN");

  if (!instanceId || !zapiToken) return null;
  return { instanceId, zapiToken, securityToken: securityToken || null };
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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

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

    // Resolve credentials using multi-instance logic
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const credentials = await resolveZapiCredentials(serviceClient, franchise_id);

    if (!credentials) {
      return new Response(
        JSON.stringify({ error: "Z-API não configurada ou desativada. Verifique as credenciais." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { instanceId, zapiToken, securityToken } = credentials;

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
