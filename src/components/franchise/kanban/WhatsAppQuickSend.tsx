import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useWhatsAppSend } from '@/hooks/useWhatsAppSend';
import { whatsappTemplates, type TemplateVars } from '@/lib/whatsapp-templates';
import { toWhatsAppPhone } from '@/lib/phone-utils';

interface WhatsAppQuickSendProps {
  leadId: string;
  leadName: string | null;
  leadPhone: string;
  franchiseId: string;
  franchiseName?: string;
  whatsAppPlanActive: boolean;
}

export function WhatsAppQuickSend({
  leadId,
  leadName,
  leadPhone,
  franchiseId,
  franchiseName,
  whatsAppPlanActive,
}: WhatsAppQuickSendProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const { sendViaZapi, sending } = useWhatsAppSend();

  if (!whatsAppPlanActive) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            aria-label="WhatsApp indisponível"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-muted-foreground/50 cursor-not-allowed"
          >
            <MessageCircle className="w-3 h-3" />
            <Send className="w-2.5 h-2.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Disponível no plano WhatsApp Próprio
        </TooltipContent>
      </Tooltip>
    );
  }

  const quickTemplates = whatsappTemplates.slice(0, 3);

  const handleSend = async () => {
    if (!message.trim()) return;
    const phone = toWhatsAppPhone(leadPhone);
    const ok = await sendViaZapi({
      phone,
      message: message.trim(),
      lead_id: leadId,
      franchise_id: franchiseId,
    });
    if (ok) {
      toast.success(`Mensagem enviada para ${leadName || 'o lead'}`);
      setMessage('');
      setOpen(false);
    }
  };

  const applyTemplate = (tpl: typeof quickTemplates[0]) => {
    const vars: TemplateVars = {
      leadName: leadName || undefined,
      franchiseName: franchiseName || 'Quintal Ideal',
    };
    setMessage(tpl.build(vars));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label="Enviar WhatsApp rápido"
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors"
          title="Enviar WhatsApp"
        >
          <MessageCircle className="w-3 h-3" />
          <Send className="w-2.5 h-2.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-semibold text-foreground mb-2">WhatsApp rápido</p>

        {quickTemplates.length > 0 && (
          <div className="mb-2 space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Templates rápidos</p>
            {quickTemplates.map((tpl) => (
              <button
                key={tpl.key}
                onClick={() => applyTemplate(tpl)}
                className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-foreground truncate"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        )}

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 500))}
          placeholder="Escreva sua mensagem..."
          className="text-base md:text-xs min-h-[70px] resize-none mb-1"
          autoFocus
        />
        <p className="text-[10px] text-muted-foreground text-right mb-2">{message.length}/500</p>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs"
            onClick={() => { setOpen(false); setMessage(''); }}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="flex-1 h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!message.trim() || sending}
            onClick={handleSend}
          >
            <Send className="w-3 h-3" />
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
