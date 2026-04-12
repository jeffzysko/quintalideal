
-- Add new status value to proposal_status enum
ALTER TYPE public.proposal_status ADD VALUE IF NOT EXISTS 'visualizada';

-- Add new columns to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS public_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by_name text,
  ADD COLUMN IF NOT EXISTS refused_at timestamptz,
  ADD COLUMN IF NOT EXISTS refused_reason text;

-- Backfill existing proposals with tokens
UPDATE public.proposals SET public_token = gen_random_uuid() WHERE public_token IS NULL;

-- Make public_token NOT NULL after backfill
ALTER TABLE public.proposals ALTER COLUMN public_token SET NOT NULL;

-- Create index for fast token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_public_token ON public.proposals(public_token);

-- Allow public (unauthenticated) read of proposals by token
CREATE POLICY "Public can read proposal by token"
  ON public.proposals FOR SELECT
  TO anon
  USING (true);

-- Create proposal_views table
CREATE TABLE public.proposal_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);

ALTER TABLE public.proposal_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (public page)
CREATE POLICY "Anyone can insert proposal views"
  ON public.proposal_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated franchise/admin can read views
CREATE POLICY "Franchise can read own proposal views"
  ON public.proposal_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_views.proposal_id
      AND (
        (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
        OR has_role(auth.uid(), 'admin_fabrica')
        OR has_role(auth.uid(), 'super_admin')
      )
    )
  );

-- Create proposal_questions table
CREATE TABLE public.proposal_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  question text NOT NULL,
  asked_at timestamptz NOT NULL DEFAULT now(),
  answer text,
  answered_at timestamptz
);

ALTER TABLE public.proposal_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert questions (public page)
CREATE POLICY "Anyone can insert proposal questions"
  ON public.proposal_questions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated franchise/admin can read questions
CREATE POLICY "Franchise can read own proposal questions"
  ON public.proposal_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_questions.proposal_id
      AND (
        (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
        OR has_role(auth.uid(), 'admin_fabrica')
        OR has_role(auth.uid(), 'super_admin')
      )
    )
  );

-- Franchise/admin can update questions (to add answers)
CREATE POLICY "Franchise can update own proposal questions"
  ON public.proposal_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_questions.proposal_id
      AND (
        (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
        OR has_role(auth.uid(), 'admin_fabrica')
        OR has_role(auth.uid(), 'super_admin')
      )
    )
  );

-- Allow public (anon) to update proposals for accept/refuse actions
CREATE POLICY "Public can update proposal status via token"
  ON public.proposals FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
