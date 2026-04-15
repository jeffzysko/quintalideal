import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Check, ClipboardList, Rocket, CheckCircle2 } from 'lucide-react';
import { isValidEmail, isValidBRPhone } from '@/lib/validation';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';

const STEPS = [
  { emoji: '📋', title: '1. Cadastre-se em 2 minutos', description: 'Preencha seus dados abaixo. Sem burocracia, sem taxas de adesão.' },
  { emoji: '✅', title: '2. Aprovação em até 24h', description: 'Nossa equipe analisa sua candidatura e entra em contato pelo WhatsApp.' },
  { emoji: '🚀', title: '3. Comece a vender mais', description: 'Receba leads qualificados, envie orçamentos profissionais e acompanhe tudo em tempo real.' },
];

const FEATURES = [
  { emoji: '🎯', title: 'Leads que chegam até você', description: 'Receba clientes interessados direto no seu painel — sem precisar correr atrás' },
  { emoji: '📄', title: 'Orçamentos em 1 clique', description: 'Propostas profissionais com a sua marca, enviadas automaticamente por WhatsApp' },
  { emoji: '📱', title: 'WhatsApp inteligente', description: 'Mensagens automáticas que nutrem o cliente enquanto você foca na venda' },
  { emoji: '📊', title: 'Métricas que importam', description: 'Saiba exatamente quantos leads entraram, converteram e quanto você faturou' },
  { emoji: '🌍', title: 'Seu link exclusivo', description: 'Uma página personalizada que captura clientes 24h por dia, mesmo enquanto você dorme' },
  { emoji: '🏆', title: 'Ranking da rede', description: 'Compare seu desempenho com outros parceiros e descubra como escalar suas vendas' },
];

