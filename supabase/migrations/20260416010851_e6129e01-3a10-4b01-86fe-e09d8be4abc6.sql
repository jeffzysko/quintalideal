
-- Part 1: Add loss_reason to leads
ALTER TABLE public.leads ADD COLUMN loss_reason text DEFAULT NULL;

-- Part 2: Lead tags table
CREATE TABLE public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own tags" ON public.lead_tags
  FOR SELECT USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Franchise can insert own tags" ON public.lead_tags
  FOR INSERT WITH CHECK (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Franchise can update own tags" ON public.lead_tags
  FOR UPDATE USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Franchise can delete own tags" ON public.lead_tags
  FOR DELETE USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Lead tag assignments table
CREATE TABLE public.lead_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.lead_tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

ALTER TABLE public.lead_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own tag assignments" ON public.lead_tag_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_tag_assignments.lead_id
      AND (
        (has_role(auth.uid(), 'franquia'::app_role) AND l.franquia_id = get_user_franquia_id(auth.uid()))
        OR has_role(auth.uid(), 'admin_fabrica'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
    )
  );

CREATE POLICY "Franchise can insert own tag assignments" ON public.lead_tag_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_tag_assignments.lead_id
      AND (
        (has_role(auth.uid(), 'franquia'::app_role) AND l.franquia_id = get_user_franquia_id(auth.uid()))
        OR has_role(auth.uid(), 'admin_fabrica'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
    )
  );

CREATE POLICY "Franchise can delete own tag assignments" ON public.lead_tag_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_tag_assignments.lead_id
      AND (
        (has_role(auth.uid(), 'franquia'::app_role) AND l.franquia_id = get_user_franquia_id(auth.uid()))
        OR has_role(auth.uid(), 'admin_fabrica'::app_role)
        OR has_role(auth.uid(), 'super_admin'::app_role)
      )
    )
  );

CREATE INDEX idx_lead_tags_franchise ON public.lead_tags(franchise_id);
CREATE INDEX idx_lead_tag_assignments_lead ON public.lead_tag_assignments(lead_id);
CREATE INDEX idx_lead_tag_assignments_tag ON public.lead_tag_assignments(tag_id);
