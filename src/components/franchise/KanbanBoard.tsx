import { useState, useMemo, useCallback, useEffect } from 'react';
import { SwipeableLeadCard } from '@/components/dashboard/SwipeableLeadCard';
import { useQuery } from '@tanstack/react-query';
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
import { STATUS_LABELS } from '@/lib/lead-constants';
import { classifyLead } from '@/lib/leadScoring';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Filter, X, Search, CalendarIcon, SlidersHorizontal, UserPlus, Upload } from 'lucide-react';
import { ManualLeadForm } from '@/components/franchise/ManualLeadForm';
import { CSVLeadImport } from '@/components/franchise/CSVLeadImport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';

import { COLUMNS, estimateLeadValue, type LeadWithQuiz } from './kanban/types';
import { LeadCard } from './kanban/LeadCard';
import { MobilePipelineCard } from './kanban/MobilePipelineCard';
import { KanbanColumn } from './kanban/KanbanColumn';
import { PipelineSummary } from './kanban/PipelineSummary';
import { StageChangeDrawer } from './kanban/StageChangeDrawer';
import { BulkActionsBar } from './kanban/BulkActionsBar';
import { STATUS_CHART_COLORS } from '@/lib/lead-constants';

interface KanbanBoardProps {
  leads: LeadWithQuiz[];
  franchiseId: string;
  basePath: string;
  franchiseMap?: Record<string, string>;
}

export { type LeadWithQuiz } from './kanban/types';

