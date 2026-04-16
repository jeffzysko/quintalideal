import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Check, ClipboardList, Rocket, CheckCircle2, ArrowRight, Sparkles, Shield, Star, Users, Zap, BarChart3, MessageCircle, Target, FileText, Globe } from 'lucide-react';
import { isValidEmail, isValidBRPhone } from '@/lib/validation';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';
import mockupCRM from '@/assets/mockup-crm-kanban.jpg';
import mockupOrcamento from '@/assets/mockup-orcamento.jpg';
import mockupDashboard from '@/assets/mockup-dashboard.jpg';

/* ── Data ── */
const STEPS = [
  { num: '01', icon: Zap, title: 'Cadastre-se em 2 minutos', description: 'Preencha seus dados abaixo. Sem burocracia, sem taxas de adesão.' },
  { num: '02', icon: Shield, title: 'Aprovação em até 24h', description: 'Nossa equipe analisa sua candidatura e entra em contato pelo WhatsApp.' },
  { num: '03', icon: Rocket, title: 'Comece a vender mais', description: 'Qualifique seus leads, envie orçamentos e gerencie tudo em tempo real.' },
];

const FEATURES = [
  { icon: Target, title: 'Qualificação inteligente', description: 'Cada lead passa por um quiz que identifica perfil, orçamento e urgência. Você recebe só quem está pronto.' },
  { icon: BarChart3, title: 'CRM completo', description: 'Kanban, funil, histórico de contatos e follow-ups automáticos num só lugar.' },
  { icon: FileText, title: 'Orçamentos em 1 clique', description: 'Propostas com sua marca, envio por WhatsApp e rastreio de abertura.' },
  { icon: MessageCircle, title: 'WhatsApp integrado', description: 'Atenda leads pelo WhatsApp da sua loja com mensagens automáticas e templates.' },
  { icon: BarChart3, title: 'Métricas em tempo real', description: 'Conversão, faturamento, metas mensais e performance de campanhas.' },
  { icon: Globe, title: 'Página de captação', description: 'Link personalizado com quiz interativo que transforma visitantes em leads qualificados.' },
];

const SOCIAL_PROOF = [
  { metric: 38, suffix: '+', label: 'Lojas parceiras' },
  { metric: 2500, suffix: '+', label: 'Leads qualificados' },
  { metric: 24, suffix: 'h', label: 'Aprovação média' },
];

const MARQUEE_ITEMS = [
  'CRM completo', 'Orçamentos profissionais', 'WhatsApp automático', 'Qualificação de leads',
  'Métricas em tempo real', 'Kanban de vendas', 'Follow-ups inteligentes', 'Página personalizada',
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
    const duration = 1800;
    const steps = 50;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return <span ref={ref} className="tabular-nums">{count.toLocaleString('pt-BR')}{suffix}</span>;
}

