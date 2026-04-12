import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import { Save, X, FileText, Check, User, Package, CreditCard, MessageSquare, Link2 } from 'lucide-react';
import { ProposalLeadSection } from '@/components/proposals/ProposalLeadSection';
import { ProposalClientSection } from '@/components/proposals/ProposalClientSection';
import { ProposalItemsSection } from '@/components/proposals/ProposalItemsSection';
import { ProposalPaymentSection } from '@/components/proposals/ProposalPaymentSection';
import { ProposalObservationsSection } from '@/components/proposals/ProposalObservationsSection';
import { cn } from '@/lib/utils';
import { isValidBRPhone, isValidEmail, unformatPhone } from '@/lib/validation';
import { isValidCPF, isValidCNPJ } from '@/lib/document-utils';

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
}

const SECTIONS = [
  { id: 'lead', label: 'Vinculação de Lead', icon: Link2 },
  { id: 'client', label: 'Dados do Cliente', icon: User },
  { id: 'items', label: 'Itens da Proposta', icon: Package },
  { id: 'payment', label: 'Pagamento', icon: CreditCard },
  { id: 'observations', label: 'Observações', icon: MessageSquare },
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
};

export default function NewProposal() {
  const { franchiseId, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [form, setForm] = useState<ProposalFormData>(initialForm);
  const [activeSection, setActiveSection] = useState('lead');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const draftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const updateForm = useCallback((updates: Partial<ProposalFormData>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  // Section completion check
  const sectionComplete = (id: string): boolean => {
    switch (id) {
      case 'lead': return true; // optional
      case 'client': return form.client_name.trim().length > 0 && form.client_phone.trim().length > 0;
      case 'items': return form.items.length > 0 && form.items.every(i => i.product_name.trim().length > 0 && i.unit_price > 0);
      case 'payment': return !!form.validity_date;
      case 'observations': return true;
      default: return false;
    }
  };

  // Compute totals
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
      // Only auto-save if there's meaningful data
      if (!form.client_name.trim()) return;
      try {
        // Save to localStorage as draft
        localStorage.setItem(`proposal_draft_${franchiseId}`, JSON.stringify(form));
        const now = new Date();
        setLastSaved(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      } catch { /* ignore */ }
    }, 30000);
    return () => { if (draftRef.current) clearInterval(draftRef.current); };
  }, [form, franchiseId, user]);

  // Load draft on mount
  useEffect(() => {
    if (!franchiseId) return;
    try {
      const draft = localStorage.getItem(`proposal_draft_${franchiseId}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        setForm(prev => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
  }, [franchiseId]);

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
    if (!franchiseId || !user) return;

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
        toast.error('Verifique os dados do cliente');
      } else if (errs.items) {
        scrollToSection('items');
        toast.error('Adicione ao menos um item à proposta');
      }
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const finalStatus = statusOverride || form.status;
      const { data, error } = await supabase.from('proposals').insert({
        franchise_id: franchiseId,
        lead_id: form.lead_id || null,
        created_by: user.id,
        person_type: form.person_type,
        client_name: form.client_name,
        client_document: form.client_document || null,
        client_contact_name: form.client_contact_name || null,
        client_phone: form.client_phone || null,
        client_email: form.client_email || null,
        client_address: form.client_address || null,
        payment_method: form.payment_method || null,
        payment_conditions: form.payment_conditions || null,
        validity_date: form.validity_date || null,
        delivery_deadline: form.delivery_deadline || null,
        subtotal,
        global_discount: form.global_discount,
        global_discount_type: form.global_discount_type,
        total,
        status: finalStatus as any,
        observations: form.observations || null,
      }).select('id').single();

      if (error) throw error;

      // Insert items
      if (data && form.items.length > 0) {
        const itemsToInsert = form.items.map((item, idx) => ({
          proposal_id: data.id,
          product_name: item.product_name,
          description: item.description || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          subtotal: (item.quantity * item.unit_price) - item.discount,
          sort_order: idx,
        }));
        const { error: itemsError } = await supabase.from('proposal_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      // Clear draft
      localStorage.removeItem(`proposal_draft_${franchiseId}`);

      toast.success('Proposta criada com sucesso!', {
        action: { label: 'Ver proposta', onClick: () => navigate(`/propostas/${data.id}`) },
      });
      navigate('/propostas');
    } catch (err: any) {
      toast.error('Erro ao criar proposta: ' + (err.message || 'Tente novamente'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-safe">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <span className="truncate">{isMobile ? 'Nova Proposta' : 'Nova Proposta Comercial'}</span>
            </h1>
            {lastSaved && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Rascunho salvo às {lastSaved}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 px-2 sm:px-3">
              <X className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Cancelar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving} className="h-8 px-2 sm:px-3">
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Rascunho</span>
            </Button>
            <Button size="sm" onClick={() => handleSubmit()} disabled={saving} className="h-8 px-2.5 sm:px-3 bg-primary hover:bg-primary/90">
              <FileText className="w-4 h-4" />
              <span className="hidden xs:inline ml-1">{isMobile ? 'Criar' : 'Criar Proposta'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex gap-8">
          {/* Sidebar Navigation (desktop) */}
          {!isMobile && (
            <nav className="w-56 shrink-0">
              <div className="sticky top-24 space-y-1">
                {SECTIONS.map((section) => {
                  const isActive = activeSection === section.id;
                  const complete = sectionComplete(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {complete ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                      ) : (
                        <section.icon className="w-5 h-5 shrink-0" />
                      )}
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {/* Mobile stepper */}
          {isMobile && (
            <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border/40 px-2 py-1.5">
              <div className="flex justify-around">
                {SECTIONS.map((section, idx) => {
                  const isActive = activeSection === section.id;
                  const complete = sectionComplete(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="flex flex-col items-center gap-0.5 min-w-0 px-1 active:scale-95 transition-transform"
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                        complete ? 'bg-emerald-100 text-emerald-600' :
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}>
                        {complete ? <Check className="w-3 h-3" /> : idx + 1}
                      </div>
                      <span className={cn('text-[9px] leading-tight truncate max-w-[52px]', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                        {section.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main form */}
          <div className={cn('flex-1 min-w-0 space-y-4 sm:space-y-6', isMobile && 'pb-32')}>
            <motion.div
              id="lead"
              ref={el => { sectionRefs.current.lead = el; }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <ProposalLeadSection form={form} updateForm={updateForm} franchiseId={franchiseId} />
            </motion.div>

            <motion.div
              id="client"
              ref={el => { sectionRefs.current.client = el; }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ProposalClientSection form={form} updateForm={updateForm} errors={fieldErrors} />
            </motion.div>

            <motion.div
              id="items"
              ref={el => { sectionRefs.current.items = el; }}
              initial={{ opacity: 0, y: 20 }}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ProposalPaymentSection form={form} updateForm={updateForm} />
            </motion.div>

            <motion.div
              id="observations"
              ref={el => { sectionRefs.current.observations = el; }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <ProposalObservationsSection form={form} updateForm={updateForm} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