const SOCIAL_PROOF = [
  { metric: '38+', label: 'lojas parceiras no RS' },
  { metric: '2.500+', label: 'leads gerados na plataforma' },
  { metric: '24h', label: 'tempo médio de aprovação' },
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
  'Instância dedicada — sem compartilhar número',
  'Conexão simples via QR Code',
  'Suporte prioritário da equipe Quintal Ideal',
];

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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome`
        );
        const data: IBGECity[] = await res.json();
        const normalized = term.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const filtered = data
          .filter(c => c.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normalized))
          .slice(0, 15)
          .map(c => ({ nome: c.nome, uf: c.microrregiao?.mesorregiao?.UF?.sigla || '' }));
        setResults(filtered);
        setOpen(filtered.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <Label className="text-xs font-medium">Cidade *</Label>
      <Input
        value={query}
        onChange={e => {
          const v = e.target.value;
          setQuery(v);
          onChange('');
          search(v);
        }}
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
              onClick={() => {
                const label = `${c.nome} (${c.uf})`;
                setQuery(label);
                onChange(label);
                setOpen(false);
              }}
            >
              {c.nome} <span className="text-muted-foreground">({c.uf})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export default function SejaParceiro() {
  const [form, setForm] = useState({
    nome_franquia: '',
    cidade_base: '',
    nome_responsavel: '',
    whatsapp_responsavel: '',
    email: '',
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
      default:
        return '';
    }
  };

  const handleBlur = (field: string) => {
    markTouched(field);
    const err = validateField(field, form[field as keyof typeof form]);
    setErrors(p => ({ ...p, [field]: err }));
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

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.img
            src={logoQuintalIdeal}
            alt="Quintal Ideal"
            className="h-12 mx-auto mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          />
          <motion.p
            className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-widest mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Para lojas de piscinas que querem crescer
          </motion.p>
          <motion.h1
            className="text-3xl sm:text-5xl font-bold text-foreground mb-4 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Receba clientes prontos<br />para comprar piscina
          </motion.h1>
          <motion.p
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            O Quintal Ideal gera leads qualificados, envia orçamentos automáticos e acompanha cada venda — tudo numa plataforma feita sob medida para o mercado de piscinas.
          </motion.p>
          <motion.p
            className="text-sm text-muted-foreground/80 max-w-xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <strong className="text-foreground">Sem taxa de adesão.</strong> Cadastre-se gratuitamente e pague apenas se quiser recursos premium.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button size="lg" className="rounded-xl text-base px-8" onClick={() => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' })}>
              Quero receber leads →
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <a href="/login" target="_blank" rel="noopener noreferrer">Já sou parceiro</a>
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 sm:gap-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {SOCIAL_PROOF.map(sp => (
              <div key={sp.label} className="text-center">
                <span className="text-2xl sm:text-3xl font-bold text-primary">{sp.metric}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{sp.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">Simples como 1, 2, 3</h2>
          <p className="text-center text-sm text-muted-foreground mb-12">Do cadastro à primeira venda em poucos dias</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="text-4xl mb-3 block">{s.emoji}</span>
                <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recursos ── */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">Tudo o que sua loja precisa para vender mais</h2>
          <p className="text-center text-sm text-muted-foreground mb-12">Ferramentas profissionais que lojas de piscinas de todo o RS já usam</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.05, 0.2) }}
              >
                <Card className="h-full border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <span className="text-2xl mb-2 block">{f.emoji}</span>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-2">Invista pouco, venda muito</h2>
          <p className="text-center text-sm text-muted-foreground mb-3">Planos acessíveis que se pagam com a primeira venda</p>
          <p className="text-center text-xs text-muted-foreground/70 mb-10">Disponíveis após a aprovação do seu cadastro</p>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Orçamento */}
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Orçamento Personalizado</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-foreground">R$ 29</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-2 mb-4">
                  {ORCAMENTO_BENEFITS.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground/60 text-center">Disponível após o cadastro</p>
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card className="border-primary/30 shadow-sm ring-1 ring-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Rocket className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">WhatsApp Próprio</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-foreground">R$ 149</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <ul className="space-y-2 mb-4">
                  {WHATSAPP_BENEFITS.map(b => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground/60 text-center">Disponível após o cadastro</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── CTA Bridge ── */}
      <section className="py-12 sm:py-16 bg-primary/5">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
              Sua loja já vende piscinas.<br className="sm:hidden" /> Agora imagine vender <span className="text-primary">com leads chegando todo dia.</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
              Enquanto você lê isso, lojas parceiras estão recebendo clientes qualificados pelo Quintal Ideal. Não fique de fora.
            </p>
            <Button size="lg" className="rounded-xl text-base px-8" onClick={() => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' })}>
              Cadastrar minha loja gratuitamente →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Formulário ── */}
      <section id="formulario" className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-[560px] mx-auto px-4">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-primary/20 shadow-md">
                <CardContent className="py-12 text-center">
                   <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-4" />
                   <h3 className="text-xl font-bold text-foreground mb-2">Pronto! Sua candidatura foi recebida 🎉</h3>
                   <p className="text-sm text-muted-foreground mb-1">
                     Nossa equipe entrará em contato pelo <strong>WhatsApp em até 24 horas</strong>.
                   </p>
                   <p className="text-xs text-muted-foreground/70">
                     Enquanto isso, prepare-se: em breve você terá acesso a uma plataforma completa para receber leads e fechar mais vendas.
                   </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="border-border/50 shadow-md">
              <CardContent className="p-6 sm:p-8">
                 <h2 className="text-xl font-bold text-foreground mb-1 text-center">Comece a receber leads agora</h2>
                 <p className="text-xs text-muted-foreground text-center mb-6">Cadastro gratuito · Sem compromisso · Aprovação em até 24h</p>
                <div className="space-y-4">
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
                    {touched.nome_franquia && errors.nome_franquia && (
                      <p className="text-xs text-destructive mt-1">{errors.nome_franquia}</p>
                    )}
                  </div>

                  <CityAutocomplete
                    value={form.cidade_base}
                    onChange={v => { setForm(p => ({ ...p, cidade_base: v })); clearError('cidade_base'); }}
                  />
                  {touched.cidade_base && errors.cidade_base && (
                    <p className="text-xs text-destructive -mt-2">{errors.cidade_base}</p>
                  )}

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
                    {touched.nome_responsavel && errors.nome_responsavel && (
                      <p className="text-xs text-destructive mt-1">{errors.nome_responsavel}</p>
                    )}
                  </div>

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
                    {touched.whatsapp_responsavel && errors.whatsapp_responsavel && (
                      <p className="text-xs text-destructive mt-1">{errors.whatsapp_responsavel}</p>
                    )}
                  </div>

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
                    {touched.email && errors.email && (
                      <p className="text-xs text-destructive mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox
                      id="terms"
                      checked={accepted}
                      onCheckedChange={v => { setAccepted(v === true); clearError('terms'); }}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                      Li e aceito os{' '}
                      <Link to="/termos" className="underline hover:text-foreground" target="_blank">Termos de Uso</Link>
                      {' '}e a{' '}
                      <Link to="/privacidade" className="underline hover:text-foreground" target="_blank">Política de Privacidade</Link>.
                    </label>
                  </div>
                  {errors.terms && (
                    <p className="text-xs text-destructive -mt-2">{errors.terms}</p>
                  )}

                  <Button
                    className="w-full rounded-xl"
                    size="lg"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? 'Enviando...' : 'Quero receber leads →'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
