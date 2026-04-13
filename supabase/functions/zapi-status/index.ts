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

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin_fabrica", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get central whatsapp_config (first active or first record)
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

    const url = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}/status`;
    const headers: Record<string, string> = {};
    if (config.security_token) {
      headers["Client-Token"] = config.security_token;
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
