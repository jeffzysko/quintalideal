import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the user via getClaims
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { franchiseId } = await req.json();
    if (!franchiseId) {
      return new Response(JSON.stringify({ error: "franchiseId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verify user has access to this franchise
    const { data: profile } = await adminClient
      .from("profiles")
      .select("franquia_id")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const isAdmin = roleData?.role === "admin_fabrica" || roleData?.role === "super_admin";
    const isOwnFranchise = profile?.franquia_id === franchiseId;

    if (!isAdmin && !isOwnFranchise) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get franchise webhook config
    const { data: franchise } = await adminClient
      .from("franchises")
      .select("webhook_url, webhook_secret, nome_franquia, slug_url")
      .eq("id", franchiseId)
      .maybeSingle();

    if (!franchise?.webhook_url) {
      return new Response(
        JSON.stringify({ error: "Nenhuma URL de webhook configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build test payload
    const payload = {
      evento: "teste_webhook",
      lead: {
        nome: "Lead de Teste",
        telefone: "51999999999",
        email: "teste@exemplo.com",
        cidade: "Cidade Teste",
        pontuacao_quintal: 75,
        modelo_recomendado: "Cancún",
        referred_by: null,
        created_at: new Date().toISOString(),
      },
      franquia: {
        nome: franchise.nome_franquia,
        slug: franchise.slug_url,
      },
    };

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // HMAC signature
    if (franchise.webhook_secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(franchise.webhook_secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
      const hex = Array.from(new Uint8Array(signature), (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");
      headers["X-Webhook-Signature"] = `sha256=${hex}`;
    }

    const res = await fetch(franchise.webhook_url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await res.text().catch(() => "");

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          status: res.status,
          message: `Webhook retornou erro ${res.status}`,
          response: responseText.substring(0, 500),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: res.status,
        message: "Webhook enviado com sucesso!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ success: false, message: `Falha ao enviar: ${message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
