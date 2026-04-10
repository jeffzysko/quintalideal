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

/** Normalize city name: lowercase, remove accents, trim, collapse spaces */
function normalizeCityName(city: string): string {
  const accents = "ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ";
  const plain  = "AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn";
  let result = city;
  for (let i = 0; i < accents.length; i++) {
    result = result.replaceAll(accents[i], plain[i]);
  }
  return result.toLowerCase().replace(/\s+/g, " ").trim();
}

interface TerritoryResult {
  assignedFranchiseId: string;
  territoryMatchStatus: string;
  coverageMatchCount: number;
  distributionRuleUsed: string;
}

async function resolveTerritory(
  supabase: ReturnType<typeof createClient>,
  cityNormalized: string,
  originFranchiseId: string | null,
): Promise<TerritoryResult> {
  // Default: keep with origin
  const fallback: TerritoryResult = {
    assignedFranchiseId: originFranchiseId || "",
    territoryMatchStatus: "no_city_match_found",
    coverageMatchCount: 0,
    distributionRuleUsed: "no_match_kept_origin",
  };

  if (!cityNormalized) return fallback;

  const { data: matches } = await supabase
    .from("franchise_covered_cities")
    .select("franchise_id, is_primary_city")
    .eq("city_name_normalized", cityNormalized);

  if (!matches || matches.length === 0) return fallback;

  const count = matches.length;

  if (count === 1) {
    return {
      assignedFranchiseId: matches[0].franchise_id,
      territoryMatchStatus: "matched_unique_franchise",
      coverageMatchCount: 1,
      distributionRuleUsed: "unique_match",
    };
  }

  // Multiple matches — Option C: prefer origin franchise if eligible
  if (originFranchiseId) {
    const originMatch = matches.find((m) => m.franchise_id === originFranchiseId);
    if (originMatch) {
      return {
        assignedFranchiseId: originFranchiseId,
        territoryMatchStatus: "matched_multiple_franchises",
        coverageMatchCount: count,
        distributionRuleUsed: "origin_franchise_eligible",
      };
    }
  }

  // Origin not eligible — round-robin by least leads assigned for this city
  const franchiseIds = matches.map((m) => m.franchise_id);
  const assigned = await roundRobinByLeastLeads(supabase, cityNormalized, franchiseIds);

  return {
    assignedFranchiseId: assigned,
    territoryMatchStatus: "matched_multiple_franchises",
    coverageMatchCount: count,
    distributionRuleUsed: "round_robin_least_leads",
  };
}

