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
import { Check, X, MessageCircle, Download, Clock, CreditCard, Truck, CalendarDays, Phone, User, MapPin, FileText, Timer, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toWhatsAppPhone } from '@/lib/phone-utils';

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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  enviada: { label: 'Aguardando sua aprovação', color: 'bg-amber-100 text-amber-800' },
  visualizada: { label: 'Aguardando sua aprovação', color: 'bg-amber-100 text-amber-800' },
  em_negociacao: { label: 'Em negociação', color: 'bg-blue-100 text-blue-800' },
  aceita: { label: 'Proposta Aceita', color: 'bg-emerald-100 text-emerald-800' },
  recusada: { label: 'Proposta Recusada', color: 'bg-red-100 text-red-800' },
};

const REFUSE_REASONS = [
  'Preço alto',
  'Prazo inadequado',
  'Optei por outro fornecedor',
  'Desisti do projeto',
  'Outro',
];

function CountdownTimer({ validityDate }: { validityDate: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const target = new Date(validityDate + 'T23:59:59');
  if (isPast(target)) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm font-medium">
        <AlertTriangle className="w-4 h-4" />
        Esta proposta expirou e não está mais disponível
      </div>
    );
  }

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;

  return (
    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-4 py-3 rounded-xl text-sm font-medium">
      <Timer className="w-4 h-4" />
      Esta proposta expira em {days > 0 && `${days}d `}{hours}h {minutes}min
    </div>
  );
}

