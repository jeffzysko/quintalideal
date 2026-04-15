import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export async function logError(options: {
  supabaseUrl: string;
  serviceKey: string;
  source?: string;
  severity?: 'warning' | 'error' | 'critical';
  functionName: string;
  message: string;
  error?: unknown;
  franchiseId?: string | null;
  metadata?: Record<string, unknown>;
  alertAdmin?: boolean;
}) {
  const {
    supabaseUrl, serviceKey, functionName, message, error,
    franchiseId = null, metadata = {}, alertAdmin = false,
    severity = 'error', source = 'edge_function',
  } = options;

  const supabase = createClient(supabaseUrl, serviceKey);
  const stack = error instanceof Error ? error.stack || null : null;
  const errorMessage = error instanceof Error ? error.message : String(error ?? '');

  // Log to table (fire and forget)
  supabase.from('error_logs').insert({
    source,
    severity,
    function_name: functionName,
    message: `${message}${errorMessage ? ': ' + errorMessage : ''}`,
    stack,
    franchise_id: franchiseId,
    metadata,
  }).then(() => {}).catch(() => {});

  // WhatsApp alert for critical errors
  if (alertAdmin && severity === 'critical') {
    const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
    const zapiToken = Deno.env.get('ZAPI_TOKEN');
    const adminPhone = Deno.env.get('ADMIN_WHATSAPP_NUMBER');

    if (instanceId && zapiToken && adminPhone) {
      const alertMessage = `🚨 *Erro crítico no sistema*\n\n📍 *Função:* ${functionName}\n❌ *Erro:* ${message}${errorMessage ? '\n🔍 ' + errorMessage : ''}${franchiseId ? '\n🏪 Franquia: ' + franchiseId : ''}\n\n_${new Date().toLocaleString('pt-BR')}_`;

      fetch(`https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: adminPhone, message: alertMessage }),
      }).catch(() => {});
    }
  }
}
