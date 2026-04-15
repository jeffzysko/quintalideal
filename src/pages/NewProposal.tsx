import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { triggerWhatsAppAuto } from '@/lib/whatsapp-auto';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PanelHeader } from '@/components/PanelHeader';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';

import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import { Save, X, Check, User, Package, CreditCard, MessageSquare, Link2, Video, BookOpen, Sparkles } from 'lucide-react';
import { ProposalLeadSection } from '@/components/proposals/ProposalLeadSection';
import { ProposalClientSection } from '@/components/proposals/ProposalClientSection';
import { ProposalItemsSection } from '@/components/proposals/ProposalItemsSection';
import { ProposalPaymentSection } from '@/components/proposals/ProposalPaymentSection';
import { ProposalObservationsSection } from '@/components/proposals/ProposalObservationsSection';
import { cn } from '@/lib/utils';
import { isValidBRPhone, isValidEmail, unformatPhone } from '@/lib/validation';
import { isValidCPF, isValidCNPJ } from '@/lib/document-utils';
import { ProposalScore } from '@/components/proposals/ProposalScore';
import { ProposalVideoSection } from '@/components/proposals/ProposalVideoSection';
import { SaveTemplateModal, LoadTemplateModal } from '@/components/proposals/ProposalTemplateModal';
import { useOrcamentoAccess } from '@/hooks/useOrcamentoAccess';
import { OrcamentoUpgradeWall } from '@/components/proposals/OrcamentoUpgradeWall';

