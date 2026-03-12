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

function isValidBRPhone(digits: string): boolean {
  if (digits.length < 10 || digits.length > 11) return false;
  const VALID_DDDS = new Set([
    '11','12','13','14','15','16','17','18','19',
    '21','22','24','27','28',
    '31','32','33','34','35','37','38',
    '41','42','43','44','45','46','47','48','49',
    '51','53','54','55','61','62','63','64','65','66','67','68','69',
    '71','73','74','75','77','79',
    '81','82','83','84','85','86','87','88','89',
    '91','92','93','94','95','96','97','98','99',
  ]);
  return VALID_DDDS.has(digits.slice(0, 2));
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().slice(0, 255);
  return value.length > 0 ? value : null;
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= 255;
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

    if (!isValidBRPhone(telefone)) {
      return new Response(JSON.stringify({ error: "Telefone inválido. Use DDD + número (10 ou 11 dígitos)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (email && !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "E-mail inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let lastError: { code?: string; message?: string } | null = null;
    let insertedRefCode = "";

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
        insertedRefCode = refCode;
        break;
      }

      lastError = error;
      if (error.code !== "23505") {
        break;
      }
    }

    if (!insertedRefCode) {
      throw new Error(lastError?.message || "Falha ao salvar lead");
    }

    // Fire webhook if franchise has one configured
    if (franquiaId) {
      fireWebhook(supabase, franquiaId, {
        nome, telefone, email, cidade, pontuacaoQuintal, modeloRecomendado, referredBy,
      }).catch((err) => console.error("Webhook error:", err));
    }

    return new Response(JSON.stringify({ success: true, refCode: insertedRefCode }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-lead:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fireWebhook(
  supabase: ReturnType<typeof createClient>,
  franquiaId: string,
  lead: {
    nome: string;
    telefone: string;
    email: string | null;
    cidade: string | null;
    pontuacaoQuintal: number | null;
    modeloRecomendado: string | null;
    referredBy: string | null;
  }
) {
  const { data: franchise } = await supabase
    .from("franchises")
    .select("webhook_url, webhook_secret, nome_franquia, slug_url")
    .eq("id", franquiaId)
    .maybeSingle();

  if (!franchise?.webhook_url) return;

  const payload = {
    evento: "novo_lead",
    lead: {
      nome: lead.nome,
      telefone: lead.telefone,
      email: lead.email,
      cidade: lead.cidade,
      pontuacao_quintal: lead.pontuacaoQuintal,
      modelo_recomendado: lead.modeloRecomendado,
      referred_by: lead.referredBy,
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

  // HMAC signature if secret is configured
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
    const hex = Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
    headers["X-Webhook-Signature"] = `sha256=${hex}`;
  }

  const res = await fetch(franchise.webhook_url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    console.error(`Webhook failed [${res.status}]: ${await res.text().catch(() => "")}`);
  } else {
    console.log("Webhook sent successfully to:", franchise.webhook_url);
  }
}
