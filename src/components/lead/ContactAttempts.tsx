import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Phone, MessageCircle, FileText } from 'lucide-react';

interface ContactAttemptsProps {
  leadId: string;
}

interface AttemptCounts {
  call: number;
  whatsapp: number;
  note: number;
  total: number;
}

export function ContactAttempts({ leadId }: ContactAttemptsProps) {
  const [counts, setCounts] = useState<AttemptCounts>({ call: 0, whatsapp: 0, note: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('lead_activities')
        .select('activity_type')
        .eq('lead_id', leadId)
        .in('activity_type', ['call', 'whatsapp', 'note']);

      if (data) {
        const call = data.filter(a => a.activity_type === 'call').length;
        const whatsapp = data.filter(a => a.activity_type === 'whatsapp').length;
        const note = data.filter(a => a.activity_type === 'note').length;
        setCounts({ call, whatsapp, note, total: call + whatsapp + note });
      }
      setLoading(false);
    };
    load();
  }, [leadId]);

  if (loading || counts.total === 0) return null;

  const items = [
    { icon: Phone, count: counts.call, label: 'Ligações', color: 'text-emerald-600' },
    { icon: MessageCircle, count: counts.whatsapp, label: 'WhatsApp', color: 'text-green-600' },
    { icon: FileText, count: counts.note, label: 'Notas', color: 'text-primary' },
  ].filter(i => i.count > 0);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center gap-1.5 text-[11px] font-medium bg-muted/50 rounded-lg px-2.5 py-1.5"
            title={`${item.count} ${item.label.toLowerCase()}`}
          >
            <Icon className={`w-3 h-3 ${item.color}`} />
            <span className="text-foreground">{item.count}</span>
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
