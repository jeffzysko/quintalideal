
CREATE TABLE public.post_sale_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE UNIQUE,
  franchise_id uuid NOT NULL REFERENCES public.franchises(id),
  status text NOT NULL DEFAULT 'agendado',
  installation_date date DEFAULT NULL,
  completion_date date DEFAULT NULL,
  responsible_name text DEFAULT NULL,
  satisfaction_rating integer DEFAULT NULL,
  satisfaction_note text DEFAULT NULL,
  internal_notes text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_sale_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own post sale projects"
ON public.post_sale_projects FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franchise can insert own post sale projects"
ON public.post_sale_projects FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franchise can update own post sale projects"
ON public.post_sale_projects FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Franchise can delete own post sale projects"
ON public.post_sale_projects FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
  OR has_role(auth.uid(), 'admin_fabrica'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE TRIGGER update_post_sale_projects_updated_at
BEFORE UPDATE ON public.post_sale_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
