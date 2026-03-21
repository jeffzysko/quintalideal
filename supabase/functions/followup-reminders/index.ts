import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check if ANY user in a franchise has push enabled for a notification key
async function franchiseHasPushEnabled(
  supabase: ReturnType<typeof createClient>,
  franchiseId: string,
  notificationKey: string,
): Promise<boolean> {
  try {
    // Get all user_ids for this franchise
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('franquia_id', franchiseId);

    if (!profiles || profiles.length === 0) return true; // no profiles = default ON

    // Check preferences for each user
    const userIds = profiles.map((p: any) => p.user_id);
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, preferences')
      .in('user_id', userIds);

    if (!prefs || prefs.length === 0) return true; // no prefs saved = default ON

    // If at least one user has push enabled (or no pref for this key), allow
    for (const pref of prefs) {
      const userPrefs = pref.preferences as Record<string, { push?: boolean }> | null;
      if (!userPrefs) return true; // no prefs = default ON
      const keyPref = userPrefs[notificationKey];
      if (!keyPref || keyPref.push === undefined || keyPref.push) return true;
    }

    // All users explicitly disabled this notification
    return false;
  } catch {
    return true; // on error, default to sending
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const STALE_NOVO_DAYS = 3;
    const STALE_CONTATADO_DAYS = 5;
    const STALE_NEGOCIACAO_DAYS = 7;

    const now = new Date();
    const results = { reminders_created: 0, leads_checked: 0, skipped_by_preference: 0 };

    const cutoffs = [
      { status: 'novo', days: STALE_NOVO_DAYS, message: 'Lead sem contato inicial', notifKey: 'lead_no_first_contact' },
      { status: 'contatado', days: STALE_CONTATADO_DAYS, message: 'Lead sem atualização', notifKey: 'followup_overdue' },
      { status: 'em_negociacao', days: STALE_NEGOCIACAO_DAYS, message: 'Negociação parada', notifKey: 'followup_overdue' },
    ];

    for (const { status, days, message, notifKey } of cutoffs) {
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
        // Check if franchise users want this notification
        const pushEnabled = await franchiseHasPushEnabled(supabase, lead.franquia_id, notifKey);
        if (!pushEnabled) {
          results.skipped_by_preference++;
          continue;
        }

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

          // Send push respecting individual user preferences
          try {
            const pushUrl = `${supabaseUrl}/functions/v1/send-push`;
            const pushRes = await fetch(pushUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({
                franchise_id: lead.franquia_id,
                title: `⏰ ${message}`,
                message: `${lead.nome || 'Lead'} — ${daysSinceUpdate} dias sem interação`,
                url: '/hoje',
                notification_key: notifKey,
              }),
            });
            await pushRes.text().catch(() => {});
          } catch (pushErr) {
            console.error('Push notification failed (non-blocking):', pushErr);
          }
        } else {
          console.error('Error creating reminder:', insertError);
        }
      }
    }

    console.log('Follow-up reminders result:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Followup reminder error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
