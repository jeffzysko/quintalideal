import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Phone, Mail, MapPin, Calendar, Droplets, Camera, ClipboardList, Settings2, Save, User, Trash2 } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { PanelHeader } from '@/components/PanelHeader';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LeadTimeline } from '@/components/lead/LeadTimeline';
import { LeadFollowups } from '@/components/franchise/LeadFollowups';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { classifyLead, type LeadTemperature } from '@/lib/leadScoring';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';



interface Lead {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
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

const statusConfig: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-white text-slate-800 border-white/80' },
  contatado: { label: 'Contatado', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  em_negociacao: { label: 'Em Negociação', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  vendido: { label: 'Vendido', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800 border-red-200' },
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
  'casal': 'Momentos a dois',
  'familia-pequena': 'Diversão com os filhos',
  'familia-grande': 'Reunir toda a família',
  'amigos': 'Churrascos e festas',
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
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [tempOverride, setTempOverride] = useState<LeadTemperature | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadLead();
  }, [id]);

  const loadLead = async () => {
    const { data } = await supabase.from('leads').select('id, nome, telefone, email, cidade, pontuacao_quintal, modelo_recomendado, respostas_questionario, foto1, foto2, foto3, foto4, status_lead, observacoes, created_at, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used, franquia_id, lead_origin').eq('id', id!).maybeSingle();
    if (data) {
      setLead(data as Lead);
      setStatus(data.status_lead);
      setObservacoes(data.observacoes || '');
      const respostas = data.respostas_questionario as Record<string, string> | null;
      setTempOverride((respostas?.temperatura_manual as LeadTemperature) || '');
    }
    setLoading(false);
  };

  const save = async () => {
    if (!lead) return;
    setSaving(true);

    // Log status change as activity
    if (status !== lead.status_lead) {
      const { data: { user } } = await supabase.auth.getUser();
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

    // Build updated respostas with temperature override
    const updatedRespostas = { ...(lead.respostas_questionario || {}) };
    const oldTemp = (lead.respostas_questionario as Record<string, string> | null)?.temperatura_manual || '';
    if (tempOverride) {
      updatedRespostas.temperatura_manual = tempOverride;
    } else {
      delete updatedRespostas.temperatura_manual;
    }

    // Log temperature change
    const tempChanged = tempOverride !== oldTemp;
    if (tempChanged) {
      const { data: { user } } = await supabase.auth.getUser();
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
        status_lead: status as any,
        observacoes,
        respostas_questionario: Object.keys(updatedRespostas).length > 0 ? updatedRespostas : null,
      })
      .eq('id', lead.id);
    setSaving(false);
    if (!error) {
      toast.success('Alterações salvas com sucesso!');
      setLead({ ...lead, status_lead: status, observacoes, respostas_questionario: Object.keys(updatedRespostas).length > 0 ? updatedRespostas : null });
      // Invalidate Kanban/table queries so they reflect the change
      queryClient.invalidateQueries({ queryKey: ['franchise-leads-all'] });
      queryClient.invalidateQueries({ queryKey: ['franchise-leads-table'] });
    } else {
      toast.error('Erro ao salvar.');
    }
  };

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
  const breadcrumbItems = [
    { label: isAdminRoute ? 'Admin' : 'Painel', href: isAdminRoute ? '/admin' : '/franquia' },
    { label: 'Leads', href: leadsUrl },
    { label: lead.nome || 'Detalhes' },
  ];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-bottomnav">
      <PanelHeader title={lead.nome || 'Detalhes do Lead'}>
        <BackButton fallback={leadsUrl} />
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
                    <p className="text-sm text-foreground mt-0.5">Potencial de instalação de piscina</p>
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
                          <p className="text-xs text-muted-foreground">Classificação</p>
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
                      const msg = encodeURIComponent(`Olá ${lead.nome || ''}, tudo bem? Vi que você fez o teste do Índice do Quintal Splash!`);
                      window.open(`https://wa.me/55${lead.telefone}?text=${msg}`, '_blank');
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

        {/* Photos */}
        {photos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card">
              <CardContent className="p-3 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Camera className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Fotos do Quintal</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((url, i) => (
                    <img key={i} src={url} alt={`Quintal ${i + 1}`} className="rounded-xl w-full aspect-square object-cover border border-border/50" loading="lazy" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quiz answers */}
        {lead.respostas_questionario && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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

        {/* Follow-up Scheduling */}
        {(franchiseId || lead.franquia_id) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <LeadFollowups franchiseId={(franchiseId || lead.franquia_id)!} leadId={lead.id} leadName={lead.nome || undefined} />
          </motion.div>
        )}

        {/* Activity Timeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <LeadTimeline leadId={lead.id} />
        </motion.div>

        {/* Manage */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Settings2 className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Gerenciar Lead</h2>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
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
                      onClick={() => setTempOverride(t.value)}
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
                  {tempOverride ? `Temperatura fixada como "${tempOverride}". Clique em "Automático" para calcular pelo questionário.` : 'Calculado automaticamente com base nos dados do questionário.'}
                </p>
              </div>

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
                          if (isAdminRoute) {
                            navigate('/admin?tab=leads');
                          } else if (window.history.length > 2) {
                            navigate(-1);
                          } else {
                            navigate('/franquia');
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
              const phone = lead.telefone!.replace(/\D/g, '');
              const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
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
