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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role: admin OR franchise
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin_fabrica", "super_admin", "franquia"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if custom credentials were sent in the body (for franchise testing their own instance)
    let customInstanceId: string | null = null;
    let customToken: string | null = null;
    let customSecurityToken: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        customInstanceId = body.instance_id || null;
        customToken = body.token || null;
        customSecurityToken = body.security_token || null;
      } catch {
        // No body or invalid JSON — fall through to central config
      }
    }

    let instanceId = customInstanceId;
    let zapiToken = customToken;
    let securityToken = customSecurityToken;

    // If no custom credentials, use central whatsapp_config
    if (!instanceId || !zapiToken) {
      const { data: config } = await supabase
        .from("whatsapp_config")
        .select("instance_id, token, security_token")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!config?.instance_id || !config?.token) {
        return new Response(
          JSON.stringify({ connected: false, message: "Credenciais não configuradas." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      instanceId = config.instance_id;
      zapiToken = config.token;
      securityToken = config.security_token;
    }

    const url = `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/status`;
    const headers: Record<string, string> = {};
    if (securityToken) {
      headers["Client-Token"] = securityToken;
    }

    const resp = await fetch(url, { headers });
    const data = await resp.json();

    const connected = data?.connected === true || data?.status === "CONNECTED";

    return new Response(
      JSON.stringify({ connected, raw: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("zapi-status error:", err);
    return new Response(
      JSON.stringify({ connected: false, message: "Erro ao verificar status." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
