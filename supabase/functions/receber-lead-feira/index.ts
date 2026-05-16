import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Segredo de integração ────────────────────────────────────────────────────
const INTEGRATION_SECRET = Deno.env.get("LEADS_FEIRA_SECRET") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-integration-secret",
};

// ─── Normalização de cidade ──────────────────────────────────────────────────
function normalizeCityName(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

// ─── Territory matching ───────────────────────────────────────────────────────
type MatchStatus =
  | "matched_unique_franchise"
  | "matched_multiple_franchises"
  | "kept_with_origin_franchise"
  | "no_city_match_found"
  | "distributed_to_all_organizers";

/**
 * Retorna a lista de franquias que devem receber o lead.
 *
 * Prioridade:
 *  1. City match único → só essa franquia
 *  2. City match múltiplo → prefere franquias organizadoras; se empate, usa a primeira organizadora
 *  3. Sem city match + 1 organizadora → essa organizadora
 *  4. Sem city match + múltiplas organizadoras → TODAS (cada uma recebe o lead)
 *  5. Sem city match + sem organizadora → lista vazia (lead sem franquia)
 */
async function resolveTerritory(
  supabase: ReturnType<typeof createClient>,
  cidade: string | null,
  originFranquiaIds: string[],
): Promise<{
  franquiaIds: string[];
  matchStatus: MatchStatus;
  matchCount: number;
}> {
  // ── Sem cidade → fallback para organizadoras ──
  if (!cidade) {
    return buildFallback(originFranquiaIds, 0);
  }

  const cityNorm = normalizeCityName(cidade);
  const { data: matches, error } = await supabase
    .from("franchise_covered_cities")
    .select("franchise_id")
    .eq("city_name_normalized", cityNorm);

  if (error || !matches) {
    console.warn("territory lookup error:", error?.message);
    return buildFallback(originFranquiaIds, 0);
  }

  const matchCount = matches.length;
  const matchIds = matches.map((m) => m.franchise_id);

  // ── Match único → direto ──
  if (matchCount === 1) {
    return {
      franquiaIds: [matchIds[0]],
      matchStatus: "matched_unique_franchise",
      matchCount: 1,
    };
  }

  // ── Múltiplos matches → preferir organizadoras ──
  if (matchCount > 1) {
    const organizingInMatches = originFranquiaIds.filter((id) => matchIds.includes(id));

    if (organizingInMatches.length >= 1) {
      // Usa a primeira organizadora que também cobre a cidade
      return {
        franquiaIds: [organizingInMatches[0]],
        matchStatus: "kept_with_origin_franchise",
        matchCount,
      };
    }

    // Nenhuma organizadora está nos matches → usa o primeiro match
    return {
      franquiaIds: [matchIds[0]],
      matchStatus: "matched_multiple_franchises",
      matchCount,
    };
  }

  // ── Nenhuma cidade encontrada → fallback ──
  return buildFallback(originFranquiaIds, 0);
}

function buildFallback(
  originFranquiaIds: string[],
  matchCount: number,
): { franquiaIds: string[]; matchStatus: MatchStatus; matchCount: number } {
  if (originFranquiaIds.length === 0) {
    return { franquiaIds: [], matchStatus: "no_city_match_found", matchCount };
  }
  if (originFranquiaIds.length === 1) {
    return {
      franquiaIds: [originFranquiaIds[0]],
      matchStatus: "no_city_match_found",
      matchCount,
    };
  }
  // Múltiplas organizadoras → todas recebem
  return {
    franquiaIds: originFranquiaIds,
    matchStatus: "distributed_to_all_organizers",
    matchCount,
  };
}

// ─── Inserção de um lead para uma franquia específica ────────────────────────
async function insertLead(
  supabase: ReturnType<typeof createClient>,
  {
    lead_id,
    franquiaId,
    originFranquiaIds,
    matchStatus,
    matchCount,
    nome,
    whatsapp,
    email,
    cidade,
    respostas,
    score,
    refCodeSuffix,
  }: {
    lead_id: string | null | undefined;
    franquiaId: string | null;
    originFranquiaIds: string[];
    matchStatus: MatchStatus;
    matchCount: number;
    nome: string;
    whatsapp: string;
    email: string | null;
    cidade: string | null;
    respostas: Record<string, unknown>;
    score: number | null;
    refCodeSuffix: string;
  },
) {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      nome:                    nome.trim(),
      telefone:                whatsapp,
      email:                   email ?? null,
      cidade:                  cidade ?? null,
      franquia_id:             franquiaId ?? null,
      origin_franchise_id:     originFranquiaIds[0] ?? null,
      lead_city_normalized:    cidade ? normalizeCityName(cidade) : null,
      territory_match_status:  matchStatus as string,
      coverage_match_count:    matchCount,
      distribution_rule_used:  "feira_integration",
      pontuacao_quintal:       typeof score === "number" ? score : null,
      respostas_questionario:  respostas,
      status_lead:             "novo",
      ref_code:                lead_id ? `feira_${lead_id}${refCodeSuffix}` : undefined,
    })
    .select("id")
    .single();

  return { data, error };
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
    origin_franquia_ids,  // agora é array
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
  } = body as Record<string, unknown>;

  if (!nome || !whatsapp) {
    return new Response(
      JSON.stringify({ error: "MISSING_FIELDS", message: "nome e whatsapp são obrigatórios" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Normalizar origin_franquia_ids para sempre ser array de strings
  const originFranquiaIds: string[] = Array.isArray(origin_franquia_ids)
    ? (origin_franquia_ids as string[]).filter(Boolean)
    : typeof origin_franquia_ids === "string" && origin_franquia_ids
    ? [origin_franquia_ids]
    : [];

  // ── Dedup: verificar se lead_id já foi recebido para qualquer franquia ──────
  if (lead_id) {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .like("ref_code", `feira_${lead_id}%`);

    if ((count ?? 0) > 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_received" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ── Territory matching ──────────────────────────────────────────────────────
  const { franquiaIds, matchStatus, matchCount } = await resolveTerritory(
    supabase,
    cidade as string | null,
    originFranquiaIds,
  );

  // ── Respostas do questionário ───────────────────────────────────────────────
  const respostas = {
    origem:          "feira",
    feira_nome:      feira_nome      ?? null,
    feira_slug:      feira_slug      ?? null,
    tamanho_quintal: tamanho_quintal ?? null,
    prazo_compra:    prazo_compra    ?? null,
    orcamento:       orcamento       ?? null,
    temperatura:     temperatura     ?? null,
    evento:          evento          ?? null,
    utm_source:      utm_source      ?? null,
    utm_medium:      utm_medium      ?? null,
    utm_campaign:    utm_campaign    ?? null,
    estado:          estado          ?? null,
    ip:              ip              ?? null,
    score_feira:     score           ?? null,
    origin_franquia_ids: originFranquiaIds,
  };

  // ── Inserção: uma entrada por franquia destino ──────────────────────────────
  // Se franquiaIds estiver vazio, insere um lead sem franquia
  const targets = franquiaIds.length > 0 ? franquiaIds : [null];
  const isMulti = targets.length > 1;
  const insertedIds: string[] = [];

  for (const franquiaId of targets) {
    // Sufixo no ref_code para distinguir duplicatas em cenário multi-franquia
    const refCodeSuffix = isMulti && franquiaId ? `_${franquiaId}` : "";

    const { data, error } = await insertLead(supabase, {
      lead_id: lead_id as string | null | undefined,
      franquiaId,
      originFranquiaIds,
      matchStatus,
      matchCount,
      nome:     nome as string,
      whatsapp: whatsapp as string,
      email:    (email as string | null) ?? null,
      cidade:   (cidade as string | null) ?? null,
      respostas,
      score:    typeof score === "number" ? score : null,
      refCodeSuffix,
    });

    if (error) {
      console.error("receber-lead-feira: insert error", error, { franquiaId });
      // Continua tentando as demais franquias
      continue;
    }

    insertedIds.push(data.id);
    console.log("receber-lead-feira: lead inserido", {
      id:         data.id,
      lead_id,
      feira:      feira_nome,
      cidade,
      franquia:   franquiaId,
      territory:  matchStatus,
    });
  }

  if (insertedIds.length === 0) {
    return new Response(
      JSON.stringify({ error: "INSERT_FAILED", message: "Não foi possível inserir o lead." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success:    true,
      ids:        insertedIds,
      count:      insertedIds.length,
      territory:  matchStatus,
      franquias:  franquiaIds,
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  );
});
