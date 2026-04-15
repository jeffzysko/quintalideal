const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload?.record;

    if (!record) {
      console.warn("[notify-new-application] No record in payload");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminPhone = Deno.env.get("ADMIN_WHATSAPP_NUMBER");
    const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
    const zapiToken = Deno.env.get("ZAPI_TOKEN");
    const securityToken = Deno.env.get("ZAPI_SECURITY_TOKEN") || null;
    const platformUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "")
      ? "https://quintalideal.lovable.app"
      : "https://quintalideal.lovable.app";

    if (!adminPhone || !instanceId || !zapiToken) {
      console.error("[notify-new-application] Missing env vars:", {
        adminPhone: !!adminPhone,
        instanceId: !!instanceId,
        zapiToken: !!zapiToken,
      });
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = `🆕 *Nova candidatura de franquia!*

📋 *Franquia:* ${record.nome_franquia || "N/A"}
📍 *Cidade:* ${record.cidade_base || "N/A"}
👤 *Responsável:* ${record.nome_responsavel || "N/A"}
📱 *WhatsApp:* ${record.whatsapp_responsavel || "N/A"}
✉️ *E-mail:* ${record.email || "N/A"}

Acesse o painel para aprovar ou rejeitar:
${platformUrl}/admin?tab=candidaturas`;

    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (securityToken) headers["Client-Token"] = securityToken;

    const resp = await fetch(zapiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: adminPhone, message }),
    });

    const result = await resp.json();
    console.log("[notify-new-application] Z-API response:", resp.status, JSON.stringify(result));

    return new Response(JSON.stringify({ ok: true, sent: resp.ok }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-new-application] Error:", err);
    return new Response(JSON.stringify({ ok: true, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
