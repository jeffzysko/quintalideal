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

    const systemPrompt = `Você é um assistente de vendas especializado em piscinas de fibra (marca Splash Piscinas). 
Seu papel é analisar o perfil de um lead e sugerir a MELHOR PRÓXIMA AÇÃO para o vendedor converter esta venda.

Responda SEMPRE em português brasileiro, de forma direta e prática. Máximo 3 frases.
Formato da resposta:
- Linha 1: Ação recomendada (imperativo, ex: "Agende uma visita técnica")  
- Linha 2: Justificativa curta baseada nos dados
- Linha 3: Dica prática de abordagem

Considere:
- Leads "quente" com alto orçamento devem ser priorizados
- Leads sem contato há muitos dias precisam de resgate
- Leads em negociação precisam de urgência/proposta
- Leads novos precisam de primeiro contato rápido`;

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
