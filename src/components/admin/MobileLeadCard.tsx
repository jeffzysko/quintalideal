import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ChevronRight, Phone, MessageCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { motion } from 'framer-motion';
import { SmartTagBadges } from '@/components/SmartTagBadges';
import { classifyLead } from '@/lib/leadScoring';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function ScorePill({ score }: { score: number }) {
  const cls = score >= 70 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low';
  const explanation = score >= 70
    ? 'Quintal com ótimas condições para piscina'
    : score >= 40
    ? 'Quintal com boas condições, com alguns ajustes possíveis'
    : 'Quintal pode precisar de mais adaptações';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${cls} cursor-help`}>
          {score}%
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[200px] text-xs">
        <p className="font-semibold mb-0.5">Compatibilidade do quintal</p>
        <p className="text-muted-foreground">{explanation}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface MobileLeadCardProps {
  lead: LeadRow & { respostas_questionario?: Record<string, string> | null };
  index: number;
  basePath?: string;
  franchiseName?: string;
}

export const MobileLeadCard = memo(function MobileLeadCard({ lead, index, basePath = '/admin/lead', franchiseName }: MobileLeadCardProps) {
  const navigate = useNavigate();
  const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.telefone) return;
    const phone = lead.telefone.replace(/\D/g, '');
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem?`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.telefone) return;
    window.open(`tel:${lead.telefone}`, '_self');
  };

  const timeSince = () => {
    const diff = Date.now() - new Date(lead.created_at).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    return `${Math.floor(days / 30)}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className="card-premium cursor-pointer active:scale-[0.98] transition-transform overflow-hidden"
        onClick={() => navigate(`${basePath}/${lead.id}`)}
      >
        <CardContent className="p-0">
          {/* Main content */}
          <div className="p-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-primary">
                    {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-foreground truncate">{lead.nome || '—'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {lead.cidade && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{lead.cidade}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />{timeSince()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge className={`${STATUS_COLORS[lead.status_lead] || ''} border text-[10px] font-semibold`} variant="secondary">
                  {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      <Badge className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`} variant="outline">
                        {temp.emoji} {temp.label}
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[220px] text-xs">
                    <p className="font-semibold mb-0.5">Nível de interesse</p>
                    <p className="text-muted-foreground">
                      {temp.temperature === 'quente'
                        ? 'Lead com alto interesse: bom orçamento, quer comprar em breve e tem espaço adequado.'
                        : temp.temperature === 'morno'
                        ? 'Lead com interesse moderado: pode precisar de mais informações ou tempo.'
                        : 'Lead no início da jornada: ainda explorando opções.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <ScorePill score={lead.pontuacao_quintal || 0} />
              </div>
            </div>

            {/* Smart tags + model */}
            <div className="mt-2 ml-14 flex items-center gap-1.5 flex-wrap">
              <SmartTagBadges lead={lead} max={2} />
              {lead.modelo_recomendado && (
                <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                  {lead.modelo_recomendado}
                </span>
              )}
            </div>

            {franchiseName && (
              <div className="mt-1.5 ml-14">
                <span className="text-[11px] text-muted-foreground font-mono">{franchiseName}</span>
              </div>
            )}
          </div>

          {/* Quick action bar */}
          <div className="flex items-center border-t border-border/30 divide-x divide-border/30">
            {lead.telefone && (
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-success hover:bg-success/5 transition-colors min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            )}
            {lead.telefone && (
              <button
                onClick={handleCall}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors min-h-[44px]"
              >
                <Phone className="w-4 h-4" />
                Ligar
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/${lead.id}`); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors min-h-[44px]"
            >
              <ChevronRight className="w-4 h-4" />
              Detalhes
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
