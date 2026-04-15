import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function for franchise WhatsApp instance management (Partner model).
 * Franchisees never see credentials — they only trigger actions by franchiseId.
 * Credentials are read server-side from the franchises table.
 */
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

    // Check role
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

    const body = await req.json();
    const { action, franchiseId } = body;

    if (!franchiseId) {
      return new Response(JSON.stringify({ error: "franchiseId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For franchise users, verify they belong to this franchise
    if (roleData.role === "franquia") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("franquia_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.franquia_id !== franchiseId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Load credentials from franchises table (never exposed to frontend)
    const { data: franchise } = await supabase
      .from("franchises")
      .select("zapi_instance_id, zapi_token, zapi_client_token, whatsapp_plan_active, zapi_instance_active")
      .eq("id", franchiseId)
      .maybeSingle();

    if (!franchise) {
      return new Response(JSON.stringify({ error: "Franchise not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!franchise.whatsapp_plan_active) {
      return new Response(
        JSON.stringify({ error: "WhatsApp plan is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceId = franchise.zapi_instance_id;
    const zapiToken = franchise.zapi_token;
    const securityToken = franchise.zapi_client_token;

    if (!instanceId || !zapiToken) {
      return new Response(
        JSON.stringify({ connected: false, message: "Credenciais ainda não configuradas pelo administrador." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiHeaders: Record<string, string> = {};
    if (securityToken) {
      apiHeaders["Client-Token"] = securityToken;
    }

    // Action: disconnect
    if (action === "disconnect") {
      const url = `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/disconnect`;
      await fetch(url, { method: "POST", headers: apiHeaders });

      await supabase
        .from("franchises")
        .update({ zapi_instance_active: false })
        .eq("id", franchiseId);

      console.log(`[zapi-instance] Disconnected franchise ${franchiseId}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: qr_code
    if (action === "qr_code") {
      const qrUrl = `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/qr-code/image`;
      const qrResp = await fetch(qrUrl, { headers: apiHeaders });
      const qrData = await qrResp.json();

      console.log(`[zapi-instance] QR code requested for franchise ${franchiseId}`);
      return new Response(
        JSON.stringify(qrData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default action: status
    const url = `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/status`;
    const resp = await fetch(url, { headers: apiHeaders });
    const data = await resp.json();

    const connected = data?.connected === true || data?.status === "CONNECTED";
    const phone = data?.phone || data?.smartPhone || null;

    // Auto-update franchise status based on Z-API response
    if (connected && !franchise.zapi_instance_active) {
      await supabase
        .from("franchises")
        .update({
          zapi_instance_active: true,
          whatsapp_mode: "own",
          zapi_phone_number: phone || null,
        })
        .eq("id", franchiseId);
    }

    return new Response(
      JSON.stringify({ connected, phone }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[zapi-instance] error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
