-- Templates de checklist por franquia
CREATE TABLE public.post_sale_checklist_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  franchise_id uuid NOT NULL,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_sale_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own checklist templates"
ON public.post_sale_checklist_templates FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franchise can insert own checklist templates"
ON public.post_sale_checklist_templates FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franchise can update own checklist templates"
ON public.post_sale_checklist_templates FOR UPDATE TO authenticated
USING (
  (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franchise can delete own checklist templates"
ON public.post_sale_checklist_templates FOR DELETE TO authenticated
USING (
  (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE TRIGGER update_post_sale_checklist_templates_updated_at
BEFORE UPDATE ON public.post_sale_checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Garantir apenas 1 template padrão por franquia
CREATE UNIQUE INDEX idx_post_sale_checklist_templates_default
ON public.post_sale_checklist_templates (franchise_id)
WHERE is_default = true;