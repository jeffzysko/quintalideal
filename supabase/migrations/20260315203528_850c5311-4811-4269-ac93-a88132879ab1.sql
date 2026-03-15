
-- Follow-up reminders table
CREATE TABLE public.lead_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  franchise_id uuid NOT NULL,
  user_id uuid NOT NULL,
  scheduled_at timestamp with time zone NOT NULL,
  note text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own followups" ON public.lead_followups
  FOR SELECT TO authenticated
  USING (franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise can insert own followups" ON public.lead_followups
  FOR INSERT TO authenticated
  WITH CHECK (franchise_id = get_user_franquia_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Franchise can update own followups" ON public.lead_followups
  FOR UPDATE TO authenticated
  USING (franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise can delete own followups" ON public.lead_followups
  FOR DELETE TO authenticated
  USING (franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Admins can read all followups" ON public.lead_followups
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_fabrica') OR has_role(auth.uid(), 'super_admin'));

-- Monthly goals table
CREATE TABLE public.franchise_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  sales_goal integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(franchise_id, month, year)
);

ALTER TABLE public.franchise_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own goals" ON public.franchise_goals
  FOR SELECT TO authenticated
  USING (franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise can insert own goals" ON public.franchise_goals
  FOR INSERT TO authenticated
  WITH CHECK (franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise can update own goals" ON public.franchise_goals
  FOR UPDATE TO authenticated
  USING (franchise_id = get_user_franquia_id(auth.uid()));

CREATE POLICY "Admins can read all goals" ON public.franchise_goals
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_fabrica') OR has_role(auth.uid(), 'super_admin'));
