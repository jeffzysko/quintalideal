import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Check, ClipboardList, Rocket, CheckCircle2, ArrowRight, Sparkles, Shield, Star, Users } from 'lucide-react';
import { isValidEmail, isValidBRPhone } from '@/lib/validation';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';

/* ── Data ── */

const STEPS = [
  { num: '01', title: 'Cadastre-se em 2 minutos', description: 'Preencha seus dados abaixo. Sem burocracia, sem taxas de adesão.' },
  { num: '02', title: 'Aprovação em até 24h', description: 'Nossa equipe analisa sua candidatura e entra em contato pelo WhatsApp.' },
  { num: '03', title: 'Comece a vender mais', description: 'Qualifique seus leads, envie orçamentos e gerencie tudo em tempo real.' },
];

const FEATURES = [
  { emoji: '🎯', title: 'Qualificação inteligente de leads', description: 'Cada lead do seu tráfego pago passa por um quiz que identifica perfil, orçamento e urgência. Você recebe só quem está pronto para comprar.' },
  { emoji: '📋', title: 'CRM completo para piscinas', description: 'Kanban, funil de vendas, histórico de contatos e follow-ups automáticos. Tudo organizado num só lugar.' },
  { emoji: '📄', title: 'Orçamentos profissionais em 1 clique', description: 'Crie propostas com a sua marca, envie por WhatsApp e saiba quando o cliente abriu.' },
  { emoji: '📱', title: 'Central de WhatsApp integrada', description: 'Atenda seus leads pelo WhatsApp da sua loja com mensagens automáticas, templates e histórico completo.' },
  { emoji: '📊', title: 'Métricas e relatórios', description: 'Acompanhe conversão, faturamento, metas mensais e veja quais campanhas trazem mais resultado.' },
  { emoji: '🌍', title: 'Página exclusiva de captação', description: 'Um link personalizado da sua loja com quiz interativo que transforma visitantes em leads qualificados.' },
];

const SOCIAL_PROOF = [
  { metric: 38, suffix: '+', label: 'lojas parceiras no RS' },
  { metric: 2500, suffix: '+', label: 'leads qualificados' },
  { metric: 24, suffix: 'h', label: 'aprovação média' },
];

const TRUST_ITEMS = [
  { icon: Shield, text: 'Dados protegidos com criptografia' },
  { icon: Star, text: 'Plataforma avaliada por parceiros reais' },
  { icon: Users, text: 'Rede ativa com mais de 38 lojas' },
];

const ORCAMENTO_BENEFITS = [
  'Orçamentos e propostas ilimitados',
  'Modelos profissionais com a sua marca',
  'Envio automático por WhatsApp',
  'Saiba quando o cliente abriu a proposta',
];

const WHATSAPP_BENEFITS = [
  'Tudo do plano Orçamento',
  'Mensagens automáticas pelo número da sua loja',
  'Instância dedicada, sem compartilhar número',
  'Conexão simples via QR Code',
  'Suporte prioritário da equipe Quintal Ideal',
];

