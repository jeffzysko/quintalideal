import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageTransition } from '@/components/PageTransition';
import { PanelHeader } from '@/components/PanelHeader';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Copy, Share2, Eye, Clock, FileText, MessageCircle, Check, X, Edit, RefreshCw, CopyPlus, ChevronRight, Handshake, StickyNote, CalendarPlus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProposalScoreReadonly } from '@/components/proposals/ProposalScore';
import { ProposalAttachments } from '@/components/proposals/ProposalAttachments';

const formatCurrency = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_PIPELINE = ['rascunho', 'enviada', 'visualizada', 'em_negociacao', 'aceita', 'recusada'] as const;
const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', visualizada: 'Visualizada',
  em_negociacao: 'Em negociação', aceita: 'Aceita', recusada: 'Recusada',
};
const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground', enviada: 'bg-primary/10 text-primary',
  visualizada: 'bg-blue-50 text-blue-700', em_negociacao: 'bg-amber-50 text-amber-700',
  aceita: 'bg-emerald-50 text-emerald-700', recusada: 'bg-red-50 text-red-700',
};

export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  useAuth();
  const navigate = useNavigate();

  const { data: proposal, isLoading, refetch } = useQuery({
    queryKey: ['proposal-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('proposals').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ['proposal-items', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('proposal_items').select('*').eq('proposal_id', id!).order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: views } = useQuery({
    queryKey: ['proposal-views', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('proposal_views').select('*').eq('proposal_id', id!).order('viewed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: questions, refetch: refetchQuestions } = useQuery({
    queryKey: ['proposal-questions', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('proposal_questions').select('*').eq('proposal_id', id!).order('asked_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: negotiations } = useQuery({
    queryKey: ['proposal-negotiations', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('proposal_negotiations' as any).select('*').eq('proposal_id', id!).order('created_at', { ascending: false });
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [internalNotes, setInternalNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDays, setExtendDays] = useState('7');

  if (isLoading) return (
    <PageTransition><div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div></PageTransition>
  );
  if (!proposal) return (
    <PageTransition><div className="min-h-screen flex items-center justify-center"><p>Proposta não encontrada</p></div></PageTransition>
  );

  // Initialize internal notes from proposal
  if (internalNotes === null && proposal) {
    setInternalNotes((proposal as any).internal_notes || '');
  }

  const publicUrl = `https://quintalideal.com.br/proposta/${proposal.public_token}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link copiado!');
  };

  const shareWhatsApp = () => {
    const clientName = proposal.client_name || 'Cliente';
    const validityText = proposal.validity_date ? `Ela é válida até ${format(new Date(proposal.validity_date), "dd/MM/yyyy")}.` : '';
    const msg = encodeURIComponent(`Olá ${clientName}, segue o link da sua proposta comercial personalizada:\n\n${publicUrl}\n\n${validityText} Qualquer dúvida estou à disposição!`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const updateStatus = async (status: string) => {
    await supabase.from('proposals').update({ status: status as any }).eq('id', proposal.id);
    refetch();
    toast.success(`Status atualizado para ${STATUS_LABELS[status]}`);
  };

  const duplicateProposal = async () => {
    const { data, error } = await supabase.from('proposals').insert({
      franchise_id: proposal.franchise_id,
      created_by: proposal.created_by,
      client_name: proposal.client_name,
      client_document: proposal.client_document,
      client_phone: proposal.client_phone,
      client_email: proposal.client_email,
      client_address: proposal.client_address,
      client_contact_name: proposal.client_contact_name,
      person_type: proposal.person_type,
      payment_method: proposal.payment_method,
      payment_conditions: proposal.payment_conditions,
      delivery_deadline: proposal.delivery_deadline,
      observations: proposal.observations,
      global_discount: proposal.global_discount,
      global_discount_type: proposal.global_discount_type,
      subtotal: proposal.subtotal,
      total: proposal.total,
      status: 'rascunho' as any,
    }).select().single();
    if (error) { toast.error('Erro ao duplicar'); return; }
    if (items?.length && data) {
      await supabase.from('proposal_items').insert(
        items.map((it, i) => ({
          proposal_id: data.id,
          product_name: it.product_name,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount,
          subtotal: it.subtotal,
          sort_order: i,
        }))
      );
    }
    toast.success('Proposta duplicada!');
    navigate(`/propostas/${data?.id}`);
  };

  const saveAnswer = async (qId: string) => {
    const text = answerText[qId];
    if (!text?.trim()) return;
    await supabase.from('proposal_questions').update({ answer: text, answered_at: new Date().toISOString() }).eq('id', qId);
    refetchQuestions();
    toast.success('Resposta salva');
  };

  const saveInternalNotes = async () => {
    setSavingNotes(true);
    await supabase.from('proposals').update({ internal_notes: internalNotes } as any).eq('id', proposal.id);
    setSavingNotes(false);
    toast.success('Notas internas salvas');
  };

  const extendValidity = async () => {
    const days = parseInt(extendDays);
    const baseDate = proposal.validity_date ? new Date(proposal.validity_date) : new Date();
    const newDate = new Date(Math.max(baseDate.getTime(), Date.now()) + days * 86400000);
    const newDateStr = newDate.toISOString().split('T')[0];
    await supabase.from('proposals').update({ validity_date: newDateStr, updated_at: new Date().toISOString() } as any).eq('id', proposal.id);
    // Reopen if it was refused due to expiration
    if (proposal.status === 'recusada' && proposal.refused_reason === 'Proposta expirada automaticamente') {
      await supabase.from('proposals').update({ status: 'enviada' as any, refused_at: null, refused_reason: null, updated_at: new Date().toISOString() } as any).eq('id', proposal.id);
    }
    setExtendOpen(false);
    refetch();
    toast.success(`Validade estendida até ${format(newDate, "dd/MM/yyyy")}`);
  };

  const resolveNegotiation = async (negId: string, status: string, notes?: string) => {
    await supabase.from('proposal_negotiations' as any).update({
      status,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes || null,
    }).eq('id', negId);
    toast.success(status === 'accepted' ? 'Ajuste aceito' : 'Ajuste recusado');
    refetch();
  };

  const statusIdx = STATUS_PIPELINE.indexOf(proposal.status as any);
  const discountAmount = proposal.global_discount_type === 'percent'
    ? proposal.subtotal * (proposal.global_discount / 100)
    : proposal.global_discount;

  // Build timeline events
  const timeline: Array<{ date: string; label: string; icon: React.ElementType; color: string }> = [];
  timeline.push({ date: proposal.created_at, label: 'Proposta criada', icon: FileText, color: 'text-primary' });
  if (views?.length) {
    const first = views[views.length - 1];
    timeline.push({ date: first.viewed_at, label: `Visualizada pela 1ª vez`, icon: Eye, color: 'text-blue-600' });
    if (views.length > 1) {
      timeline.push({ date: views[0].viewed_at, label: `Visualizada novamente (${views.length}x total)`, icon: Eye, color: 'text-blue-500' });
    }
  }
  if (questions?.length) {
    questions.forEach(q => timeline.push({ date: q.asked_at, label: 'Dúvida enviada pelo cliente', icon: MessageCircle, color: 'text-amber-600' }));
  }
  if (negotiations?.length) {
    negotiations.forEach((n: any) => timeline.push({ date: n.created_at, label: `Contraproposta do cliente: "${(n.client_message || '').slice(0, 50)}"`, icon: Handshake, color: 'text-blue-600' }));
  }
  if (proposal.accepted_at) timeline.push({ date: proposal.accepted_at, label: `Aceita por ${proposal.accepted_by_name}`, icon: Check, color: 'text-emerald-600' });
  if (proposal.refused_at) timeline.push({ date: proposal.refused_at, label: 'Recusada pelo cliente', icon: X, color: 'text-red-600' });
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-bottomnav sm:pb-0">
        <PanelHeader title="Detalhe da Proposta">
          <BackButton fallback="/propostas" />
        </PanelHeader>

        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
          {/* Header + link sharing */}
          <div className="hidden md:block"><Breadcrumbs /></div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-page-title text-foreground">{proposal.client_name}</h1>
              <p className="text-sm text-muted-foreground">#{proposal.id.slice(0, 4).toUpperCase()} • {format(new Date(proposal.created_at), "dd MMM yyyy", { locale: ptBR })}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5 h-10"><Copy className="w-3.5 h-3.5" /> Copiar link</Button>
              <Button size="sm" variant="outline" onClick={shareWhatsApp} className="gap-1.5 h-10"><Share2 className="w-3.5 h-3.5" /> WhatsApp</Button>
            </div>
          </div>

          {/* Pipeline visual */}
          <Card className="shadow-sm border-border/50">
            <CardContent className="py-4 px-4 overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max">
                {STATUS_PIPELINE.filter(s => s !== 'recusada').map((s, i) => {
                  const isActive = s === proposal.status;
                  const isPast = STATUS_PIPELINE.indexOf(s) <= statusIdx && proposal.status !== 'recusada';
                  return (
                    <div key={s} className="flex items-center">
                      {i > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground mx-0.5 shrink-0" />}
                      <button
                        onClick={() => updateStatus(s)}
                        className={cn(
                          'px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap min-h-[36px] active:scale-[0.97]',
                          isActive ? STATUS_COLORS[s] + ' ring-2 ring-primary/30' : isPast ? 'bg-primary/5 text-primary/70' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >{STATUS_LABELS[s]}</button>
                    </div>
                  );
                })}
              </div>
              {proposal.status === 'recusada' && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge className="bg-red-50 text-red-700 border-0">Recusada</Badge>
                  {proposal.refused_reason && <span className="text-sm text-muted-foreground">Motivo: {proposal.refused_reason}</span>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score da Proposta */}
          {items && items.length > 0 && (
            <ProposalScoreReadonly
              proposal={{
                payment_method: proposal.payment_method,
                payment_conditions: proposal.payment_conditions,
                validity_date: proposal.validity_date,
                delivery_deadline: proposal.delivery_deadline,
                observations: proposal.observations,
                global_discount: Number(proposal.global_discount),
                video_url: (proposal as any).video_url,
              }}
              items={items.map(i => ({
                product_name: i.product_name,
                description: i.description,
                discount: Number(i.discount),
              }))}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-sm border-border/50">
              <CardContent className="py-4 px-4 text-center">
                <Eye className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{views?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Visualizações</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border/50">
              <CardContent className="py-4 px-4 text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-sm font-semibold text-foreground">{views?.length ? format(new Date(views[views.length - 1].viewed_at), "dd/MM HH:mm") : '—'}</p>
                <p className="text-xs text-muted-foreground">Primeira visualização</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-border/50">
              <CardContent className="py-4 px-4 text-center">
                <Eye className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-sm font-semibold text-foreground">{views?.length ? format(new Date(views[0].viewed_at), "dd/MM HH:mm") : '—'}</p>
                <p className="text-xs text-muted-foreground">Última visualização</p>
              </CardContent>
            </Card>
          </div>

          {/* Items summary */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Itens da Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {items?.map(it => (
                <div key={it.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span className="text-foreground">{it.product_name} <span className="text-muted-foreground">x{it.quantity}</span></span>
                  <span className="font-medium">{formatCurrency(it.subtotal)}</span>
                </div>
              ))}
              <Separator />
              {discountAmount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Desconto</span><span>-{formatCurrency(discountAmount)}</span></div>}
              <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">{formatCurrency(proposal.total)}</span></div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {proposal && (
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Anexos</CardTitle></CardHeader>
              <CardContent>
                <ProposalAttachments proposalId={proposal.id} franchiseId={proposal.franchise_id} />
              </CardContent>
            </Card>
          )}

          {/* Negotiations */}
          {negotiations && negotiations.length > 0 && (
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Handshake className="w-4 h-4 text-primary" /> Negociações</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {negotiations.map((n: any) => (
                  <div key={n.id} className="border rounded-lg p-3 space-y-2">
                    {n.item_reference && <Badge variant="outline" className="text-xs">{n.item_reference}</Badge>}
                    <p className="text-sm text-foreground">{n.client_message}</p>
                    {n.proposed_value && <p className="text-sm text-primary font-medium">Valor proposto: {formatCurrency(n.proposed_value)}</p>}
                    <p className="text-xs text-muted-foreground">{format(new Date(n.created_at), "dd/MM HH:mm")}</p>
                    {n.status === 'pending' ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" onClick={() => resolveNegotiation(n.id, 'accepted')} className="gap-1.5 h-9"><Check className="w-3.5 h-3.5" /> Aceitar</Button>
                        <Button size="sm" variant="destructive" onClick={() => resolveNegotiation(n.id, 'refused')} className="gap-1.5 h-9"><X className="w-3.5 h-3.5" /> Recusar</Button>
                        <Button size="sm" variant="outline" onClick={duplicateProposal} className="gap-1.5 h-9"><Edit className="w-3.5 h-3.5" /> Editar e reenviar</Button>
                      </div>
                    ) : (
                      <Badge variant={n.status === 'accepted' ? 'success' : 'destructive'} className="text-xs">
                        {n.status === 'accepted' ? 'Aceito' : 'Recusado'}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Timeline de Eventos</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeline.map((evt, i) => {
                  const Icon = evt.icon;
                  return (
                    <div key={i} className="flex gap-3 items-start">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-muted/50', evt.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{evt.label}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(evt.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          {questions && questions.length > 0 && (
            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Dúvidas do Cliente</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q: any) => (
                  <div key={q.id} className="border rounded-lg p-3 space-y-2">
                    <p className="text-sm text-foreground">{q.question}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(q.asked_at), "dd/MM HH:mm")}</p>
                    {q.answer ? (
                      <div className="bg-muted/30 rounded p-2 text-sm"><span className="font-medium">Nota interna:</span> {q.answer}</div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Textarea
                          placeholder="Anotar resposta (visível só internamente)..."
                          value={answerText[q.id] || ''}
                          onChange={(e) => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))}
                          rows={2}
                          className="text-sm"
                        />
                        <Button size="sm" onClick={() => saveAnswer(q.id)} disabled={!answerText[q.id]?.trim()} className="h-9 shrink-0 self-end">Salvar</Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Internal Notes */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><StickyNote className="w-4 h-4 text-primary" /> Notas Internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder="Anotações internas sobre esta negociação (visível apenas para a equipe)..."
                value={internalNotes || ''}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={saveInternalNotes} disabled={savingNotes} className="h-9">
                {savingNotes ? 'Salvando...' : 'Salvar notas'}
              </Button>
            </CardContent>
          </Card>

          {/* Aceite details */}
          {proposal.accepted_at && (
            <Card className="shadow-sm border-emerald-200 bg-emerald-50/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-800">✅ Certificado de Aceite</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Aceito por:</span> <span className="font-medium">{proposal.accepted_by_name}</span></p>
                <p><span className="text-muted-foreground">Data:</span> {format(new Date(proposal.accepted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </CardContent>
            </Card>
          )}

          {/* Validity info */}
          {proposal.validity_date && (
            <Card className="shadow-sm border-border/50">
              <CardContent className="py-4 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarPlus className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Validade:</span>
                  <span className="font-medium">{format(new Date(proposal.validity_date), "dd/MM/yyyy")}</span>
                  {new Date(proposal.validity_date) < new Date() && (
                    <Badge variant="destructive" className="text-xs ml-1">Expirada</Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setExtendOpen(true)} className="gap-1.5">
                  <CalendarPlus className="w-3.5 h-3.5" /> Estender
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/propostas/nova?edit=${proposal.id}`)} className="gap-1.5 h-10"><Edit className="w-4 h-4" /> Editar</Button>
            <Button variant="outline" onClick={copyLink} className="gap-1.5 h-10"><RefreshCw className="w-4 h-4" /> Reenviar link</Button>
            <Button variant="outline" onClick={duplicateProposal} className="gap-1.5 h-10"><CopyPlus className="w-4 h-4" /> Duplicar</Button>
            {!proposal.validity_date && (
              <Button variant="outline" onClick={() => setExtendOpen(true)} className="gap-1.5 h-10"><CalendarPlus className="w-4 h-4" /> Definir validade</Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-1.5 h-10 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
                  <Trash2 className="w-4 h-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação é irreversível. A proposta para <strong>{proposal.client_name}</strong> será permanentemente excluída, incluindo todos os itens, visualizações e negociações associadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      try {
                        await supabase.from('proposal_items').delete().eq('proposal_id', proposal.id);
                        await supabase.from('proposal_views').delete().eq('proposal_id', proposal.id);
                        await supabase.from('proposal_questions').delete().eq('proposal_id', proposal.id);
                        await supabase.from('proposal_negotiations').delete().eq('proposal_id', proposal.id);
                        await supabase.from('proposals').delete().eq('id', proposal.id);
                        toast.success('Proposta excluída com sucesso');
                        navigate('/propostas');
                      } catch {
                        toast.error('Erro ao excluir proposta');
                      }
                    }}
                  >
                    Excluir permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Extend Validity Dialog */}
          <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Estender Validade</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  {proposal.validity_date
                    ? `Validade atual: ${format(new Date(proposal.validity_date), "dd/MM/yyyy")}`
                    : 'Nenhuma validade definida'}
                </p>
                <Select value={extendDays} onValueChange={setExtendDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">+ 3 dias</SelectItem>
                    <SelectItem value="7">+ 7 dias</SelectItem>
                    <SelectItem value="15">+ 15 dias</SelectItem>
                    <SelectItem value="30">+ 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setExtendOpen(false)}>Cancelar</Button>
                <Button onClick={extendValidity}>Confirmar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PageTransition>
  );
}