export interface ProposalItem {
  id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

export interface ProposalFormData {
  lead_id: string | null;
  person_type: 'pf' | 'pj';
  client_name: string;
  client_document: string;
  client_contact_name: string;
  client_phone: string;
  client_email: string;
  client_address: string;
  items: ProposalItem[];
  payment_method: string;
  payment_conditions: string;
  validity_date: string;
  delivery_deadline: string;
  status: 'rascunho' | 'enviada' | 'em_negociacao';
  global_discount: number;
  global_discount_type: 'fixed' | 'percent';
  observations: string;
  video_url: string;
}

const SECTIONS = [
  { id: 'lead', label: 'Lead', mobileLabel: 'Lead', icon: Link2 },
  { id: 'client', label: 'Cliente', mobileLabel: 'Cliente', icon: User },
  { id: 'items', label: 'Itens', mobileLabel: 'Itens', icon: Package },
  { id: 'payment', label: 'Pagamento', mobileLabel: 'Pgto', icon: CreditCard },
  { id: 'video', label: 'Vídeo', mobileLabel: 'Vídeo', icon: Video },
  { id: 'observations', label: 'Observações', mobileLabel: 'Obs.', icon: MessageSquare },
];

const initialForm: ProposalFormData = {
  lead_id: null,
  person_type: 'pf',
  client_name: '',
  client_document: '',
  client_contact_name: '',
  client_phone: '',
  client_email: '',
  client_address: '',
  items: [{ id: crypto.randomUUID(), product_name: '', description: '', quantity: 1, unit_price: 0, discount: 0 }],
  payment_method: '',
  payment_conditions: '',
  validity_date: '',
  delivery_deadline: '',
  status: 'rascunho',
  global_discount: 0,
  global_discount_type: 'fixed',
  observations: '',
  video_url: '',
};

export default function NewProposal() {
  const { franchiseId: authFranchiseId, user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isMobile = useIsMobile();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';

  // For admins without a franchise, allow selecting one
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string | null>(null);
  const [franchiseOptions, setFranchiseOptions] = useState<{ id: string; nome_franquia: string }[]>([]);
  const franchiseId = authFranchiseId || selectedFranchiseId;

  // Load franchise options for admins without a franchise
  useEffect(() => {
    if (isAdmin && !authFranchiseId) {
      supabase.from('franchises').select('id, nome_franquia').eq('ativa', true).order('nome_franquia').then(({ data }) => {
        if (data) setFranchiseOptions(data);
        if (data?.length === 1) setSelectedFranchiseId(data[0].id);
      });
    }
  }, [isAdmin, authFranchiseId]);

  const [form, setForm] = useState<ProposalFormData>(initialForm);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLoaded, setEditLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState('lead');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const draftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [loadTemplateOpen, setLoadTemplateOpen] = useState(false);
  const pendingAttachmentsRef = useRef<{ file_name: string; file_path: string; file_size: number; content_type: string }[]>([]);

  const updateForm = useCallback((updates: Partial<ProposalFormData>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const sectionComplete = (id: string): boolean => {
    switch (id) {
      case 'lead': return true;
      case 'client': return form.client_name.trim().length > 0 && form.client_phone.trim().length > 0;
      case 'items': return form.items.length > 0 && form.items.every(i => i.product_name.trim().length > 0 && i.unit_price > 0);
      case 'payment': return !!form.validity_date;
      case 'observations': return true;
      default: return false;
    }
  };

  const itemSubtotals = form.items.map(i => (i.quantity * i.unit_price) - i.discount);
  const subtotal = itemSubtotals.reduce((a, b) => a + b, 0);
  const discountAmount = form.global_discount_type === 'percent'
    ? subtotal * (form.global_discount / 100)
    : form.global_discount;
  const total = Math.max(0, subtotal - discountAmount);

  // Auto-save draft every 30s
  useEffect(() => {
    draftRef.current = setInterval(async () => {
      if (!franchiseId || !user) return;
      if (!form.client_name.trim()) return;
      try {
        localStorage.setItem(`proposal_draft_${franchiseId}`, JSON.stringify(form));
        const now = new Date();
        setLastSaved(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      } catch { /* ignore */ }
    }, 30000);
    return () => { if (draftRef.current) clearInterval(draftRef.current); };
  }, [form, franchiseId, user]);

  // Load existing proposal data for edit mode
  useEffect(() => {
    if (!editId || editLoaded) return;
    const loadProposal = async () => {
      const { data: proposal, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', editId)
        .single();
      if (error || !proposal) {
        toast.error('Proposta não encontrada');
        navigate('/propostas');
        return;
      }
      // Load items
      const { data: items } = await supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', editId)
        .order('sort_order');

      const formItems: ProposalItem[] = (items && items.length > 0)
        ? items.map(it => ({
            id: it.id,
            product_name: it.product_name,
            description: it.description || '',
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            discount: Number(it.discount),
          }))
        : [{ id: crypto.randomUUID(), product_name: '', description: '', quantity: 1, unit_price: 0, discount: 0 }];

      setForm({
        lead_id: proposal.lead_id,
        person_type: (proposal.person_type as 'pf' | 'pj') || 'pf',
        client_name: proposal.client_name || '',
        client_document: proposal.client_document || '',
        client_contact_name: proposal.client_contact_name || '',
        client_phone: proposal.client_phone || '',
        client_email: proposal.client_email || '',
        client_address: proposal.client_address || '',
        items: formItems,
        payment_method: proposal.payment_method || '',
        payment_conditions: proposal.payment_conditions || '',
        validity_date: proposal.validity_date || '',
        delivery_deadline: proposal.delivery_deadline || '',
        status: (proposal.status as any) || 'rascunho',
        global_discount: Number(proposal.global_discount) || 0,
        global_discount_type: (proposal.global_discount_type as 'fixed' | 'percent') || 'fixed',
        observations: proposal.observations || '',
        video_url: (proposal as any).video_url || '',
      });
      setIsEditMode(true);
      setEditLoaded(true);
    };
    loadProposal();
  }, [editId, editLoaded, navigate]);

  // Pre-link lead from query params
  useEffect(() => {
    if (editId) return;
    const leadIdParam = searchParams.get('lead_id');
    const leadNameParam = searchParams.get('lead_name');
    if (leadIdParam) {
      setForm(prev => ({
        ...prev,
        lead_id: leadIdParam,
        client_name: prev.client_name || leadNameParam || '',
      }));
      // Also load lead data for auto-fill
      supabase
        .from('leads')
        .select('nome, telefone, email, cidade')
        .eq('id', leadIdParam)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm(prev => ({
              ...prev,
              client_name: prev.client_name || data.nome || '',
              client_phone: prev.client_phone || data.telefone || '',
              client_email: prev.client_email || data.email || '',
              client_address: prev.client_address || (data.cidade ? `${data.cidade}` : ''),
            }));
          }
        });
    }
  }, [editId, searchParams]);

  // Reset form on mount for new proposals (not edit mode)
  useEffect(() => {
    if (editId) return;
    if (searchParams.get('lead_id')) return; // Don't reset if pre-linking
    setForm(initialForm);
    setIsEditMode(false);
    setEditLoaded(false);
    setFieldErrors({});
  }, [editId, searchParams]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Intersection observer for active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 }
    );
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const handleSaveDraft = async () => {
    await handleSubmit('rascunho');
  };

  const handleSubmit = async (statusOverride?: string) => {
    if (!user) return;
    if (!franchiseId) {
      toast.error('Selecione uma franquia antes de salvar');
      return;
    }

    const errs: Record<string, string> = {};
    if (!form.client_name.trim()) errs.client_name = 'Nome é obrigatório';

    const phoneDigits = unformatPhone(form.client_phone);
    if (!phoneDigits) {
      errs.client_phone = 'Telefone é obrigatório';
    } else if (!isValidBRPhone(phoneDigits)) {
      errs.client_phone = 'Telefone inválido. Use DDD + número';
    }

    if (form.client_email.trim() && !isValidEmail(form.client_email)) {
      errs.client_email = 'Email inválido';
    }

    if (form.client_document.trim()) {
      const isPJ = form.person_type === 'pj';
      if (isPJ && !isValidCNPJ(form.client_document)) {
        errs.client_document = 'CNPJ inválido';
      } else if (!isPJ && !isValidCPF(form.client_document)) {
        errs.client_document = 'CPF inválido';
      }
    }

    if (form.items.length === 0 || !form.items[0].product_name.trim()) {
      errs.items = 'Adicione ao menos um item à proposta';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      if (errs.client_name || errs.client_phone || errs.client_email || errs.client_document) {
        scrollToSection('client');
      } else if (errs.items) {
        scrollToSection('items');
      }
      toast.error('Corrija os campos destacados');
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      const finalStatus = statusOverride || form.status;
      const proposalPayload = {
        lead_id: form.lead_id,
        person_type: form.person_type,
        client_name: form.client_name.trim(),
        client_document: form.client_document.trim() || null,
        client_contact_name: form.client_contact_name.trim() || null,
        client_phone: form.client_phone.trim(),
        client_email: form.client_email.trim() || null,
        client_address: form.client_address.trim() || null,
        payment_method: form.payment_method || null,
        payment_conditions: form.payment_conditions.trim() || null,
        validity_date: form.validity_date || null,
        delivery_deadline: form.delivery_deadline.trim() || null,
        observations: form.observations.trim() || null,
        video_url: form.video_url.trim() || null,
        status: finalStatus as any,
        global_discount: form.global_discount,
        global_discount_type: form.global_discount_type,
        subtotal,
        total,
      } as any;

      let proposalId: string;

      if (isEditMode && editId) {
        // Update existing proposal
        const { error } = await supabase
          .from('proposals')
          .update(proposalPayload)
          .eq('id', editId);
        if (error) throw error;
        proposalId = editId;

        // Delete old items and re-insert
        await supabase.from('proposal_items').delete().eq('proposal_id', editId);
      } else {
        // Create new proposal
        const { data, error } = await supabase
          .from('proposals')
          .insert({
            franchise_id: franchiseId,
            created_by: user.id,
            ...proposalPayload,
          })
          .select('id')
          .single();
        if (error) throw error;
        proposalId = data.id;
      }

      if (form.items.length > 0) {
        const itemsToInsert = form.items.map((item, idx) => ({
          proposal_id: proposalId,
          product_name: item.product_name.trim(),
          description: item.description.trim() || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          subtotal: (item.quantity * item.unit_price) - item.discount,
          sort_order: idx,
        }));

        const { error: itemsError } = await supabase.from('proposal_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // Save pending attachments
      if (pendingAttachmentsRef.current.length > 0) {
        const attachmentsToInsert = pendingAttachmentsRef.current.map(att => ({
          proposal_id: proposalId,
          file_name: att.file_name,
          file_path: att.file_path,
          file_size: att.file_size,
          content_type: att.content_type,
        }));
        await supabase.from('proposal_attachments').insert(attachmentsToInsert);
        pendingAttachmentsRef.current = [];
      }

      localStorage.removeItem(`proposal_draft_${franchiseId}`);

      // Send email to client when status is "enviada" and client has email
      if (finalStatus === 'enviada' && form.client_email.trim()) {
        const emailType = isEditMode ? 'update' : 'new';
        supabase.functions.invoke('send-proposal-email', {
          body: { proposal_id: proposalId, type: emailType },
        }).then(({ error }) => {
          if (error) {
            console.error('Erro ao enviar e-mail da proposta:', error);
            toast.error('Proposta salva, mas houve um erro ao enviar o e-mail para o cliente.');
          } else {
            toast.success('📧 E-mail enviado para o cliente!');
          }
        });
      }

      // Event 3: WhatsApp auto trigger when proposal is sent
      if (finalStatus === 'enviada') {
        triggerWhatsAppAuto({ trigger_event: 'proposal_sent', proposal_id: proposalId, franchise_id: franchiseId });
      }

      const msg = isEditMode ? 'Proposta atualizada com sucesso!' : 'Proposta criada com sucesso!';
      toast.success(msg, {
        action: { label: 'Ver proposta', onClick: () => navigate(`/propostas/${proposalId}`) },
      });
      navigate(`/propostas/${proposalId}`);
    } catch (err: any) {
      toast.error('Erro ao salvar proposta: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadTemplate = (template: any) => {
    const items = (template.items as any[] || []).map((i: any) => ({
      id: crypto.randomUUID(),
      product_name: i.product_name || '',
      description: i.description || '',
      quantity: i.quantity || 1,
      unit_price: i.unit_price || 0,
      discount: i.discount || 0,
    }));
    updateForm({
      items: items.length > 0 ? items : form.items,
      payment_method: template.payment_method || form.payment_method,
      payment_conditions: template.payment_conditions || form.payment_conditions,
      delivery_deadline: template.delivery_deadline || form.delivery_deadline,
      observations: template.notes || form.observations,
    });
    toast.success(`Template "${template.name}" carregado!`);
  };

  const actionButtons = (
    <div className="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" onClick={() => setLoadTemplateOpen(true)} className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground" title="Carregar template">
        <BookOpen className="w-4 h-4" />
      </Button>
      {form.client_name.trim() && (
        <Button variant="ghost" size="icon" onClick={() => setSaveTemplateOpen(true)} className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground" title="Salvar como template">
          <Sparkles className="w-4 h-4" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground" title="Cancelar">
        <X className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="icon" onClick={handleSaveDraft} disabled={saving} className="h-8 w-8 sm:h-9 sm:w-9" title="Salvar rascunho">
        <Save className="w-4 h-4" />
      </Button>
      <Button size="sm" onClick={() => handleSubmit('enviada')} disabled={saving} className="h-8 sm:h-9 px-2.5 sm:px-4 gap-1">
        <Link2 className="w-4 h-4" />
        <span className="hidden sm:inline">{isEditMode ? 'Salvar e Enviar' : 'Criar e Enviar'}</span>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-bottomnav sm:pb-0">
      {/* Mobile header — same pattern as HojePage */}
      <PanelHeader title={isEditMode ? "Editar Proposta" : "Nova Proposta"}>
        <BackButton fallback="/propostas" />
        {actionButtons}
      </PanelHeader>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between mb-5">
          <div>
            <Breadcrumbs />
            <h1 className="text-page-title text-foreground mt-1">{isEditMode ? 'Editar Proposta Comercial' : 'Nova Proposta Comercial'}</h1>
            {lastSaved && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Rascunho salvo às {lastSaved}
              </p>
            )}
          </div>
          {actionButtons}
        </div>

        {/* Mobile draft saved indicator */}
        {isMobile && lastSaved && (
          <p className="text-[11px] text-muted-foreground text-center mb-3">
            Rascunho salvo às {lastSaved}
          </p>
        )}

        <div className="flex gap-8">
          {/* Sidebar Navigation (desktop only) */}
          {!isMobile && (
            <nav className="w-52 shrink-0">
              <div className="sticky top-20 space-y-1">
                {SECTIONS.map((section) => {
                  const isActive = activeSection === section.id;
                  const complete = sectionComplete(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {complete ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      ) : (
                        <section.icon className="w-4 h-4 shrink-0" />
                      )}
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {/* Mobile stepper — sits above BottomNav */}
          {isMobile && (
            <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 bg-background/95 backdrop-blur-xl border-t border-border/40 px-2 py-2">
              <div className="flex justify-around">
                {SECTIONS.map((section, idx) => {
                  const isActive = activeSection === section.id;
                  const complete = sectionComplete(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="flex flex-col items-center gap-0.5 min-w-0 px-1.5 py-0.5 active:scale-95 transition-transform min-h-[44px] justify-center"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all',
                        complete ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'
                      )}>
                        {complete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className={cn('text-[9px] leading-tight', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                        {section.mobileLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main form */}
          <div className={cn('flex-1 min-w-0 space-y-4 sm:space-y-5', isMobile && 'pb-28')}>
            {/* Admin franchise selector */}
            {isAdmin && !authFranchiseId && franchiseOptions.length > 0 && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <Label className="text-sm font-medium mb-2 block">Franquia responsável</Label>
                <Select value={selectedFranchiseId || ''} onValueChange={setSelectedFranchiseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a franquia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {franchiseOptions.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <motion.div
              id="lead"
              ref={el => { sectionRefs.current.lead = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <ProposalLeadSection form={form} updateForm={updateForm} franchiseId={franchiseId} />
            </motion.div>

            <motion.div
              id="client"
              ref={el => { sectionRefs.current.client = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ProposalClientSection form={form} updateForm={updateForm} errors={fieldErrors} />
            </motion.div>

            <motion.div
              id="items"
              ref={el => { sectionRefs.current.items = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <ProposalItemsSection
                form={form}
                updateForm={updateForm}
                subtotal={subtotal}
                discountAmount={discountAmount}
                total={total}
              />
            </motion.div>

            <motion.div
              id="payment"
              ref={el => { sectionRefs.current.payment = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ProposalPaymentSection form={form} updateForm={updateForm} />
            </motion.div>

            <motion.div
              id="video"
              ref={el => { sectionRefs.current.video = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              <ProposalVideoSection videoUrl={form.video_url} onChange={(url) => updateForm({ video_url: url })} />
            </motion.div>

            <motion.div
              id="observations"
              ref={el => { sectionRefs.current.observations = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <ProposalObservationsSection
                form={form}
                updateForm={updateForm}
                proposalId={editId}
                franchiseId={franchiseId || undefined}
                onPendingAttachmentsChange={(pending) => { pendingAttachmentsRef.current = pending; }}
              />
            </motion.div>

            {/* Score da Proposta */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ProposalScore form={form} subtotal={subtotal} />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Template Modals */}
      {franchiseId && user && (
        <>
          <SaveTemplateModal open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen} form={form} franchiseId={franchiseId} userId={user.id} />
          <LoadTemplateModal open={loadTemplateOpen} onOpenChange={setLoadTemplateOpen} franchiseId={franchiseId} onSelect={handleLoadTemplate} />
        </>
      )}
    </div>
  );
}
