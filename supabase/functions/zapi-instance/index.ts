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
 *
 * Actions:
 * - create: Creates a new Z-API instance (admin only, requires ZAPI_PARTNER_TOKEN)
 * - delete: Deletes a Z-API instance (admin only, requires ZAPI_PARTNER_TOKEN)
 * - qr_code: Gets QR code for connecting WhatsApp
 * - disconnect: Disconnects the WhatsApp session
 * - status (default): Checks connection status
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

    const isAdmin = roleData.role === "admin_fabrica" || roleData.role === "super_admin";

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

    // ─── Action: CREATE (admin only, requires Partner Token) ───
    if (action === "create") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const partnerToken = Deno.env.get("ZAPI_PARTNER_TOKEN");
      if (!partnerToken) {
        console.error("[zapi-instance] ZAPI_PARTNER_TOKEN not configured");
        return new Response(
          JSON.stringify({ error: "ZAPI_PARTNER_TOKEN não configurado. Configure o secret e tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const createResp = await fetch("https://api.z-api.io/partner/create-instance", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${partnerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: `quintal-franchise-${franchiseId}` }),
      });

      const createData = await createResp.json();

      if (!createResp.ok || !createData.id) {
        console.error("[zapi-instance] Failed to create instance:", createData);
        return new Response(
          JSON.stringify({ error: "Falha ao criar instância na Z-API", details: createData }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save instance credentials to DB (never exposed to frontend)
      await supabase
        .from("franchises")
        .update({
          zapi_instance_id: createData.id,
          zapi_token: createData.token,
        })
        .eq("id", franchiseId);

      console.log(`[zapi-instance] Created instance for franchise ${franchiseId}: ${createData.id}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: DELETE (admin only, requires Partner Token) ───
    if (action === "delete") {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load current instance ID
      const { data: franchise } = await supabase
        .from("franchises")
        .select("zapi_instance_id")
        .eq("id", franchiseId)
        .maybeSingle();

      if (franchise?.zapi_instance_id) {
        const partnerToken = Deno.env.get("ZAPI_PARTNER_TOKEN");
        if (partnerToken) {
          const delResp = await fetch(
            `https://api.z-api.io/partner/delete-instance/${franchise.zapi_instance_id}`,
            {
              method: "DELETE",
              headers: { "Authorization": `Bearer ${partnerToken}` },
            }
          );
          const delText = await delResp.text();
          console.log(`[zapi-instance] Delete response for ${franchise.zapi_instance_id}:`, delResp.status, delText);
        } else {
          console.warn("[zapi-instance] ZAPI_PARTNER_TOKEN not set, skipping Z-API delete call");
        }
      }

      // Clear credentials from DB
      await supabase
        .from("franchises")
        .update({
          zapi_instance_id: null,
          zapi_token: null,
          zapi_phone_number: null,
          zapi_instance_active: false,
        })
        .eq("id", franchiseId);

      console.log(`[zapi-instance] Deleted instance for franchise ${franchiseId}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Load credentials for remaining actions ───
    const { data: franchise } = await supabase
      .from("franchises")
      .select("zapi_instance_id, zapi_token, whatsapp_plan_active, zapi_instance_active")
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
