import { useState, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { classifyLead } from '@/lib/leadScoring';
import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toWhatsAppPhone } from '@/lib/phone-utils';
import { MapPin, Calendar, GripVertical, Building2, MessageCircle, StickyNote, ArrowRightLeft, Phone, Send } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { SmartTagBadges } from '@/components/SmartTagBadges';
import { COLUMNS, type LeadWithQuiz } from './types';
import { WhatsAppQuickSend } from './WhatsAppQuickSend';
import { LeadCardAssignee } from './LeadCardAssignee';

export const LeadCard = memo(function LeadCard({
  lead,
  basePath,
  overlay,
  franchiseName,
  onMoveStage,
  franchiseId,
  whatsAppPlanActive = false,
}: {
  lead: LeadWithQuiz;
  basePath: string;
  overlay?: boolean;
  franchiseName?: string;
  onMoveStage?: (leadId: string, newStatus: string, lossReason?: string) => void;
  franchiseId?: string;
  whatsAppPlanActive?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const { data: leadTags = [] } = useQuery({
    queryKey: ['lead-card-tags', lead.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_tag_assignments')
        .select('tag_id, lead_tags(name, color)')
        .eq('lead_id', lead.id)
        .limit(3);
      return (data || []).map((d: any) => ({ name: d.lead_tags?.name, color: d.lead_tags?.color })).filter((t: any) => t.name);
    },
    staleTime: 5 * 60 * 1000,
  });

  const assignedTo = (lead as any).assigned_to as string | null;
  const { data: assignedUser } = useQuery({
    queryKey: ['assigned-user', assignedTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', assignedTo!)
        .maybeSingle();
      return data?.full_name || null;
    },
    enabled: !!assignedTo,
    staleTime: 10 * 60 * 1000,
  });

  const style = !overlay
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
        transition: isDragging ? 'opacity 150ms ease' : undefined,
      }
    : undefined;

  const handleSaveNote = async () => {
    if (!noteText.trim() || !user) return;
    setSavingNote(true);
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      user_id: user.id,
      activity_type: 'note',
      content: noteText.trim(),
    });
    setSavingNote(false);
    if (error) {
      toast.error('Erro ao salvar nota');
    } else {
      toast.success('Nota adicionada');
      setNoteText('');
      setNoteOpen(false);
    }
  };

  const currentStatus = lead.status_lead;
  const borderAccent = temp.borderAccent;
  const scoreColor = (lead.pontuacao_quintal || 0) >= 70 ? 'bg-emerald-500' : (lead.pontuacao_quintal || 0) >= 40 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div
      ref={!overlay ? setNodeRef : undefined}
      style={style}
      className={`group bg-card border rounded-xl shadow-sm transition-all border-l-[3px] ${borderAccent} ${
        overlay
          ? 'shadow-xl border-primary/30 scale-105 rotate-1 ring-2 ring-primary/20'
          : isDragging
          ? 'border-primary/20'
          : 'border-border/50 hover:shadow-md hover:border-border cursor-pointer'
      }`}
    >
      <div
        className="p-3"
        onClick={!overlay ? () => navigate(`${basePath}/${lead.id}`) : undefined}
      >
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground truncate">{lead.nome || '—'}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {assignedUser && <LeadCardAssignee assignedName={assignedUser} />}
            <div
              {...listeners}
              {...attributes}
              className="shrink-0 cursor-grab active:cursor-grabbing p-1 -m-1 rounded-lg hover:bg-muted/80 touch-none transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div className={`h-full rounded-full ${scoreColor} transition-all`} style={{ width: `${lead.pontuacao_quintal || 0}%` }} />
          </div>
          <span className="text-[11px] font-bold tabular-nums w-7 text-right">{lead.pontuacao_quintal || 0}%</span>
        </div>

        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {(lead as any).lead_origin === 'manual' && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold" variant="outline">
              ✏️ Manual
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                <Badge className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`} variant="outline">
                  {temp.emoji} {temp.label}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              <p className="font-semibold mb-0.5">Nível de interesse</p>
              <p className="text-muted-foreground">
                {temp.temperature === 'quente'
                  ? 'Alto interesse: bom orçamento, quer comprar em breve e tem espaço.'
                  : temp.temperature === 'morno'
                  ? 'Interesse moderado: pode precisar de mais informações.'
                  : 'Início da jornada: ainda explorando opções.'}
              </p>
            </TooltipContent>
          </Tooltip>
          <SmartTagBadges lead={lead} max={1} />
          {leadTags.length > 0 && (
            <span className="inline-flex items-center gap-0.5 ml-0.5">
              {leadTags.map((tag: { name: string; color: string }, i: number) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 cursor-help" style={{ backgroundColor: tag.color }} />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs py-1 px-2">{tag.name}</TooltipContent>
                </Tooltip>
              ))}
            </span>
          )}
        </div>

        <div className="space-y-1">
          {lead.status_lead === 'vendido' && (lead as any).modelo_vendido && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <span className="w-3 h-3 shrink-0">✅</span>
              <span className="truncate">Vendido: {(lead as any).modelo_vendido}</span>
            </div>
          )}
          {lead.cidade && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{lead.cidade}</span>
            </div>
          )}
          {franchiseName && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{franchiseName}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {!overlay && (
        <div className="flex items-center border-t border-border/30 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity divide-x divide-border/30">
          {lead.telefone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const fullPhone = toWhatsAppPhone(lead.telefone!);
                window.open(`https://wa.me/${fullPhone}`, '_blank');
              }}
              aria-label="Abrir WhatsApp"
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-success hover:bg-success/5 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-3 h-3" />
            </button>
          )}
          {lead.telefone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const phone = lead.telefone!.replace(/\D/g, '');
                window.open(`tel:+55${phone}`, '_self');
              }}
              aria-label="Ligar para lead"
              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/5 transition-colors"
              title="Ligar"
            >
              <Phone className="w-3 h-3" />
            </button>
          )}
          <Popover open={noteOpen} onOpenChange={setNoteOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label="Adicionar nota rápida"
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                title="Adicionar nota"
              >
                <StickyNote className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-foreground mb-2">Nota rápida</p>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escreva uma nota..."
                className="text-base md:text-xs min-h-[60px] resize-none mb-2"
                autoFocus
              />
              <Button
                size="sm"
                className="w-full h-7 text-xs gap-1"
                disabled={!noteText.trim() || savingNote}
                onClick={handleSaveNote}
              >
                <Send className="w-3 h-3" />
                {savingNote ? 'Salvando...' : 'Salvar'}
              </Button>
            </PopoverContent>
          </Popover>
          {onMoveStage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Mover para próxima etapa"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
                  title="Mover etapa"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {COLUMNS.filter(s => s !== currentStatus).map(status => {
                  const color = STATUS_CHART_COLORS[status] || '#64748b';
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveStage(lead.id, status);
                      }}
                      className="gap-2 text-xs cursor-pointer"
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  );
});
