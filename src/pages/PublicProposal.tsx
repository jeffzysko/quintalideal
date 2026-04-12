import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, MessageCircle, Download, CreditCard, Truck, CalendarDays, Phone, User, FileText, AlertTriangle, RefreshCw, Droplets, Shield, Star } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toWhatsAppPhone } from '@/lib/phone-utils';
import { VideoEmbed } from '@/components/proposals/ProposalVideoSection';
import logoSplash from '@/assets/logo-splash.png';

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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-slate-600', bg: 'bg-slate-100' },
  enviada: { label: 'Aguardando sua aprovação', color: 'text-amber-700', bg: 'bg-amber-50' },
  visualizada: { label: 'Aguardando sua aprovação', color: 'text-amber-700', bg: 'bg-amber-50' },
  em_negociacao: { label: 'Em negociação', color: 'text-[#08a1d6]', bg: 'bg-[#08a1d6]/10' },
  aceita: { label: 'Proposta Aceita ✓', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  recusada: { label: 'Proposta Recusada', color: 'text-red-700', bg: 'bg-red-50' },
};

const REFUSE_REASONS = [
  'Preço alto',
  'Prazo inadequado',
  'Optei por outro fornecedor',
  'Não é o momento',
  'Outro',
];

/* ── Countdown ── */
function CountdownTimer({ validityDate }: { validityDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const target = new Date(validityDate + 'T23:59:59');
  if (isPast(target)) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 bg-red-50 border border-red-200 px-5 py-4 rounded-2xl">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-red-700 text-sm font-medium">Esta proposta expirou e não está mais disponível para aceite.</p>
      </motion.div>
    );
  }

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 justify-center">
      {[
        { value: days, label: 'dias' },
        { value: hours, label: 'horas' },
        { value: minutes, label: 'min' },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#08a1d6] to-[#0d8ab8] flex items-center justify-center shadow-lg shadow-[#08a1d6]/20">
            <span className="text-xl font-bold text-white">{String(value).padStart(2, '0')}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-medium">{label}</span>
        </div>
      ))}
    </motion.div>
  );
}

