import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { motion } from 'framer-motion';

function ScorePill({ score }: { score: number }) {
  const cls = score >= 70 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low';
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${cls}`}>
      {score}%
    </span>
  );
}

interface MobileLeadCardProps {
  lead: LeadRow;
  index: number;
  basePath?: string;
  franchiseName?: string;
}

export function MobileLeadCard({ lead, index, basePath = '/admin/lead', franchiseName }: MobileLeadCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className="card-premium cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => navigate(`${basePath}/${lead.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-primary">
                  {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-foreground truncate">{lead.nome || '—'}</p>
                <div className="flex items-center gap-3 mt-1">
                  {lead.cidade && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />{lead.cidade}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-2" />
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center gap-2.5">
              <ScorePill score={lead.pontuacao_quintal || 0} />
              {lead.modelo_recomendado && (
                <span className="text-xs text-muted-foreground">{lead.modelo_recomendado}</span>
              )}
            </div>
            <Badge className={`${STATUS_COLORS[lead.status_lead] || ''} border text-[11px] font-semibold`} variant="secondary">
              {STATUS_LABELS[lead.status_lead] || lead.status_lead}
            </Badge>
          </div>

          {franchiseName && (
            <p className="text-[11px] text-muted-foreground mt-2 font-mono">{franchiseName}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
