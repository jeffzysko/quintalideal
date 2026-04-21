import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeadActivity {
  lead_id: string;
  activity_type: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  content?: string | null;
}

interface Lead {
  id: string;
  status_lead: string;
  created_at: string;
}

interface SLAIndicatorProps {
  leads: Lead[];
  activities: LeadActivity[];
}

export function SLAIndicator({ leads, activities }: SLAIndicatorProps) {
  const { avgHours, alertLeads } = useMemo(() => {
    // Pre-index: first "Contatado" activity per lead → O(n) lookup
    // (activities are pre-filtered to status_change by the query)
    const firstContactMap = new Map<string, string>();
    for (const a of activities) {
      if (a.content?.includes('Contatado') && !firstContactMap.has(a.lead_id)) {
        firstContactMap.set(a.lead_id, a.created_at);
      }
    }

    const contactedTimes: number[] = [];
    const now = Date.now();
    const overdue: Lead[] = [];

    leads.forEach(lead => {
      const contactTime = firstContactMap.get(lead.id);

      if (contactTime) {
        const created = new Date(lead.created_at).getTime();
        const contacted = new Date(contactTime).getTime();
        const hours = (contacted - created) / (1000 * 60 * 60);
        if (hours >= 0 && hours < 720) contactedTimes.push(hours);
      } else if (lead.status_lead === 'novo') {
        const hoursWaiting = (now - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);
        if (hoursWaiting > 2) overdue.push(lead);
      }
    });

    const avg = contactedTimes.length > 0
      ? contactedTimes.reduce((s, v) => s + v, 0) / contactedTimes.length
      : 0;

    return { avgHours: avg, alertLeads: overdue };
  }, [leads, activities]);

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const isOverSLA = avgHours > 2;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Card className={`card-premium overflow-hidden h-full ${isOverSLA ? 'border-destructive/30' : ''}`}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOverSLA ? 'bg-destructive/10' : 'icon-bg-blue'}`}>
              {isOverSLA ? <AlertTriangle className="w-[18px] h-[18px] text-destructive" /> : <Clock className="w-[18px] h-[18px] text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Tempo médio de 1º contato</p>
              <p className={`text-2xl font-extrabold tracking-tight mt-0.5 ${isOverSLA ? 'text-destructive' : 'text-foreground'}`}>
                {avgHours === 0 ? '—' : formatTime(avgHours)}
              </p>
              {alertLeads.length > 0 && (
                <p className="text-[13px] text-destructive font-medium mt-1.5 leading-snug">
                  ⚠️ {alertLeads.length} lead{alertLeads.length > 1 ? 's' : ''} esperando contato há +2h
                </p>
              )}
              {avgHours > 0 && avgHours <= 2 && (
                <p className="text-[13px] text-emerald-600 font-medium mt-1.5">✅ Ótimo! Respondendo rápido</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
