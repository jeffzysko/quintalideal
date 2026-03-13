
-- Lead activities / follow-up timeline
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  activity_type text NOT NULL DEFAULT 'note',
  content text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);

-- RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Franchise users can read activities on their own leads
CREATE POLICY "Franchise can read own lead activities"
ON public.lead_activities FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
    AND l.franquia_id = public.get_user_franquia_id(auth.uid())
  )
  AND public.has_role(auth.uid(), 'franquia'::app_role)
);

-- Franchise users can insert activities on their own leads
CREATE POLICY "Franchise can insert own lead activities"
ON public.lead_activities FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_activities.lead_id
    AND l.franquia_id = public.get_user_franquia_id(auth.uid())
  )
  AND public.has_role(auth.uid(), 'franquia'::app_role)
  AND user_id = auth.uid()
);

-- Admins can read all activities
CREATE POLICY "Admins can read all lead activities"
ON public.lead_activities FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Admins can insert activities
CREATE POLICY "Admins can insert lead activities"
ON public.lead_activities FOR INSERT TO authenticated
WITH CHECK (
  (public.has_role(auth.uid(), 'admin_fabrica'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  AND user_id = auth.uid()
);