/* ── Animated Counter ── */
function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref} className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tabular-nums">
      {count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

/* ── Helpers ── */
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface IBGECity {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
}

function CityAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<{ nome: string; uf: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = useCallback((term: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.length < 3) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome');
        const data: IBGECity[] = await res.json();
        const normalized = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const filtered = data
          .filter(c => c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalized))
          .slice(0, 15)
          .map(c => ({ nome: c.nome, uf: c.microrregiao?.mesorregiao?.UF?.sigla || '' }));
        setResults(filtered);
        setOpen(filtered.length > 0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <Label className="text-xs font-medium">Cidade *</Label>
      <Input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(''); search(e.target.value); }}
        placeholder="Digite o nome da cidade..."
        maxLength={100}
        autoComplete="off"
      />
      {loading && <p className="text-xs text-muted-foreground mt-1">Buscando...</p>}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(c => (
            <button
              key={`${c.nome}-${c.uf}`}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { const label = `${c.nome} (${c.uf})`; setQuery(label); onChange(label); setOpen(false); }}
            >
              {c.nome} <span className="text-muted-foreground">({c.uf})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
export default function SejaParceiro() {
  const [form, setForm] = useState({
    nome_franquia: '', cidade_base: '', nome_responsavel: '',
    whatsapp_responsavel: '', email: '',
  });
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const clearError = (field: string) => setErrors(p => ({ ...p, [field]: '' }));
  const markTouched = (field: string) => setTouched(p => ({ ...p, [field]: true }));

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'nome_franquia':
        if (!value.trim()) return 'Nome da empresa é obrigatório';
        if (value.trim().length < 2) return 'Mínimo de 2 caracteres';
        return '';
      case 'cidade_base':
        if (!value) return 'Selecione uma cidade da lista';
        return '';
      case 'nome_responsavel':
        if (!value.trim()) return 'Nome do responsável é obrigatório';
        if (value.trim().length < 2) return 'Mínimo de 2 caracteres';
        return '';
      case 'whatsapp_responsavel': {
        const digits = value.replace(/\D/g, '');
        if (!digits) return 'WhatsApp é obrigatório';
        if (!isValidBRPhone(digits)) return 'Número inválido. Use DDD + número (10 ou 11 dígitos)';
        return '';
      }
      case 'email': {
        const trimmed = value.trim();
        if (!trimmed) return 'E-mail é obrigatório';
        if (!isValidEmail(trimmed)) return 'E-mail inválido. Ex: contato@empresa.com';
        return '';
      }
      default: return '';
    }
  };

  const handleBlur = (field: string) => {
    markTouched(field);
    setErrors(p => ({ ...p, [field]: validateField(field, form[field as keyof typeof form]) }));
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    let valid = true;
    for (const key of Object.keys(form) as (keyof typeof form)[]) {
      const err = validateField(key, form[key]);
      if (err) { newErrors[key] = err; valid = false; }
    }
    if (!accepted) { newErrors.terms = 'Aceite os termos para continuar'; valid = false; }
    setErrors(newErrors);
    setTouched({ nome_franquia: true, cidade_base: true, nome_responsavel: true, whatsapp_responsavel: true, email: true });
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('franchise_applications' as any).insert({
        nome_franquia: form.nome_franquia.trim(),
        cidade_base: form.cidade_base,
        nome_responsavel: form.nome_responsavel.trim(),
        whatsapp_responsavel: form.whatsapp_responsavel.replace(/\D/g, ''),
        email: form.email.trim().toLowerCase(),
      } as any);
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error('Erro ao enviar candidatura. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen overflow-hidden">

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section className="relative py-20 sm:py-32 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/5" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.04) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/6 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-secondary/6 blur-[100px] pointer-events-none" />

        {/* Floating orbs */}
        <motion.div className="absolute top-24 left-[8%] w-3 h-3 rounded-full bg-primary/25"
          animate={{ y: [0, -18, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute top-48 right-[12%] w-2 h-2 rounded-full bg-secondary/35"
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />
        <motion.div className="absolute bottom-24 left-[18%] w-4 h-4 rounded-full bg-primary/15"
          animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        />

        <div className="relative max-w-4xl mx-auto px-5 text-center">
          <motion.img
            src={logoQuintalIdeal}
            alt="Quintal Ideal"
            className="h-11 sm:h-12 mx-auto mb-7"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />

          <motion.div
            className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            A plataforma completa para lojas de piscinas
          </motion.div>

          <motion.h1
            className="text-[2rem] leading-[1.15] sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight sm:leading-[1.1]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 100 }}
          >
            <span className="block sm:inline">Qualifique leads,</span>{' '}
            <span className="block sm:inline">
              envie{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">orçamentos</span>
            </span>
            <br className="hidden sm:block" />
            <span className="block mt-1 sm:mt-0 sm:inline"> e venda mais piscinas</span>
          </motion.h1>

          <motion.p
            className="text-[0.95rem] sm:text-lg text-muted-foreground max-w-xl sm:max-w-2xl mx-auto mb-5 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            CRM, qualificação de leads, orçamentos profissionais e atendimento via WhatsApp. Tudo integrado numa plataforma feita para o mercado de piscinas.
          </motion.p>

          <motion.p
            className="text-sm text-muted-foreground/80 max-w-md sm:max-w-xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <strong className="text-foreground">Sem taxa de adesão.</strong> Cadastre-se gratuitamente e pague apenas se quiser recursos premium.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Button
              size="lg"
              className="rounded-xl text-base px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 group"
              onClick={scrollToForm}
            >
              Quero ser parceiro
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl hover:-translate-y-0.5 transition-all duration-300" asChild>
              <a href="/login" target="_blank" rel="noopener noreferrer">Já sou parceiro</a>
            </Button>
          </motion.div>

          {/* Animated counters */}
          <motion.div
            className="flex flex-wrap justify-center gap-8 sm:gap-16 mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {SOCIAL_PROOF.map(sp => (
              <div key={sp.label} className="text-center min-w-[80px]">
                <AnimatedCounter value={sp.metric} suffix={sp.suffix} />
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 font-medium">{sp.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Trust strip */}
          <motion.div
            className="flex flex-wrap justify-center gap-4 sm:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {TRUST_ITEMS.map(t => (
              <div key={t.text} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <t.icon className="w-3.5 h-3.5 text-primary/60" />
                {t.text}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ COMO FUNCIONA ═══════════════════════════ */}
      <section className="py-20 sm:py-24 bg-background relative">
        <div className="max-w-4xl mx-auto px-5">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Como funciona</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mt-2 mb-2">Simples como 1, 2, 3</h2>
            <p className="text-sm text-muted-foreground">Do cadastro à primeira venda em poucos dias</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connector (desktop) */}
            <div className="hidden sm:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary/10 via-primary/30 to-primary/10" />

            {STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                className="relative text-center sm:text-left"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="flex flex-col items-center sm:items-start">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center mb-4 relative z-10">
                    <span className="text-lg font-bold text-primary">{s.num}</span>
                  </div>
                  <h3 className="font-bold text-foreground mb-1.5 text-[0.95rem]">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto sm:mx-0">{s.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ RECURSOS ═══════════════════════════ */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/40" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="relative max-w-5xl mx-auto px-5">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Recursos</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mt-2 mb-2">CRM, orçamentos e WhatsApp<br className="hidden sm:block" /> em um só lugar</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">A plataforma completa que lojas de piscinas de todo o RS já usam no dia a dia</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.08, 0.3) }}
              >
                <Card className="h-full border-border/50 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group">
                  <CardContent className="p-5 sm:p-6">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/12 to-primary/5 border border-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                      <span className="text-xl">{f.emoji}</span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm mb-2">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ PLANOS ═══════════════════════════ */}
      <section className="py-20 sm:py-24 bg-background relative">
        <div className="max-w-4xl mx-auto px-5">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Planos</span>
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mt-2 mb-2">Invista pouco, venda muito</h2>
            <p className="text-sm text-muted-foreground">Planos acessíveis que se pagam com a primeira venda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Disponíveis após a aprovação do seu cadastro</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {/* Orçamento */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="h-full border-border/50 shadow-sm hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground">Orçamento Personalizado</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-4xl font-bold text-foreground">R$ 29</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-3 mb-5">
                    {ORCAMENTO_BENEFITS.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground/50 text-center">Disponível após o cadastro</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* WhatsApp */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Card className="h-full border-primary/20 shadow-lg ring-1 ring-primary/10 relative overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-secondary" />
                <div className="absolute top-3.5 right-3.5">
                  <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-full uppercase tracking-wide">Mais popular</span>
                </div>
                <CardContent className="p-6 sm:p-8 pt-8">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Rocket className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground">WhatsApp Próprio</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-4xl font-bold text-foreground">R$ 149</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-3 mb-5">
                    {WHATSAPP_BENEFITS.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground/50 text-center">Disponível após o cadastro</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ CTA BRIDGE ═══════════════════════════ */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-primary/4 to-secondary/4" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.03) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        <div className="relative max-w-2xl mx-auto px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            <h2 className="text-xl sm:text-3xl font-bold text-foreground mb-4 leading-snug">
              Sua loja já investe em tráfego pago.{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Agora transforme cliques em vendas de verdade.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              O Quintal Ideal qualifica cada lead do seu tráfego, organiza sua operação comercial e automatiza o atendimento. Tudo o que falta para sua loja escalar.
            </p>
            <Button
              size="lg"
              className="rounded-xl text-base px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 group"
              onClick={scrollToForm}
            >
              Cadastrar minha loja gratuitamente
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ FORMULÁRIO ═══════════════════════════ */}
      <section id="formulario" className="py-20 sm:py-24 bg-muted/30 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="max-w-[540px] mx-auto px-5">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <Card className="border-primary/20 shadow-xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary to-secondary" />
                <CardContent className="py-14 text-center px-6">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}>
                    <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-5" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Pronto! Sua candidatura foi recebida 🎉</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Nossa equipe entrará em contato pelo <strong>WhatsApp em até 24 horas</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Prepare-se: em breve você terá acesso a uma plataforma completa para qualificar leads e fechar mais vendas.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="border-border/50 shadow-xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary to-secondary" />
                <CardContent className="p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-foreground mb-1 text-center">Comece agora mesmo</h2>
                  <p className="text-xs text-muted-foreground text-center mb-6">Cadastro gratuito · Sem compromisso · Aprovação em até 24h</p>

                  <div className="space-y-4">
                    {/* Nome da empresa */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Nome da empresa *</Label>
                      <Input
                        value={form.nome_franquia}
                        onChange={e => { setForm(p => ({ ...p, nome_franquia: e.target.value })); clearError('nome_franquia'); }}
                        onBlur={() => handleBlur('nome_franquia')}
                        placeholder="Quintal Ideal Porto Alegre"
                        maxLength={100}
                        className={touched.nome_franquia && errors.nome_franquia ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                      {touched.nome_franquia && errors.nome_franquia && <p className="text-xs text-destructive mt-1">{errors.nome_franquia}</p>}
                    </div>

                    {/* Cidade */}
                    <CityAutocomplete value={form.cidade_base} onChange={v => { setForm(p => ({ ...p, cidade_base: v })); clearError('cidade_base'); }} />
                    {touched.cidade_base && errors.cidade_base && <p className="text-xs text-destructive -mt-2">{errors.cidade_base}</p>}

                    {/* Nome do responsável */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Nome do responsável *</Label>
                      <Input
                        value={form.nome_responsavel}
                        onChange={e => { setForm(p => ({ ...p, nome_responsavel: e.target.value })); clearError('nome_responsavel'); }}
                        onBlur={() => handleBlur('nome_responsavel')}
                        placeholder="João Silva"
                        maxLength={100}
                        className={touched.nome_responsavel && errors.nome_responsavel ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                      {touched.nome_responsavel && errors.nome_responsavel && <p className="text-xs text-destructive mt-1">{errors.nome_responsavel}</p>}
                    </div>

                    {/* WhatsApp */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">WhatsApp *</Label>
                      <Input
                        type="tel"
                        value={form.whatsapp_responsavel}
                        onChange={e => { setForm(p => ({ ...p, whatsapp_responsavel: formatPhone(e.target.value) })); clearError('whatsapp_responsavel'); }}
                        onBlur={() => handleBlur('whatsapp_responsavel')}
                        placeholder="(51) 99999-9999"
                        maxLength={15}
                        className={touched.whatsapp_responsavel && errors.whatsapp_responsavel ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                      {touched.whatsapp_responsavel && errors.whatsapp_responsavel && <p className="text-xs text-destructive mt-1">{errors.whatsapp_responsavel}</p>}
                    </div>

                    {/* E-mail */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">E-mail *</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={e => { setForm(p => ({ ...p, email: e.target.value })); clearError('email'); }}
                        onBlur={() => handleBlur('email')}
                        placeholder="contato@empresa.com"
                        maxLength={255}
                        className={touched.email && errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                      {touched.email && errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                    </div>

                    {/* Termos */}
                    <div className="flex items-start gap-2 pt-2">
                      <Checkbox id="terms" checked={accepted} onCheckedChange={v => { setAccepted(v === true); clearError('terms'); }} className="mt-0.5" />
                      <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                        Li e aceito os{' '}
                        <Link to="/termos" className="underline hover:text-foreground" target="_blank">Termos de Uso</Link>
                        {' '}e a{' '}
                        <Link to="/privacidade" className="underline hover:text-foreground" target="_blank">Política de Privacidade</Link>.
                      </label>
                    </div>
                    {errors.terms && <p className="text-xs text-destructive -mt-2">{errors.terms}</p>}

                    <Button
                      className="w-full rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group"
                      size="lg"
                      disabled={submitting}
                      onClick={handleSubmit}
                    >
                      {submitting ? 'Enviando...' : 'Quero ser parceiro'}
                      {!submitting && <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
