import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Phone, Mail, MapPin, Calendar, Droplets, Camera, ClipboardList, Settings2, Save, User, Trash2, Clock, Image, CalendarClock, Pencil, X, ChevronDown, Check } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/BackButton';
import { PanelHeader } from '@/components/PanelHeader';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LeadTimeline } from '@/components/lead/LeadTimeline';
import { LeadFollowups } from '@/components/franchise/LeadFollowups';
import { PhotoLightbox } from '@/components/lead/PhotoLightbox';
import { InactivityBadge } from '@/components/lead/InactivityBadge';
import { WhatsAppTemplates } from '@/components/lead/WhatsAppTemplates';
import { LeadValueEstimator } from '@/components/lead/LeadValueEstimator';
import { ContactAttempts } from '@/components/lead/ContactAttempts';
import { LeadPhotoUpload } from '@/components/lead/LeadPhotoUpload';

import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
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
}

const statusConfig: Record<string, { label: string; color: string; accent: string }> = {
  novo: { label: 'Novo', color: 'bg-white text-slate-800 border-white/80', accent: 'border-l-primary bg-primary/5' },
  contatado: { label: 'Contatado', color: 'bg-sky-100 text-sky-800 border-sky-200', accent: 'border-l-sky-500 bg-sky-50' },
  em_negociacao: { label: 'Em Negociação', color: 'bg-amber-100 text-amber-800 border-amber-200', accent: 'border-l-amber-500 bg-amber-50' },
  vendido: { label: 'Vendido', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', accent: 'border-l-emerald-500 bg-emerald-50' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800 border-red-200', accent: 'border-l-red-500 bg-red-50' },
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

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? 'hsl(var(--primary))' : score >= 60 ? 'hsl(var(--secondary))' : 'hsl(var(--destructive))';

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        <motion.circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-foreground">{score}%</span>
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const { franchiseId } = useAuth();
  const isMobile = useIsMobile();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [modeloVendido, setModeloVendido] = useState('');
  const [tempOverride, setTempOverride] = useState<LeadTemperature | ''>('');
  const [saving, setSaving] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [activeTab, setActiveTab] = useState('gerenciar');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: poolModels = [] } = useQuery({
    queryKey: ['pool-models'],
    queryFn: async () => {
      const { data } = await supabase.from('pool_models').select('nome_modelo').order('nome_modelo');
      return data?.map(m => m.nome_modelo) || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Both queries run in parallel — no sequential waterfall
  const { data: lead, isLoading: loading } = useQuery({
    queryKey: ['lead-detail', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, nome, telefone, email, cidade, pontuacao_quintal, modelo_recomendado, modelo_vendido, respostas_questionario, foto1, foto2, foto3, foto4, status_lead, observacoes, created_at, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, franquia_id, lead_origin')
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

  // Sync editable form fields when the lead first loads or when ID changes
  useEffect(() => {
    if (lead) {
      setStatus(lead.status_lead);
      setObservacoes(lead.observacoes || '');
      setModeloVendido(lead.modelo_vendido || '');
      setEditNome(lead.nome || '');
      setEditTelefone(lead.telefone || '');
      setEditEmail(lead.email || '');
      setEditCidade(lead.cidade || '');
      const respostas = lead.respostas_questionario as Record<string, string> | null;
      setTempOverride((respostas?.temperatura_manual as LeadTemperature) || '');
    }
  }, [lead?.id]);

  const save = async () => {
    if (!lead) return;
    if (!editNome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editEmail.trim() && !isValidEmail(editEmail.trim())) { toast.error('E-mail inválido'); return; }
    if (editTelefone.trim()) {
      const digits = editTelefone.replace(/\D/g, '');
      if (!isValidBRPhone(digits)) { toast.error('Telefone inválido (ex: 11999998888)'); return; }
    }
    setSaving(true);

    if (status !== lead.status_lead) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const oldLabel = statusConfig[lead.status_lead]?.label || lead.status_lead;
        const newLabel = statusConfig[status]?.label || status;
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          user_id: currentUser.id,
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const TEMP_LABELS: Record<string, string> = { quente: '🔥 Quente', morno: '☀️ Morno', frio: '❄️ Frio', '': '🤖 Automático' };
        await supabase.from('lead_activities').insert({
          lead_id: lead.id,
          user_id: currentUser.id,
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
    } else {
      toast.error('Erro ao salvar.');
    }
  };

  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const autoSaveField = useCallback(async (field: 'status' | 'temperature', newValue: string) => {
    if (!lead) return;
    setAutoSaving(true);

    const currentRespostas = { ...(lead.respostas_questionario || {}) } as Record<string, string>;
    const { data: { user: currentUser } } = await supabase.auth.getUser();

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
    setAutoSaved(field === 'status' ? 'Status salvo!' : 'Temperatura salva!');
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => setAutoSaved(null), 2000);
    queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-all'] });
    queryClient.invalidateQueries({ queryKey: ['franchise-leads-table'] });
    queryClient.invalidateQueries({ queryKey: ['admin-leads-all'] });
    queryClient.invalidateQueries({ queryKey: ['admin-leads-table'] });
  }, [lead, id, queryClient]);

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
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <p className="text-muted-foreground">Lead não encontrado.</p>
      </div>
    );
  }

  const statusInfo = statusConfig[lead.status_lead] || statusConfig.novo;
  const isAdminRoute = location.pathname.startsWith('/admin');
  const leadsUrl = isAdminRoute ? '/admin?tab=leads' : '/franquia';
  const returnTo = ((location.state as { returnTo?: string } | null)?.returnTo) || leadsUrl;
  const breadcrumbItems = [
    { label: isAdminRoute ? 'Admin' : 'Painel', href: isAdminRoute ? '/admin' : '/franquia' },
    { label: 'Leads', href: returnTo },
    { label: lead.nome || 'Detalhes' },
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-bottomnav">
      <PanelHeader title={lead.nome || 'Detalhes do Lead'}>
        <BackButton fallback={returnTo} />
        <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
        <NotificationBell />
        <UserAvatarMenu />
      </PanelHeader>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        <Breadcrumbs items={breadcrumbItems} />

        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card overflow-hidden">
            <div className="gradient-blue px-3 sm:px-5 py-3 sm:py-4 relative">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-primary-foreground truncate">
                    {lead.nome || 'Lead sem nome'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-primary-foreground/80 text-xs sm:text-sm mt-0.5">
                    {lead.cidade && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{lead.cidade}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 sm:mt-0 sm:absolute sm:top-4 sm:right-5 flex items-center gap-1.5">
                {lead.lead_origin === 'manual' && (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] sm:text-xs font-medium" variant="outline">
                    ✏️ Manual
                  </Badge>
                )}
                <Badge className={`${statusInfo.color} border text-[10px] sm:text-xs font-medium`}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>

            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
                <ScoreRing score={lead.pontuacao_quintal || 0} />
                <div className="flex-1 space-y-2 w-full">
                  <div className="text-center sm:text-left">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Índice do Quintal</p>
                    <p className="text-sm text-foreground mt-0.5">Quanto maior, mais preparado está o quintal para uma piscina</p>
                  </div>
                  {/* Inactivity Badge */}
                  <div className="flex justify-center sm:justify-start">
                    <InactivityBadge createdAt={lead.created_at} lastActivityAt={lastActivityAt} />
                  </div>
                  {/* Lead Temperature */}
                  {(() => {
                    const liveRespostas = { ...(lead.respostas_questionario || {}) };
                    if (tempOverride) liveRespostas.temperatura_manual = tempOverride;
                    else delete liveRespostas.temperatura_manual;
                    const temp = classifyLead(Object.keys(liveRespostas).length > 0 ? liveRespostas : null, lead.pontuacao_quintal);
                    return (
                      <div className={`flex items-center gap-2 ${temp.bgColor} border rounded-lg px-3 py-2`}>
                        <span className="text-lg">{temp.emoji}</span>
                        <div>
                          <p className="text-xs text-muted-foreground">Temperatura</p>
                          <p className={`text-sm font-semibold ${temp.color}`}>Lead {temp.label}</p>
                        </div>
                      </div>
                    );
                  })()}
                  {lead.modelo_recomendado && (
                    <div className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2">
                      <Droplets className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Modelo recomendado</p>
                        <p className="text-sm font-semibold text-foreground truncate">{lead.modelo_recomendado}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Contato</h2>
              </div>

              {lead.telefone && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 sm:px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">{lead.telefone}</span>
                  </div>
                    <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-success-foreground text-xs h-8 gap-1.5 w-full sm:w-auto"
                    onClick={() => {
                      const fullPhone = toWhatsAppPhone(lead.telefone || '');
                      const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem? Vi que você fez o teste do Índice do Quintal Splash!`);
                      window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                </div>
              )}

              {lead.email && (
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-3 sm:px-4 py-3">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{lead.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Attempts + Value Estimator */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-4">
          <ContactAttempts leadId={lead.id} />
          <LeadValueEstimator respostas={lead.respostas_questionario} modeloRecomendado={lead.modelo_recomendado} />
        </motion.div>

        {/* Quiz Answers — always visible */}
        {lead.respostas_questionario && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Respostas do Questionário</h2>
                </div>
                <div className="space-y-1.5">
                  {Object.entries(lead.respostas_questionario)
                    .filter(([key]) => questionLabels[key])
                    .map(([key, value]) => {
                      const q = questionLabels[key];
                      const displayValue = answerLabels[value as string] || (value as string);
                      return (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                            <span className="text-base">{q.icon}</span>
                            {q.label}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-foreground ml-7 sm:ml-0">{displayValue}</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabbed Content */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-card/80 backdrop-blur-sm border border-border/40 rounded-2xl p-1.5 shadow-sm">
              <TabsList className="w-full grid grid-cols-4 h-12 bg-transparent p-0 gap-1">
                {[
                  { value: 'fotos', icon: Image, label: 'Fotos', disabled: false, badge: photos.length > 0 ? photos.length : undefined },
                  { value: 'gerenciar', icon: Settings2, label: 'Gerenciar' },
                  { value: 'followups', icon: CalendarClock, label: 'Follow-ups' },
                  { value: 'timeline', icon: Clock, label: 'Timeline' },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.value;
                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      disabled={tab.disabled}
                      className="relative h-10 text-[11px] sm:text-xs gap-1 sm:gap-1.5 rounded-xl font-medium transition-all duration-200 text-muted-foreground data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/20 hover:bg-muted/60 data-[state=active]:hover:bg-primary"
                    >
                      <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span className="text-[10px] sm:text-xs">{tab.label}</span>
                      {tab.badge && (
                        <span className={`text-[9px] rounded-full px-1.5 leading-tight font-bold ${isActive ? 'bg-white/20 text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <AnimatePresence mode="wait">

              {/* Follow-ups Tab */}
              <TabsContent value="followups" className="mt-4">
                <motion.div key="followups" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {(franchiseId || lead.franquia_id) ? (
                    <LeadFollowups franchiseId={(franchiseId || lead.franquia_id)!} leadId={lead.id} leadName={lead.nome || undefined} />
                  ) : (
                    <Card className="glass-card">
                      <CardContent className="p-6 text-center">
                        <CalendarClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Follow-ups não disponíveis para este lead.</p>
                      </CardContent>
                    </Card>
                  )}
                  <WhatsAppTemplates
                    leadName={lead.nome}
                    leadPhone={lead.telefone}
                    modeloRecomendado={lead.modelo_recomendado}
                    cidade={lead.cidade}
                    pontuacao={lead.pontuacao_quintal}
                    statusLead={lead.status_lead}
                  />
                </motion.div>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="mt-4">
                <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <LeadTimeline leadId={lead.id} />
                </motion.div>
              </TabsContent>

              {/* Fotos Tab */}
              <TabsContent value="fotos" className="mt-4">
                <motion.div key="fotos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <Card className="glass-card">
                    <CardContent className="p-3 sm:p-5">
                      {photos.length > 0 ? (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <Camera className="w-4 h-4 text-primary" />
                            <h2 className="text-sm font-semibold text-foreground">Fotos do Quintal</h2>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {photos.map((url, i) => (
                              <div key={i} className="relative group rounded-xl overflow-hidden border border-border/50 aspect-square">
                                <button
                                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                                  className="w-full h-full focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <img src={url} alt={`Quintal ${i + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-md z-10"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remover foto?</AlertDialogTitle>
                                      <AlertDialogDescription>Esta ação não pode ser desfeita. A foto será removida permanentemente do lead.</AlertDialogDescription>
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
                                          if (error) {
                                            toast.error('Erro ao remover foto.');
                                          } else {
                                            toast.success('Foto removida com sucesso!');
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
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                            <Camera className="w-7 h-7 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">Nenhuma foto adicionada</p>
                          <p className="text-xs text-muted-foreground max-w-[220px]">Adicione fotos do quintal para enriquecer o cadastro deste lead</p>
                        </div>
                      )}
                      {photos.length < 4 && lead && (
                        <LeadPhotoUpload
                          leadId={lead.id}
                          existingPhotos={[lead.foto1, lead.foto2, lead.foto3, lead.foto4]}
                          franchiseId={lead.franquia_id || ''}
                          onSaved={() => {
                            queryClient.invalidateQueries({ queryKey: ['lead-detail', id] });
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                  <PhotoLightbox photos={photos} initialIndex={lightboxIndex} open={lightboxOpen} onOpenChange={setLightboxOpen} />
                </motion.div>
              </TabsContent>

              {/* Gerenciar Tab */}
              <TabsContent value="gerenciar" className="mt-4">
                <motion.div key="gerenciar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  <Card className="glass-card">
                    <CardContent className="p-3 sm:p-5 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings2 className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-semibold text-foreground">Gerenciar Lead</h2>
                      </div>

                      {/* Status section comes first — most important action */}

                      {/* Score / Pontuação visual */}
                      {lead.pontuacao_quintal != null && (
                        <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border/40">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pontuação do Quintal</span>
                            <span className={`text-sm font-bold ${
                              lead.pontuacao_quintal >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
                              lead.pontuacao_quintal >= 40 ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-500 dark:text-red-400'
                            }`}>{lead.pontuacao_quintal}%</span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${
                                lead.pontuacao_quintal >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                lead.pontuacao_quintal >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${lead.pontuacao_quintal}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {lead.pontuacao_quintal >= 70 ? 'Excelente — quintal muito preparado para uma piscina.' :
                             lead.pontuacao_quintal >= 40 ? 'Bom potencial — com alguns ajustes, o quintal estará pronto.' :
                             'Potencial inicial — vale explorar mais com o cliente.'}
                          </p>
                        </div>
                      )}

                      <div className={`rounded-lg border-l-4 p-4 ${statusConfig[status]?.accent || 'border-l-primary bg-primary/5'} transition-colors duration-200`}>
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">▶</span>
                          Alterar Status do Lead
                        </label>
                        <p className="text-xs text-muted-foreground mb-3">Selecione o estágio atual deste lead no funil de vendas — salva automaticamente</p>
                        {autoSaved && (
                          <div className="flex items-center gap-1.5 mb-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                            <Check className="w-3.5 h-3.5" />
                            {autoSaved}
                          </div>
                        )}
                        <Select value={status} onValueChange={handleStatusChange}>
                          <SelectTrigger className={`bg-background border-2 border-primary/20 hover:border-primary/40 transition-colors h-12 text-sm font-medium ${autoSaving ? 'opacity-70 pointer-events-none' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([val, cfg]) => (
                              <SelectItem key={val} value={val}>
                                <span className="flex items-center gap-2">
                                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg.color.split(' ')[0]}`} />
                                  {cfg.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Temperature override */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Temperatura do Lead</label>
                        <div className="flex gap-2">
                          {([
                            { value: '' as const, label: 'Automático', emoji: '🤖' },
                            { value: 'quente' as LeadTemperature, label: 'Quente', emoji: '🔥' },
                            { value: 'morno' as LeadTemperature, label: 'Morno', emoji: '☀️' },
                            { value: 'frio' as LeadTemperature, label: 'Frio', emoji: '❄️' },
                          ]).map(t => (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => handleTempChange(t.value)}
                              className={`flex-1 text-xs py-2.5 px-1 rounded-lg border transition-colors font-medium ${
                                tempOverride === t.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-muted-foreground hover:bg-muted/50'
                              }`}
                            >
                              {t.emoji} {t.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {tempOverride ? `Temperatura fixada como "${tempOverride}". Toque em "Automático" para usar o cálculo inteligente.` : 'Calculado automaticamente com base nas respostas do quiz (intenção, orçamento e espaço).'}
                        </p>
                      </div>

                      {/* Modelo Vendido — only when status is vendido */}
                      {status === 'vendido' && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Modelo Vendido</label>
                          <Select value={modeloVendido} onValueChange={setModeloVendido}>
                            <SelectTrigger className="bg-muted/50"><SelectValue placeholder="Selecione o modelo vendido" /></SelectTrigger>
                            <SelectContent>
                              {poolModels.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                           <p className="text-[11px] text-muted-foreground mt-1">
                            Registre o modelo efetivamente vendido. Isso melhora a inteligência das recomendações futuras.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Observações</label>
                        <Textarea
                          value={observacoes}
                          onChange={e => setObservacoes(e.target.value)}
                          rows={3}
                          placeholder="Adicionar observações sobre este lead..."
                          maxLength={1000}
                          className="bg-muted/50 resize-none"
                        />
                      </div>

                      {/* Personal info — collapsible, below observações */}
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-2">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Editar Dados Pessoais</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-3 p-3 bg-muted/30 rounded-xl border border-border/40">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
                              <Input value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome do lead" className="bg-background" maxLength={200} />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
                              <Input value={editTelefone} onChange={e => setEditTelefone(e.target.value)} placeholder="(XX) XXXXX-XXXX" className="bg-background" maxLength={20} />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                              <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-background" maxLength={255} />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                              <Input value={editCidade} onChange={e => setEditCidade(e.target.value)} placeholder="Cidade" className="bg-background" maxLength={200} />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Button onClick={save} disabled={saving} className="w-full gap-2">
                        {saving ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" /> Salvar Alterações
                          </>
                        )}
                      </Button>

                      {/* Delete test lead */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full gap-2 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive">
                            <Trash2 className="w-4 h-4" /> Excluir Lead de Teste
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <span className="block">
                                Você está prestes a excluir o lead <strong>"{lead.nome || 'sem nome'}"</strong>.
                              </span>
                              <span className="block font-semibold text-destructive">
                                ⚠️ Esta ação é irreversível. Confirme que este é um lead de teste e NÃO um lead oficial de um cliente real.
                              </span>
                              <span className="block text-xs">
                                Todas as atividades, follow-ups e dados associados serão removidos permanentemente.
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
                                  toast.success('Lead de teste excluído com sucesso.');
                                  // Invalidate all lead-related queries so lists refresh immediately
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
                              Confirmo: é lead de teste, excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>

        {/* Spacer for sticky bar */}
        {isMobile && <div className="h-20" />}
      </div>

      {/* Sticky bottom action bar - mobile only */}
      {isMobile && lead.telefone && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/50 px-4 py-3 flex items-center gap-2 shadow-lg" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
          <Button
            size="sm"
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground gap-1.5 h-11"
            onClick={() => {
              const fullPhone = toWhatsAppPhone(lead.telefone!);
              const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem?`);
              window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
            }}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-11 w-11 shrink-0"
            onClick={() => window.open(`tel:${lead.telefone}`, '_self')}
          >
            <Phone className="w-4 h-4" />
          </Button>
          {lead.email && (
            <Button
              size="sm"
              variant="outline"
              className="h-11 w-11 shrink-0"
              onClick={() => window.open(`mailto:${lead.email}`, '_blank')}
            >
              <Mail className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
