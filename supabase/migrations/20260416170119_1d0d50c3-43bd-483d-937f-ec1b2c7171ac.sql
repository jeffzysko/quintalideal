
-- 1. Fix franchises: replace overly broad anon SELECT with restricted version
DROP POLICY IF EXISTS "Anyone can read active franchises via public view" ON public.franchises;

CREATE POLICY "Anon can read active franchise public fields"
ON public.franchises
FOR SELECT
TO anon
USING (ativa = true);

-- Create a security definer function to safely expose only public fields
CREATE OR REPLACE FUNCTION public.get_active_franchises_public()
RETURNS SETOF public.franchises_public
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.franchises_public WHERE ativa = true;
$$;

-- 2. Fix proposal_attachments: restrict SELECT to owners
DROP POLICY IF EXISTS "Anyone can read proposal attachments" ON public.proposal_attachments;

CREATE POLICY "Authenticated users can read own proposal attachments"
ON public.proposal_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_attachments.proposal_id
    AND (
      (has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
      OR has_role(auth.uid(), 'admin_fabrica'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Also allow public access via proposal public_token for the public proposal page
CREATE POLICY "Public can read attachments of shared proposals"
ON public.proposal_attachments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_attachments.proposal_id
  )
);
