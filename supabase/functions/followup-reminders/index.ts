import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Configuration: days without update to trigger reminders
    const STALE_NOVO_DAYS = 3;
    const STALE_CONTATADO_DAYS = 5;
    const STALE_NEGOCIACAO_DAYS = 7;

    const now = new Date();
    const results = { reminders_created: 0, leads_checked: 0 };

    // Find leads that are stale (no update in X days) and still open
    const cutoffs = [
      { status: 'novo', days: STALE_NOVO_DAYS, message: 'Lead sem contato inicial' },
      { status: 'contatado', days: STALE_CONTATADO_DAYS, message: 'Lead sem atualização' },
      { status: 'em_negociacao', days: STALE_NEGOCIACAO_DAYS, message: 'Negociação parada' },
    ];

    for (const { status, days, message } of cutoffs) {
      const cutoffDate = new Date(now.getTime() - days * 86400000).toISOString();

      const { data: staleLeads, error } = await supabase
        .from('leads')
        .select('id, nome, franquia_id, updated_at')
        .eq('status_lead', status)
        .lt('updated_at', cutoffDate)
        .not('franquia_id', 'is', null);

      if (error) {
        console.error(`Error fetching stale ${status} leads:`, error);
        continue;
      }

      results.leads_checked += staleLeads?.length || 0;

      for (const lead of staleLeads || []) {
        // Check if we already sent a reminder for this lead in the last 24h
        const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'followup_reminder')
          .eq('franchise_id', lead.franquia_id)
          .gte('created_at', oneDayAgo)
          .contains('metadata', { lead_id: lead.id })
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Create reminder notification
        const daysSinceUpdate = Math.floor(
          (now.getTime() - new Date(lead.updated_at).getTime()) / 86400000
        );

        const { error: insertError } = await supabase.from('notifications').insert({
          franchise_id: lead.franquia_id,
          type: 'followup_reminder',
          title: `⏰ ${message}: ${lead.nome || 'Lead sem nome'}`,
          message: `Há ${daysSinceUpdate} dias sem interação. Atualize o status ou entre em contato.`,
          metadata: { lead_id: lead.id, days_stale: daysSinceUpdate, status },
        });

        if (!insertError) {
          results.reminders_created++;
        } else {
          console.error('Error creating reminder:', insertError);
        }
      }
    }

    console.log('Follow-up reminders result:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Followup reminder error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
