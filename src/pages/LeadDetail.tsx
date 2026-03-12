import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MessageCircle, Phone, Mail, MapPin, Calendar, Droplets, Camera, ClipboardList, Settings2, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { TERRITORY_LABELS, TERRITORY_COLORS } from '@/lib/lead-constants';

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
  'simples': 'Piscina clássica e elegante',
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadLead();
  }, [id]);

  const loadLead = async () => {
    const { data } = await supabase.from('leads').select('id, nome, telefone, email, cidade, pontuacao_quintal, modelo_recomendado, respostas_questionario, foto1, foto2, foto3, foto4, status_lead, observacoes, created_at, origin_franchise_id, territory_match_status, coverage_match_count, distribution_rule_used').eq('id', id!).maybeSingle();
    if (data) {
      setLead(data as Lead);
      setStatus(data.status_lead);
      setObservacoes(data.observacoes || '');
    }
    setLoading(false);
  };

  const save = async () => {
    if (!lead) return;
    setSaving(true);
    const { error } = await supabase
      .from('leads')
      .update({ status_lead: status as any, observacoes })
      .eq('id', lead.id);
    setSaving(false);
    if (!error) toast.success('Alterações salvas com sucesso!');
    else toast.error('Erro ao salvar.');
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

  return (
    <div className="min-h-screen gradient-hero">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => {
          // If we have history, go back; otherwise navigate to the appropriate dashboard
          if (window.history.length > 2) {
            navigate(-1);
          } else {
            const isAdminRoute = window.location.pathname.startsWith('/admin');
            navigate(isAdminRoute ? '/admin' : '/franquia');
          }
        }} className="text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card overflow-hidden">
            <div className="gradient-blue px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-primary-foreground truncate">
                    {lead.nome || 'Lead sem nome'}
                  </h1>
                  <div className="flex items-center gap-3 text-primary-foreground/80 text-sm mt-0.5">
                    {lead.cidade && (
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{lead.cidade}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <Badge className={`${statusInfo.color} border text-xs font-medium`}>
                  {statusInfo.label}
                </Badge>
              </div>
            </div>

            <CardContent className="p-5">
              <div className="flex items-center gap-5">
                <ScoreRing score={lead.pontuacao_quintal || 0} />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Índice do Quintal</p>
                    <p className="text-sm text-foreground mt-0.5">Potencial de instalação de piscina</p>
                  </div>
                  {lead.modelo_recomendado && (
                    <div className="flex items-center gap-2 bg-accent/50 rounded-lg px-3 py-2">
                      <Droplets className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Modelo recomendado</p>
                        <p className="text-sm font-semibold text-foreground">{lead.modelo_recomendado}</p>
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
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Contato</h2>
              </div>

              {lead.telefone && (
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{lead.telefone}</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5"
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
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{lead.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Photos */}
        {photos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card">
              <CardContent className="p-5">
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
              <CardContent className="p-5">
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
                        <div key={key} className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                          <span className="text-sm text-muted-foreground flex items-center gap-2.5">
                            <span className="text-base">{q.icon}</span>
                            {q.label}
                          </span>
                          <span className="text-sm font-semibold text-foreground">{displayValue}</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Manage */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card">
            <CardContent className="p-5 space-y-4">
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
            </CardContent>
          </Card>
        </motion.div>

        <div className="h-4" />
      </div>
    </div>
  );
}