export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Modal states
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [acceptName, setAcceptName] = useState('');
  const [refuseReason, setRefuseReason] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState<'accepted' | 'refused' | 'question' | null>(null);

  const fetchProposal = useCallback(async () => {
    if (!token) return;
    try {
      const { data, error: err } = await supabase.rpc('public_get_proposal_by_token', { _token: token });
      if (err || !data) { setError(true); return; }
      setProposal(data as unknown as ProposalData);
    } catch { setError(true); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchProposal(); }, [fetchProposal]);

  // Register view
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
    setSubmitting(false);
    setAcceptOpen(false);
    setActionDone('accepted');
    fetchProposal();
  };

  const handleRefuse = async () => {
    if (!token || !refuseReason.trim()) return;
    setSubmitting(true);
    await supabase.rpc('public_refuse_proposal', { _token: token, _reason: refuseReason.trim(), _user_agent: navigator.userAgent });
    setSubmitting(false);
    setRefuseOpen(false);
    setActionDone('refused');
    fetchProposal();
  };

  const handleQuestion = async () => {
    if (!token || !questionText.trim()) return;
    setSubmitting(true);
    await supabase.rpc('public_ask_proposal_question', { _token: token, _question: questionText.trim() });
    setSubmitting(false);
    setQuestionOpen(false);
    setQuestionText('');
    setActionDone('question');
  };

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (error || !proposal) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <FileText className="w-16 h-16 text-muted-foreground mb-4" />
      <h1 className="text-xl font-bold text-foreground mb-2">Proposta não encontrada</h1>
      <p className="text-muted-foreground">O link pode estar incorreto ou a proposta foi removida.</p>
    </div>
  );

  const statusConf = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.enviada;
  const sellerPhone = proposal.seller?.telefone;
  const discountAmount = proposal.global_discount_type === 'percent'
    ? proposal.subtotal * (proposal.global_discount / 100)
    : proposal.global_discount;
  const proposalNumber = proposal.id.slice(0, 4).toUpperCase();

  const sectionAnim = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-40px' }, transition: { duration: 0.4 } };

  return (
    <>
      <div className="min-h-screen bg-white print:bg-white">
        {/* Header */}
        <header className="border-b bg-white sticky top-0 z-10 print:static print:border-b-2">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground text-sm leading-tight">{proposal.franchise?.nome_franquia || 'Proposta Comercial'}</h1>
                {proposal.franchise?.cidade_base && <p className="text-xs text-muted-foreground">{proposal.franchise.cidade_base}</p>}
              </div>
            </div>
            <Badge className={`${statusConf.color} border-0 text-xs`}>{statusConf.label}</Badge>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-32 sm:pb-8 print:pb-0 print:space-y-4">
          {/* Seção 1 — Header da Proposta */}
          <motion.div {...sectionAnim}>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-foreground print:text-3xl">Proposta Comercial</h2>
              <p className="text-muted-foreground text-sm mt-1">#{proposalNumber} • Emitida em {format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>
            {proposal.validity_date && <CountdownTimer validityDate={proposal.validity_date} />}
          </motion.div>

          {/* Success messages */}
          {actionDone === 'accepted' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <Check className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-emerald-800">Proposta aceita!</p>
              <p className="text-sm text-emerald-700 mt-1">O vendedor foi notificado e entrará em contato em breve.</p>
            </motion.div>
          )}
          {actionDone === 'refused' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <X className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="font-semibold text-red-800">Proposta recusada</p>
              <p className="text-sm text-red-700 mt-1">O vendedor foi notificado sobre sua decisão.</p>
            </motion.div>
          )}
          {actionDone === 'question' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <MessageCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-semibold text-blue-800">Dúvida enviada!</p>
              <p className="text-sm text-blue-700 mt-1">O vendedor receberá sua mensagem e responderá em breve.</p>
            </motion.div>
          )}

          {/* Seção 2 — Vendedor */}
          {proposal.seller && (
            <motion.div {...sectionAnim}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={proposal.seller.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(proposal.seller.full_name || 'V')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{proposal.seller.full_name || 'Vendedor'}</p>
                    <p className="text-xs text-muted-foreground">{proposal.franchise?.nome_franquia}</p>
                  </div>
                  {sellerPhone && (
                    <Button size="sm" variant="outline" className="shrink-0 print:hidden" asChild>
                      <a href={`https://wa.me/${toWhatsAppPhone(sellerPhone)}`} target="_blank" rel="noopener noreferrer">
                        <Phone className="w-4 h-4 mr-1.5" /> Falar
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Seção 3 — Dados do Cliente */}
          <motion.div {...sectionAnim}>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="py-4 px-5 space-y-2">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Dados do Cliente</h3>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium text-foreground">{proposal.client_name}</span></div>
                  {proposal.client_document && <div><span className="text-muted-foreground">{proposal.person_type === 'pj' ? 'CNPJ' : 'CPF'}:</span> <span className="font-medium text-foreground">{proposal.client_document}</span></div>}
                  {proposal.client_address && <div className="sm:col-span-2"><span className="text-muted-foreground">Endereço:</span> <span className="font-medium text-foreground">{proposal.client_address}</span></div>}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Seção 4 — Itens */}
          <motion.div {...sectionAnim}>
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardContent className="py-4 px-0">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2 px-5 mb-3"><FileText className="w-4 h-4 text-primary" /> Itens da Proposta</h3>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30">
                      <th className="text-left px-5 py-2 font-medium text-muted-foreground">Item</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Qtd</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unitário</th>
                      <th className="text-right px-5 py-2 font-medium text-muted-foreground">Subtotal</th>
                    </tr></thead>
                    <tbody>
                      {proposal.items.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="px-5 py-3">
                            <p className="font-medium text-foreground">{item.product_name}</p>
                            {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                          </td>
                          <td className="text-center px-3 py-3">{item.quantity}</td>
                          <td className="text-right px-3 py-3">{formatCurrency(item.unit_price)}</td>
                          <td className="text-right px-5 py-3 font-medium">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="sm:hidden space-y-3 px-5">
                  {proposal.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <p className="font-medium text-foreground text-sm">{item.product_name}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>{item.quantity}x {formatCurrency(item.unit_price)}</span>
                        <span className="font-semibold text-foreground">{formatCurrency(item.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Totals */}
                <div className="mt-4 px-5 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(proposal.subtotal)}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Desconto</span><span>-{formatCurrency(discountAmount)}</span></div>}
                  <Separator className="my-2" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(proposal.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Seção 5 — Condições Comerciais */}
          <motion.div {...sectionAnim}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {proposal.payment_method && (
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="py-4 px-4 text-center">
                    <CreditCard className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">{proposal.payment_method}</p>
                  </CardContent>
                </Card>
              )}
              {proposal.delivery_deadline && (
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="py-4 px-4 text-center">
                    <Truck className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Prazo de entrega</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">{proposal.delivery_deadline}</p>
                  </CardContent>
                </Card>
              )}
              {proposal.validity_date && (
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="py-4 px-4 text-center">
                    <CalendarDays className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Válida até</p>
                    <p className="font-semibold text-sm text-foreground mt-0.5">{format(new Date(proposal.validity_date), "dd/MM/yyyy")}</p>
                  </CardContent>
                </Card>
              )}
            </div>
            {proposal.payment_conditions && (
              <Card className="border-border/50 shadow-sm mt-3">
                <CardContent className="py-3 px-4 text-sm text-muted-foreground">{proposal.payment_conditions}</CardContent>
              </Card>
            )}
          </motion.div>

          {/* Observações */}
          {proposal.observations && (
            <motion.div {...sectionAnim}>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="py-4 px-5">
                  <h3 className="font-semibold text-sm text-foreground mb-2">Observações</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proposal.observations}</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Desktop actions */}
          {canAct && !actionDone && (
            <motion.div {...sectionAnim} className="hidden sm:flex flex-wrap gap-3 justify-center print:hidden">
              <Button onClick={() => setAcceptOpen(true)} className="gap-2"><Check className="w-4 h-4" /> Aceitar Proposta</Button>
              <Button variant="destructive" onClick={() => setRefuseOpen(true)} className="gap-2"><X className="w-4 h-4" /> Recusar Proposta</Button>
              <Button variant="outline" onClick={() => setQuestionOpen(true)} className="gap-2"><MessageCircle className="w-4 h-4" /> Tenho uma dúvida</Button>
              <Button variant="ghost" onClick={handlePrint} className="gap-2"><Download className="w-4 h-4" /> Baixar PDF</Button>
            </motion.div>
          )}
        </main>

        {/* Mobile sticky bottom actions */}
        {canAct && !actionDone && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 sm:hidden print:hidden z-20 safe-bottom">
            <div className="flex gap-2">
              <Button onClick={() => setAcceptOpen(true)} className="flex-1 gap-1.5 h-11"><Check className="w-4 h-4" /> Aceitar</Button>
              <Button variant="destructive" onClick={() => setRefuseOpen(true)} className="gap-1.5 h-11 px-3"><X className="w-4 h-4" /></Button>
              <Button variant="outline" onClick={() => setQuestionOpen(true)} className="gap-1.5 h-11 px-3"><MessageCircle className="w-4 h-4" /></Button>
              <Button variant="ghost" onClick={handlePrint} className="gap-1.5 h-11 px-3"><Download className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Accept modal */}
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar aceite</DialogTitle>
            <DialogDescription>Digite seu nome completo para confirmar a aceitação desta proposta.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Seu nome completo" value={acceptName} onChange={(e) => setAcceptName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>Cancelar</Button>
            <Button onClick={handleAccept} disabled={!acceptName.trim() || submitting}>{submitting ? 'Enviando...' : 'Confirmar Aceite'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refuse modal */}
      <Dialog open={refuseOpen} onOpenChange={setRefuseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recusar proposta</DialogTitle>
            <DialogDescription>Nos ajude a melhorar. Qual o motivo da recusa?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {REFUSE_REASONS.map((r) => (
              <Button key={r} variant={refuseReason === r ? 'default' : 'outline'} size="sm" onClick={() => setRefuseReason(r)}>{r}</Button>
            ))}
          </div>
          {refuseReason === 'Outro' && (
            <Textarea placeholder="Descreva o motivo..." value={refuseReason === 'Outro' ? '' : refuseReason} onChange={(e) => setRefuseReason(e.target.value || 'Outro')} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefuseOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRefuse} disabled={!refuseReason.trim() || submitting}>{submitting ? 'Enviando...' : 'Confirmar Recusa'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question modal */}
      <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar dúvida</DialogTitle>
            <DialogDescription>Escreva sua pergunta e o vendedor responderá em breve.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Qual sua dúvida sobre esta proposta?" value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuestion} disabled={!questionText.trim() || submitting}>{submitting ? 'Enviando...' : 'Enviar Dúvida'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:static { position: static !important; }
          .print\\:border-b-2 { border-bottom-width: 2px !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:pb-0 { padding-bottom: 0 !important; }
          .print\\:space-y-4 > * + * { margin-top: 1rem !important; }
          .print\\:text-3xl { font-size: 1.875rem !important; }
        }
      `}</style>
    </>
  );
}
