-- New table: installation checklist per post-sale project
CREATE TABLE IF NOT EXISTS public.post_sale_checklist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.post_sale_projects(id) ON DELETE CASCADE,
  label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone DEFAULT NULL,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_sale_checklist_project ON public.post_sale_checklist(project_id);

ALTER TABLE public.post_sale_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Franchise access post_sale_checklist" ON public.post_sale_checklist;
CREATE POLICY "Franchise access post_sale_checklist"
ON public.post_sale_checklist
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.post_sale_projects p
    WHERE p.id = post_sale_checklist.project_id
    AND (
      (public.has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = public.get_user_franquia_id(auth.uid()))
      OR public.has_role(auth.uid(), 'admin_fabrica'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.post_sale_projects p
    WHERE p.id = post_sale_checklist.project_id
    AND (
      (public.has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = public.get_user_franquia_id(auth.uid()))
      OR public.has_role(auth.uid(), 'admin_fabrica'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Extend post_sale_projects with warranty, final value and final photos
ALTER TABLE public.post_sale_projects
  ADD COLUMN IF NOT EXISTS warranty_months integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS warranty_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS final_photo_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS final_value numeric DEFAULT NULL;