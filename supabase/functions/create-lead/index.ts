import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sanitizeName(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/[<>'"&]/g, "").trim().slice(0, 100);
}

function normalizePhone(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(/\D/g, "").slice(0, 15);
}

function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().slice(0, 255);
  return value.length > 0 ? value : null;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generateRefCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const nome = sanitizeName(payload.nome);
    const telefone = normalizePhone(payload.telefone);
    const email = normalizeEmail(payload.email);
    const cidade = typeof payload.cidade === "string" ? payload.cidade.trim().slice(0, 120) : null;
    const modeloRecomendado =
      typeof payload.modelo_recomendado === "string" ? payload.modelo_recomendado.trim().slice(0, 120) : null;
    const referredBy = typeof payload.referred_by === "string" ? payload.referred_by.trim().slice(0, 120) : null;
    const pontuacaoQuintal = Number.isFinite(payload.pontuacao_quintal)
      ? Number(payload.pontuacao_quintal)
      : null;

    const franquiaId =
      typeof payload.franquia_id === "string" && isValidUuid(payload.franquia_id)
        ? payload.franquia_id
        : null;

    const respostasQuestionario =
      payload.respostas_questionario && typeof payload.respostas_questionario === "object"
        ? payload.respostas_questionario
        : null;

    if (!nome || nome.length < 2) {
      return new Response(JSON.stringify({ error: "Nome inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (telefone.length < 10 || telefone.length > 11) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const refCode = generateRefCode();

      const { error } = await supabase.from("leads").insert({
        nome,
        telefone,
        email,
        cidade,
        franquia_id: franquiaId,
        pontuacao_quintal: pontuacaoQuintal,
        modelo_recomendado: modeloRecomendado,
        respostas_questionario: respostasQuestionario,
        foto1: typeof payload.foto1 === "string" ? payload.foto1 : null,
        foto2: typeof payload.foto2 === "string" ? payload.foto2 : null,
        foto3: typeof payload.foto3 === "string" ? payload.foto3 : null,
        foto4: typeof payload.foto4 === "string" ? payload.foto4 : null,
        referred_by: referredBy,
        ref_code: refCode,
      });

      if (!error) {
        return new Response(JSON.stringify({ success: true, refCode }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      lastError = error;
      if (error.code !== "23505") {
        break;
      }
    }

    throw new Error(lastError?.message || "Falha ao salvar lead");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-lead:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
