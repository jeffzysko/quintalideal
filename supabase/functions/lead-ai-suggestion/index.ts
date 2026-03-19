import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead, activities_count, last_activity_days, followups_pending } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um consultor estratégico de vendas de alto desempenho, especializado em venda consultiva de piscinas de fibra premium (marca Splash Piscinas).

Seu papel NÃO é sugerir ações genéricas como "faça um follow-up" ou "envie um orçamento". Você deve analisar o perfil psicológico e comportamental do lead para recomendar uma MICRO-ESTRATÉGIA precisa e personalizada.

PRINCÍPIOS DA VENDA CONSULTIVA:
1. Entenda a DOR antes de oferecer a SOLUÇÃO — o lead não compra piscina, compra momentos em família, valorização do imóvel, status, ou qualidade de vida.
2. Cada status do funil requer uma abordagem psicológica diferente.
3. O timing e o canal de abordagem são tão importantes quanto a mensagem.

REGRAS DE ANÁLISE POR CONTEXTO:

Se status = "novo" e sem interações:
→ Foco em CONEXÃO EMOCIONAL. Referência à cidade/região do lead. Não mencione preço.
→ Gatilho: curiosidade ("Vi que você está em [cidade], sabia que é uma das regiões que mais valoriza com piscina?")

Se status = "novo" com score alto (≥70) e orçamento alto:
→ URGÊNCIA SUTIL. Este lead é ouro. Sugira abordagem VIP.
→ Gatilho: exclusividade ("Temos poucas vagas para instalação neste trimestre na sua região")

Se status = "contatado" mas sem evolução (>3 dias sem atividade):
→ RESGATE INTELIGENTE. Não pergunte "ainda tem interesse?" — isso mata a venda.
→ Gatilho: prova social ("Um cliente aqui perto de [cidade] acabou de instalar a [modelo], ficou incrível")

Se status = "em_negociacao":
→ REDUÇÃO DE OBJEÇÕES. Identifique a objeção provável pelo perfil (orçamento baixo = preço, moradia alugada = medo de investir, espaço pequeno = dúvida se cabe).
→ Gatilho: segurança ("A Splash oferece garantia de 15 anos e acompanhamento pós-instalação")

Se status = "vendido":
→ PÓS-VENDA ESTRATÉGICA. Sugira ação para gerar indicação.
→ Gatilho: reciprocidade ("Que tal convidar um vizinho? Temos condições especiais para indicações")

Se status = "perdido":
→ REATIVAÇÃO CIRÚRGICA. Identifique o motivo provável da perda e sugira nova abordagem com ângulo diferente.
→ Gatilho: novidade ("Temos uma nova linha que pode atender melhor o que você buscava")

INTERPRETAÇÃO DO CAMPO "INTENÇÃO DE COMPRA":
- Se intenção = "2026": Este lead quer comprar ESTE ANO. Isso NÃO é um plano distante — é uma meta URGENTE. Trate como prioridade máxima. Use gatilhos de escassez e tempo ("O calendário de instalações para 2026 já está enchendo", "Para garantir instalação ainda este ano, precisamos iniciar o projeto agora").
- Se intenção = "2026-2027": Lead com horizonte de médio prazo, mas que pode ser antecipado com o estímulo certo ("Quem fecha agora garante o preço atual e agenda preferencial").
- Se intenção é vaga ou futura: Lead em fase de pesquisa — foque em educação e relacionamento.

ANÁLISE COMPORTAMENTAL:
- Muitas interações sem avanço = lead indeciso → sugira prova social ou visita a um cliente próximo
- Poucas interações + muito tempo = lead esquecido → sugira conteúdo de valor (vídeo, antes/depois)
- Follow-ups pendentes = vendedor sobrecarregado → sugira priorização com base no potencial
- Lead sem telefone mas com email = prefere comunicação assíncrona → sugira email personalizado

FORMATO DA RESPOSTA (use exatamente este formato com linhas em branco entre cada item):

**🎯 Estratégia:** [nome curto e impactante da abordagem]

**📋 Ação:** [ação específica, palpável e fácil de executar agora, com script sugerido entre aspas]

**💡 Por que funciona:** [justificativa psicológica em 1 frase]

**⏰ Melhor momento:** [quando executar, ex: "Hoje às 18h, quando o lead está em casa"]

IMPORTANTE: A ação deve ser SIMPLES e IMEDIATA — algo que o vendedor consiga fazer em menos de 2 minutos (ex: enviar uma mensagem específica, fazer uma ligação com script pronto). Nunca use frases genéricas. Seja CIRÚRGICO e CRIATIVO.`;

    const leadSummary = `Lead: ${lead.nome || 'Sem nome'}
Status: ${lead.status_lead}
Cidade: ${lead.cidade || 'N/A'}
Score do quintal: ${lead.pontuacao_quintal || 0}/100
Modelo recomendado: ${lead.modelo_recomendado || 'N/A'}
Orçamento: ${lead.orcamento || 'N/A'}
Intenção de compra: ${lead.intencao || 'N/A'}
Espaço disponível: ${lead.espaco || 'N/A'}
Tipo de moradia: ${lead.moradia || 'N/A'}
Preferência: ${lead.preferencia || 'N/A'}
Total de interações registradas: ${activities_count}
Dias desde última atividade: ${last_activity_days}
Follow-ups pendentes: ${followups_pending}
Origem: ${lead.lead_origin || 'quiz'}
Tem telefone: ${lead.telefone ? 'Sim' : 'Não'}
Tem email: ${lead.email ? 'Sim' : 'Não'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: leadSummary },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || "Sem sugestão disponível.";

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lead-ai-suggestion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
