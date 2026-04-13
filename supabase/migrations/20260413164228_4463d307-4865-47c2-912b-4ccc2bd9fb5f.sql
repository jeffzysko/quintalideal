
-- Create storage bucket for proposal attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal-attachments', 'proposal-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can read proposal attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposal-attachments');

CREATE POLICY "Authenticated users can upload proposal attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposal-attachments');

CREATE POLICY "Authenticated users can delete own proposal attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proposal-attachments');

-- Create proposal_attachments table
CREATE TABLE public.proposal_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_attachments ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for public proposal page)
CREATE POLICY "Anyone can read proposal attachments"
ON public.proposal_attachments FOR SELECT
USING (true);

-- Franchise/admins can insert
CREATE POLICY "Users can insert attachments to own proposals"
ON public.proposal_attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_attachments.proposal_id
    AND (
      (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
      OR has_role(auth.uid(), 'admin_fabrica')
      OR has_role(auth.uid(), 'super_admin')
    )
  )
);

-- Franchise/admins can delete
CREATE POLICY "Users can delete attachments of own proposals"
ON public.proposal_attachments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_attachments.proposal_id
    AND (
      (has_role(auth.uid(), 'franquia') AND p.franchise_id = get_user_franquia_id(auth.uid()))
      OR has_role(auth.uid(), 'admin_fabrica')
      OR has_role(auth.uid(), 'super_admin')
    )
  )
);