/** Pick the franchise with the fewest leads for this city (self-balancing round-robin). */
async function roundRobinByLeastLeads(
  supabase: ReturnType<typeof createClient>,
  cityNormalized: string,
  franchiseIds: string[],
): Promise<string> {
  // Single query: fetch all matching leads for this city across all eligible franchises
  const { data } = await supabase
    .from("leads")
    .select("franquia_id")
    .in("franquia_id", franchiseIds)
    .eq("lead_city_normalized", cityNormalized);

  // Count per franchise from the result
  const countMap: Record<string, number> = {};
  for (const fid of franchiseIds) countMap[fid] = 0;
  for (const row of data ?? []) {
    if (row.franquia_id) countMap[row.franquia_id] = (countMap[row.franquia_id] ?? 0) + 1;
  }

  // Pick franchise with fewest leads
  return franchiseIds.reduce((min, fid) => countMap[fid] < countMap[min] ? fid : min, franchiseIds[0]);
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
    const utmSource = typeof payload.utm_source === "string" ? payload.utm_source.trim().slice(0, 120) : null;
    const utmMedium = typeof payload.utm_medium === "string" ? payload.utm_medium.trim().slice(0, 120) : null;
    const utmCampaign = typeof payload.utm_campaign === "string" ? payload.utm_campaign.trim().slice(0, 120) : null;
    const pontuacaoQuintal = Number.isFinite(payload.pontuacao_quintal)
      ? Number(payload.pontuacao_quintal)
      : null;

    const originFranchiseId =
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

    // Territory distribution logic
    const cityNormalized = cidade ? normalizeCityName(cidade) : null;

    // Test franchise: always keep leads with origin, skip territory distribution
    const TEST_FRANCHISE_ID = "025e4b4e-b895-4c8f-9db5-caec623bd351";
    const isTestFranchise = originFranchiseId === TEST_FRANCHISE_ID;

    const territory = isTestFranchise
      ? {
          assignedFranchiseId: TEST_FRANCHISE_ID,
          territoryMatchStatus: "matched_unique_franchise" as const,
          coverageMatchCount: 1,
          distributionRuleUsed: "test_franchise_locked",
        }
      : await resolveTerritory(supabase, cityNormalized || "", originFranchiseId);

    // assigned franchise = territory result, fallback to origin
    const assignedFranchiseId = territory.assignedFranchiseId || originFranchiseId;

    let lastError: { code?: string; message?: string } | null = null;
    let insertedRefCode = "";
    let insertedLeadId = "";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const refCode = generateRefCode();

      const { data: insertedLead, error } = await supabase.from("leads").insert({
        nome,
        telefone,
        email,
        cidade,
        franquia_id: assignedFranchiseId,
        origin_franchise_id: originFranchiseId,
        lead_city_normalized: cityNormalized,
        territory_match_status: territory.territoryMatchStatus,
        coverage_match_count: territory.coverageMatchCount,
        distribution_rule_used: territory.distributionRuleUsed,
        pontuacao_quintal: pontuacaoQuintal,
        modelo_recomendado: modeloRecomendado,
        respostas_questionario: respostasQuestionario,
        foto1: typeof payload.foto1 === "string" ? payload.foto1 : null,
        foto2: typeof payload.foto2 === "string" ? payload.foto2 : null,
        foto3: typeof payload.foto3 === "string" ? payload.foto3 : null,
        foto4: typeof payload.foto4 === "string" ? payload.foto4 : null,
        referred_by: referredBy,
        ref_code: refCode,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      }).select('id').single();

      if (!error && insertedLead) {
        insertedRefCode = refCode;
        insertedLeadId = insertedLead.id;
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

    // Fetch the assigned franchise info for the response
    let assignedWhatsapp: string | null = null;
    let assignedFranchiseName: string | null = null;
    let assignedCidadeBase: string | null = null;

    if (assignedFranchiseId) {
      const { data: franchise } = await supabase
        .from("franchises")
        .select("whatsapp, nome_franquia, cidade_base")
        .eq("id", assignedFranchiseId)
        .maybeSingle();

      if (franchise) {
        assignedWhatsapp = franchise.whatsapp;
        assignedFranchiseName = franchise.nome_franquia;
        assignedCidadeBase = franchise.cidade_base;
      }
    }

    // Create notification for assigned franchise
    if (assignedFranchiseId) {
      supabase.from("notifications").insert({
        franchise_id: assignedFranchiseId,
        title: "Novo lead recebido",
        message: `${nome}${cidade ? ` de ${cidade}` : ""} — ${modeloRecomendado || "Sem modelo"}`,
        type: "new_lead",
        metadata: { lead_id: insertedLeadId, lead_name: nome, city: cidade, model: modeloRecomendado },
      }).then(({ error: notifError }) => {
        if (notifError) console.error("Notification insert error:", notifError);
      });

      // Fire webhook for assigned franchise
      fireWebhook(supabase, assignedFranchiseId, {
        nome, telefone, email, cidade, pontuacaoQuintal, modeloRecomendado,
      }).catch((err) => console.error("Webhook error:", err));
    }

    return new Response(JSON.stringify({
      success: true,
      refCode: insertedRefCode,
      assignedFranchiseId,
      assignedWhatsapp,
      assignedFranchiseName,
      assignedCidadeBase,
      territoryMatchStatus: territory.territoryMatchStatus,
    }), {
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

  const MAX_ATTEMPTS = 3;
  const BACKOFF_MS = [0, 2000, 5000];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
    }

    let httpStatus: number | null = null;
    let responseText = "";
    let success = false;
    let errorMessage: string | null = null;

    try {
      const res = await fetch(franchise.webhook_url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      httpStatus = res.status;
      responseText = await res.text().catch(() => "");
      success = res.ok;

      if (!res.ok) {
        errorMessage = `HTTP ${res.status}`;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Network error";
    }

    // Log this attempt
    supabase.from("webhook_logs").insert({
      franchise_id: franquiaId,
      event_type: "novo_lead",
      url: franchise.webhook_url,
      http_status: httpStatus,
      success,
      attempt,
      error_message: errorMessage,
      response_body: responseText ? responseText.substring(0, 500) : null,
    }).then(({ error: logErr }) => {
      if (logErr) console.error("Webhook log insert error:", logErr);
    });

    if (success) {
      console.log("Webhook sent successfully to:", franchise.webhook_url);
      return;
    }

    console.error(`Webhook attempt ${attempt}/${MAX_ATTEMPTS} failed:`, errorMessage);

    // Don't retry on 4xx client errors (except 408 timeout / 429 rate limit)
    if (httpStatus && httpStatus >= 400 && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 429) {
      console.log("Client error, skipping retries");
      return;
    }
  }

  console.error(`Webhook failed after ${MAX_ATTEMPTS} attempts to:`, franchise.webhook_url);

  // Send failure alert email to franchise
  await sendWebhookFailureAlert(supabase, franquiaId, franchise.webhook_url, lead.nome).catch(
    (err) => console.error("Webhook failure alert email error:", err)
  );
}

async function sendWebhookFailureAlert(
  supabase: ReturnType<typeof createClient>,
  franchiseId: string,
  webhookUrl: string,
  leadName: string,
) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return;

  const { data: franchise } = await supabase
    .from("franchises")
    .select("email, nome_franquia")
    .eq("id", franchiseId)
    .maybeSingle();

  if (!franchise?.email) return;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px;text-align:center;">
          <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="font-size:24px;">⚠️</span>
          </div>
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Falha na Entrega do Webhook</h1>
          <p style="color:#fecaca;margin:8px 0 0;font-size:13px;">${franchise.nome_franquia}</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;font-size:14px;color:#1e293b;line-height:1.6;">
            O sistema tentou enviar os dados do lead <strong>${leadName}</strong> para o seu CRM via webhook, mas <strong>todas as 3 tentativas falharam</strong>.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fee2e2;border-radius:10px;overflow:hidden;background:#fef2f2;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 6px;font-size:12px;color:#991b1b;text-transform:uppercase;letter-spacing:1px;font-weight:700;">URL configurada</p>
              <p style="margin:0;font-size:13px;color:#7f1d1d;font-family:monospace;word-break:break-all;">${webhookUrl}</p>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
            <strong>O lead foi salvo normalmente</strong> no painel do Quintal Ideal. Verifique se a URL do webhook está correta e se o servidor do seu CRM está acessível.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 28px;text-align:center;">
          <a href="https://quintalideal.com.br/perfil#integracoes" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:700;font-size:14px;">
            Verificar configurações →
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">
            Quintal Ideal Splash • Alerta automático<br/>
            <a href="https://quintalideal.com.br" style="color:#0369a1;text-decoration:none;">quintalideal.com.br</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Quintal Ideal Splash <noreply@hallow.com.br>",
      to: [franchise.email],
      subject: `⚠️ Falha no Webhook — Lead ${leadName} não foi entregue ao CRM`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Failed to send webhook failure alert: ${res.status} ${text}`);
  } else {
    console.log("Webhook failure alert sent to:", franchise.email);
  }
}
