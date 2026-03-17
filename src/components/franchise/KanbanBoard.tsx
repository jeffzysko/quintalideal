import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { classifyLead } from '@/lib/leadScoring';
import { STATUS_LABELS, STATUS_CHART_COLORS, type LeadRow } from '@/lib/lead-constants';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar, GripVertical, Filter, X, Building2, Search, CalendarIcon, MessageCircle, ChevronRight, SlidersHorizontal, StickyNote, ArrowRightLeft, Phone, Send } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { SmartTagBadges } from '@/components/SmartTagBadges';

const COLUMNS = ['novo', 'contatado', 'em_negociacao', 'vendido', 'perdido'] as const;

type LeadWithQuiz = LeadRow & { respostas_questionario?: Record<string, string> | null };

const BUDGET_RANGES: Record<string, [number, number]> = {
  '30-50': [30000, 50000],
  '18-30': [18000, 30000],
  'ate-18': [5000, 18000],
};

function estimateLeadValue(respostas: Record<string, string> | null): number {
  if (!respostas?.orcamento) return 15000;
  const range = BUDGET_RANGES[respostas.orcamento];
  if (!range) return 15000;
  return (range[0] + range[1]) / 2;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

interface KanbanBoardProps {
  leads: LeadWithQuiz[];
  franchiseId: string;
  basePath: string;
  franchiseMap?: Record<string, string>;
}

// ── Draggable Lead Card with Quick Actions ──
function LeadCard({
  lead,
  basePath,
  overlay,
  franchiseName,
  onMoveStage,
}: {
  lead: LeadWithQuiz;
  basePath: string;
  overlay?: boolean;
  franchiseName?: string;
  onMoveStage?: (leadId: string, newStatus: string) => void;
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

  return (
    <div
      ref={!overlay ? setNodeRef : undefined}
      style={style}
      className={`group bg-card border rounded-xl shadow-sm transition-all ${
        overlay
          ? 'shadow-xl border-primary/30 scale-105 rotate-1 ring-2 ring-primary/20'
          : isDragging
          ? 'border-primary/20'
          : 'border-border/50 hover:shadow-md hover:border-border cursor-pointer'
      }`}
    >
      {/* Card body */}
      <div
        className="p-3"
        onClick={!overlay ? () => navigate(`${basePath}/${lead.id}`) : undefined}
      >
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{lead.nome || '—'}</p>
          </div>
          {!overlay && (
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

        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                <Badge
                  className={`${temp.bgColor} ${temp.color} border text-[10px] font-semibold`}
                  variant="outline"
                >
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
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-bold text-primary cursor-help">{lead.pontuacao_quintal || 0}%</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px] text-xs">
              <p className="font-semibold mb-0.5">Compatibilidade do quintal</p>
              <p className="text-muted-foreground">Quanto maior, mais adequado o espaço para uma piscina.</p>
            </TooltipContent>
          </Tooltip>
          <SmartTagBadges lead={lead} max={1} />
        </div>

        <div className="space-y-1">
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

      {/* Quick action bar — visible on hover */}
      {!overlay && (
        <div className="flex items-center border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity divide-x divide-border/30">
          {lead.telefone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const phone = lead.telefone!.replace(/\D/g, '');
                const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
                window.open(`https://wa.me/${fullPhone}`, '_blank');
              }}
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
                className="text-xs min-h-[60px] resize-none mb-2"
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
}

// ── Mobile Lead Card for pipeline ──
function MobilePipelineCard({
  lead,
  basePath,
  franchiseName,
  onStageChange,
}: {
  lead: LeadWithQuiz;
  basePath: string;
  franchiseName?: string;
  onStageChange: (leadId: string) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const temp = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-xs"
    >
      <div
        className="p-3.5 cursor-pointer"
        onClick={() => navigate(`${basePath}/${lead.id}`)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {lead.nome ? lead.nome.charAt(0).toUpperCase() : '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{lead.nome || '—'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {lead.cidade && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />{lead.cidade}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
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
                    ? 'Alto interesse: bom orçamento, quer comprar em breve e tem espaço.'
                    : temp.temperature === 'morno'
                    ? 'Interesse moderado: pode precisar de mais informações.'
                    : 'Início da jornada: ainda explorando opções.'}
                </p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-bold text-primary cursor-help">{lead.pontuacao_quintal || 0}%</span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px] text-xs">
                <p className="font-semibold mb-0.5">Compatibilidade do quintal</p>
                <p className="text-muted-foreground">Quanto maior, mais adequado o espaço.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {franchiseName && (
          <div className="mt-1.5 ml-[46px]">
            <span className="text-[11px] text-muted-foreground">{franchiseName}</span>
          </div>
        )}
      </div>

      {/* Note inline form */}
      <AnimatePresence>
        {noteOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/30"
          >
            <div className="p-3 space-y-2">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escreva uma nota rápida..."
                className="text-xs min-h-[50px] resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1"
                  disabled={!noteText.trim() || savingNote}
                  onClick={handleSaveNote}
                >
                  <Send className="w-3 h-3" />
                  {savingNote ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setNoteOpen(false); setNoteText(''); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions */}
      <div className="flex items-center border-t border-border/30 divide-x divide-border/30">
        {lead.telefone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const phone = lead.telefone!.replace(/\D/g, '');
              const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
              window.open(`https://wa.me/${fullPhone}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-success hover:bg-success/5 transition-colors min-h-[44px]"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setNoteOpen(v => !v);
          }}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors min-h-[44px]"
        >
          <StickyNote className="w-3.5 h-3.5" />
          Nota
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStageChange(lead.id);
          }}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium text-primary hover:bg-primary/5 transition-colors min-h-[44px]"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          Mover
        </button>
      </div>
    </motion.div>
  );
}

// ── Droppable Column (desktop) ──
function KanbanColumn({
  status,
  leads,
  basePath,
  isOverColumn,
  franchiseMap,
  onMoveStage,
}: {
  status: string;
  leads: LeadWithQuiz[];
  basePath: string;
  isOverColumn: boolean;
  franchiseMap?: Record<string, string>;
  onMoveStage: (leadId: string, newStatus: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = STATUS_CHART_COLORS[status] || '#64748b';
  const highlighted = isOver || isOverColumn;
  const totalValue = useMemo(
    () => leads.reduce((sum, l) => sum + estimateLeadValue(l.respostas_questionario || null), 0),
    [leads]
  );

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border transition-all duration-200 min-w-[250px] w-[250px] shrink-0 ${
        highlighted
          ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/5'
          : 'border-border/40 bg-muted/20'
      }`}
    >
      <div className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider truncate">
            {STATUS_LABELS[status]}
          </h3>
          <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted/80 rounded-full px-2 py-0.5">
            {leads.length}
          </span>
        </div>
        {leads.length > 0 && (
          <div className="mt-1.5 text-[11px] font-semibold text-success">
            {formatCurrency(totalValue)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 p-2 pt-0 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-none">
        <AnimatePresence mode="popLayout">
          {leads.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                highlighted ? 'border-primary/40 bg-primary/5' : 'border-border/30'
              }`}
            >
              <p className="text-xs text-muted-foreground">
                {highlighted ? 'Solte aqui' : 'Nenhum lead'}
              </p>
            </motion.div>
          ) : (
            leads.map((lead) => (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <LeadCard
                  lead={lead}
                  basePath={basePath}
                  franchiseName={franchiseMap?.[lead.franquia_id || '']}
                  onMoveStage={onMoveStage}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Pipeline Summary ──
function PipelineSummary({ leads, franchiseMap }: { leads: LeadWithQuiz[]; franchiseMap?: Record<string, string> }) {
  const stats = useMemo(() => {
    let total = 0;
    const temps = { quente: 0, morno: 0, frio: 0 };
    const byFranchise: Record<string, { total: number; count: number }> = {};
    for (const lead of leads) {
      const val = estimateLeadValue(lead.respostas_questionario || null);
      total += val;
      const t = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
      temps[t.temperature]++;
      if (franchiseMap && lead.franquia_id) {
        if (!byFranchise[lead.franquia_id]) byFranchise[lead.franquia_id] = { total: 0, count: 0 };
        byFranchise[lead.franquia_id].total += val;
        byFranchise[lead.franquia_id].count++;
      }
    }
    return { total, temps, count: leads.length, byFranchise };
  }, [leads, franchiseMap]);

  const franchiseEntries = useMemo(() => {
    if (!franchiseMap) return [];
    return Object.entries(stats.byFranchise)
      .map(([id, data]) => ({ id, name: franchiseMap[id] || id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [stats.byFranchise, franchiseMap]);

  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 p-3 rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
      <div className="flex flex-col">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pipeline Total</span>
        <span className="text-lg font-bold text-foreground">{formatCurrency(stats.total)}</span>
        <span className="text-[11px] text-muted-foreground">{stats.count} leads</span>
      </div>
      <div className="h-10 w-px bg-border/50 hidden sm:block" />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🔥</span>
          <span className="text-sm font-bold text-warning">{stats.temps.quente}</span>
          <span className="text-[11px] text-muted-foreground">Quentes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">☀️</span>
          <span className="text-sm font-bold text-warning">{stats.temps.morno}</span>
          <span className="text-[11px] text-muted-foreground">Mornos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">❄️</span>
          <span className="text-sm font-bold text-info">{stats.temps.frio}</span>
          <span className="text-[11px] text-muted-foreground">Frios</span>
        </div>
      </div>
      {franchiseEntries.length > 0 && (
        <>
          <div className="h-10 w-px bg-border/50 hidden sm:block" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Top Franquias</span>
            {franchiseEntries.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground truncate max-w-[120px]">{f.name}</span>
                <span className="font-semibold text-foreground">{formatCurrency(f.total)}</span>
                <span className="text-muted-foreground">({f.count})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Mobile Stage Change Drawer ──
function StageChangeDrawer({
  open,
  onOpenChange,
  leadId,
  currentStatus,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  currentStatus: string;
  onConfirm: (leadId: string, newStatus: string) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-base">Para qual etapa deseja mover este lead?</DrawerTitle>
          <p className="text-xs text-muted-foreground mt-1">Selecione a nova etapa do lead no processo de vendas.</p>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2">
          {COLUMNS.map((status) => {
            const color = STATUS_CHART_COLORS[status] || '#64748b';
            const isActive = status === currentStatus;
            const descriptions: Record<string, string> = {
              novo: 'Lead acabou de chegar, ainda não foi contatado',
              contatado: 'Você já entrou em contato com o lead',
              em_negociacao: 'Lead demonstrou interesse, negociação em andamento',
              vendido: 'Venda concluída com sucesso! 🎉',
              perdido: 'Lead desistiu ou não tem mais interesse',
            };
            return (
              <button
                key={status}
                disabled={isActive}
                className={cn(
                  "w-full flex items-start gap-3 p-3.5 rounded-xl border transition-all min-h-[48px]",
                  isActive
                    ? "border-primary/30 bg-primary/5 cursor-default"
                    : "border-border/40 hover:border-primary/30 hover:bg-primary/5 cursor-pointer active:scale-[0.98]"
                )}
                onClick={() => {
                  if (leadId && !isActive) {
                    onConfirm(leadId, status);
                    onOpenChange(false);
                  }
                }}
              >
                <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: color }} />
                <div className="flex-1 text-left">
                  <span className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>
                    {STATUS_LABELS[status]}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{descriptions[status]}</p>
                </div>
                {isActive && (
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary shrink-0 mt-0.5">
                    Atual
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ── Main Board ──
export function KanbanBoard({ leads, franchiseId, basePath, franchiseMap }: KanbanBoardProps) {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, string>>({});
  const [movingLeads, setMovingLeads] = useState<Set<string>>(new Set());
  const [kanbanTipDismissed, setKanbanTipDismissed] = useState(() => !!localStorage.getItem('kanban-tip-dismissed'));
  const [tempFilter, setTempFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [franchiseFilter, setFranchiseFilter] = useState<string>('all');
  const [nameSearch, setNameSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [mobileStage, setMobileStage] = useState<string>('novo');
  const [stageDrawerOpen, setStageDrawerOpen] = useState(false);
  const [stageDrawerLeadId, setStageDrawerLeadId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocalStatusOverrides({});
  }, [leads]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.cidade) set.add(l.cidade);
    return Array.from(set).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const search = nameSearch.trim().toLowerCase();
    return leads.filter((lead) => {
      if (search && !(lead.nome || '').toLowerCase().includes(search)) return false;
      if (tempFilter !== 'all') {
        const t = classifyLead(lead.respostas_questionario || null, lead.pontuacao_quintal);
        if (t.temperature !== tempFilter) return false;
      }
      if (cityFilter !== 'all') {
        if (lead.cidade !== cityFilter) return false;
      }
      if (franchiseFilter !== 'all' && franchiseMap) {
        if (lead.franquia_id !== franchiseFilter) return false;
      }
      if (dateFrom) {
        if (new Date(lead.created_at) < dateFrom) return false;
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(lead.created_at) > end) return false;
      }
      return true;
    });
  }, [leads, tempFilter, cityFilter, franchiseFilter, nameSearch, dateFrom, dateTo, franchiseMap]);

  const hasActiveFilters = tempFilter !== 'all' || cityFilter !== 'all' || franchiseFilter !== 'all' || nameSearch.trim() !== '' || !!dateFrom || !!dateTo;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const columnData = useMemo(() => {
    const map: Record<string, LeadWithQuiz[]> = {};
    for (const col of COLUMNS) map[col] = [];
    for (const lead of filteredLeads) {
      const effectiveStatus = localStatusOverrides[lead.id] || lead.status_lead;
      const col = COLUMNS.includes(effectiveStatus as any) ? effectiveStatus : 'novo';
      (map[col] ??= []).push(lead);
    }
    for (const col of COLUMNS) {
      map[col].sort((a, b) => {
        const sa = classifyLead(a.respostas_questionario || null, a.pontuacao_quintal);
        const sb = classifyLead(b.respostas_questionario || null, b.pontuacao_quintal);
        return sa.sortOrder - sb.sortOrder;
      });
    }
    return map;
  }, [filteredLeads, localStatusOverrides]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverColumnId(event.over?.id as string || null);
  }, []);

  const moveLeadToStatus = useCallback(async (leadId: string, newStatus: string) => {
    if (movingLeads.has(leadId)) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const oldStatus = localStatusOverrides[leadId] || lead.status_lead;
    if (oldStatus === newStatus) return;

    setMovingLeads(prev => new Set(prev).add(leadId));
    setLocalStatusOverrides((prev) => ({ ...prev, [leadId]: newStatus }));

    const { error } = await supabase
      .from('leads')
      .update({ status_lead: newStatus as any })
      .eq('id', leadId);

    if (error) {
      setLocalStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
      setMovingLeads(prev => { const next = new Set(prev); next.delete(leadId); return next; });
      toast.error('Erro ao atualizar status');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: user.id,
        activity_type: 'status_change',
        content: `${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[newStatus]}`,
      });
    }

    setMovingLeads(prev => { const next = new Set(prev); next.delete(leadId); return next; });
    toast.success(`Lead movido para ${STATUS_LABELS[newStatus]}`);
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-all', franchiseId] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-table', franchiseId] });
  }, [leads, localStatusOverrides, franchiseId, queryClient, movingLeads]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);
    if (!over) return;
    await moveLeadToStatus(active.id as string, over.id as string);
  }, [moveLeadToStatus]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleMobileStageChange = useCallback((leadId: string) => {
    setStageDrawerLeadId(leadId);
    setStageDrawerOpen(true);
  }, []);

  const getLeadCurrentStatus = useCallback((leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return 'novo';
    return localStatusOverrides[leadId] || lead.status_lead;
  }, [leads, localStatusOverrides]);

  // Mobile pipeline view
  if (isMobile) {
    const currentStageLeads = columnData[mobileStage] || [];
    const stageValue = currentStageLeads.reduce((sum, l) => sum + estimateLeadValue(l.respostas_questionario || null), 0);

    return (
      <>
        <PipelineSummary leads={filteredLeads} franchiseMap={franchiseMap} />

        {/* Search + filter button */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead..."
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="pl-8 h-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 relative"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">!</span>
            )}
          </Button>
        </div>

        {/* Stage tabs - scrollable */}
        <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-none pb-1">
          {COLUMNS.map((status) => {
            const color = STATUS_CHART_COLORS[status] || '#64748b';
            const count = (columnData[status] || []).length;
            const isActive = mobileStage === status;
            return (
              <button
                key={status}
                onClick={() => setMobileStage(status)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[40px] shrink-0",
                  isActive
                    ? "bg-card shadow-sm border border-border/50 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {STATUS_LABELS[status]}
                <span className={cn(
                  "text-[10px] rounded-full px-1.5 py-0.5",
                  isActive ? "bg-primary/10 text-primary font-bold" : "bg-muted/80 text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stage value */}
        {currentStageLeads.length > 0 && (
          <div className="text-xs text-muted-foreground mb-3">
            <span className="font-semibold text-foreground">{formatCurrency(stageValue)}</span> em {currentStageLeads.length} leads
          </div>
        )}

        {/* Cards for current stage */}
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {currentStageLeads.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border-2 border-dashed border-border/30 p-12 text-center"
              >
                <p className="text-sm text-muted-foreground">Nenhum lead nesta etapa</p>
              </motion.div>
            ) : (
              currentStageLeads.map((lead) => (
                <MobilePipelineCard
                  key={lead.id}
                  lead={lead}
                  basePath={basePath}
                  franchiseName={franchiseMap?.[lead.franquia_id || '']}
                  onStageChange={handleMobileStageChange}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        <StageChangeDrawer
          open={stageDrawerOpen}
          onOpenChange={setStageDrawerOpen}
          leadId={stageDrawerLeadId}
          currentStatus={stageDrawerLeadId ? getLeadCurrentStatus(stageDrawerLeadId) : 'novo'}
          onConfirm={moveLeadToStatus}
        />

        {/* Mobile filter drawer */}
        <Drawer open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Filtros do Pipeline
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Temperatura</label>
                <Select value={tempFilter} onValueChange={setTempFilter}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas temperaturas</SelectItem>
                    <SelectItem value="quente">🔥 Quente</SelectItem>
                    <SelectItem value="morno">☀️ Morno</SelectItem>
                    <SelectItem value="frio">❄️ Frio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas cidades</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {franchiseMap && Object.keys(franchiseMap).length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Franquia</label>
                  <Select value={franchiseFilter} onValueChange={setFranchiseFilter}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas franquias</SelectItem>
                      {Object.entries(franchiseMap).sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => { setTempFilter('all'); setCityFilter('all'); setFranchiseFilter('all'); setNameSearch(''); setDateFrom(undefined); setDateTo(undefined); }}
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Limpar filtros
                </Button>
              )}
              <DrawerClose asChild>
                <Button className="w-full" size="lg">Aplicar</Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop Kanban
  return (
    <>
      <PipelineSummary leads={filteredLeads} franchiseMap={franchiseMap} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            className="w-[160px] h-8 text-xs pl-7"
          />
        </div>

        <Select value={tempFilter} onValueChange={setTempFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Temperatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas temperaturas</SelectItem>
            <SelectItem value="quente">🔥 Quente</SelectItem>
            <SelectItem value="morno">☀️ Morno</SelectItem>
            <SelectItem value="frio">❄️ Frio</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas cidades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {franchiseMap && Object.keys(franchiseMap).length > 0 && (
          <Select value={franchiseFilter} onValueChange={setFranchiseFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Franquia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas franquias</SelectItem>
              {Object.entries(franchiseMap).sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", dateFrom && "text-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", dateTo && "text-foreground")}>
              <CalendarIcon className="w-3.5 h-3.5" />
              {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => { setTempFilter('all'); setCityFilter('all'); setFranchiseFilter('all'); setNameSearch(''); setDateFrom(undefined); setDateTo(undefined); }}
          >
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        )}

        {hasActiveFilters && (
          <span className="text-[11px] text-muted-foreground">
            {filteredLeads.length} de {leads.length} leads
          </span>
        )}
      </div>

      {/* Onboarding tip for first-time users */}
      {!kanbanTipDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 mb-4 rounded-xl border border-primary/20 bg-primary/5"
        >
          <span className="text-sm">💡</span>
          <p className="text-xs text-foreground flex-1">
            <span className="font-semibold">Dica:</span> Arraste os cards entre as colunas para mudar o status do lead.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-muted-foreground shrink-0"
            onClick={() => { localStorage.setItem('kanban-tip-dismissed', 'true'); setKanbanTipDismissed(true); }}
          >
            Entendi
          </Button>
        </motion.div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              leads={columnData[status]}
              basePath={basePath}
              isOverColumn={overColumnId === status}
              franchiseMap={franchiseMap}
              onMoveStage={moveLeadToStatus}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {activeLead ? (
            <LeadCard lead={activeLead} basePath={basePath} overlay franchiseName={franchiseMap?.[activeLead.franquia_id || '']} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
