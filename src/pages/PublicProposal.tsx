import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, MessageCircle, Download, CreditCard, Truck, CalendarDays, Phone, User, FileText, AlertTriangle, RefreshCw, Droplets, Shield, Star, Sparkles, ArrowRight, Loader2, ShieldCheck, Copy, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toWhatsAppPhone } from '@/lib/phone-utils';
import { VideoEmbed } from '@/components/proposals/ProposalVideoSection';
import logoSplash from '@/assets/logo-splash.png';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const formatCurrency = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ProposalData {
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
  } | null;
  seller: {
    full_name: string | null;
    avatar_url: string | null;
    telefone: string | null;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-muted-foreground', bg: 'bg-muted', icon: '📝' },
  enviada: { label: 'Aguardando aprovação', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: '⏳' },
  visualizada: { label: 'Aguardando aprovação', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: '👁️' },
  em_negociacao: { label: 'Em negociação', color: 'text-info', bg: 'bg-info/10', icon: '🤝' },
  aceita: { label: 'Proposta Aceita ✓', color: 'text-success', bg: 'bg-success/10', icon: '✅' },
  recusada: { label: 'Proposta Recusada', color: 'text-destructive', bg: 'bg-destructive/10', icon: '❌' },
};

const REFUSE_REASONS = [
  'Preço alto',
  'Prazo inadequado',
  'Optei por outro fornecedor',
  'Não é o momento',
  'Outro',
];

/* ── Stagger container ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ── Verification code generator ── */
function generateVerificationCode(id: string, token: string): string {
  // Deterministic hash from id + token
  let hash = 0;
  const str = id + token;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const abs = Math.abs(hash);
  const part1 = (abs % 10000).toString().padStart(4, '0');
  const part2 = ((abs >>> 8) % 10000).toString().padStart(4, '0');
  return `SPL-${part1}-${part2}`;
}

/* ── Verification Footer ── */
function VerificationFooter({ proposal }: { proposal: ProposalData }) {
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
      {/* Verification card */}
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

      {/* Logo footer */}
      <div className="text-center space-y-2">
        <img src={logoSplash} alt="Splash" className="h-7 mx-auto opacity-20" />
        <p className="text-[10px] text-muted-foreground/40 font-medium">
          Proposta gerada pela plataforma Splash Piscinas
        </p>
      </div>
    </motion.div>
  );
}

