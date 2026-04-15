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
 * Resolve Z-API credentials with robust fallback:
 * Use franchise own instance ONLY if all 3 conditions are true:
 * 1. whatsapp_plan_active === true
 * 2. whatsapp_mode === 'own'
 * 3. zapi_instance_active === true
 * Otherwise, always fall back to platform env credentials.
 */
async function resolveZapiCredentials(
  supabase: ReturnType<typeof createClient>,
  franchiseId: string
): Promise<{ instanceId: string; zapiToken: string; securityToken: string | null } | null> {
  const { data: franchise } = await supabase
    .from("franchises")
    .select("whatsapp_mode, zapi_instance_id, zapi_token, zapi_instance_active, whatsapp_plan_active")
    .eq("id", franchiseId)
    .maybeSingle();

  const useOwnInstance =
    franchise?.whatsapp_plan_active === true &&
    franchise?.whatsapp_mode === "own" &&
    franchise?.zapi_instance_active === true;

  const instanceId = useOwnInstance
    ? franchise!.zapi_instance_id
    : Deno.env.get("ZAPI_INSTANCE_ID");
  const zapiToken = useOwnInstance
    ? franchise!.zapi_token
    : Deno.env.get("ZAPI_TOKEN");
  const securityToken = useOwnInstance
    ? null
    : Deno.env.get("ZAPI_SECURITY_TOKEN") || null;

  if (!instanceId || !zapiToken) return null;

  return { instanceId, zapiToken, securityToken };
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

    // Log usage event (async, non-blocking)
    if (success) {
      serviceClient.from("usage_logs").insert({
        franchise_id,
        event_type: "whatsapp_message_sent",
        metadata: { lead_id: lead_id || null, proposal_id: proposal_id || null, template_key: template_key || null },
      }).then(() => {}).catch(() => {});
    }

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
