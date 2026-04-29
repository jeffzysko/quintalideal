import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { triggerWhatsAppAuto } from '@/lib/whatsapp-auto';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, MessageCircle, Download, CreditCard, Truck, CalendarDays, Phone, User, FileText, RefreshCw, Sparkles, ArrowRight, Loader2, Paperclip, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toWhatsAppPhone } from '@/lib/phone-utils';
import { VideoEmbed } from '@/components/proposals/ProposalVideoSection';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';
import { PublicFooter } from '@/components/Footer';

import {
  type ProposalData,
  formatCurrency,
  getPaymentLabel,
  STATUS_CONFIG,
  stagger,
  staggerItem,
  SectionCard,
  VerificationFooter,
  CountdownTimer,
  TrustBadges,
} from '@/components/proposals/public/ProposalShared';

import { AcceptDialog, RefuseDialog, QuestionDialog, NegotiateDialog } from '@/components/proposals/public/ProposalDialogs';
import { exportProposalPDF } from '@/components/proposals/public/ProposalPDFExport';
import { isPast as _isPast } from 'date-fns';

export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [itemImages, setItemImages] = useState<Record<string, string>>({});

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
  const [attachments, setAttachments] = useState<{ id: string; file_name: string; file_path: string; file_size: number; content_type: string }[]>([]);

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
    if (!proposal?.items?.length) return;
    
    const fetchImages = async () => {
      const productNames = proposal.items.map(i => i.product_name);
      const { data: models } = await supabase
        .from('pool_models')
        .select('nome_modelo, imagem_principal, gallery_urls')
        .in('nome_modelo', productNames);
        
      if (models) {
        const imageMap: Record<string, string> = {};
        models.forEach(m => {
          imageMap[m.nome_modelo] = m.imagem_principal || (m.gallery_urls && m.gallery_urls[0]) || '';
        });
        setItemImages(imageMap);
      }
    };
    
    fetchImages();
  }, [proposal?.items]);

  // Fetch attachments when proposal loads
  useEffect(() => {
    if (!proposal?.id) return;
    supabase
      .from('proposal_attachments')
      .select('id, file_name, file_path, file_size, content_type')
      .eq('proposal_id', proposal.id)
      .order('created_at')
      .then(({ data }) => { if (data) setAttachments(data); });
  }, [proposal?.id]);

  const [viewCount, setViewCount] = useState(0);
  const [hasViewedBefore, setHasViewedBefore] = useState(false);

  useEffect(() => {
    if (!token || !proposal) return;
    
    // Register view and get total count
    supabase.rpc('public_register_proposal_view', { _token: token, _user_agent: navigator.userAgent })
      .then(() => {
        // Fetch view count after registering
        supabase
          .from('proposal_views')
          .select('id', { count: 'exact', head: true })
          .eq('proposal_id', proposal.id)
          .then(({ count }) => {
            if (count !== null) setViewCount(count);
          });
      });

    // Check localStorage for repeat viewer
    const viewKey = `proposal_viewed_${proposal.id}`;
    if (localStorage.getItem(viewKey)) {
      setHasViewedBefore(true);
    } else {
      localStorage.setItem(viewKey, 'true');
    }
  }, [token, proposal?.id]);

  // Section Analytics
  useEffect(() => {
    if (!proposal?.id) return;

    const viewedSections = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const section = (entry.target as HTMLElement).dataset.section;
        if (entry.isIntersecting && section && !viewedSections.has(section)) {
          viewedSections.add(section);
          supabase.from('proposal_section_views').insert({
            proposal_id: proposal.id,
            section: section,
            viewed_at: new Date().toISOString()
          });
        }
      });
    }, { threshold: 0.5 });

    const sections = document.querySelectorAll('[data-section]');
    sections.forEach(s => observer.observe(s));

    return () => observer.disconnect();
  }, [proposal?.id]);

  const expired = proposal?.validity_date ? _isPast(new Date(proposal.validity_date + 'T23:59:59')) : false;
  const isFinal = proposal?.status === 'aceita' || proposal?.status === 'recusada';
  const canAct = !expired && !isFinal;

  const handleAccept = async () => {
    if (!token || !acceptName.trim()) return;
    setSubmitting(true);
    await supabase.rpc('public_accept_proposal', { _token: token, _name: acceptName.trim(), _user_agent: navigator.userAgent });
    // Event 6: WhatsApp auto trigger on proposal accepted
    if (proposal?.id) {
      triggerWhatsAppAuto({ trigger_event: 'proposal_accepted', proposal_id: proposal.id, franchise_id: proposal.franchise_id });
    }
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
      const da = proposal.global_discount_type === 'percent'
        ? proposal.subtotal * (proposal.global_discount / 100)
        : proposal.global_discount;
      await exportProposalPDF(proposal, da);
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
          src={logoQuintalIdeal} alt="Quintal Ideal" className="w-36 h-auto dark:brightness-0 dark:invert"
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
        <img src={logoQuintalIdeal} alt="Quintal Ideal" className="w-40 h-auto mx-auto dark:brightness-0 dark:invert" />
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
  const brand = proposal.brand;
  const brandPrimary = brand?.primary_color || undefined;

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
              {brand?.logo_url ? (
                <motion.img src={brand.logo_url} alt={brand.name} className="h-9 w-auto object-contain" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} />
              ) : brand?.name ? (
                <motion.span className="text-base font-black tracking-tight" style={{ color: brandPrimary }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  {brand.name}
                </motion.span>
              ) : (
                <motion.img src={logoQuintalIdeal} alt="Quintal Ideal" className="h-9 w-auto dark:brightness-0 dark:invert" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} />
              )}
              <div className="hidden sm:block h-6 w-px bg-border" />
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-foreground leading-tight">{proposal.franchise?.nome_franquia}</p>
                {proposal.franchise?.cidade_base && <p className="text-xs text-muted-foreground">{proposal.franchise.cidade_base}</p>}
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

          {/* ═══ HERO ═══ */}
          <motion.div data-pdf-section variants={stagger} initial="hidden" animate="show" className="text-center space-y-5 pt-2">
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 bg-primary/8 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> PROPOSTA #{proposalNumber}
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl sm:text-[2.75rem] font-black text-foreground tracking-tight leading-[1.1]">
              Olá, {proposal.client_name.split(' ')[0]}! 👋
            </motion.h2>
            {viewCount > 0 && (
              <motion.p variants={staggerItem} className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <Eye className="w-3 h-3" /> Esta proposta foi visualizada {viewCount} {viewCount === 1 ? 'vez' : 'vezes'}
              </motion.p>
            )}
            <motion.p variants={staggerItem} className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Preparamos uma proposta exclusiva para você.<br className="hidden sm:block" />Confira todos os detalhes abaixo.
            </motion.p>
            <motion.p variants={staggerItem} className="text-xs text-muted-foreground/50 font-medium">
              Emitida em {format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </motion.p>
            {proposal.validity_date && (
              <div className="space-y-3">
                <CountdownTimer validityDate={proposal.validity_date} />
                {hasViewedBefore && viewCount > 2 && (
                  <motion.p variants={staggerItem} className="text-xs font-semibold text-primary/80 animate-pulse">
                    Você já conferiu esta proposta {viewCount} vezes — que tal aprovar hoje?
                  </motion.p>
                )}
              </div>
            )}
          </motion.div>

          {/* ═══ BRAND INTRO ═══ */}
          {brand?.proposal_header && brand.proposal_header.trim() && (
            <SectionCard delay={0.02}>
              <div className="p-5">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{brand.proposal_header}</p>
                {brand.slogan && (
                  <p className="text-xs italic text-muted-foreground mt-3" style={{ color: brandPrimary }}>{brand.slogan}</p>
                )}
              </div>
            </SectionCard>
          )}

          {/* ═══ ACTION DONE MESSAGES ═══ */}
          <AnimatePresence>
            {actionDone === 'accepted' && (
              <motion.div key="accepted" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="relative overflow-hidden rounded-2xl border border-success/20 p-6 text-center"
                style={{ background: 'linear-gradient(135deg, hsl(152 70% 96%), hsl(152 70% 94%))' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
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

          {/* ═══ SELLER CARD ═══ */}
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
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <a
                        href={`https://wa.me/55${toWhatsAppPhone(sellerPhone)}?text=${encodeURIComponent(`Olá! Estou visualizando a proposta #${proposalNumber} e gostaria de tirar uma dúvida.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-success hover:bg-success hover:text-white transition-all shadow-sm border border-success/20"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </a>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <a
                        href={`tel:${sellerPhone}`}
                        className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-sm border border-primary/20"
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                    </motion.div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
          {/* ═══ VIDEO ═══ */}
          {proposal.video_url && (
            <SectionCard data-section="video">
              <div className="p-5 space-y-4">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary animate-spin-slow" /> Conheça mais sobre o projeto
                </h3>
                <VideoEmbed url={proposal.video_url} />
              </div>
            </SectionCard>
          )}

          {/* ═══ CLIENT DATA ═══ */}
          <SectionCard delay={0.05}>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center"><User className="w-4.5 h-4.5 text-primary" /></div>
                <h3 className="font-bold text-sm text-foreground">Dados do Cliente</h3>
              </div>
              <div className="h-px bg-border/50" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground/70 text-xs uppercase tracking-[0.1em] font-semibold">Nome</span>
                  <p className="font-semibold text-foreground mt-0.5">{proposal.client_name}</p>
                </div>
                {proposal.client_document && (
                  <div>
                    <span className="text-muted-foreground/70 text-xs uppercase tracking-[0.1em] font-semibold">{proposal.person_type === 'pj' ? 'CNPJ' : 'CPF'}</span>
                    <p className="font-semibold text-foreground mt-0.5">{proposal.client_document}</p>
                  </div>
                )}
                {proposal.client_address && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground/70 text-xs uppercase tracking-[0.1em] font-semibold">Endereço</span>
                    <p className="font-semibold text-foreground mt-0.5">{proposal.client_address}</p>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>


          {/* ═══ ITEMS ═══ */}
          <SectionCard delay={0.1} className="overflow-hidden" data-section="items">
            <div className="p-5 pb-0">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center"><FileText className="w-4.5 h-4.5 text-primary" /></div>
                <h3 className="font-bold text-sm text-foreground">Itens da Proposta</h3>
                <Badge variant="secondary" className="ml-auto text-xs font-bold rounded-full px-2.5">
                  {proposal.items.length} {proposal.items.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border/50 bg-muted/30">
                    <th className="text-left px-5 py-3 font-bold text-muted-foreground text-xs uppercase tracking-[0.1em]">Item</th>
                    <th className="text-center px-3 py-3 font-bold text-muted-foreground text-xs uppercase tracking-[0.1em]">Qtd</th>
                    <th className="text-right px-3 py-3 font-bold text-muted-foreground text-xs uppercase tracking-[0.1em]">Unitário</th>
                    <th className="text-right px-5 py-3 font-bold text-muted-foreground text-xs uppercase tracking-[0.1em]">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item, i) => (
                    <motion.tr key={item.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                      className={`border-b border-border/30 last:border-0 transition-colors hover:bg-muted/20 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-[60px] rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border/50">
                            {itemImages[item.product_name] ? (
                              <img src={itemImages[item.product_name]} alt={item.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-muted-foreground/60 bg-muted/40">
                                <span className="text-lg">🏊</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{item.product_name}</p>
                            {item.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>}
                          </div>
                        </div>
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
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="sm:hidden space-y-2.5 px-5">
              {proposal.items.map((item) => (
                <motion.div key={item.id} variants={staggerItem}
                  className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-3 transition-all hover:border-primary/20 hover:bg-primary/3">
                  <div className="flex gap-4">
                    <div className="w-20 h-[60px] rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-border/50">
                      {itemImages[item.product_name] ? (
                        <img src={itemImages[item.product_name]} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-muted-foreground/60 bg-muted/40">
                          <span className="text-lg">🏊</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{item.product_name}</p>
                      {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border/10">
                    <span className="text-xs text-muted-foreground tabular-nums">{item.quantity}x {formatCurrency(item.unit_price)}</span>
                    <span className="font-black text-foreground tabular-nums">{formatCurrency(item.subtotal)}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            {/* Total section */}
            <motion.div data-section="total" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative m-5 mt-4 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'linear-gradient(135deg, hsl(207 90% 42%), hsl(322 85% 50%))' }} />
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
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total</span>
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                    <span className="text-3xl sm:text-4xl font-black tracking-tight"
                      style={{ background: 'linear-gradient(135deg, hsl(207 90% 42%), hsl(322 85% 50%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {formatCurrency(proposal.total)}
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </SectionCard>

          {/* ═══ CONDITIONS ═══ */}
          <motion.div data-section="payment" data-pdf-section variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {proposal.payment_method && (
              <motion.div variants={staggerItem}>
                <div className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 text-center transition-all duration-300 hover:border-secondary/30 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-secondary/8 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                    <CreditCard className="w-5 h-5 text-secondary" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] font-bold">Pagamento</p>
                  <p className="font-bold text-sm text-foreground mt-1">{getPaymentLabel(proposal.payment_method)}</p>
                </div>
              </motion.div>
            )}
            {proposal.delivery_deadline && (
              <motion.div variants={staggerItem}>
                <div className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] font-bold">Entrega</p>
                  <p className="font-bold text-sm text-foreground mt-1">{proposal.delivery_deadline}</p>
                </div>
              </motion.div>
            )}
            {proposal.validity_date && (
              <motion.div variants={staggerItem}>
                <div className="group relative rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-5 text-center transition-all duration-300 hover:border-success/30 hover:shadow-lg hover:-translate-y-0.5">
                  <div className="w-11 h-11 rounded-xl bg-success/8 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                    <CalendarDays className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] font-bold">Válida até</p>
                  <p className="font-bold text-sm text-foreground mt-1">{format(new Date(proposal.validity_date), "dd/MM/yyyy")}</p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {(proposal.payment_conditions || brand?.payment_terms) && (
            <SectionCard>
              <div className="p-5 space-y-2">
                <h3 className="font-bold text-sm text-foreground">Condições de Pagamento</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {proposal.payment_conditions || brand?.payment_terms}
                </p>
              </div>
            </SectionCard>
          )}
          {proposal.observations && (
            <SectionCard>
              <div className="p-5 space-y-2">
                <h3 className="font-bold text-sm text-foreground">Observações</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{proposal.observations}</p>
              </div>
            </SectionCard>
          )}

          {/* ═══ ATTACHMENTS ═══ */}
          {attachments.length > 0 && (
            <SectionCard>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                    <Paperclip className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Anexos</h3>
                </div>
                <div className="space-y-2">
                  {attachments.map(att => {
                    const { data } = supabase.storage.from('proposal-attachments').getPublicUrl(att.file_path);
                    return (
                      <a
                        key={att.id}
                        href={data.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-3 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                      >
                        <Download className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium text-foreground truncate flex-1">{att.file_name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {att.file_size < 1024 * 1024
                            ? `${(att.file_size / 1024).toFixed(1)} KB`
                            : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </SectionCard>
          )}

          {canAct && !actionDone && (
            <motion.div data-section="actions" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="hidden sm:block print:hidden">
              <div className="relative rounded-2xl overflow-hidden border border-border/40">
                <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, hsl(322 85% 50%), hsl(207 90% 42%), hsl(140 20% 72%))' }} />
                <div className="bg-card/80 backdrop-blur-sm p-7 space-y-5">
                  <p className="text-center text-sm text-muted-foreground font-semibold">O que você gostaria de fazer?</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button
                        onClick={() => setAcceptOpen(true)}
                        className={`gap-2 text-white rounded-xl shadow-lg h-12 px-7 font-bold text-sm hover:opacity-90 transition-opacity ${!brandPrimary ? 'bg-gradient-to-r from-success to-success/80 text-success-foreground' : ''}`}
                        style={brandPrimary ? { backgroundColor: brandPrimary } : undefined}
                      >
                        <Check className="w-4 h-4" /> Aceitar Proposta <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </motion.div>
                    <Button variant="outline" onClick={() => setNegotiateOpen(true)} className="gap-2 border-primary/30 text-primary hover:bg-primary/5 rounded-xl h-12 px-5 font-semibold">
                      <RefreshCw className="w-4 h-4" /> Propor Ajuste
                    </Button>
                    <Button variant="outline" onClick={() => setRefuseOpen(true)} className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/5 rounded-xl h-12 px-5 font-semibold">
                      <X className="w-4 h-4" /> Recusar
                    </Button>
                    <Button variant="ghost" onClick={() => setQuestionOpen(true)} className="gap-2 text-muted-foreground hover:text-foreground rounded-xl h-12 font-semibold">
                      <MessageCircle className="w-4 h-4" /> Tenho uma dúvida
                    </Button>
                    <Button variant="ghost" onClick={handleExportPDF} disabled={exporting} className="gap-2 text-muted-foreground/50 rounded-xl h-12">
                      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <TrustBadges />
          {brand?.proposal_footer && brand.proposal_footer.trim() && (
            <div className="text-center text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-wrap px-4 pt-2">
              {brand.proposal_footer}
            </div>
          )}
          <VerificationFooter proposal={proposal} />
        </main>
        <PublicFooter />

        {/* ═══ MOBILE BOTTOM BAR ═══ */}
        {canAct && !actionDone && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 p-4 sm:hidden print:hidden z-20"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-2">
              <motion.div className="flex-1" whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={() => setAcceptOpen(true)}
                  className={`w-full gap-1.5 h-12 text-white rounded-xl shadow-lg font-bold hover:opacity-90 transition-opacity ${!brandPrimary ? 'bg-gradient-to-r from-success to-success/80 text-success-foreground' : ''}`}
                  style={brandPrimary ? { backgroundColor: brandPrimary } : undefined}
                >
                  <Check className="w-4 h-4" /> Aceitar
                </Button>
              </motion.div>
              <Button variant="outline" onClick={() => setNegotiateOpen(true)} className="h-12 w-12 rounded-xl border-primary/30 text-primary p-0"><RefreshCw className="w-5 h-5" /></Button>
              <Button variant="outline" onClick={() => setRefuseOpen(true)} className="h-12 w-12 rounded-xl border-destructive/20 text-destructive p-0"><X className="w-5 h-5" /></Button>
              <Button variant="ghost" onClick={() => setQuestionOpen(true)} className="h-12 w-12 rounded-xl text-muted-foreground p-0"><MessageCircle className="w-5 h-5" /></Button>
              <Button variant="ghost" onClick={handleExportPDF} disabled={exporting} className="h-12 w-12 rounded-xl text-muted-foreground p-0">
                {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}
      <AcceptDialog open={acceptOpen} onOpenChange={setAcceptOpen} acceptName={acceptName} setAcceptName={setAcceptName} onAccept={handleAccept} submitting={submitting} />
      <RefuseDialog open={refuseOpen} onOpenChange={setRefuseOpen} refuseReason={refuseReason} setRefuseReason={setRefuseReason} customRefuseReason={customRefuseReason} setCustomRefuseReason={setCustomRefuseReason} onRefuse={handleRefuse} submitting={submitting} />
      <QuestionDialog open={questionOpen} onOpenChange={setQuestionOpen} questionText={questionText} setQuestionText={setQuestionText} onQuestion={handleQuestion} submitting={submitting} />
      <NegotiateDialog open={negotiateOpen} onOpenChange={setNegotiateOpen} negotiateItem={negotiateItem} setNegotiateItem={setNegotiateItem} negotiateValue={negotiateValue} setNegotiateValue={setNegotiateValue} negotiateMessage={negotiateMessage} setNegotiateMessage={setNegotiateMessage} onNegotiate={handleNegotiate} submitting={submitting} items={proposal?.items || []} />

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