/* ── Trust badges ── */
function TrustBadges() {
  return (
    <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
      <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Proposta segura</span>
      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Empresa verificada</span>
      <span className="flex items-center gap-1"><Droplets className="w-3.5 h-3.5" /> Splash Piscinas</span>
    </div>
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
  const handlePrint = () => window.print();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#9bcdeb]/10 to-[#08a1d6]/5">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
        <img src={logoSplash} alt="Splash" className="w-20 h-auto" />
        <div className="animate-spin w-8 h-8 border-3 border-[#08a1d6] border-t-transparent rounded-full" />
      </motion.div>
    </div>
  );

  if (error || !proposal) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white via-[#9bcdeb]/10 to-[#08a1d6]/5 px-6 text-center">
      <img src={logoSplash} alt="Splash" className="w-24 h-auto mb-6" />
      <FileText className="w-14 h-14 text-slate-300 mb-4" />
      <h1 className="text-xl font-bold text-slate-800 mb-2">Proposta não encontrada</h1>
      <p className="text-slate-500 text-sm">O link pode estar incorreto ou a proposta foi removida.</p>
    </div>
  );

  const statusConf = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.enviada;
  const sellerPhone = proposal.seller?.telefone;
  const discountAmount = proposal.global_discount_type === 'percent'
    ? proposal.subtotal * (proposal.global_discount / 100)
    : proposal.global_discount;
  const proposalNumber = proposal.id.slice(0, 4).toUpperCase();

  const fadeUp = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-30px' },
    transition: { duration: 0.5 },
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-white via-white to-[#9bcdeb]/5 print:bg-white">
        {/* ── Branded Header ── */}
        <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-slate-100 print:static">
          <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoSplash} alt="Splash Piscinas" className="h-9 w-auto" />
              <div className="hidden sm:block h-6 w-px bg-slate-200" />
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{proposal.franchise?.nome_franquia}</p>
                {proposal.franchise?.cidade_base && <p className="text-[10px] text-slate-400">{proposal.franchise.cidade_base}</p>}
              </div>
            </div>
            <Badge className={`${statusConf.bg} ${statusConf.color} border-0 text-xs font-semibold px-3 py-1`}>
              {statusConf.label}
            </Badge>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-5 py-8 space-y-8 pb-36 sm:pb-10 print:pb-0 print:space-y-5">
          {/* ── Hero Section ── */}
          <motion.div {...fadeUp} className="text-center space-y-5">
            <div className="inline-flex items-center gap-2 bg-[#08a1d6]/8 text-[#08a1d6] px-4 py-1.5 rounded-full text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" />
              PROPOSTA COMERCIAL #{proposalNumber}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
              Olá, {proposal.client_name.split(' ')[0]}! 👋
            </h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
              Preparamos uma proposta exclusiva para você. Confira os detalhes abaixo.
            </p>
            <p className="text-xs text-slate-400">
              Emitida em {format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            {proposal.validity_date && !expired && <CountdownTimer validityDate={proposal.validity_date} />}
            {proposal.validity_date && expired && <CountdownTimer validityDate={proposal.validity_date} />}
          </motion.div>

          {/* ── Success/action messages ── */}
          {actionDone === 'accepted' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-bold text-emerald-800 text-lg">Proposta aceita com sucesso! 🎉</p>
              <p className="text-sm text-emerald-700 mt-2">O vendedor foi notificado e entrará em contato em breve.</p>
            </motion.div>
          )}
          {actionDone === 'refused' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <X className="w-7 h-7 text-red-600" />
              </div>
              <p className="font-bold text-red-800 text-lg">Proposta recusada</p>
              <p className="text-sm text-red-700 mt-2">O vendedor foi notificado sobre sua decisão.</p>
            </motion.div>
          )}
          {actionDone === 'question' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-[#08a1d6]/5 border border-[#08a1d6]/20 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#08a1d6]/10 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-7 h-7 text-[#08a1d6]" />
              </div>
              <p className="font-bold text-slate-800 text-lg">Dúvida enviada!</p>
              <p className="text-sm text-slate-600 mt-2">O vendedor receberá sua mensagem e responderá em breve.</p>
            </motion.div>
          )}
          {actionDone === 'negotiated' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-[#08a1d6]/5 border border-[#08a1d6]/20 rounded-2xl p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#08a1d6]/10 flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="w-7 h-7 text-[#08a1d6]" />
              </div>
              <p className="font-bold text-slate-800 text-lg">Proposta de ajuste enviada!</p>
              <p className="text-sm text-slate-600 mt-2">O vendedor analisará sua contraproposta e retornará em breve.</p>
            </motion.div>
          )}

          {/* ── Seller Card ── */}
          {proposal.seller && (
            <motion.div {...fadeUp}>
              <Card className="overflow-hidden border-0 shadow-lg shadow-slate-200/50 rounded-2xl">
                <div className="h-1.5 bg-gradient-to-r from-[#e80685] via-[#08a1d6] to-[#9bcdeb]" />
                <CardContent className="flex items-center gap-4 py-5 px-5">
                  <Avatar className="w-14 h-14 ring-2 ring-[#08a1d6]/20 ring-offset-2">
                    <AvatarImage src={proposal.seller.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-[#08a1d6] to-[#0d8ab8] text-white font-bold text-lg">
                      {(proposal.seller.full_name || 'V')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800">{proposal.seller.full_name || 'Consultor'}</p>
                    <p className="text-xs text-slate-500">{proposal.franchise?.nome_franquia} • Consultor comercial</p>
                  </div>
                  {sellerPhone && (
                    <Button size="sm" className="shrink-0 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl shadow-md shadow-green-200/50 print:hidden" asChild>
                      <a href={`https://wa.me/${toWhatsAppPhone(sellerPhone)}`} target="_blank" rel="noopener noreferrer">
                        <Phone className="w-4 h-4 mr-1.5" /> Falar
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Video ── */}
          {proposal.video_url && (
            <motion.div {...fadeUp}>
              <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
                <CardContent className="py-5 px-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#e80685]/10 flex items-center justify-center">
                      <span className="text-sm">🎬</span>
                    </div>
                    <h3 className="font-semibold text-sm text-slate-800">Uma mensagem do seu consultor</h3>
                  </div>
                  <VideoEmbed url={proposal.video_url} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Client Data ── */}
          <motion.div {...fadeUp}>
            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl">
              <CardContent className="py-5 px-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#08a1d6]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#08a1d6]" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-800">Dados do Cliente</h3>
                </div>
                <Separator className="bg-slate-100" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Nome</span><p className="font-medium text-slate-800 mt-0.5">{proposal.client_name}</p></div>
                  {proposal.client_document && <div><span className="text-slate-400 text-xs uppercase tracking-wide">{proposal.person_type === 'pj' ? 'CNPJ' : 'CPF'}</span><p className="font-medium text-slate-800 mt-0.5">{proposal.client_document}</p></div>}
                  {proposal.client_address && <div className="sm:col-span-2"><span className="text-slate-400 text-xs uppercase tracking-wide">Endereço</span><p className="font-medium text-slate-800 mt-0.5">{proposal.client_address}</p></div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Items ── */}
          <motion.div {...fadeUp}>
            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
              <CardContent className="py-5 px-0">
                <div className="flex items-center gap-2 px-5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#08a1d6]/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#08a1d6]" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-800">Itens da Proposta</h3>
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-y bg-slate-50/80">
                      <th className="text-left px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Item</th>
                      <th className="text-center px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Qtd</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Unitário</th>
                      <th className="text-right px-5 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Subtotal</th>
                    </tr></thead>
                    <tbody>
                      {proposal.items.map((item, i) => (
                        <tr key={item.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-800">{item.product_name}</p>
                            {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                          </td>
                          <td className="text-center px-3 py-4 text-slate-600">{item.quantity}</td>
                          <td className="text-right px-3 py-4 text-slate-600">{formatCurrency(item.unit_price)}</td>
                          <td className="text-right px-5 py-4 font-semibold text-slate-800">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="sm:hidden space-y-3 px-5">
                  {proposal.items.map((item) => (
                    <div key={item.id} className="bg-slate-50/60 rounded-xl p-4 space-y-2">
                      <p className="font-semibold text-slate-800 text-sm">{item.product_name}</p>
                      {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">{item.quantity}x {formatCurrency(item.unit_price)}</span>
                        <span className="font-bold text-slate-800">{formatCurrency(item.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Totals */}
                <div className="mt-5 mx-5 bg-gradient-to-r from-slate-50 to-[#08a1d6]/5 rounded-2xl p-5 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="text-slate-700">{formatCurrency(proposal.subtotal)}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-emerald-600">Desconto</span><span className="text-emerald-600 font-medium">-{formatCurrency(discountAmount)}</span></div>}
                  <Separator className="my-2 bg-slate-200" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-800">Total</span>
                    <span className="text-3xl font-extrabold bg-gradient-to-r from-[#08a1d6] to-[#e80685] bg-clip-text text-transparent">
                      {formatCurrency(proposal.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Commercial Conditions ── */}
          <motion.div {...fadeUp}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {proposal.payment_method && (
                <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl hover:shadow-lg transition-shadow">
                  <CardContent className="py-5 px-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#e80685]/10 flex items-center justify-center mx-auto mb-2">
                      <CreditCard className="w-5 h-5 text-[#e80685]" />
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pagamento</p>
                    <p className="font-bold text-sm text-slate-800 mt-1 capitalize">{proposal.payment_method}</p>
                  </CardContent>
                </Card>
              )}
              {proposal.delivery_deadline && (
                <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl hover:shadow-lg transition-shadow">
                  <CardContent className="py-5 px-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#08a1d6]/10 flex items-center justify-center mx-auto mb-2">
                      <Truck className="w-5 h-5 text-[#08a1d6]" />
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Entrega</p>
                    <p className="font-bold text-sm text-slate-800 mt-1">{proposal.delivery_deadline}</p>
                  </CardContent>
                </Card>
              )}
              {proposal.validity_date && (
                <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl hover:shadow-lg transition-shadow">
                  <CardContent className="py-5 px-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-[#b1cbb0]/30 flex items-center justify-center mx-auto mb-2">
                      <CalendarDays className="w-5 h-5 text-[#6a9c6a]" />
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Válida até</p>
                    <p className="font-bold text-sm text-slate-800 mt-1">{format(new Date(proposal.validity_date), "dd/MM/yyyy")}</p>
                  </CardContent>
                </Card>
              )}
            </div>
            {proposal.payment_conditions && (
              <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl mt-3">
                <CardContent className="py-4 px-5 text-sm text-slate-600">{proposal.payment_conditions}</CardContent>
              </Card>
            )}
          </motion.div>

          {/* ── Observations ── */}
          {proposal.observations && (
            <motion.div {...fadeUp}>
              <Card className="border-0 shadow-md shadow-slate-200/50 rounded-2xl">
                <CardContent className="py-5 px-5">
                  <h3 className="font-semibold text-sm text-slate-800 mb-2">Observações</h3>
                  <p className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">{proposal.observations}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Desktop Actions ── */}
          {canAct && !actionDone && (
            <motion.div {...fadeUp} className="hidden sm:block print:hidden">
              <Card className="border-0 shadow-xl shadow-slate-200/60 rounded-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#e80685] via-[#08a1d6] to-[#b1cbb0]" />
                <CardContent className="py-6 px-6 space-y-4">
                  <p className="text-center text-sm text-slate-500 font-medium">O que você gostaria de fazer?</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={() => setAcceptOpen(true)}
                      className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-200/50 h-11 px-6">
                      <Check className="w-4 h-4" /> Aceitar Proposta
                    </Button>
                    <Button variant="outline" onClick={() => setNegotiateOpen(true)}
                      className="gap-2 border-[#08a1d6]/30 text-[#08a1d6] hover:bg-[#08a1d6]/5 rounded-xl h-11 px-5">
                      <RefreshCw className="w-4 h-4" /> Propor Ajuste
                    </Button>
                    <Button variant="outline" onClick={() => setRefuseOpen(true)}
                      className="gap-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl h-11 px-5">
                      <X className="w-4 h-4" /> Recusar
                    </Button>
                    <Button variant="ghost" onClick={() => setQuestionOpen(true)}
                      className="gap-2 text-slate-500 hover:text-slate-700 rounded-xl h-11">
                      <MessageCircle className="w-4 h-4" /> Tenho uma dúvida
                    </Button>
                    <Button variant="ghost" onClick={handlePrint} className="gap-2 text-slate-400 rounded-xl h-11">
                      <Download className="w-4 h-4" /> PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Trust badges ── */}
          <motion.div {...fadeUp}>
            <TrustBadges />
          </motion.div>

          {/* ── Footer ── */}
          <motion.div {...fadeUp} className="text-center pb-4">
            <img src={logoSplash} alt="Splash" className="h-7 mx-auto opacity-30 mb-2" />
            <p className="text-[10px] text-slate-300">Proposta gerada pela plataforma Splash Piscinas</p>
          </motion.div>
        </main>

        {/* ── Mobile sticky bottom ── */}
        {canAct && !actionDone && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 p-4 sm:hidden print:hidden z-20" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-2">
              <Button onClick={() => setAcceptOpen(true)}
                className="flex-1 gap-1.5 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200/50 font-semibold">
                <Check className="w-4 h-4" /> Aceitar
              </Button>
              <Button variant="outline" onClick={() => setNegotiateOpen(true)}
                className="h-12 w-12 rounded-xl border-[#08a1d6]/30 text-[#08a1d6] p-0">
                <RefreshCw className="w-5 h-5" />
              </Button>
              <Button variant="outline" onClick={() => setRefuseOpen(true)}
                className="h-12 w-12 rounded-xl border-red-200 text-red-500 p-0">
                <X className="w-5 h-5" />
              </Button>
              <Button variant="ghost" onClick={() => setQuestionOpen(true)}
                className="h-12 w-12 rounded-xl text-slate-400 p-0">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Accept Modal ── */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Confirmar aceite</DialogTitle>
            <DialogDescription>Digite seu nome completo para confirmar a aceitação desta proposta.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Seu nome completo" value={acceptName} onChange={(e) => setAcceptName(e.target.value)} className="rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleAccept} disabled={!acceptName.trim() || submitting}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl">
              {submitting ? 'Enviando...' : 'Confirmar Aceite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Refuse Modal ── */}
      <Dialog open={refuseOpen} onOpenChange={setRefuseOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Recusar proposta</DialogTitle>
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
            <Button variant="destructive" onClick={handleRefuse} className="rounded-xl"
              disabled={(!refuseReason || (refuseReason === 'Outro' && !customRefuseReason.trim())) || submitting}>
              {submitting ? 'Enviando...' : 'Confirmar Recusa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Question Modal ── */}
      <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">💬 Enviar dúvida</DialogTitle>
            <DialogDescription>Escreva sua pergunta e o vendedor responderá em breve.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Qual sua dúvida sobre esta proposta?" value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4} className="rounded-xl" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleQuestion} disabled={!questionText.trim() || submitting} className="rounded-xl bg-[#08a1d6] hover:bg-[#0792c2] text-white">
              {submitting ? 'Enviando...' : 'Enviar Dúvida'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Negotiate Modal ── */}
      <Dialog open={negotiateOpen} onOpenChange={setNegotiateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">🔄 Propor Ajuste</DialogTitle>
            <DialogDescription>Selecione o item que deseja negociar e descreva sua contraproposta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Item (opcional)</label>
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
              <label className="text-sm font-medium text-slate-700">Valor proposto (opcional)</label>
              <Input type="number" placeholder="R$ 0,00" value={negotiateValue} onChange={(e) => setNegotiateValue(e.target.value)} className="mt-1 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Sua proposta *</label>
              <Textarea placeholder="Ex: Consigo fechar se o prazo de entrega for de 30 dias..." value={negotiateMessage} onChange={(e) => setNegotiateMessage(e.target.value)} rows={3} className="mt-1 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiateOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleNegotiate} disabled={!negotiateMessage.trim() || submitting} className="rounded-xl bg-[#08a1d6] hover:bg-[#0792c2] text-white">
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
