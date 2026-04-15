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
  { emoji: '📋', title: 'Cadastre-se', description: 'Preencha o formulário com os dados da sua empresa. É rápido.' },
  { emoji: '✅', title: 'Aguarde a aprovação', description: 'Nossa equipe analisa e entra em contato em até 24h.' },
  { emoji: '🚀', title: 'Comece a operar', description: 'Acesse a plataforma, divulgue seu link e gerencie seus leads.' },
];

const FEATURES = [
  { emoji: '🎯', title: 'Gestão de leads', description: 'Kanban, funil de vendas e histórico completo de cada cliente' },
  { emoji: '📄', title: 'Orçamentos personalizados', description: 'Crie e envie propostas profissionais com um clique' },
  { emoji: '📱', title: 'WhatsApp integrado', description: 'Notificações automáticas para seus leads pelo WhatsApp' },
  { emoji: '📊', title: 'Relatórios e metas', description: 'Acompanhe sua performance e defina metas mensais' },
  { emoji: '🌍', title: 'Link exclusivo', description: 'Seu link de divulgação captura leads automaticamente' },
  { emoji: '🏆', title: 'Ranking da rede', description: 'Veja seu desempenho comparado aos outros parceiros' },
];

const ORCAMENTO_BENEFITS = [
  'Orçamentos e propostas ilimitados',
  'Modelos profissionais personalizados',
  'Envio automático por WhatsApp',
  'Acompanhamento de status em tempo real',
];

const WHATSAPP_BENEFITS = [
  'Tudo do plano Orçamento',
  'Notificações pelo número da sua empresa',
  'Instância dedicada gerenciada pela plataforma',
  'Conexão simples via QR Code',
  'Suporte prioritário',
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

  const isValid =
    form.nome_franquia.trim() &&
    form.cidade_base &&
    form.nome_responsavel.trim() &&
    form.whatsapp_responsavel.replace(/\D/g, '').length >= 10 &&
    form.email.includes('@') &&
    accepted;

  const handleSubmit = async () => {
    if (!isValid) return;
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
          <motion.h1
            className="text-3xl sm:text-5xl font-bold text-foreground mb-4 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Seja parceiro do<br />Quintal Ideal
          </motion.h1>
          <motion.p
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Gerencie seus leads, envie orçamentos profissionais e cresça com o suporte de uma plataforma feita para lojas de piscinas.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button size="lg" className="rounded-xl" onClick={() => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' })}>
              Quero ser parceiro
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <a href="/login" target="_blank" rel="noopener noreferrer">Ver a plataforma</a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-12">Como funciona</h2>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-12">Recursos da plataforma</h2>
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
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-3">Planos</h2>
          <p className="text-center text-sm text-muted-foreground mb-10">Disponíveis após o cadastro da sua empresa</p>
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

      {/* ── Formulário ── */}
      <section id="formulario" className="py-16 sm:py-20 bg-muted/30">
        <div className="max-w-[560px] mx-auto px-4">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-primary/20 shadow-md">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">Candidatura recebida!</h3>
                  <p className="text-sm text-muted-foreground">
                    Entraremos em contato pelo WhatsApp em até 24 horas.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="border-border/50 shadow-md">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground mb-6 text-center">Quero ser parceiro</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nome da empresa *</Label>
                    <Input
                      value={form.nome_franquia}
                      onChange={e => setForm(p => ({ ...p, nome_franquia: e.target.value }))}
                      placeholder="Quintal Ideal Porto Alegre"
                      maxLength={100}
                    />
                  </div>

                  <CityAutocomplete
                    value={form.cidade_base}
                    onChange={v => setForm(p => ({ ...p, cidade_base: v }))}
                  />

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Nome do responsável *</Label>
                    <Input
                      value={form.nome_responsavel}
                      onChange={e => setForm(p => ({ ...p, nome_responsavel: e.target.value }))}
                      placeholder="João Silva"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">WhatsApp *</Label>
                    <Input
                      type="tel"
                      value={form.whatsapp_responsavel}
                      onChange={e => setForm(p => ({ ...p, whatsapp_responsavel: formatPhone(e.target.value) }))}
                      placeholder="(51) 99999-9999"
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">E-mail *</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="contato@empresa.com"
                      maxLength={255}
                    />
                  </div>

                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox
                      id="terms"
                      checked={accepted}
                      onCheckedChange={v => setAccepted(v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                      Li e aceito os{' '}
                      <Link to="/termos" className="underline hover:text-foreground" target="_blank">Termos de Uso</Link>
                      {' '}e a{' '}
                      <Link to="/privacidade" className="underline hover:text-foreground" target="_blank">Política de Privacidade</Link>.
                    </label>
                  </div>

                  <Button
                    className="w-full rounded-xl"
                    size="lg"
                    disabled={!isValid || submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? 'Enviando...' : 'Enviar candidatura'}
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