/* ── Countdown ── */
function CountdownTimer({ validityDate }: { validityDate: string }) {
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
      {/* Subtle animated gradient bg */}
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

/* ── Trust badges ── */
function TrustBadges() {
  const badges = [
    { icon: Shield, label: 'Proposta segura', color: 'text-success', bg: 'bg-success/8 border-success/15' },
    { icon: Star, label: 'Empresa verificada', color: 'text-warning', bg: 'bg-warning/8 border-warning/15' },
    { icon: Droplets, label: 'Splash Piscinas', color: 'text-primary', bg: 'bg-primary/8 border-primary/15' },
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

/* ── Glassmorphism section card ── */
function SectionCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
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

export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [acceptName, setAcceptName] = useState('');
  const [refuseReason, setRefuseReason] = useState('');
  const [customRefuseReason, setCustomRefuseReason] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [negotiateItem, setNegotiateItem] = useState('');
  const [negotiateMessage, setNegotiateMessage] = useState('');
  const [negotiateValue, setNegotiateValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState<'accepted' | 'refused' | 'question' | 'negotiated' | null>(null);

  const fetchProposal = useCallback(async () => {
    if (!token) return;
    try {
      const { data, error: err } = await supabase.rpc('public_get_proposal_by_token', { _token: token });
      if (err || !data) { setError(true); return; }
      setProposal(data as unknown as ProposalData);
    } catch { setError(true); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchProposal(); }, [fetchProposal]);

  useEffect(() => {
    if (!token || !proposal) return;
    supabase.rpc('public_register_proposal_view', { _token: token, _user_agent: navigator.userAgent });
  }, [token, proposal?.id]);

  const expired = proposal?.validity_date ? isPast(new Date(proposal.validity_date + 'T23:59:59')) : false;
  const isFinal = proposal?.status === 'aceita' || proposal?.status === 'recusada';
  const canAct = !expired && !isFinal;

  const handleAccept = async () => {
    if (!token || !acceptName.trim()) return;
    setSubmitting(true);
    await supabase.rpc('public_accept_proposal', { _token: token, _name: acceptName.trim(), _user_agent: navigator.userAgent });
    setSubmitting(false); setAcceptOpen(false); setActionDone('accepted'); fetchProposal();
  };
  const handleRefuse = async () => {
    const reason = refuseReason === 'Outro' ? customRefuseReason.trim() : refuseReason;
    if (!token || !reason) return;
    setSubmitting(true);
    await supabase.rpc('public_refuse_proposal', { _token: token, _reason: reason, _user_agent: navigator.userAgent });
    setSubmitting(false); setRefuseOpen(false); setActionDone('refused'); fetchProposal();
  };
  const handleQuestion = async () => {
    if (!token || !questionText.trim()) return;
    setSubmitting(true);
    await supabase.rpc('public_ask_proposal_question', { _token: token, _question: questionText.trim() });
    setSubmitting(false); setQuestionOpen(false); setQuestionText(''); setActionDone('question');
  };
  const handleNegotiate = async () => {
    if (!token || !negotiateMessage.trim()) return;
    setSubmitting(true);
    await supabase.rpc('public_submit_negotiation' as any, {
      _token: token, _item_reference: negotiateItem || null,
      _client_message: negotiateMessage.trim(), _proposed_value: negotiateValue ? parseFloat(negotiateValue) : null,
    });
    setSubmitting(false); setNegotiateOpen(false); setNegotiateMessage(''); setNegotiateItem(''); setNegotiateValue('');
    setActionDone('negotiated'); fetchProposal();
  };
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!proposal) return;
    setExporting(true);
    try {
      const contentEl = document.getElementById('proposal-pdf-content');
      if (!contentEl) return;

      const A4_W = 210, A4_H = 297, M = 15;
      const CW = A4_W - M * 2;
      const GAP = 4;

      const sections = Array.from(contentEl.querySelectorAll('[data-pdf-section]')) as HTMLElement[];
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let curY = M;

      // Add logo at top of first page
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = logoSplash;
      await new Promise<void>((res) => { logoImg.onload = () => res(); logoImg.onerror = () => res(); });
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoH = 12;
        const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
        pdf.addImage(logoImg, 'PNG', M, curY, logoW, logoH);
        curY += logoH + 4;
      }

      // Title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 30, 30);
      pdf.text(`Proposta #${proposal.id.slice(0, 4).toUpperCase()}`, M, curY + 6);
      curY += 12;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Emitida em ${format(new Date(proposal.created_at), "dd/MM/yyyy")} • ${proposal.franchise?.nome_franquia || ''}`, M, curY + 3);
      curY += 10;

      // Separator line
      pdf.setDrawColor(220, 220, 220);
      pdf.line(M, curY, A4_W - M, curY);
      curY += 6;

      for (const section of sections) {
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 700,
        });

        const wPx = canvas.width / 2;
        const hPx = canvas.height / 2;
        const sf = CW / wPx;
        const hMM = hPx * sf;

        if (hMM > (A4_H - M - curY) && curY > M + 20) {
          pdf.addPage();
          curY = M;
        }

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', M, curY, CW, hMM);
        curY += hMM + GAP;
      }

      // Footer on last page
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(170, 170, 170);
        pdf.text(`Splash Piscinas • Página ${i} de ${pageCount}`, A4_W / 2, A4_H - 8, { align: 'center' });
      }

      pdf.save(`proposta-${proposal.id.slice(0, 8)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5">
        <motion.img
          src={logoSplash} alt="Splash" className="w-20 h-auto"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
          <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Carregando proposta...</p>
      </motion.div>
    </div>
  );

  /* ── Error ── */
  if (error || !proposal) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <img src={logoSplash} alt="Splash" className="w-24 h-auto mx-auto" />
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Proposta não encontrada</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">O link pode estar incorreto ou a proposta foi removida.</p>
      </motion.div>
    </div>
  );

  const statusConf = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.enviada;
  const sellerPhone = proposal.seller?.telefone;
  const discountAmount = proposal.global_discount_type === 'percent'
    ? proposal.subtotal * (proposal.global_discount / 100)
    : proposal.global_discount;
  const proposalNumber = proposal.id.slice(0, 4).toUpperCase();

  return (
    <>
      <div className="min-h-screen bg-background print:bg-white">
        {/* ── Animated background mesh ── */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden print:hidden">
          <div className="absolute -top-[40%] -right-[20%] w-[80%] h-[80%] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, hsl(207 90% 52%), transparent 70%)' }} />
          <div className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full opacity-[0.02]"
            style={{ background: 'radial-gradient(circle, hsl(322 85% 50%), transparent 70%)' }} />
        </div>

        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border/50 print:static">
          <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.img
                src={logoSplash} alt="Splash Piscinas" className="h-9 w-auto"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              />
              <div className="hidden sm:block h-6 w-px bg-border" />
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-foreground leading-tight">{proposal.franchise?.nome_franquia}</p>
                {proposal.franchise?.cidade_base && <p className="text-[10px] text-muted-foreground">{proposal.franchise.cidade_base}</p>}
              </div>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <Badge className={`${statusConf.bg} ${statusConf.color} border-0 text-xs font-bold px-3.5 py-1.5 rounded-full`}>
                {statusConf.icon} {statusConf.label}
              </Badge>
            </motion.div>
          </div>
        </header>

        <main id="proposal-pdf-content" className="relative max-w-3xl mx-auto px-5 py-8 space-y-7 pb-36 sm:pb-10 print:pb-0 print:space-y-5">

          {/* ═══════════ HERO ═══════════ */}
          <motion.div
            data-pdf-section
            variants={stagger} initial="hidden" animate="show"
            className="text-center space-y-5 pt-2"
          >
            <motion.div variants={staggerItem}
              className="inline-flex items-center gap-2 bg-primary/8 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5" />
              PROPOSTA #{proposalNumber}
            </motion.div>

            <motion.h2 variants={staggerItem}
              className="text-3xl sm:text-[2.75rem] font-black text-foreground tracking-tight leading-[1.1]"
            >
              Olá, {proposal.client_name.split(' ')[0]}! 👋
            </motion.h2>

            <motion.p variants={staggerItem}
              className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed"
            >
              Preparamos uma proposta exclusiva para você.
              <br className="hidden sm:block" />
              Confira todos os detalhes abaixo.
            </motion.p>

            <motion.p variants={staggerItem} className="text-xs text-muted-foreground/50 font-medium">
              Emitida em {format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </motion.p>

            {proposal.validity_date && <CountdownTimer validityDate={proposal.validity_date} />}
          </motion.div>

          {/* ═══════════ ACTION DONE MESSAGES ═══════════ */}
          <AnimatePresence>
            {actionDone === 'accepted' && (
              <motion.div key="accepted" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="relative overflow-hidden rounded-2xl border border-success/20 p-6 text-center"
                style={{ background: 'linear-gradient(135deg, hsl(152 70% 96%), hsl(152 70% 94%))' }}
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-8 h-8 text-success" />
                </motion.div>
                <p className="font-black text-success text-lg">Proposta aceita com sucesso! 🎉</p>
                <p className="text-sm text-success/80 mt-2">O vendedor foi notificado e entrará em contato em breve.</p>
              </motion.div>
            )}
            {actionDone === 'refused' && (
              <motion.div key="refused" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-destructive" />
                </div>
                <p className="font-black text-destructive text-lg">Proposta recusada</p>
                <p className="text-sm text-destructive/70 mt-2">O vendedor foi notificado sobre sua decisão.</p>
              </motion.div>
            )}
            {actionDone === 'question' && (
              <motion.div key="question" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-primary/5 border border-primary/15 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-primary" />
                </div>
                <p className="font-black text-foreground text-lg">Dúvida enviada!</p>
                <p className="text-sm text-muted-foreground mt-2">O vendedor receberá sua mensagem e responderá em breve.</p>
              </motion.div>
            )}
            {actionDone === 'negotiated' && (
              <motion.div key="negotiated" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-primary/5 border border-primary/15 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-primary" />
                </div>
                <p className="font-black text-foreground text-lg">Proposta de ajuste enviada!</p>
                <p className="text-sm text-muted-foreground mt-2">O vendedor analisará sua contraproposta e retornará em breve.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════ SELLER CARD ═══════════ */}
          {proposal.seller && (
            <SectionCard className="overflow-hidden">
              <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(322 85% 50%), hsl(207 90% 42%), hsl(140 20% 72%))' }} />
              <div className="flex items-center gap-4 p-5">
                <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
                  <Avatar className="w-14 h-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                    <AvatarImage src={proposal.seller.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground font-black text-lg">
                      {(proposal.seller.full_name || 'V')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{proposal.seller.full_name || 'Consultor'}</p>
                  <p className="text-xs text-muted-foreground">{proposal.franchise?.nome_franquia} • Consultor comercial</p>
                </div>
                {sellerPhone && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="sm" className="shrink-0 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl shadow-md print:hidden" asChild>
                      <a href={`https://wa.me/${toWhatsAppPhone(sellerPhone)}`} target="_blank" rel="noopener noreferrer">
                        <Phone className="w-4 h-4 mr-1.5" /> Falar
                      </a>
                    </Button>
                  </motion.div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ═══════════ VIDEO ═══════════ */}
          {proposal.video_url && (
            <SectionCard>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <span className="text-sm">🎬</span>
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Uma mensagem do seu consultor</h3>
                </div>
                <VideoEmbed url={proposal.video_url} />
              </div>
            </SectionCard>
          )}

          {/* ═══════════ CLIENT DATA ═══════════ */}
          <SectionCard delay={0.05}>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                  <User className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Dados do Cliente</h3>
              </div>
              <div className="h-px bg-border/50" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground/70 text-[11px] uppercase tracking-[0.1em] font-semibold">Nome</span>
                  <p className="font-semibold text-foreground mt-0.5">{proposal.client_name}</p>
                </div>
                {proposal.client_document && (
                  <div>
                    <span className="text-muted-foreground/70 text-[11px] uppercase tracking-[0.1em] font-semibold">
                      {proposal.person_type === 'pj' ? 'CNPJ' : 'CPF'}
                    </span>
                    <p className="font-semibold text-foreground mt-0.5">{proposal.client_document}</p>
                  </div>
                )}
                {proposal.client_address && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground/70 text-[11px] uppercase tracking-[0.1em] font-semibold">Endereço</span>
                    <p className="font-semibold text-foreground mt-0.5">{proposal.client_address}</p>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ═══════════ ITEMS ═══════════ */}
          <SectionCard delay={0.1} className="overflow-hidden">
            <div className="p-5 pb-0">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-primary" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Itens da Proposta</h3>
                <Badge variant="secondary" className="ml-auto text-[10px] font-bold rounded-full px-2.5">
                  {proposal.items.length} {proposal.items.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border/50 bg-muted/30">
                    <th className="text-left px-5 py-3 font-bold text-muted-foreground text-[11px] uppercase tracking-[0.1em]">Item</th>
                    <th className="text-center px-3 py-3 font-bold text-muted-foreground text-[11px] uppercase tracking-[0.1em]">Qtd</th>
                    <th className="text-right px-3 py-3 font-bold text-muted-foreground text-[11px] uppercase tracking-[0.1em]">Unitário</th>
                    <th className="text-right px-5 py-3 font-bold text-muted-foreground text-[11px] uppercase tracking-[0.1em]">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className={`border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-foreground">{item.product_name}</p>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                      </td>
                      <td className="text-center px-3 py-4 text-muted-foreground tabular-nums">{item.quantity}</td>
                      <td className="text-right px-3 py-4 text-muted-foreground tabular-nums">{formatCurrency(item.unit_price)}</td>
                      <td className="text-right px-5 py-4 font-bold text-foreground tabular-nums">{formatCurrency(item.subtotal)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <motion.div
              variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="sm:hidden space-y-2.5 px-5"
            >
              {proposal.items.map((item) => (
                <motion.div key={item.id} variants={staggerItem}
                  className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-2 transition-all hover:border-primary/20 hover:bg-primary/3"
                >
                  <p className="font-bold text-foreground text-sm">{item.product_name}</p>
                  {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-muted-foreground tabular-nums">{item.quantity}x {formatCurrency(item.unit_price)}</span>
                    <span className="font-black text-foreground tabular-nums">{formatCurrency(item.subtotal)}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* ── TOTAL SECTION (Premium) ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative m-5 mt-4 rounded-2xl overflow-hidden"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 opacity-[0.06]"
                style={{ background: 'linear-gradient(135deg, hsl(207 90% 42%), hsl(322 85% 50%))' }} />
              <div className="absolute inset-0 bg-card/60 backdrop-blur-sm" />

              <div className="relative p-5 space-y-3 border border-border/30 rounded-2xl">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground tabular-nums">{formatCurrency(proposal.subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium">Desconto</span>
                    <span className="text-success font-bold tabular-nums">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="h-px bg-border/50 my-1" />
                <div className="flex justify-between items-end pt-1">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total</span>
                  </div>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  >
                    <span className="text-3xl sm:text-4xl font-black tracking-tight"
                      style={{
                        background: 'linear-gradient(135deg, hsl(207 90% 42%), hsl(322 85% 50%))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {formatCurrency(proposal.total)}
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </SectionCard>

          {/* ═══════════ CONDITIONS ═══════════ */}
          <motion.div
            data-pdf-section
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {proposal.payment_method && (
              <motion.div variants={staggerItem}>
                <div className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 text-center
                  transition-all duration-300 hover:border-secondary/30 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-secondary/8 flex items-center justify-center mx-auto mb-3
                    group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="w-5 h-5 text-secondary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold">Pagamento</p>
                  <p className="font-bold text-sm text-foreground mt-1 capitalize">{proposal.payment_method}</p>
                </div>
              </motion.div>
            )}
            {proposal.delivery_deadline && (
              <motion.div variants={staggerItem}>
                <div className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 text-center
                  transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center mx-auto mb-3
                    group-hover:scale-110 transition-transform duration-300">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold">Entrega</p>
                  <p className="font-bold text-sm text-foreground mt-1">{proposal.delivery_deadline}</p>
                </div>
              </motion.div>
            )}
            {proposal.validity_date && (
              <motion.div variants={staggerItem}>
                <div className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 text-center
                  transition-all duration-300 hover:border-success/30 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-success/8 flex items-center justify-center mx-auto mb-3
                    group-hover:scale-110 transition-transform duration-300">
                    <CalendarDays className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold">Válida até</p>
                  <p className="font-bold text-sm text-foreground mt-1">{format(new Date(proposal.validity_date), "dd/MM/yyyy")}</p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {proposal.payment_conditions && (
            <SectionCard>
              <div className="p-5 text-sm text-muted-foreground leading-relaxed">{proposal.payment_conditions}</div>
            </SectionCard>
          )}

          {/* ═══════════ OBSERVATIONS ═══════════ */}
          {proposal.observations && (
            <SectionCard>
              <div className="p-5 space-y-2">
                <h3 className="font-bold text-sm text-foreground">Observações</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{proposal.observations}</p>
              </div>
            </SectionCard>
          )}

          {/* ═══════════ DESKTOP ACTIONS ═══════════ */}
          {canAct && !actionDone && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="hidden sm:block print:hidden"
            >
              <div className="relative rounded-2xl overflow-hidden border border-border/40">
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(322 85% 50%), hsl(207 90% 42%), hsl(140 20% 72%))' }} />
                <div className="bg-card/80 backdrop-blur-sm p-7 space-y-5">
                  <p className="text-center text-sm text-muted-foreground font-semibold">O que você gostaria de fazer?</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button onClick={() => setAcceptOpen(true)}
                        className="gap-2 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-success-foreground rounded-xl shadow-lg h-12 px-7 font-bold text-sm">
                        <Check className="w-4 h-4" /> Aceitar Proposta
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </motion.div>
                    <Button variant="outline" onClick={() => setNegotiateOpen(true)}
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/5 rounded-xl h-12 px-5 font-semibold">
                      <RefreshCw className="w-4 h-4" /> Propor Ajuste
                    </Button>
                    <Button variant="outline" onClick={() => setRefuseOpen(true)}
                      className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/5 rounded-xl h-12 px-5 font-semibold">
                      <X className="w-4 h-4" /> Recusar
                    </Button>
                    <Button variant="ghost" onClick={() => setQuestionOpen(true)}
                      className="gap-2 text-muted-foreground hover:text-foreground rounded-xl h-12 font-semibold">
                      <MessageCircle className="w-4 h-4" /> Tenho uma dúvida
                    </Button>
                    <Button variant="ghost" onClick={handleExportPDF} disabled={exporting}
                      className="gap-2 text-muted-foreground/50 rounded-xl h-12">
                      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <VerificationFooter proposal={proposal} />
        </main>

        {/* ═══════════ MOBILE BOTTOM BAR ═══════════ */}
        {canAct && !actionDone && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 p-4 sm:hidden print:hidden z-20"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-2">
              <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
                <Button onClick={() => setAcceptOpen(true)}
                  className="w-full gap-1.5 h-12 bg-gradient-to-r from-success to-success/80 text-success-foreground rounded-xl shadow-lg font-bold">
                  <Check className="w-4 h-4" /> Aceitar
                </Button>
              </motion.div>
              <Button variant="outline" onClick={() => setNegotiateOpen(true)}
                className="h-12 w-12 rounded-xl border-primary/30 text-primary p-0">
                <RefreshCw className="w-5 h-5" />
              </Button>
              <Button variant="outline" onClick={() => setRefuseOpen(true)}
                className="h-12 w-12 rounded-xl border-destructive/20 text-destructive p-0">
                <X className="w-5 h-5" />
              </Button>
              <Button variant="ghost" onClick={() => setQuestionOpen(true)}
                className="h-12 w-12 rounded-xl text-muted-foreground p-0">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ MODALS ═══════════ */}
      {/* Accept */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Confirmar aceite</DialogTitle>
            <DialogDescription>Digite seu nome completo para confirmar a aceitação desta proposta.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Seu nome completo" value={acceptName} onChange={(e) => setAcceptName(e.target.value)} className="rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleAccept} disabled={!acceptName.trim() || submitting}
              className="bg-gradient-to-r from-success to-success/80 text-success-foreground rounded-xl font-bold">
              {submitting ? 'Enviando...' : 'Confirmar Aceite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refuse */}
      <Dialog open={refuseOpen} onOpenChange={setRefuseOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Recusar proposta</DialogTitle>
            <DialogDescription>Nos ajude a melhorar. Qual o motivo da recusa?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {REFUSE_REASONS.map((r) => (
              <Button key={r} variant={refuseReason === r ? 'default' : 'outline'} size="sm" className="rounded-xl"
                onClick={() => { setRefuseReason(r); if (r !== 'Outro') setCustomRefuseReason(''); }}>{r}</Button>
            ))}
          </div>
          {refuseReason === 'Outro' && (
            <Textarea placeholder="Descreva o motivo..." value={customRefuseReason} onChange={(e) => setCustomRefuseReason(e.target.value)} className="rounded-xl" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={handleRefuse} className="rounded-xl font-bold"
              disabled={(!refuseReason || (refuseReason === 'Outro' && !customRefuseReason.trim())) || submitting}>
              {submitting ? 'Enviando...' : 'Confirmar Recusa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question */}
      <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">💬 Enviar dúvida</DialogTitle>
            <DialogDescription>Escreva sua pergunta e o vendedor responderá em breve.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Qual sua dúvida sobre esta proposta?" value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4} className="rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleQuestion} disabled={!questionText.trim() || submitting}
              className="rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold">
              {submitting ? 'Enviando...' : 'Enviar Dúvida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Negotiate */}
      <Dialog open={negotiateOpen} onOpenChange={setNegotiateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">🔄 Propor Ajuste</DialogTitle>
            <DialogDescription>Selecione o item que deseja negociar e descreva sua contraproposta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-foreground">Item (opcional)</label>
              <Select value={negotiateItem} onValueChange={setNegotiateItem}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue placeholder="Selecione um item..." /></SelectTrigger>
                <SelectContent>
                  {proposal?.items.map((item) => (
                    <SelectItem key={item.id} value={item.product_name}>{item.product_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Valor proposto (opcional)</label>
              <Input type="number" placeholder="R$ 0,00" value={negotiateValue} onChange={(e) => setNegotiateValue(e.target.value)} className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground">Sua proposta *</label>
              <Textarea placeholder="Ex: Consigo fechar se o prazo de entrega for de 30 dias..." value={negotiateMessage} onChange={(e) => setNegotiateMessage(e.target.value)} rows={3} className="mt-1 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleNegotiate} disabled={!negotiateMessage.trim() || submitting}
              className="rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold">
              {submitting ? 'Enviando...' : 'Enviar Proposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:static { position: static !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:pb-0 { padding-bottom: 0 !important; }
          .print\\:space-y-5 > * + * { margin-top: 1.25rem !important; }
        }
      `}</style>
    </>
  );
}
