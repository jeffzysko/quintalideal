import { useState, memo, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { classifyLead } from '@/lib/leadScoring';
import { STATUS_LABELS, STATUS_CHART_COLORS } from '@/lib/lead-constants';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toWhatsAppPhone } from '@/lib/phone-utils';
import { MapPin, GripVertical, MessageCircle, StickyNote, ArrowRightLeft, Send, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { COLUMNS, type LeadWithQuiz } from './types';
import { LeadCardAssignee } from './LeadCardAssignee';

const DESTRUCTIVE_STAGES = ['perdido', 'descartado'];

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#14b8a6', '#f97316'];
function getInitials(nome: string | null) {
  if (!nome) return '?';
  const p = nome.trim().split(/\s+/);
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function getAvatarColor(nome: string | null) {
  if (!nome) return AVATAR_COLORS[0];
  return AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length];
}

export const LeadCard = memo(function LeadCard({
  lead,
  basePath,
  overlay,
  franchiseName,
  onMoveStage,
  isSelected = false,
  showCheckbox = false,
  onToggleSelect,
}: {
  lead: LeadWithQuiz;
  basePath: string;
  overlay?: boolean;
  franchiseName?: string;
  onMoveStage?: (leadId: string, newStatus: string, extra?: { lossReason?: string; valorVenda?: number }) => void;
  franchiseId?: string;
  whatsAppPlanActive?: boolean;
  isSelected?: boolean;
  showCheckbox?: boolean;
  onToggleSelect?: (leadId: string) => void;
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
  const [confirmStage, setConfirmStage] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: leadTags = [] } = useQuery({
    queryKey: ['lead-card-tags', lead.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_tag_assignments')
        .select('tag_id, lead_tags(name, color)')
        .eq('lead_id', lead.id)
        .limit(3);
      return (data || [])
        .map((d: any) => ({ name: d.lead_tags?.name, color: d.lead_tags?.color }))
        .filter((t: any) => t.name);
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

  const handleStageSelect = (newStage: string) => {
    if (!onMoveStage) return;
    if (DESTRUCTIVE_STAGES.includes(newStage)) {
      setConfirmStage(newStage);
      return;
    }
    onMoveStage(lead.id, newStage);
  };

  const handleTouchStart = () => {
    if (overlay || !onToggleSelect) return;
    longPressTimer.current = setTimeout(() => {
      onToggleSelect(lead.id);
    }, 500);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const currentStatus = lead.status_lead;
  const borderAccent = temp.borderAccent;

  return (
    <div
      ref={!overlay ? setNodeRef : undefined}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onTouchCancel={clearLongPress}
      className={cn(
        'group relative bg-card rounded-xl border-l-[3px] border border-border/40 shadow-sm transition-all cursor-pointer select-none',
        borderAccent,
        isSelected && 'ring-2 ring-primary/40 border-primary/30',
        overlay && 'shadow-xl scale-[1.02] rotate-[0.5deg] ring-2 ring-primary/30',
        isDragging && 'opacity-30',
        !overlay && !isDragging && 'hover:shadow-md hover:border-border/70 active:scale-[0.99]'
      )}
    >
      {!overlay && onToggleSelect && (
        <div
          className={cn(
            'absolute top-2.5 left-2.5 z-10 transition-opacity',
            showCheckbox || isSelected
              ? 'opacity-100'
              : 'opacity-0 sm:group-hover:opacity-100'
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(lead.id)}
            aria-label={`Selecionar lead ${lead.nome || ''}`}
            className="h-4 w-4 shadow-sm bg-background border-border"
          />
        </div>
      )}

      <div
        className="p-3"
        onClick={!overlay ? () => navigate(`${basePath}/${lead.id}`) : undefined}
      >
        {/* Linha 1: Avatar + Nome + Responsável + Grip */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: getAvatarColor(lead.nome) }}
          >
            {getInitials(lead.nome)}
          </div>
          <p className="text-sm font-semibold text-foreground truncate flex-1 leading-tight">
            {lead.nome || '—'}
          </p>
          {assignedUser && <LeadCardAssignee assignedName={assignedUser} />}
          {!overlay && (
            <div
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing p-1 rounded touch-none opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
              aria-label="Arrastar lead"
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Linha 2: Temperatura + Modelo + Indicador manual */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border',
              temp.bgColor,
              temp.color
            )}
          >
            {temp.emoji} {temp.label}
          </span>
          {lead.modelo_recomendado && (
            <span className="text-xs text-muted-foreground truncate max-w-[110px]">
              · {lead.modelo_recomendado}
            </span>
          )}
          {(lead as any).lead_origin === 'manual' && (
            <span className="text-xs text-amber-600 font-medium" title="Lead manual">✏️</span>
          )}
        </div>

        {/* Linha 3: Cidade + Último contato */}
        <div className="flex items-center justify-between gap-2">
          {lead.cidade ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {lead.cidade}
            </span>
          ) : (
            <span />
          )}
          {(() => {
            const lastTs = (lead as any).updated_at || lead.created_at;
            const days = (Date.now() - new Date(lastTs).getTime()) / (1000 * 60 * 60 * 24);
            const tone = days > 7 ? 'text-destructive' : days > 3 ? 'text-amber-500' : 'text-muted-foreground';
            return (
              <span className={cn('text-xs flex items-center gap-1 shrink-0 font-medium', tone)}>
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(lastTs), { locale: ptBR, addSuffix: true }).replace('há ', '')}
              </span>
            );
          })()}
        </div>

        {/* Franquia (visão admin) */}
        {franchiseName && (
          <div className="mt-1.5 text-xs text-muted-foreground/80 truncate">
            {franchiseName}
          </div>
        )}

        {/* Tags coloridas */}
        {leadTags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {leadTags.slice(0, 3).map((tag: { name: string; color: string }, i: number) => (
              <span
                key={i}
                className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: tag.color + '25', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer de ações — sempre visível */}
      {!overlay && (
        <div className="flex items-center border-t border-border/25 divide-x divide-border/25">
          {lead.telefone && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://wa.me/${toWhatsAppPhone(lead.telefone!)}`, '_blank');
              }}
              className="flex-1 h-auto py-2 rounded-none text-xs font-medium gap-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/20"
              title="Enviar WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enviar</span>
            </Button>
          )}
          <Popover open={noteOpen} onOpenChange={setNoteOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 h-auto py-2 rounded-none text-xs font-medium gap-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                title="Adicionar nota"
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nota</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold mb-2">Nota rápida</p>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escreva uma nota..."
                className="text-sm min-h-[60px] resize-none mb-2"
                autoFocus
              />
              <Button
                size="sm"
                className="w-full h-7 text-xs gap-1"
                disabled={!noteText.trim() || savingNote}
                onClick={handleSaveNote}
              >
                <Send className="w-3 h-3" /> {savingNote ? 'Salvando...' : 'Salvar'}
              </Button>
            </PopoverContent>
          </Popover>
          {onMoveStage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 h-auto py-2 rounded-none text-xs font-medium gap-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  title="Mover etapa"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mover</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {COLUMNS.filter((s) => s !== currentStatus).map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStageSelect(status);
                    }}
                    className="gap-2 text-xs cursor-pointer"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_CHART_COLORS[status] || '#64748b' }}
                    />
                    {STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Confirmação para estágios destrutivos */}
      <AlertDialog
        open={!!confirmStage}
        onOpenChange={(o) => !o && setConfirmStage(null)}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mover para "{confirmStage ? STATUS_LABELS[confirmStage] || confirmStage : ''}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marca o lead como{' '}
              {confirmStage ? (STATUS_LABELS[confirmStage] || confirmStage).toLowerCase() : ''}.
              Você pode desfazer movendo para outra etapa depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (confirmStage && onMoveStage) {
                  onMoveStage(lead.id, confirmStage);
                }
                setConfirmStage(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
