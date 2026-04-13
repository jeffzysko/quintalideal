import { supabase } from '@/lib/supabase';

/**
 * Fire-and-forget WhatsApp auto-send trigger.
 * NEVER blocks the main flow — always wrapped in try/catch.
 */
export async function triggerWhatsAppAuto(params: {
  trigger_event: string;
  lead_id?: string;
  proposal_id?: string;
  franchise_id?: string;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-whatsapp-auto', {
      body: params,
    });
    if (error) {
      console.warn(`[WhatsApp Auto] ${params.trigger_event} falhou:`, error);
    }
  } catch (err) {
    console.warn(`[WhatsApp Auto] ${params.trigger_event} exceção:`, err);
  }
}
