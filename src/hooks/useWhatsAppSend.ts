import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SendWhatsAppParams {
  phone: string;
  message: string;
  template_key?: string;
  lead_id?: string;
  proposal_id?: string;
  franchise_id: string;
}

export function useWhatsAppSend() {
  const [sending, setSending] = useState(false);

  const sendViaZapi = async (params: SendWhatsAppParams): Promise<boolean> => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: params,
      });

      if (error) {
        console.error('send-whatsapp error:', error);
        toast.error('Erro ao enviar mensagem via WhatsApp');
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      toast.success('Mensagem enviada via WhatsApp! ✅');
      return true;
    } catch (err) {
      console.error('send-whatsapp exception:', err);
      toast.error('Erro ao enviar mensagem');
      return false;
    } finally {
      setSending(false);
    }
  };

  return { sendViaZapi, sending };
}