/* ── 3D Tilt Card ── */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  function handleMouse(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() { x.set(0); y.set(0); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Marquee ── */
function Marquee() {
  return (
    <div className="relative overflow-hidden py-4">
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-sm font-medium text-muted-foreground/60 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Helpers ── */
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface IBGECity { nome: string; microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } }; }

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

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

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
    <div className="min-h-screen overflow-hidden bg-background">

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(225,76%,48%,0.08)] via-background to-[hsl(178,100%,43%,0.06)]" />
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(225 76% 48% / 0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(178 100% 43% / 0.08) 0%, transparent 50%), radial-gradient(circle at 50% 80%, hsl(225 76% 48% / 0.06) 0%, transparent 50%)',
          }} />
        </div>

        {/* Animated floating orbs */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-30 blur-[120px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(225 76% 48% / 0.4), transparent 70%)' }}
          animate={{
            x: ['-10%', '10%', '-10%'],
            y: ['-5%', '15%', '-5%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{ background: 'radial-gradient(circle, hsl(178 100% 43% / 0.5), transparent 70%)', right: '10%', top: '20%' }}
          animate={{
            x: ['5%', '-15%', '5%'],
            y: ['10%', '-10%', '10%'],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        {/* Radial vignette */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 75%)',
        }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.7, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + i * 0.7,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        ))}

        {/* Hero content */}
        <motion.div
          className="relative z-10 max-w-4xl mx-auto px-5 pt-12 sm:pt-16 text-center"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <motion.img
            src={logoQuintalIdeal}
            alt="Quintal Ideal"
            className="h-10 sm:h-12 mx-auto mb-5"
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />

          <motion.div
            className="inline-flex items-center gap-2 mb-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="relative inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-5 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary backdrop-blur-sm">
              <span className="absolute inset-0 rounded-full animate-pulse bg-primary/5" />
              <Sparkles className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">A plataforma completa para lojas de piscinas</span>
            </span>
          </motion.div>

          <motion.h1
            className="text-[1.75rem] leading-[1.1] sm:text-[2.75rem] lg:text-[3.25rem] font-extrabold text-foreground mb-4 tracking-tight sm:leading-[1.08]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Qualifique leads, envie{' '}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-primary via-[hsl(200,80%,50%)] to-secondary bg-clip-text text-transparent">
                orçamentos
              </span>
              <motion.span
                className="absolute -inset-x-2 -inset-y-1 rounded-lg bg-primary/[0.07] -z-0"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'left' }}
              />
            </span>{' '}e venda
            <br />
            mais piscinas
          </motion.h1>

          <motion.p
            className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto mb-3 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            CRM, qualificação de leads, orçamentos profissionais e atendimento via WhatsApp. Tudo integrado numa plataforma feita para o mercado de piscinas.
          </motion.p>

          <motion.p
            className="text-xs sm:text-sm text-muted-foreground/70 max-w-xl mx-auto mb-7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <strong className="text-foreground">Sem taxa de adesão.</strong> Cadastre-se gratuitamente e pague apenas se quiser recursos premium.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              size="lg"
              onClick={scrollToForm}
              className="relative rounded-2xl text-base px-10 py-7 font-bold gap-2 overflow-hidden group transition-all duration-500 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                boxShadow: '0 0 30px -5px hsl(225 76% 48% / 0.4), 0 10px 30px -10px hsl(225 76% 48% / 0.3)',
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary via-[hsl(200,80%,50%)] to-primary bg-[length:200%_100%] group-hover:animate-[shimmer_2s_linear_infinite]" />
              <span className="relative z-10 flex items-center gap-2">
                Quero ser parceiro
                <motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-8 py-7 backdrop-blur-sm border-border/50 hover:bg-muted/50 hover:scale-[1.02] transition-all duration-300"
              asChild
            >
              <a href="/login">Já sou parceiro</a>
            </Button>
          </motion.div>
        </motion.div>
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/20 flex items-start justify-center p-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════ SOCIAL PROOF BAND ═══════════════════════════ */}
      <section className="py-10 sm:py-12 bg-background relative">
        <div className="max-w-4xl mx-auto px-5">
          <motion.div
            className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {SOCIAL_PROOF.map((sp) => (
              <motion.div
                key={sp.label}
                className="relative group px-8 sm:px-10 py-5 rounded-2xl border border-border/30 bg-background backdrop-blur-md cursor-default"
                whileHover={{ scale: 1.05, borderColor: 'hsl(225 76% 48% / 0.3)' }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="absolute inset-0 rounded-2xl bg-primary/[0.02] group-hover:bg-primary/[0.05] transition-colors duration-300" />
                <div className="relative text-center">
                  <span className="block text-3xl sm:text-4xl font-bold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
                    <AnimatedCounter value={sp.metric} suffix={sp.suffix} />
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-1.5 block">{sp.label}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="flex flex-wrap justify-center gap-5"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {[
              { icon: Shield, text: 'Dados protegidos' },
              { icon: Star, text: 'Avaliada por parceiros' },
              { icon: Users, text: '38+ lojas ativas' },
            ].map(t => (
              <div key={t.text} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                <t.icon className="w-3 h-3" />
                {t.text}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ MARQUEE ═══════════════════════════ */}
      <div className="border-y border-border/30 bg-muted/20">
        <Marquee />
      </div>

      {/* ═══════════════════════════ COMO FUNCIONA ═══════════════════════════ */}
      <section className="py-24 sm:py-32 relative">
        <div className="max-w-5xl mx-auto px-5">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5">Como funciona</span>
            <h2 className="text-3xl sm:text-[2.75rem] font-extrabold text-foreground mt-4 mb-3 tracking-tight leading-tight">
              Simples como{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">1, 2, 3</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">Do cadastro à primeira venda em poucos dias</p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6 sm:gap-4 relative">
            {/* Connector line (desktop) */}
            <div className="hidden sm:block absolute top-16 left-[22%] right-[22%] h-px">
              <motion.div
                className="h-full bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>

            {STEPS.map((s, i) => (
              <motion.div
                key={s.num}
                className="relative text-center group"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
              >
                <div className="flex flex-col items-center">
                  <div className="relative mb-5">
                    <motion.div
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center relative z-10 group-hover:from-primary/25 group-hover:to-primary/10 transition-all duration-500"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <s.icon className="w-6 h-6 text-primary" />
                    </motion.div>
                    <div className="absolute -inset-2 rounded-3xl bg-primary/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                    <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center z-20">{s.num}</span>
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-base">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">{s.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ RECURSOS ═══════════════════════════ */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 bg-muted/30" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }} />

        <div className="relative max-w-5xl mx-auto px-5">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5">Recursos</span>
            <h2 className="text-3xl sm:text-[2.75rem] font-extrabold text-foreground mt-4 mb-3 tracking-tight leading-tight">
              CRM, orçamentos e WhatsApp<br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">em um só lugar</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
              A plataforma completa que lojas de piscinas de todo o RS já usam no dia a dia
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 perspective-[1200px]">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.1, 0.4), duration: 0.5 }}
              >
                <TiltCard>
                  <Card className="h-full border-border/40 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 group overflow-hidden relative">
                    {/* Hover glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardContent className="p-6 relative">
                      <motion.div
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/12 to-secondary/8 border border-primary/10 flex items-center justify-center mb-4"
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <f.icon className="w-5 h-5 text-primary" />
                      </motion.div>
                      <h3 className="font-bold text-foreground text-[0.95rem] mb-2">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ MOCKUPS / SHOWCASE ═══════════════════════════ */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />
        <div className="relative max-w-6xl mx-auto px-5">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5">Por dentro da plataforma</span>
            <h2 className="text-3xl sm:text-[2.75rem] font-extrabold text-foreground mt-4 mb-3 tracking-tight leading-tight">
              Conheça o sistema que vai{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">transformar suas vendas</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
              Uma plataforma profissional, intuitiva e feita sob medida para o mercado de piscinas
            </p>
          </motion.div>

          {/* Mockup 1 - CRM Kanban */}
          <motion.div
            className="mb-20"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="grid lg:grid-cols-5 gap-8 items-center">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-[0.15em] px-3 py-1 rounded-full border border-primary/15 bg-primary/5">
                  <Target className="w-3.5 h-3.5" />
                  CRM e Pipeline
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
                  Gerencie todos os seus leads em um Kanban visual
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Arraste e solte leads entre as etapas do funil. Veja score de qualificação, histórico de contatos e follow-ups pendentes em um só lugar.
                </p>
              </div>
              <div className="lg:col-span-3">
                <div className="relative group">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-2xl">
                    <div className="h-8 bg-muted/80 border-b border-border/30 flex items-center gap-1.5 px-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                      <span className="text-[10px] text-muted-foreground/50 ml-3">quintalideal.app/painel</span>
                    </div>
                    <img src={mockupCRM} alt="CRM e Pipeline de Vendas do Quintal Ideal" loading="lazy" width={1280} height={800} className="w-full" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mockup 2 - Orçamentos */}
          <motion.div
            className="mb-20"
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="grid lg:grid-cols-5 gap-8 items-center">
              <div className="lg:col-span-3 order-2 lg:order-1">
                <div className="relative group">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-bl from-secondary/10 to-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-2xl">
                    <div className="h-8 bg-muted/80 border-b border-border/30 flex items-center gap-1.5 px-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                      <span className="text-[10px] text-muted-foreground/50 ml-3">quintalideal.app/orcamento</span>
                    </div>
                    <img src={mockupOrcamento} alt="Gerador de Orçamentos do Quintal Ideal" loading="lazy" width={1280} height={800} className="w-full" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 order-1 lg:order-2 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-[0.15em] px-3 py-1 rounded-full border border-primary/15 bg-primary/5">
                  <FileText className="w-3.5 h-3.5" />
                  Orçamentos
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
                  Propostas profissionais com envio por WhatsApp
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Crie orçamentos detalhados com seus modelos de piscina, condições de pagamento e envie direto pelo WhatsApp. Saiba quando o cliente visualizou.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Mockup 3 - Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="grid lg:grid-cols-5 gap-8 items-center">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-[0.15em] px-3 py-1 rounded-full border border-primary/15 bg-primary/5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Dashboard
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
                  Métricas e metas em tempo real
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Acompanhe leads, conversão, faturamento e performance de campanhas. Defina metas mensais e veja o progresso da sua equipe.
                </p>
              </div>
              <div className="lg:col-span-3">
                <div className="relative group">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-2xl">
                    <div className="h-8 bg-muted/80 border-b border-border/30 flex items-center gap-1.5 px-4">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                      <span className="text-[10px] text-muted-foreground/50 ml-3">quintalideal.app/dashboard</span>
                    </div>
                    <img src={mockupDashboard} alt="Dashboard de Métricas do Quintal Ideal" loading="lazy" width={1280} height={800} className="w-full" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ PLANOS ═══════════════════════════ */}
      <section className="py-24 sm:py-32 relative">
        <div className="max-w-4xl mx-auto px-5">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.2em] mb-3 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/5">Planos</span>
            <h2 className="text-3xl sm:text-[2.75rem] font-extrabold text-foreground mt-4 mb-3 tracking-tight">
              Invista pouco,{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">venda muito</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Planos acessíveis que se pagam com a primeira venda</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Disponíveis após a aprovação do seu cadastro</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {/* Orçamento */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <Card className="h-full border-border/40 shadow-md hover:shadow-xl transition-all duration-500 group">
                <CardContent className="p-7 sm:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <ClipboardList className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">Orçamento Personalizado</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-extrabold text-foreground tracking-tight">R$ 29</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {ORCAMENTO_BENEFITS.map(b => (
                      <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground/40 text-center">Disponível após o cadastro</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* WhatsApp */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <Card className="h-full relative overflow-hidden group border-primary/25 hover:border-primary/40 transition-all duration-500"
                style={{ boxShadow: '0 0 40px -10px hsl(225 76% 48% / 0.15), 0 10px 40px -10px rgba(0,0,0,0.1)' }}
              >
                {/* Animated border glow */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite]" />
                <div className="absolute -top-1 -right-1">
                  <div className="relative">
                    <span className="text-[10px] font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground px-3 py-1.5 rounded-bl-xl rounded-tr-sm uppercase tracking-wider">Mais popular</span>
                  </div>
                </div>
                <CardContent className="p-7 sm:p-8 pt-9">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <Rocket className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground text-lg">WhatsApp Próprio</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-extrabold text-foreground tracking-tight">R$ 149</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {WHATSAPP_BENEFITS.map(b => (
                      <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground/40 text-center">Disponível após o cadastro</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ CTA BRIDGE ═══════════════════════════ */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-background to-secondary/[0.04]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '20px 20px',
        }} />
        {/* Floating glow */}
        <motion.div
          className="absolute w-[600px] h-[300px] rounded-full blur-[120px] bg-primary/10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          animate={{ scale: [1, 1.2, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative max-w-3xl mx-auto px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-5 leading-snug tracking-tight">
              Sua loja já investe em tráfego pago.{' '}
              <span className="bg-gradient-to-r from-primary via-[hsl(200,80%,50%)] to-secondary bg-clip-text text-transparent">
                Agora transforme cliques em vendas de verdade.
              </span>
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              O Quintal Ideal qualifica cada lead do seu tráfego, organiza sua operação comercial e automatiza o atendimento. Tudo o que falta para sua loja escalar.
            </p>
            <Button
              size="lg"
              onClick={scrollToForm}
              className="relative rounded-2xl text-base px-10 py-7 font-bold gap-2 overflow-hidden group transition-all duration-500 hover:scale-[1.03] active:scale-[0.98]"
              style={{ boxShadow: '0 0 30px -5px hsl(225 76% 48% / 0.35)' }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary via-[hsl(200,80%,50%)] to-primary bg-[length:200%_100%] group-hover:animate-[shimmer_2s_linear_infinite]" />
              <span className="relative z-10 flex items-center gap-2">
                Cadastrar minha loja gratuitamente
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ FORMULÁRIO ═══════════════════════════ */}
      <section id="formulario" className="py-24 sm:py-32 relative">
        <div className="absolute inset-0 bg-muted/20" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        {/* Glow behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[100px] pointer-events-none" />

        <div className="relative max-w-[540px] mx-auto px-5">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <Card className="border-primary/20 overflow-hidden relative"
                style={{ boxShadow: '0 0 60px -15px hsl(225 76% 48% / 0.2), 0 20px 40px -10px rgba(0,0,0,0.1)' }}
              >
                <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite]" />
                <CardContent className="py-16 text-center px-6">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}>
                    <div className="relative inline-block">
                      <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-6" />
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/10"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                  </motion.div>
                  <h3 className="text-2xl font-extrabold text-foreground mb-3">Pronto! Sua candidatura foi recebida 🎉</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Nossa equipe entrará em contato pelo <strong>WhatsApp em até 24 horas</strong>.
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Prepare-se: em breve você terá acesso a uma plataforma completa para qualificar leads e fechar mais vendas.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <Card className="border-border/40 overflow-hidden relative"
                style={{ boxShadow: '0 0 60px -15px hsl(225 76% 48% / 0.12), 0 20px 40px -10px rgba(0,0,0,0.08)' }}
              >
                <div className="h-1 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite]" />
                <CardContent className="p-7 sm:p-9">
                  <div className="text-center mb-7">
                    <h2 className="text-2xl font-extrabold text-foreground mb-1.5">Comece agora mesmo</h2>
                    <p className="text-xs text-muted-foreground">Cadastro gratuito · Sem compromisso · Aprovação em até 24h</p>
                  </div>

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
                      className="w-full relative rounded-xl overflow-hidden group transition-all duration-500 hover:scale-[1.01] active:scale-[0.99]"
                      size="lg"
                      disabled={submitting}
                      onClick={handleSubmit}
                      style={{ boxShadow: '0 0 25px -5px hsl(225 76% 48% / 0.3)' }}
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-primary via-[hsl(200,80%,50%)] to-primary bg-[length:200%_100%] group-hover:animate-[shimmer_2s_linear_infinite]" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {submitting ? 'Enviando...' : 'Quero ser parceiro'}
                        {!submitting && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                      </span>
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
