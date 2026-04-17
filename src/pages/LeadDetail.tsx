import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Phone, Mail, MapPin, Droplets, Camera, ClipboardList, ClipboardCheck, Settings2, X, ChevronDown, Package, FileText, HelpCircle, Plus, TrendingUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/BackButton';
import { PanelHeader } from '@/components/PanelHeader';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LeadFollowups } from '@/components/franchise/LeadFollowups';
import { PhotoLightbox } from '@/components/lead/PhotoLightbox';
import { InactivityBadge } from '@/components/lead/InactivityBadge';
import { UnifiedConversation } from '@/components/lead/UnifiedConversation';



import { LeadPhotoUpload } from '@/components/lead/LeadPhotoUpload';
import { LeadLinkedProposals } from '@/components/lead/LeadLinkedProposals';

import { WhatsAppTemplates } from '@/components/lead/WhatsAppTemplates';
import { LeadTagsSection } from '@/components/lead/LeadTagsSection';
import { PostSaleSection } from '@/components/lead/PostSaleSection';
import { TechnicalVisitSection } from '@/components/lead/TechnicalVisitSection';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


import { useAuth } from '@/hooks/useAuth';
import { triggerWhatsAppAuto } from '@/lib/whatsapp-auto';

import { classifyLead, type LeadTemperature } from '@/lib/leadScoring';
import { toast } from 'sonner';
import { isValidBRPhone, isValidEmail } from '@/lib/validation';
import { motion, AnimatePresence } from 'framer-motion';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { toWhatsAppPhone } from '@/lib/phone-utils';

