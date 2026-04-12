
-- 1. Add new columns to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS accepted_ip text,
  ADD COLUMN IF NOT EXISTS accepted_user_agent text,
  ADD COLUMN IF NOT EXISTS accepted_geolocation text;

-- 2. Create proposal_negotiations table
CREATE TABLE public.proposal_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  item_reference text,
  client_message text NOT NULL,
  proposed_value numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text
);

ALTER TABLE public.proposal_negotiations ENABLE ROW LEVEL SECURITY;

-- Public can insert negotiations (client from public page)
-- We'll use a security definer function instead for public access

-- Franchise can read negotiations of own proposals
CREATE POLICY "Franchise can read own proposal negotiations"
ON public.proposal_negotiations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_negotiations.proposal_id
    AND (
      (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
      OR has_role(auth.uid(), 'admin_fabrica')
      OR has_role(auth.uid(), 'super_admin')
    )
  )
);

-- Franchise can update negotiations of own proposals
CREATE POLICY "Franchise can update own proposal negotiations"
ON public.proposal_negotiations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_negotiations.proposal_id
    AND (
      (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
      OR has_role(auth.uid(), 'admin_fabrica')
      OR has_role(auth.uid(), 'super_admin')
    )
  )
);

-- 3. Create proposal_templates table
CREATE TABLE public.proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  franchise_id uuid NOT NULL,
  created_by uuid NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_method text,
  payment_conditions text,
  delivery_deadline text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own templates"
ON public.proposal_templates FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica')
  OR has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Franchise can insert own templates"
ON public.proposal_templates FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()) AND created_by = auth.uid())
  OR has_role(auth.uid(), 'admin_fabrica')
  OR has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Franchise can update own templates"
ON public.proposal_templates FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica')
  OR has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Franchise can delete own templates"
ON public.proposal_templates FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'franquia') AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica')
  OR has_role(auth.uid(), 'super_admin')
);

-- Trigger for updated_at on templates
CREATE TRIGGER update_proposal_templates_updated_at
BEFORE UPDATE ON public.proposal_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Security definer function for public negotiation submission
CREATE OR REPLACE FUNCTION public.public_submit_negotiation(
  _token uuid,
  _item_reference text,
  _client_message text,
  _proposed_value numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proposal_id uuid;
  _status proposal_status;
BEGIN
  SELECT id, status INTO _proposal_id, _status
  FROM public.proposals WHERE public_token = _token;

  IF _proposal_id IS NULL THEN RETURN false; END IF;
  IF _status IN ('aceita', 'recusada') THEN RETURN false; END IF;

  INSERT INTO public.proposal_negotiations (proposal_id, item_reference, client_message, proposed_value)
  VALUES (_proposal_id, _item_reference, _client_message, _proposed_value);

  -- Update proposal status to em_negociacao
  UPDATE public.proposals
  SET status = 'em_negociacao', updated_at = now()
  WHERE id = _proposal_id AND status != 'em_negociacao';

  RETURN true;
END;
$$;