export function KanbanBoard({ leads, franchiseId, basePath, franchiseMap }: KanbanBoardProps) {
  const { user: authUser } = useAuth();
  const isMobile = useIsMobile();

  const { data: franchise } = useQuery({
    queryKey: ['franchise-whatsapp-plan', franchiseId],
    queryFn: async () => {
      const { data } = await supabase.from('franchises').select('whatsapp_plan_active').eq('id', franchiseId).maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const whatsAppPlanActive = franchise?.whatsapp_plan_active ?? false;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [localStatusOverrides, setLocalStatusOverrides] = useState<Record<string, string>>({});
  const [movingLeads, setMovingLeads] = useState<Set<string>>(new Set());
  const [kanbanTipDismissed, setKanbanTipDismissed] = useState(() => !!localStorage.getItem('kanban-tip-dismissed'));
  const [tempFilter, setTempFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');
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
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const { data: franchiseProfiles = [] } = useQuery({
    queryKey: ['franchise-profiles', franchiseId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name').eq('franquia_id', franchiseId);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const toggleSelect = useCallback((leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  }, []);


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
      if (cityFilter !== 'all' && lead.cidade !== cityFilter) return false;
      if (originFilter !== 'all') {
        const isLeadOriginValue = ['quiz', 'manual', 'csv_import'].includes(originFilter);
        if (isLeadOriginValue) {
          if ((lead.lead_origin || 'quiz') !== originFilter) return false;
        } else {
          if ((lead.utm_source || '') !== originFilter) return false;
        }
      }
      if (franchiseFilter !== 'all' && franchiseMap && lead.franquia_id !== franchiseFilter) return false;
      if (dateFrom && new Date(lead.created_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(lead.created_at) > end) return false;
      }
      return true;
    });
  }, [leads, tempFilter, originFilter, cityFilter, franchiseFilter, nameSearch, dateFrom, dateTo, franchiseMap]);

  const hasActiveFilters = tempFilter !== 'all' || originFilter !== 'all' || cityFilter !== 'all' || franchiseFilter !== 'all' || nameSearch.trim() !== '' || !!dateFrom || !!dateTo;

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

  const moveLeadToStatus = useCallback(async (leadId: string, newStatus: string, lossReason?: string) => {
    if (movingLeads.has(leadId)) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const oldStatus = localStatusOverrides[leadId] || lead.status_lead;
    if (oldStatus === newStatus) return;

    setMovingLeads(prev => new Set(prev).add(leadId));
    setLocalStatusOverrides((prev) => ({ ...prev, [leadId]: newStatus }));

    const updatePayload: Record<string, any> = { status_lead: newStatus as any };
    if (newStatus === 'perdido' && lossReason) {
      updatePayload.loss_reason = lossReason;
    } else if (newStatus !== 'perdido') {
      updatePayload.loss_reason = null;
    }

    const { error } = await supabase
      .from('leads')
      .update(updatePayload)
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

    const currentUser = authUser;
    if (currentUser) {
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        user_id: currentUser.id,
        activity_type: 'status_change',
        content: `${STATUS_LABELS[oldStatus]} → ${STATUS_LABELS[newStatus]}${lossReason ? ` (Motivo: ${lossReason})` : ''}`,
      });
    }

    setMovingLeads(prev => { const next = new Set(prev); next.delete(leadId); return next; });
    if (newStatus === 'vendido') {
      const { fireConfetti, haptic } = await import('@/lib/celebrations');
      fireConfetti();
      haptic('heavy');
      toast.success('🎉 Venda registrada! Parabens!');
    } else if (newStatus === 'perdido') {
      toast.success('Lead finalizado. Motivo registrado.');
    } else {
      toast.success(`Lead movido para ${STATUS_LABELS[newStatus]}`);
    }
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-all', franchiseId] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-table', franchiseId] });
  }, [leads, localStatusOverrides, franchiseId, queryClient, movingLeads, authUser]);

  const handleBulkMove = useCallback(async (ids: string[], newStatus: string) => {
    const results = await Promise.allSettled(
      ids.map(id => moveLeadToStatus(id, newStatus))
    );
    const success = results.filter(r => r.status === 'fulfilled').length;
    toast.success(`${success} leads movidos para ${STATUS_LABELS[newStatus]}`);
  }, [moveLeadToStatus]);

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

  const clearAllFilters = useCallback(() => {
    setTempFilter('all');
    setOriginFilter('all');
    setCityFilter('all');
    setFranchiseFilter('all');
    setNameSearch('');
    setDateFrom(undefined);
    setDateTo(undefined);
  }, []);

  // Mobile pipeline view
  if (isMobile) {
    const currentStageLeads = columnData[mobileStage] || [];
    return (
      <>
        <PipelineSummary leads={filteredLeads} franchiseMap={franchiseMap} />

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
          <ManualLeadForm
            franchiseId={franchiseId}
            trigger={
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Novo Lead">
                <UserPlus className="w-4 h-4" />
              </Button>
            }
          />
          <CSVLeadImport
            franchiseId={franchiseId}
            trigger={
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Importar CSV">
                <Upload className="w-4 h-4" />
              </Button>
            }
          />
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

        {currentStageLeads.length > 0 && (
          <div className="text-xs text-muted-foreground mb-3">
            <span className="font-semibold text-foreground">{currentStageLeads.reduce((sum, l) => sum + estimateLeadValue(l.respostas_questionario || null), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}</span> em {currentStageLeads.length} leads
          </div>
        )}

        <div className="space-y-2.5">
            {currentStageLeads.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border/30 p-12 text-center animate-fade-in">
                <p className="text-sm text-muted-foreground">Nenhum lead nesta etapa</p>
              </div>
            ) : (
              currentStageLeads.map((lead) => (
                <SwipeableLeadCard key={lead.id} leadPhone={lead.telefone} leadName={lead.nome}>
                  <MobilePipelineCard
                    lead={lead}
                    basePath={basePath}
                    franchiseName={franchiseMap?.[lead.franquia_id || '']}
                    onStageChange={handleMobileStageChange}
                  />
                </SwipeableLeadCard>
              ))
            )}
        </div>

        <StageChangeDrawer
          open={stageDrawerOpen}
          onOpenChange={setStageDrawerOpen}
          leadId={stageDrawerLeadId}
          currentStatus={stageDrawerLeadId ? getLeadCurrentStatus(stageDrawerLeadId) : 'novo'}
          onConfirm={moveLeadToStatus}
        />

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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Origem</label>
                <Select value={originFilter} onValueChange={setOriginFilter}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas origens</SelectItem>
                    <SelectItem value="quiz">📝 Quiz</SelectItem>
                    <SelectItem value="manual">✏️ Manual</SelectItem>
                    <SelectItem value="csv_import">📄 CSV</SelectItem>
                    <SelectItem value="instagram">📸 Instagram</SelectItem>
                    <SelectItem value="facebook">📘 Facebook</SelectItem>
                    <SelectItem value="google">🔍 Google Ads</SelectItem>
                    <SelectItem value="indicacao">🤝 Indicação</SelectItem>
                    <SelectItem value="organico">🌱 Orgânico</SelectItem>
                    <SelectItem value="tiktok">🎵 TikTok</SelectItem>
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
                <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={clearAllFilters}>
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

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <ManualLeadForm franchiseId={franchiseId} />
        <CSVLeadImport franchiseId={franchiseId} />
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
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Temperatura" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas temperaturas</SelectItem>
            <SelectItem value="quente">🔥 Quente</SelectItem>
            <SelectItem value="morno">☀️ Morno</SelectItem>
            <SelectItem value="frio">❄️ Frio</SelectItem>
          </SelectContent>
        </Select>

        <Select value={originFilter} onValueChange={setOriginFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="quiz">📝 Quiz</SelectItem>
            <SelectItem value="manual">✏️ Manual</SelectItem>
            <SelectItem value="csv_import">📄 CSV</SelectItem>
            <SelectItem value="instagram">📸 Instagram</SelectItem>
            <SelectItem value="facebook">📘 Facebook</SelectItem>
            <SelectItem value="google">🔍 Google Ads</SelectItem>
            <SelectItem value="indicacao">🤝 Indicação</SelectItem>
            <SelectItem value="organico">🌱 Orgânico</SelectItem>
            <SelectItem value="tiktok">🎵 TikTok</SelectItem>
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas cidades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {franchiseMap && Object.keys(franchiseMap).length > 0 && (
          <Select value={franchiseFilter} onValueChange={setFranchiseFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Franquia" /></SelectTrigger>
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
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={clearAllFilters}>
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

      {!kanbanTipDismissed && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-4 rounded-xl border border-primary/20 bg-primary/5 animate-fade-in">
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
        </div>
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
              franchiseId={franchiseId}
              whatsAppPlanActive={whatsAppPlanActive}
              selectedIds={selectedLeadIds}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
          {activeLead ? (
            <LeadCard lead={activeLead} basePath={basePath} overlay franchiseName={franchiseMap?.[activeLead.franquia_id || '']} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <BulkActionsBar
        selectedIds={selectedLeadIds}
        leads={filteredLeads}
        franchiseId={franchiseId}
        profiles={franchiseProfiles}
        whatsAppPlanActive={whatsAppPlanActive}
        onClearSelection={() => setSelectedLeadIds([])}
        onMoveLeads={handleBulkMove}
      />
    </>
  );
}
