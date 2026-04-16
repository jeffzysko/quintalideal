import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';

interface StatusResponse {
  stripe: {
    mode: 'live' | 'test' | 'unknown';
    configured: boolean;
    webhook_configured: boolean;
  };
  zapi: {
    partner_token_configured: boolean;
    active_instances: number;
    franchises_with_plan: number;
    status: 'operational' | 'degraded' | 'no_instances' | 'unknown';
  };
  email: {
    resend_configured: boolean;
  };
  edge_functions: Array<{
    name: string;
    last_run: string | null;
    status: 'ok' | 'error' | 'no_runs';
  }>;
  cron_jobs: Array<{
    jobname: string;
    schedule: string;
    active: boolean;
    last_run_started: string | null;
    last_run_status: string | null;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify super_admin role
    const userId = claimsData.claims.sub;
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const isSuperAdmin = (roles ?? []).some((r) => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service-role for aggregating data
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Stripe ──
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    let stripeMode: 'live' | 'test' | 'unknown' = 'unknown';
    if (stripeKey.startsWith('sk_live_')) stripeMode = 'live';
    else if (stripeKey.startsWith('sk_test_')) stripeMode = 'test';

    // ── Z-API ──
    const zapiPartnerConfigured = !!Deno.env.get('ZAPI_SECURITY_TOKEN');
    const { count: activeInstances } = await admin
      .from('franchises')
      .select('id', { count: 'exact', head: true })
      .eq('zapi_instance_active', true);
    const { count: franchisesWithPlan } = await admin
      .from('franchises')
      .select('id', { count: 'exact', head: true })
      .eq('whatsapp_plan_active', true);

    let zapiStatus: 'operational' | 'degraded' | 'no_instances' | 'unknown' = 'unknown';
    if ((franchisesWithPlan ?? 0) === 0) zapiStatus = 'no_instances';
    else if ((activeInstances ?? 0) === (franchisesWithPlan ?? 0)) zapiStatus = 'operational';
    else if ((activeInstances ?? 0) > 0) zapiStatus = 'degraded';
    else zapiStatus = 'no_instances';

    // ── Email (Resend) ──
    const resendConfigured = !!Deno.env.get('RESEND_API_KEY');

    // ── Edge functions: last run from logs (best-effort: error_logs only for failures) ──
    const criticalFns = [
      'check-proposal-expiration',
      'followup-reminders',
      'send-monthly-report',
      'send-whatsapp-auto',
      'stripe-webhook',
      'send-lead-result-email',
      'send-proposal-email',
    ];

    // ── Cron jobs ──
    let cronJobs: StatusResponse['cron_jobs'] = [];
    try {
      const { data: crons, error: cronErr } = await admin.rpc('admin_get_cron_jobs');
      if (!cronErr && crons) {
        cronJobs = (crons as Array<{
          jobname: string;
          schedule: string;
          active: boolean;
          last_run_started: string | null;
          last_run_status: string | null;
        }>).map((c) => ({
          jobname: c.jobname,
          schedule: c.schedule,
          active: c.active,
          last_run_started: c.last_run_started,
          last_run_status: c.last_run_status,
        }));
      }
    } catch (_) { /* ignore */ }

    // Map cron last_run into edge_functions list when matched
    const cronByName = new Map(cronJobs.map((c) => [c.jobname, c]));
    const edgeFunctions = criticalFns.map((name) => {
      const cron = cronByName.get(name) ?? cronByName.get(`${name}-daily`) ?? cronByName.get(`${name}-hourly`);
      return {
        name,
        last_run: cron?.last_run_started ?? null,
        status: (cron?.last_run_status === 'succeeded' ? 'ok' : cron?.last_run_status ? 'error' : 'no_runs') as 'ok' | 'error' | 'no_runs',
      };
    });

    const response: StatusResponse = {
      stripe: {
        mode: stripeMode,
        configured: !!stripeKey,
        webhook_configured: !!Deno.env.get('STRIPE_WEBHOOK_SECRET'),
      },
      zapi: {
        partner_token_configured: zapiPartnerConfigured,
        active_instances: activeInstances ?? 0,
        franchises_with_plan: franchisesWithPlan ?? 0,
        status: zapiStatus,
      },
      email: {
        resend_configured: resendConfigured,
      },
      edge_functions: edgeFunctions,
      cron_jobs: cronJobs,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
