import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Star, Droplets, CalendarDays, AlertTriangle, ShieldCheck, Copy, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns';

export interface ProposalData {
  id: string;
  public_token: string;
  client_name: string;
  client_document: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  client_contact_name: string | null;
  person_type: string;
  status: string;
  subtotal: number;
  total: number;
  global_discount: number;
  global_discount_type: string;
  payment_method: string | null;
  payment_conditions: string | null;
  delivery_deadline: string | null;
  validity_date: string | null;
  observations: string | null;
  created_at: string;
  accepted_at: string | null;
  accepted_by_name: string | null;
  refused_at: string | null;
  refused_reason: string | null;
  franchise_id: string;
  video_url?: string | null;
  items: Array<{
    id: string;
    product_name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    discount: number;
    subtotal: number;
    sort_order: number;
  }>;
  franchise: {
    nome_franquia: string;
    whatsapp: string | null;
    email: string | null;
    cidade_base: string | null;
    endereco: string | null;
  } | null;
  seller: {
    full_name: string | null;
    avatar_url: string | null;
    telefone: string | null;
  } | null;
}

export const formatCurrency = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão de Crédito',
  transferencia: 'Transferência',
  cfm: 'CFM',
  cred_window: 'Cred Window',
  compra_programada: 'Compra Programada',
  financiamento_banco: 'Financiamento via Banco',
  outro: 'Outro',
};

export const getPaymentLabel = (v: string | null) => (v ? PAYMENT_LABELS[v] || v : '');

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-muted-foreground', bg: 'bg-muted', icon: '📝' },
  enviada: { label: 'Aguardando aprovação', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: '⏳' },
  visualizada: { label: 'Aguardando aprovação', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: '👁️' },
  em_negociacao: { label: 'Em negociação', color: 'text-info', bg: 'bg-info/10', icon: '🤝' },
  aceita: { label: 'Proposta Aceita ✓', color: 'text-success', bg: 'bg-success/10', icon: '✅' },
  recusada: { label: 'Proposta Recusada', color: 'text-destructive', bg: 'bg-destructive/10', icon: '❌' },
};

export const REFUSE_REASONS = [
  'Preço alto',
  'Prazo inadequado',
  'Optei por outro fornecedor',
  'Não é o momento',
  'Outro',
];

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export function generateVerificationCode(id: string, token: string): string {
  let hash = 0;
  const str = id + token;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const abs = Math.abs(hash);
  const part1 = (abs % 10000).toString().padStart(4, '0');
  const part2 = ((abs >>> 8) % 10000).toString().padStart(4, '0');
  return `SPL-${part1}-${part2}`;
}

export function SectionCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      data-pdf-section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300 ${className}`}>
        {children}
      </div>
    </motion.div>
  );
}

export function VerificationFooter({ proposal }: { proposal: ProposalData }) {
  const [copied, setCopied] = useState(false);
  const code = generateVerificationCode(proposal.id, proposal.public_token);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      data-pdf-section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="space-y-5 pb-6"
    >
      <div className="relative rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, hsl(207 90% 42%), hsl(152 70% 45%), hsl(207 90% 42%))' }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-success" />
            <h4 className="text-sm font-bold text-foreground">Código de Verificação</h4>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-muted/50 border border-border/50 rounded-xl px-5 py-3">
              <span className="font-mono text-lg font-black tracking-[0.15em] text-foreground">{code}</span>
            </div>
            <button
              onClick={handleCopy}
              className="p-2.5 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors print:hidden"
              title="Copiar código"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed max-w-sm mx-auto">
              Este código garante a autenticidade desta proposta.
              Verifique diretamente com a <strong className="text-foreground/80">Splash Piscinas</strong> em caso de dúvida.
            </p>
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/50 font-medium">
              <span>ID: #{proposal.id.slice(0, 8).toUpperCase()}</span>
              <span>•</span>
              <span>Emitida em {format(new Date(proposal.created_at), "dd/MM/yyyy")}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function CountdownTimer({ validityDate }: { validityDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const target = new Date(validityDate + 'T23:59:59');
  if (isPast(target)) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 px-5 py-4 rounded-2xl">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
        <p className="text-destructive text-sm font-medium">Esta proposta expirou e não está mais disponível para aceite.</p>
      </motion.div>
    );
  }

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6"
    >
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ background: 'linear-gradient(135deg, hsl(207 90% 42%), hsl(322 85% 50%))' }} />
      <div className="relative space-y-4">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Proposta válida por</span>
        </div>
        <div className="flex items-center gap-3 justify-center">
          {[
            { value: days, label: 'dias' },
            { value: hours, label: 'horas' },
            { value: minutes, label: 'min' },
          ].map(({ value, label }, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <motion.div
                  key={value}
                  initial={{ rotateX: -90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg"
                  style={{ boxShadow: '0 8px 32px hsl(207 90% 42% / 0.25)' }}
                >
                  <span className="text-2xl font-black text-primary-foreground tabular-nums">
                    {String(value).padStart(2, '0')}
                  </span>
                </motion.div>
                <span className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-[0.15em] font-semibold">{label}</span>
              </div>
              {i < 2 && <span className="text-xl font-black text-primary/40 -mt-5">:</span>}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/60 text-center">
          Expira em {format(target, "dd/MM/yyyy 'às' HH:mm")}
        </p>
      </div>
    </motion.div>
  );
}

export function TrustBadges() {
  const badges = [
    { icon: Shield, label: 'Proposta segura', color: 'text-success', bg: 'bg-success/8 border-success/15' },
    { icon: Star, label: 'Empresa verificada', color: 'text-warning', bg: 'bg-warning/8 border-warning/15' },
    { icon: Droplets, label: 'Quintal Ideal', color: 'text-primary', bg: 'bg-primary/8 border-primary/15' },
  ];

  return (
    <motion.div
      variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
      className="flex flex-wrap items-center justify-center gap-3"
    >
      {badges.map(({ icon: Icon, label, color, bg }) => (
        <motion.div key={label} variants={staggerItem}
          className={`flex items-center gap-2 ${bg} border px-4 py-2.5 rounded-full transition-transform hover:scale-105`}
        >
          <Icon className={`w-4 h-4 ${color}`} />
          <span className={`text-xs font-bold ${color}`}>{label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
