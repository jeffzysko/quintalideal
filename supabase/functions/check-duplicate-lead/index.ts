import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }
  entry.count++;
  return entry.count > 10;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Muitas requisições. Tente novamente em 1 minuto." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 255) : null;
    const telefone = typeof body.telefone === "string" ? body.telefone.replace(/\D/g, "").slice(0, 15) : null;

    if (!telefone && !email) {
      return new Response(
        JSON.stringify({ error: "telefone or email required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check by phone first (always provided)
    if (telefone) {
      const { data: phoneMatch } = await supabase
        .from("leads")
        .select("id, nome, franquia_id")
        .eq("telefone", telefone)
        .limit(1)
        .maybeSingle();

      if (phoneMatch) {
        let franchiseName = null;
        if (phoneMatch.franquia_id) {
          const { data: franchise } = await supabase
            .from("franchises")
            .select("nome_franquia")
            .eq("id", phoneMatch.franquia_id)
            .single();
          franchiseName = franchise?.nome_franquia || null;
        }
        return new Response(
          JSON.stringify({ duplicate: true, field: "telefone", franchiseName }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check by email
    if (email) {
      const { data: emailMatch } = await supabase
        .from("leads")
        .select("id, nome, franquia_id")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

      if (emailMatch) {
        let franchiseName = null;
        if (emailMatch.franquia_id) {
          const { data: franchise } = await supabase
            .from("franchises")
            .select("nome_franquia")
            .eq("id", emailMatch.franquia_id)
            .single();
          franchiseName = franchise?.nome_franquia || null;
        }
        return new Response(
          JSON.stringify({ duplicate: true, field: "email", franchiseName }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ duplicate: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
