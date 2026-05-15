import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Segredo de integração ────────────────────────────────────────────────────
// Configure como secret no Supabase do quintalideal:
//   supabase secrets set LEADS_FEIRA_SECRET=<valor>
const INTEGRATION_SECRET = Deno.env.get("LEADS_FEIRA_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-integration-secret",
};

// ─── Normalização de cidade (igual à função do banco) ────────────────────────
function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // remove acentos
    .replace(/\s+/g, " ");
}

// ─── Territory matching ───────────────────────────────────────────────────────
type MatchStatus =
  | "matched_unique_franchise"
  | "matched_multiple_franchises"
  | "kept_with_origin_franchise"
  | "no_city_match_found";

async function resolveTerritory(
  supabase: ReturnType<typeof createClient>,
  cidade: string | null,
  originFranquiaId: string | null,
): Promise<{
  franquiaId: string | null;
  matchStatus: MatchStatus;
  matchCount: number;
}> {
  if (!cidade) {
    return {
      franquiaId: originFranquiaId,
      matchStatus: "no_city_match_found",
      matchCount: 0,
    };
  }

  const cityNorm = normalizeCityName(cidade);

  const { data: matches, error } = await supabase
    .from("franchise_covered_cities")
    .select("franchise_id")
    .eq("city_name_normalized", cityNorm);

  if (error || !matches) {
    console.warn("territory lookup error:", error?.message);
    return {
      franquiaId: originFranquiaId,
      matchStatus: "no_city_match_found",
      matchCount: 0,
    };
  }

  const matchCount = matches.length;

  if (matchCount === 1) {
    return {
      franquiaId: matches[0].franchise_id,
      matchStatus: "matched_unique_franchise",
      matchCount: 1,
    };
  }

  if (matchCount > 1) {
    // Se a franquia de origem está entre as que cobrem a cidade → mantém com ela
    const originInMatches = originFranquiaId
      ? matches.some((m) => m.franchise_id === originFranquiaId)
      : false;

    if (originInMatches) {
      return {
        franquiaId: originFranquiaId,
        matchStatus: "kept_with_origin_franchise",
        matchCount,
      };
    }

    // Senão, usa a primeira (admin pode redistribuir manualmente depois)
    return {
      franquiaId: matches[0].franchise_id,
      matchStatus: "matched_multiple_franchises",
      matchCount,
    };
  }

  // Nenhuma cidade encontrada → usa a franquia de origem da feira
  return {
    franquiaId: originFranquiaId,
    matchStatus: "no_city_match_found",
    matchCount: 0,
  };
}

// ─── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validar segredo de integração
  const secret = req.headers.get("x-integration-secret");
  if (!INTEGRATION_SECRET || secret !== INTEGRATION_SECRET) {
    console.warn("receber-lead-feira: unauthorized", {
      ip: req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip"),
    });
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Ler body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    lead_id,
    feira_nome,
    feira_slug,
    origin_franquia_id,
    nome,
    whatsapp,
    email,
    cidade,
    estado,
    tamanho_quintal,
    prazo_compra,
    orcamento,
    score,
    temperatura,
    evento,
    utm_source,
    utm_medium,
    utm_campaign,
    ip,
  } = body as Record<string, string | number | null | undefined>;

  if (!nome || !whatsapp) {
    return new Response(
      JSON.stringify({ error: "MISSING_FIELDS", message: "nome e whatsapp são obrigatórios" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Evitar duplicatas: mesmo lead_id já recebido
  if (lead_id) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("ref_code", `feira_${lead_id}`);

    if ((count ?? 0) > 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_received" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ── Territory matching ──────────────────────────────────────────────────────
  const { franquiaId, matchStatus, matchCount } = await resolveTerritory(
    supabase,
    cidade as string | null,
    origin_franquia_id as string | null,
  );

  // ── Montar respostas_questionario com dados da feira ────────────────────────
  const respostas = {
    origem: "feira",
    feira_nome: feira_nome ?? null,
    feira_slug: feira_slug ?? null,
    tamanho_quintal: tamanho_quintal ?? null,
    prazo_compra: prazo_compra ?? null,
    orcamento: orcamento ?? null,
    temperatura: temperatura ?? null,
    evento: evento ?? null,
    utm_source: utm_source ?? null,
    utm_medium: utm_medium ?? null,
    utm_campaign: utm_campaign ?? null,
    estado: estado ?? null,
    ip: ip ?? null,
    score_feira: score ?? null,
  };

  // ── Inserir na tabela leads principal ───────────────────────────────────────
  const { data, error } = await supabase.from("leads").insert({
    nome:                  (nome as string).trim(),
    telefone:              whatsapp as string,          // campo no quintalideal é "telefone"
    email:                 (email as string | null) ?? null,
    cidade:                (cidade as string | null) ?? null,
    franquia_id:           franquiaId ?? null,
    origin_franchise_id:   (origin_franquia_id as string | null) ?? null,
    lead_city_normalized:  cidade ? normalizeCityName(cidade as string) : null,
    territory_match_status: matchStatus as string,
    coverage_match_count:  matchCount,
    distribution_rule_used: "feira_integration",
    pontuacao_quintal:     typeof score === "number" ? score : null,
    respostas_questionario: respostas,
    status_lead:           "novo",
    // ref_code especial para dedup (prefixo feira_ + UUID original)
    ref_code:              lead_id ? `feira_${lead_id}` : undefined,
  }).select("id").single();

  if (error) {
    console.error("receber-lead-feira: insert error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("receber-lead-feira: lead inserido", {
    id: data.id,
    lead_id,
    feira: feira_nome,
    cidade,
    franquia: franquiaId,
    territory: matchStatus,
  });

  return new Response(
    JSON.stringify({ success: true, id: data.id, franquia_id: franquiaId, territory: matchStatus }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
});
