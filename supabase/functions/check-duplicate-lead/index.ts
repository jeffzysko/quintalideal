import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, telefone } = await req.json();

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
