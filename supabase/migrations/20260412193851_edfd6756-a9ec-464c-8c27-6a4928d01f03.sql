
-- Create proposal status enum
CREATE TYPE public.proposal_status AS ENUM ('rascunho', 'enviada', 'em_negociacao', 'aceita', 'recusada');

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  franchise_id UUID NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  
  -- Client data
  person_type TEXT NOT NULL DEFAULT 'pf' CHECK (person_type IN ('pf', 'pj')),
  client_name TEXT NOT NULL,
  client_document TEXT,
  client_contact_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  client_address TEXT,
  
  -- Payment
  payment_method TEXT,
  payment_conditions TEXT,
  validity_date DATE,
  delivery_deadline TEXT,
  
  -- Totals
  subtotal NUMERIC NOT NULL DEFAULT 0,
  global_discount NUMERIC NOT NULL DEFAULT 0,
  global_discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (global_discount_type IN ('fixed', 'percent')),
  total NUMERIC NOT NULL DEFAULT 0,
  
  -- Meta
  status public.proposal_status NOT NULL DEFAULT 'rascunho',
  observations TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create proposal items table
CREATE TABLE public.proposal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- Proposals policies
CREATE POLICY "Franchise can read own proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise can insert own proposals"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Franchise can update own proposals"
  ON public.proposals FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise can delete own proposals"
  ON public.proposals FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Admins can read all proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_fabrica') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage all proposals"
  ON public.proposals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_fabrica') OR has_role(auth.uid(), 'super_admin'));

-- Proposal items policies
CREATE POLICY "Users can read items of accessible proposals"
  ON public.proposal_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND (
    (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica')
    OR has_role(auth.uid(), 'super_admin')
  )));

CREATE POLICY "Users can insert items to own proposals"
  ON public.proposal_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND (
    (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica')
    OR has_role(auth.uid(), 'super_admin')
  )));

CREATE POLICY "Users can update items of own proposals"
  ON public.proposal_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND (
    (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica')
    OR has_role(auth.uid(), 'super_admin')
  )));

CREATE POLICY "Users can delete items of own proposals"
  ON public.proposal_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.proposals p WHERE p.id = proposal_id AND (
    (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica')
    OR has_role(auth.uid(), 'super_admin')
  )));

-- Trigger for updated_at
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
