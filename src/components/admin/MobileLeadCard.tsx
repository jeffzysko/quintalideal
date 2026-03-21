import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, ChevronRight, Phone, MessageCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_LABELS, STATUS_COLORS, LeadRow } from '@/lib/lead-constants';
import { motion } from 'framer-motion';
import { SmartTagBadges } from '@/components/SmartTagBadges';
import { classifyLead } from '@/lib/leadScoring';

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[11px] font-bold text-foreground tabular-nums w-8 text-right">{score}%</span>
    </div>
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
  const TempIcon = TEMP_ICON[temp.temperature] || Thermometer;

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

  // Left border accent based on temperature
  const borderAccent =
    temp.temperature === 'quente'
      ? 'border-l-emerald-500'
      : temp.temperature === 'morno'
      ? 'border-l-amber-500'
      : 'border-l-blue-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div
        className={`relative bg-card rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98] border-l-[3px] ${borderAccent} overflow-hidden`}
        onClick={() => navigate(`${basePath}/${lead.id}`)}
      >
        {/* Header row */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            {/* Avatar + name */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-primary">
                    {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
                  </span>
                </div>
                {/* Temperature indicator dot */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ${temp.bgColor} flex items-center justify-center ring-2 ring-card`}>
                  <TempIcon className={`w-2.5 h-2.5 ${temp.color}`} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-foreground truncate leading-tight">{lead.nome || '—'}</p>
                <div className="flex items-center gap-2 mt-1">
                  {lead.cidade && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /><span className="truncate max-w-[100px]">{lead.cidade}</span>
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground/70 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />{timeSince()}
                  </span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <Badge className={`${STATUS_COLORS[lead.status_lead] || ''} border text-[10px] font-semibold shrink-0`} variant="secondary">
              {STATUS_LABELS[lead.status_lead] || lead.status_lead}
            </Badge>
          </div>
        </div>

        {/* Score bar + metadata */}
        <div className="px-4 pb-3 space-y-2">
          <ScoreBar score={lead.pontuacao_quintal || 0} />

          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(lead.respostas_questionario as any)?.v2_recommendation?.is_hot_lead && (
              <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] font-semibold animate-pulse" variant="outline">
                🔥 Quente
              </Badge>
            )}
            <Badge className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`} variant="outline">
              {temp.emoji} {temp.label}
            </Badge>
            {(lead as any).lead_origin === 'manual' && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold" variant="outline">
                ✏️ Manual
              </Badge>
            )}
            <SmartTagBadges lead={lead} max={2} />
            {lead.modelo_recomendado && (
              <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md font-medium">
                🏊 {lead.modelo_recomendado}
              </span>
            )}
          </div>

          {franchiseName && (
            <p className="text-[11px] text-muted-foreground/70 font-medium truncate">
              🏢 {franchiseName}
            </p>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center border-t border-border/30 bg-muted/20">
          {lead.telefone && (
            <button
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 transition-colors min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          )}
          {lead.telefone && (
            <>
              <div className="w-px h-5 bg-border/40" />
              <button
                onClick={handleCall}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-primary hover:bg-primary/5 active:bg-primary/10 transition-colors min-h-[44px]"
              >
                <Phone className="w-4 h-4" />
                Ligar
              </button>
            </>
          )}
          <div className="w-px h-5 bg-border/40" />
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/${lead.id}`); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-muted-foreground hover:bg-muted/40 active:bg-muted/60 transition-colors min-h-[44px]"
          >
            Detalhes
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