interface Lead {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
  modelo_vendido: string | null;
  valor_venda: number | null;
  respostas_questionario: Record<string, string> | null;
  foto1: string | null;
  foto2: string | null;
  foto3: string | null;
  foto4: string | null;
  status_lead: string;
  observacoes: string | null;
  created_at: string;
  origin_franchise_id: string | null;
  territory_match_status: string | null;
  coverage_match_count: number | null;
  distribution_rule_used: string | null;
  franquia_id: string | null;
  lead_origin?: string;
  loss_reason?: string | null;
  assigned_to?: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-card text-foreground border-border' },
  contatado: { label: 'Contatado', color: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-700' },
  em_negociacao: { label: 'Em Negociação', color: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700' },
  vendido: { label: 'Vendido', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700' },
  perdido: { label: 'Perdido', color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700' },
};

const questionLabels: Record<string, { label: string; icon: string }> = {
  espaco: { label: 'Espaço disponível', icon: '📏' },
  moradia: { label: 'Situação da casa', icon: '🏠' },
  uso: { label: 'Perfil de uso', icon: '👨‍👩‍👧‍👦' },
  intencao: { label: 'Quando pretende comprar', icon: '📅' },
  preferencia: { label: 'Preferência', icon: '✨' },
  orcamento: { label: 'Orçamento estimado', icon: '💰' },
  cidade: { label: 'Cidade', icon: '📍' },
};

const answerLabels: Record<string, string> = {
  'ate-3': 'Até 3 metros',
  '3-5': 'Entre 3 e 5 metros',
  '5-7': 'Entre 5 e 7 metros',
  'mais-7': 'Mais de 7 metros',
  'minha': 'Já é minha casa',
  'construindo': 'Estou construindo',
  'planejando': 'Ainda estou planejando',
  'relaxar': 'Relaxar e desacelerar',
  'filhos': 'Curtir com os filhos',
  'familia': 'Reunir a família',
  'amigos': 'Churrascos e festas',
  'valorizar': 'Valorizar a casa',
  '2026': 'Ainda em 2026',
  '2026-2027': 'Talvez em 2026 ou 2027',
  'pesquisando': 'Só estou pesquisando',
  'prainha': 'Prainha',
  'spa': 'Spa ou Hidromassagem',
  'simples': 'Piscina clássica',
  'nao-sei': 'Ainda não sei',
  'ate-18': 'Até R$ 18 mil',
  '18-30': 'R$ 18 a 30 mil',
  '30-50': 'R$ 30 a 50 mil',
};

function getInitials(nome: string | null): string {
  if (!nome) return '?';
  const parts = nome.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

function getAvatarColor(nome: string | null): string {
  if (!nome) return AVATAR_COLORS[0];
  const idx = nome.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function estimateValueRange(respostas: Record<string, string> | null): string | null {
  if (!respostas) return null;
  const budget = respostas.orcamento;
  const pref = respostas.preferencia;
  const space = respostas.espaco;
  let min = 15000;
  let max = 25000;
  if (budget === '30-50') { min = 30000; max = 50000; }
  else if (budget === '18-30') { min = 18000; max = 30000; }
  else if (budget === 'ate-18') { min = 12000; max = 18000; }
  else return null;
  if (pref === 'spa') { min *= 1.15; max *= 1.15; }
  if (pref === 'prainha') { min *= 1.1; max *= 1.1; }
  if (space === 'mais-7') { min *= 1.1; max *= 1.1; }
  min = Math.round(min / 1000);
  max = Math.round(max / 1000);
  return `R$ ${min}–${max} mil`;
}

export default function LeadDetail() {
  const { franchiseId, user } = useAuth();
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [modeloVendido, setModeloVendido] = useState('');
  const [valorVendaInput, setValorVendaInput] = useState('');
  const [tempOverride, setTempOverride] = useState<LeadTemperature | ''>('');
  const [saving, setSaving] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [activeTab, setActiveTab] = useState('conversa');
  const [manageOpen, setManageOpen] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);

  const { data: poolModels = [] } = useQuery({
    queryKey: ['pool-models'],
    queryFn: async () => {
      const { data } = await supabase.from('pool_models').select('nome_modelo').order('nome_modelo');
      return data?.map(m => m.nome_modelo) || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: lead, isLoading: loading } = useQuery({
    queryKey: ['lead-detail', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, nome, telefone, email, cidade, pontuacao_quintal, modelo_recomendado, modelo_vendido, valor_venda, respostas_questionario, foto1, foto2, foto3, foto4, status_lead, observacoes, created_at, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, franquia_id, lead_origin, loss_reason, assigned_to')
        .eq('id', id!)
        .maybeSingle();
      return data ? (data as Lead) : null;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: lastActivityAt = null } = useQuery({
    queryKey: ['lead-last-activity', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_activities')
        .select('created_at')
        .eq('lead_id', id!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.created_at ?? null;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

  const leadFranchiseId = lead?.franquia_id || franchiseId;
  const { data: franchiseUsers = [] } = useQuery({
    queryKey: ['franchise-users', leadFranchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('franquia_id', leadFranchiseId!);
      return (data || []).filter((u: any) => u.full_name);
    },
    enabled: !!leadFranchiseId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (lead) {
      setStatus(lead.status_lead);
      setObservacoes(lead.observacoes || '');
      setModeloVendido(lead.modelo_vendido || '');
      setValorVendaInput(
        lead.valor_venda != null
          ? lead.valor_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : ''
      );
      setEditNome(lead.nome || '');
      setEditTelefone(lead.telefone || '');
      setEditEmail(lead.email || '');
      setEditCidade(lead.cidade || '');
      setAssignedTo(lead.assigned_to || null);
      const respostas = lead.respostas_questionario as Record<string, string> | null;
      setTempOverride((respostas?.temperatura_manual as LeadTemperature) || '');
    }
  }, [lead?.id]);

  const parsedValorVenda = (() => {
    const cleaned = valorVendaInput.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  })();

  const save = async () => {
    if (!lead) return;
    if (!editNome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editEmail.trim() && !isValidEmail(editEmail.trim())) { toast.error('E-mail inválido'); return; }
    if (editTelefone.trim()) {
      const digits = editTelefone.replace(/\D/g, '');
      if (!isValidBRPhone(digits)) { toast.error('Telefone inválido (ex: 11999998888)'); return; }
    }
    if (status === 'vendido' && parsedValorVenda <= 0) {
      toast.error('Informe o valor total da venda para registrar o fechamento.');
      return;
    }
    setSaving(true);

    if (status !== lead.status_lead) {
      if (user) {
        const oldLabel = statusConfig[lead.status_lead]?.label || lead.status_lead;
        const newLabel = statusConfig[status]?.label || status;
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          user_id: user.id,
          activity_type: 'status_change',
          content: `Status alterado de "${oldLabel}" para "${newLabel}"`,
        });
      }
    }

    const updatedRespostas = { ...(lead.respostas_questionario || {}) };
    const oldTemp = (lead.respostas_questionario as Record<string, string> | null)?.temperatura_manual || '';
    if (tempOverride) {
      updatedRespostas.temperatura_manual = tempOverride;
    } else {
      delete updatedRespostas.temperatura_manual;
    }

    const tempChanged = tempOverride !== oldTemp;
    if (tempChanged) {
      if (user) {
        const TEMP_LABELS: Record<string, string> = { quente: '🔥 Quente', morno: '☀️ Morno', frio: '❄️ Frio', '': '🤖 Automático' };
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          user_id: user.id,
          activity_type: 'temperature_change',
          content: `Temperatura alterada de "${TEMP_LABELS[oldTemp] || '🤖 Automático'}" para "${TEMP_LABELS[tempOverride] || '🤖 Automático'}"`,
        });
      }
    }

    const { error } = await supabase
      .from('leads')
      .update({
        nome: editNome.trim() || null,
        telefone: editTelefone.trim() || null,
        email: editEmail.trim() || null,
        cidade: editCidade.trim() || null,
        status_lead: status as any,
        observacoes,
        modelo_vendido: status === 'vendido' && modeloVendido ? modeloVendido : null,
        valor_venda: status === 'vendido' ? parsedValorVenda : null,
        respostas_questionario: Object.keys(updatedRespostas).length > 0 ? updatedRespostas : null,
      })
      .eq('id', lead.id);
    setSaving(false);
    if (!error) {
      toast.success('Alterações salvas com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['franchise-leads-all'] });
      queryClient.invalidateQueries({ queryKey: ['franchise-leads-table'] });
      queryClient.invalidateQueries({ queryKey: ['admin-leads-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-leads-table'] });
      setManageOpen(false);
    } else {
      toast.error('Erro ao salvar.');
    }
  };

  const [autoSaving, setAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
  }, []);

  const autoSaveField = useCallback(async (field: 'status' | 'temperature', newValue: string) => {
    if (!lead) return;
    setAutoSaving(true);

    const currentRespostas = { ...(lead.respostas_questionario || {}) } as Record<string, string>;
    const currentUser = user;

    if (field === 'status') {
      if (newValue !== lead.status_lead && currentUser) {
        const oldLabel = statusConfig[lead.status_lead]?.label || lead.status_lead;
        const newLabel = statusConfig[newValue]?.label || newValue;
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          user_id: currentUser.id,
          activity_type: 'status_change',
          content: `Status alterado de "${oldLabel}" para "${newLabel}"`,
        });
      }
      const { error } = await supabase.from('leads').update({ status_lead: newValue as any }).eq('id', lead.id);
      if (error) { toast.error('Erro ao salvar status'); setAutoSaving(false); return; }
      if (newValue === 'em_negociacao') {
        triggerWhatsAppAuto({ trigger_event: 'lead_negotiation', lead_id: lead.id, franchise_id: lead.franquia_id || undefined });
      }
    }

    if (field === 'temperature') {
      const TEMP_LABELS: Record<string, string> = { quente: '🔥 Quente', morno: '☀️ Morno', frio: '❄️ Frio', '': '🤖 Automático' };
      const oldTemp = currentRespostas.temperatura_manual || '';
      if (newValue !== oldTemp && currentUser) {
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          user_id: currentUser.id,
          activity_type: 'temperature_change',
          content: `Temperatura alterada de "${TEMP_LABELS[oldTemp] || '🤖 Automático'}" para "${TEMP_LABELS[newValue] || '🤖 Automático'}"`,
        });
      }
      const updatedRespostas = { ...currentRespostas };
      if (newValue) { updatedRespostas.temperatura_manual = newValue; } else { delete updatedRespostas.temperatura_manual; }
      const { error } = await supabase.from('leads').update({
        respostas_questionario: Object.keys(updatedRespostas).length > 0 ? updatedRespostas : null,
      }).eq('id', lead.id);
      if (error) { toast.error('Erro ao salvar temperatura'); setAutoSaving(false); return; }
    }

    setAutoSaving(false);
    queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-all'] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-table'] });
    queryClient.invalidateQueries({ queryKey: ['admin-leads-all'] });
    queryClient.invalidateQueries({ queryKey: ['admin-leads-table'] });
  }, [lead, id, queryClient, user]);

  const handleStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus);
    autoSaveField('status', newStatus);
    if (newStatus === 'vendido') {
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      });
    }
  }, [autoSaveField]);

  const handleTempChange = useCallback((newTemp: LeadTemperature | '') => {
    setTempOverride(newTemp);
    autoSaveField('temperature', newTemp);
  }, [autoSaveField]);

  const photos = lead ? [lead.foto1, lead.foto2, lead.foto3, lead.foto4].filter(Boolean) as string[] : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Lead não encontrado.</p>
      </div>
    );
  }

  void statusConfig;
  const isAdminRoute = location.pathname.startsWith('/admin');
  const leadsUrl = isAdminRoute ? '/admin?tab=leads' : '/franquia';
  const returnTo = ((location.state as { returnTo?: string } | null)?.returnTo) || leadsUrl;
  const breadcrumbItems = [
    { label: isAdminRoute ? 'Admin' : 'Painel', href: isAdminRoute ? '/admin' : '/franquia' },
    { label: 'Leads', href: returnTo },
    { label: lead.nome || 'Detalhes' },
  ];

  const liveRespostas = { ...(lead.respostas_questionario || {}) };
  if (tempOverride) liveRespostas.temperatura_manual = tempOverride;
  else delete liveRespostas.temperatura_manual;
  const temp = classifyLead(Object.keys(liveRespostas).length > 0 ? liveRespostas : null, lead.pontuacao_quintal);

  const quizEntriesEarly = lead.respostas_questionario
    ? Object.entries(lead.respostas_questionario).filter(([key]) => questionLabels[key])
    : [];

  const tabs = [
    { value: 'dados', icon: HelpCircle, label: 'Dados' },
    { value: 'visita', icon: ClipboardCheck, label: 'Visita Técnica' },
    { value: 'proposta', icon: FileText, label: 'Proposta' },
    { value: 'conversa', icon: MessageCircle, label: 'Conversa' },
    ...(quizEntriesEarly.length > 0 ? [{ value: 'quiz', icon: ClipboardList, label: 'Quiz' }] : []),
    { value: 'fotos', icon: Camera, label: 'Fotos' },
    ...(lead.status_lead === 'vendido' ? [{ value: 'pos-venda', icon: Package, label: 'Pós-venda' }] : []),
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <PanelHeader title={lead.nome || 'Detalhes do Lead'}>
        <BackButton fallback={returnTo} />
        <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
        <Button variant="ghost" size="icon" onClick={() => setManageOpen(true)} title="Gerenciar lead">
          <Settings2 className="w-4 h-4" />
        </Button>
        <NotificationBell />
        <UserAvatarMenu />
      </PanelHeader>

      <div className="max-w-2xl mx-auto">
        <div className="px-3 sm:px-4 pt-3">
          <Breadcrumbs className="md:hidden" items={breadcrumbItems} />
        </div>

        {/* ZONA 1 — Hero unificado (perfil + pipeline + métricas) */}
        <div className="bg-gradient-to-b from-muted/40 to-background px-4 pt-4 pb-5">
          {/* Linha 1: Avatar do lead + Nome + Avatar do responsável */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-md"
              style={{ backgroundColor: getAvatarColor(lead.nome) }}
            >
              {getInitials(lead.nome)}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground leading-tight truncate">
                {lead.nome || 'Lead sem nome'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                {lead.cidade && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{lead.cidade}
                  </span>
                )}
                <InactivityBadge createdAt={lead.created_at} lastActivityAt={lastActivityAt} />
              </div>
            </div>

            {/* Avatar do responsável clicável */}
            <div className="flex flex-col items-center shrink-0">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Responsável</span>
              <Select
                value={assignedTo || '_none'}
                onValueChange={async (val) => {
                  const newVal = val === '_none' ? null : val;
                  setAssignedTo(newVal);
                  await supabase.from('leads').update({ assigned_to: newVal } as any).eq('id', lead.id);
                  queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
                  toast.success('Responsável atualizado');
                }}
              >
                <SelectTrigger className="h-auto w-auto p-0 border-0 bg-transparent hover:opacity-80 transition-opacity [&>svg]:hidden" title="Clique para trocar o responsável">
                  {(() => {
                    const assignedUser = franchiseUsers.find((u: any) => u.user_id === assignedTo) as any;
                    if (assignedUser?.full_name) {
                      return (
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/15 border-2 border-background shadow-sm flex items-center justify-center">
                              <span className="text-[11px] font-bold text-primary">{getInitials(assignedUser.full_name)}</span>
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                              <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
                            </div>
                          </div>
                          <span className="text-[9px] text-muted-foreground max-w-[60px] truncate mt-0.5">{assignedUser.full_name.split(' ')[0]}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-10 h-10 rounded-full bg-muted border-2 border-dashed border-primary/40 flex items-center justify-center animate-pulse">
                          <Plus className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-[9px] font-semibold text-primary">Atribuir</span>
                      </div>
                    );
                  })()}
                </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="_none">Sem responsável</SelectItem>
                {franchiseUsers.map((u: any) => (
                  <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>

          {/* Linha 2: Pipeline visual de status */}
          {(() => {
            const pipeline = [
              { key: 'novo', label: 'Novo', color: 'bg-slate-400' },
              { key: 'contatado', label: 'Contatado', color: 'bg-sky-500' },
              { key: 'em_negociacao', label: 'Negociação', color: 'bg-amber-500' },
              { key: 'vendido', label: 'Vendido', color: 'bg-emerald-500' },
            ];
            const currentIdx = pipeline.findIndex(p => p.key === status);
            const isLost = status === 'perdido';

            return (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Etapa do funil <span className="hidden sm:inline normal-case tracking-normal text-muted-foreground/70 font-normal">· toque para mover</span>
                  </span>
                  {isLost ? (
                    <span className="text-[10px] font-semibold text-destructive">💔 Perdido</span>
                  ) : (
                    <button
                      onClick={() => handleStatusChange('perdido')}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Marcar perdido
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {pipeline.map((step, i) => {
                    const isActive = !isLost && i <= currentIdx;
                    const isCurrent = !isLost && i === currentIdx;
                    return (
                      <button
                        key={step.key}
                        onClick={() => handleStatusChange(step.key)}
                        disabled={autoSaving}
                        className={`flex-1 group flex flex-col items-center gap-1 ${autoSaving ? 'opacity-70' : ''}`}
                        title={`Mover para ${step.label}`}
                      >
                        <div className={`h-1.5 w-full rounded-full transition-all ${isActive && !isLost ? step.color : 'bg-muted'} ${isCurrent ? 'h-2' : ''}`} />
                        <span className={`text-[10px] font-medium transition-colors ${isCurrent ? 'text-foreground' : isActive ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                          {step.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Linha 3: Métricas (temperatura + score + valor) */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Chips de temperatura */}
            <div className="flex items-center gap-1 bg-muted/60 rounded-full p-0.5">
              {[
                { val: 'quente' as const, emoji: '🔥', label: 'Quente' },
                { val: 'morno' as const, emoji: '☀️', label: 'Morno' },
                { val: 'frio' as const, emoji: '❄️', label: 'Frio' },
              ].map((t) => {
                const active = (tempOverride || temp.temperature) === t.val;
                return (
                  <button
                    key={t.val}
                    onClick={() => handleTempChange(active && tempOverride === t.val ? '' : t.val)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-all ${active ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    title={tempOverride === t.val ? 'Clique para voltar ao automático' : `Marcar como ${t.label}`}
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>

            {lead.pontuacao_quintal != null && (
              <div className="flex items-center gap-1.5 ml-auto" title="Score do quintal">
                <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${lead.pontuacao_quintal >= 70 ? 'bg-emerald-500' : lead.pontuacao_quintal >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                    style={{ width: `${lead.pontuacao_quintal}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{lead.pontuacao_quintal}%</span>
              </div>
            )}
          </div>

          {/* Linha 4: Infos contextuais (modelo + valor) */}
          {(lead.modelo_recomendado || estimateValueRange(lead.respostas_questionario)) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3 pb-3 border-b border-border/40">
              {lead.modelo_recomendado && (
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-primary" />
                  <strong className="text-foreground font-semibold">{lead.modelo_recomendado}</strong>
                </span>
              )}
              {(() => {
                const estimate = estimateValueRange(lead.respostas_questionario);
                return estimate ? (
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                    <strong className="text-foreground font-semibold">{estimate}</strong>
                  </span>
                ) : null;
              })()}
            </div>
          )}

          {lead.status_lead === 'perdido' && lead.loss_reason && (
            <div className="flex items-center gap-2 text-xs text-destructive mb-3">
              💔 <span>Motivo: {lead.loss_reason}</span>
            </div>
          )}

          {(franchiseId || lead.franquia_id) && (
            <div className="mb-4">
              <LeadTagsSection leadId={lead.id} franchiseId={(franchiseId || lead.franquia_id)!} />
            </div>
          )}

          <div className="flex gap-2">
            {lead.telefone ? (
              <>
                <Button
                  className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white gap-2 h-11 rounded-xl font-semibold"
                  onClick={() => {
                    const fullPhone = toWhatsAppPhone(lead.telefone || '');
                    const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem? Vi que você fez o teste do Índice do Quintal Ideal!`);
                    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button variant="outline" className="h-11 w-11 rounded-xl shrink-0" onClick={() => window.open(`tel:${lead.telefone}`, '_self')}>
                  <Phone className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center h-11 rounded-xl bg-muted/50 text-xs text-muted-foreground">
                Sem telefone cadastrado
              </div>
            )}
            {lead.email && (
              <Button variant="outline" className="h-11 w-11 rounded-xl shrink-0" onClick={() => window.open(`mailto:${lead.email}`, '_blank')}>
                <Mail className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ZONA 2 — Tabs underline */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/50 bg-background sticky top-[57px] z-10">
            <TabsList className="h-auto bg-transparent p-0 w-full flex justify-start gap-0 rounded-none overflow-x-auto scrollbar-hide [scroll-snap-type:x_mandatory]">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex-shrink-0 whitespace-nowrap [scroll-snap-align:start] flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs font-medium rounded-none border-b-2 text-muted-foreground border-transparent data-[state=active]:text-primary data-[state=active]:border-primary hover:text-foreground transition-colors bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none relative"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {(tab as any).dot && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success ml-0.5" aria-hidden />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* ZONA 3 — Feed */}
          <AnimatePresence mode="wait">
            <TabsContent value="conversa" className="mt-0">
              <motion.div key="conversa" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-4 space-y-4">
                {(franchiseId || lead.franquia_id) && (
                  <LeadFollowups franchiseId={(franchiseId || lead.franquia_id)!} leadId={lead.id} leadName={lead.nome || undefined} />
                )}
                <UnifiedConversation leadId={lead.id} franchiseId={franchiseId || lead.franquia_id} leadName={lead.nome} />
                <WhatsAppTemplates
                  leadName={lead.nome}
                  leadPhone={lead.telefone}
                  modeloRecomendado={lead.modelo_recomendado}
                  cidade={lead.cidade}
                  pontuacao={lead.pontuacao_quintal}
                  statusLead={lead.status_lead}
                  leadId={lead.id}
                />
              </motion.div>
            </TabsContent>

            <TabsContent value="proposta" className="mt-0">
              <motion.div key="proposta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-4 space-y-4">
                <LeadLinkedProposals leadId={lead.id} leadName={lead.nome} />
                <Button
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => {
                    const params = new URLSearchParams({ lead_id: lead.id });
                    if (lead.nome) params.set('lead_name', lead.nome);
                    navigate(`/propostas/nova?${params.toString()}`);
                  }}
                >
                  <Plus className="w-4 h-4" /> Nova proposta para este lead
                </Button>
              </motion.div>
            </TabsContent>

            <TabsContent value="dados" className="mt-0">
              <motion.div key="dados" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Dados pessoais</h2>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setManageOpen(true)}>
                      <Settings2 className="w-3 h-3" /> Editar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Nome', value: lead.nome, icon: '👤' },
                      { label: 'Telefone', value: lead.telefone, icon: '📱' },
                      { label: 'E-mail', value: lead.email, icon: '✉️' },
                      { label: 'Cidade', value: lead.cidade, icon: '📍' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-muted/40">
                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          {item.label}
                        </span>
                        <span className="text-xs font-semibold text-foreground text-right break-all">
                          {item.value || <span className="text-muted-foreground/60 italic font-normal">Não informado</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-2 block">Observações internas</label>
                  <Textarea
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    onBlur={async () => {
                      if (observacoes === (lead.observacoes || '')) return;
                      const { error } = await supabase.from('leads').update({ observacoes }).eq('id', lead.id);
                      if (error) toast.error('Erro ao salvar observações');
                      else {
                        toast.success('Observações salvas');
                        queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
                      }
                    }}
                    rows={4}
                    placeholder="Adicionar observações sobre este lead..."
                    maxLength={1000}
                    className="bg-muted/40 resize-none text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Salva automaticamente ao sair do campo.</p>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="visita" className="mt-0">
              <motion.div key="visita" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-4">
                {(lead?.franquia_id ?? franchiseId ?? '') ? (
                  <TechnicalVisitSection
                    leadId={lead?.id ?? ''}
                    franchiseId={lead?.franquia_id ?? franchiseId ?? ''}
                  />
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">Franquia não vinculada a este lead.</div>
                )}
              </motion.div>
            </TabsContent>

            {quizEntriesEarly.length > 0 && (
              <TabsContent value="quiz" className="mt-0">
                <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Respostas do Quiz ({quizEntriesEarly.length})</h2>
                  </div>
                  {quizEntriesEarly.map(([key, value]) => {
                    const q = questionLabels[key];
                    const displayValue = answerLabels[value as string] || (value as string);
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-muted/40">
                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="text-base">{q.icon}</span>
                          {q.label}
                        </span>
                        <span className="text-xs font-semibold text-foreground text-right">{displayValue}</span>
                      </div>
                    );
                  })}
                </motion.div>
              </TabsContent>
            )}

            <TabsContent value="fotos" className="mt-0">
              <motion.div key="fotos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-4 space-y-5">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-primary" /> Fotos do Quintal
                  </p>
                  {photos.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {photos.map((url, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-border/50 aspect-square">
                          <button
                            onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                            className="w-full h-full focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <img src={url} alt={`Quintal ${i + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="absolute top-1.5 right-1.5 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md z-10">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover foto?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={async () => {
                                    if (!lead) return;
                                    const photoFields = ['foto1', 'foto2', 'foto3', 'foto4'] as const;
                                    const remaining = photos.filter((_, idx) => idx !== i);
                                    const update: Record<string, string | null> = {};
                                    photoFields.forEach((field, idx) => {
                                      update[field] = remaining[idx] || null;
                                    });
                                    const { error } = await supabase.from('leads').update(update).eq('id', lead.id);
                                    if (error) toast.error('Erro ao remover foto.');
                                    else {
                                      toast.success('Foto removida!');
                                      queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
                                    }
                                  }}
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mb-3">Nenhuma foto adicionada.</p>
                  )}
                  {photos.length < 4 && lead && (
                    <LeadPhotoUpload
                      leadId={lead.id}
                      existingPhotos={[lead.foto1, lead.foto2, lead.foto3, lead.foto4]}
                      franchiseId={lead.franquia_id || ''}
                      onSaved={() => queryClient.invalidateQueries({ queryKey: ['lead-detail', id] })}
                    />
                  )}
                </div>
                <PhotoLightbox photos={photos} initialIndex={lightboxIndex} open={lightboxOpen} onOpenChange={setLightboxOpen} />
              </motion.div>
            </TabsContent>

            {lead.status_lead === 'vendido' && (
              <TabsContent value="pos-venda" className="mt-0">
                <motion.div key="pos-venda" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-4">
                  <PostSaleSection leadId={lead.id} franchiseId={(franchiseId || lead.franquia_id)!} />
                </motion.div>
              </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
      </div>

      {/* Drawer de gerenciamento */}
      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Gerenciar Lead
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Responsável</label>
              <Select
                value={assignedTo || '_none'}
                onValueChange={async (val) => {
                  const newVal = val === '_none' ? null : val;
                  setAssignedTo(newVal);
                  await supabase.from('leads').update({ assigned_to: newVal } as any).eq('id', lead.id);
                  queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
                  toast.success('Responsável atualizado');
                }}
              >
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem responsável</SelectItem>
                  {franchiseUsers.map((u: any) => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Status no Funil</label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className={`bg-muted/50 ${autoSaving ? 'opacity-70 pointer-events-none' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Temperatura</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { value: '' as const, label: 'Auto', emoji: '🤖' },
                  { value: 'quente' as LeadTemperature, label: 'Quente', emoji: '🔥' },
                  { value: 'morno' as LeadTemperature, label: 'Morno', emoji: '☀️' },
                  { value: 'frio' as LeadTemperature, label: 'Frio', emoji: '❄️' },
                ]).map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleTempChange(t.value)}
                    className={`text-xs py-3 px-1 rounded-lg border transition-colors font-medium min-h-[44px] active:scale-[0.97] ${
                      tempOverride === t.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-base leading-none mb-0.5">{t.emoji}</div>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {status === 'vendido' && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    Valor da venda <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={valorVendaInput}
                    onChange={e => setValorVendaInput(e.target.value)}
                    placeholder="Ex: 35.000,00"
                    className="bg-muted/50"
                  />
                  {parsedValorVenda > 0 && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      {parsedValorVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Substitui a estimativa do lead. Atualizado automaticamente quando uma proposta vinculada é aceita.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    Modelo Vendido
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-[200px]">O modelo confirmado na venda</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </label>
                  <Select value={modeloVendido} onValueChange={setModeloVendido}>
                    <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {poolModels.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Observações</label>
              <Textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={3}
                placeholder="Adicionar observações..."
                maxLength={1000}
                className="bg-muted/50 resize-none"
              />
            </div>

            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium group">
                <span>Editar dados pessoais</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
                  <Input value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome do lead" maxLength={200} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
                  <Input value={editTelefone} onChange={e => setEditTelefone(e.target.value)} placeholder="(XX) XXXXX-XXXX" maxLength={20} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                  <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@exemplo.com" maxLength={255} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                  <Input value={editCidade} onChange={e => setEditCidade(e.target.value)} placeholder="Cidade" maxLength={200} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>

            <div className="pt-4 border-t border-border/30">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors w-full text-center py-1">
                    Excluir lead de teste
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        Você está prestes a excluir o lead <strong>"{lead.nome || 'sem nome'}"</strong>.
                      </span>
                      <span className="block font-semibold text-destructive">
                        ⚠️ Esta ação é irreversível.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        await supabase.from('lead_activities').delete().eq('lead_id', lead.id);
                        await supabase.from('lead_followups').delete().eq('lead_id', lead.id);
                        const { error } = await supabase.from('leads').delete().eq('id', lead.id);
                        if (error) {
                          toast.error('Erro ao excluir lead.');
                        } else {
                          toast.success('Lead excluído.');
                          queryClient.invalidateQueries({ queryKey: ['admin-leads-table'] });
                          queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
                          queryClient.invalidateQueries({ queryKey: ['franchise-leads'] });
                          queryClient.invalidateQueries({ queryKey: ['leads'] });
                          queryClient.invalidateQueries({ queryKey: ['kanban-leads'] });
                          if (isAdminRoute) {
                            navigate(returnTo, { replace: true });
                          } else if (window.history.length > 2) {
                            navigate(-1);
                          } else {
                            navigate('/franquia', { replace: true });
                          }
                        }
                      }}
                    >
                      Confirmar exclusão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </PageTransition>
  );
}
