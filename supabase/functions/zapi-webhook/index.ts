// =============================================================================
// zapi-webhook: Recebe notificações automáticas da Z-API sobre mudanças de status
// de instâncias WhatsApp (conectado, desconectado, etc.).
//
// CONFIGURAÇÃO MANUAL NECESSÁRIA:
// A URL desta function deve ser cadastrada no painel da Z-API para cada instância:
//   https://bbfkorzehzoaogrnuyqp.supabase.co/functions/v1/zapi-webhook
//
// A Z-API envia webhooks sem token Bearer, então esta function não exige autenticação.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logError } from "../_shared/error-monitor.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let payload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Z-API pode enviar o instanceId no nível raiz ou dentro de nested objects
    const instanceId = payload?.instanceId || payload?.instance?.instanceId;
    // Estado pode vir como "state" ou inferido pelo tipo de evento
    let state = payload?.state || payload?.status;

    // Inferir estado a partir do tipo de evento Z-API
    if (!state) {
      if (payload?.event === "on-webhook-connected" || payload?.connected === true) {
        state = "CONNECTED";
      } else if (payload?.event === "on-webhook-disconnected" || payload?.connected === false) {
        state = "DISCONNECTED";
      }
    }

    console.log("zapi-webhook received:", { instanceId, state, event: payload?.event });

    if (!instanceId || !state) {
      return new Response(
        JSON.stringify({ error: "Missing instanceId or state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar franquia pelo instanceId
    const { data: franchise, error: fetchError } = await adminClient
      .from("franchises")
      .select("id, whatsapp_mode, zapi_instance_active")
      .eq("zapi_instance_id", instanceId)
      .maybeSingle();

    if (fetchError || !franchise) {
      console.error(`Franchise not found for instanceId: ${instanceId}`, fetchError);
      // Retornar 200 mesmo assim para não causar retries na Z-API
      return new Response(
        JSON.stringify({ received: true, matched: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isConnected = state === "CONNECTED";

    const updateData: Record<string, unknown> = {
      zapi_instance_active: isConnected,
    };

    // Se desconectou, manter whatsapp_mode = 'own' mas desativar a instância
    if (!isConnected && franchise.whatsapp_mode === "own") {
      console.log(`Instance ${instanceId} disconnected. Keeping mode 'own', marking inactive.`);
    }

    // Se conectou, garantir que o modo está como 'own'
    if (isConnected && franchise.whatsapp_mode === "own") {
      console.log(`Instance ${instanceId} connected.`);
    }

    const { error: updateError } = await adminClient
      .from("franchises")
      .update(updateData)
      .eq("id", franchise.id);

    if (updateError) {
      console.error(`Failed to update franchise ${franchise.id}:`, updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ received: true, matched: true, connected: isConnected }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[zapi-webhook] error:", err);
    await logError({
      supabaseUrl: Deno.env.get('SUPABASE_URL')!,
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      functionName: 'zapi-webhook',
      message: 'Erro interno não tratado',
      error: err,
      severity: 'critical',
      alertAdmin: true,
    });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
