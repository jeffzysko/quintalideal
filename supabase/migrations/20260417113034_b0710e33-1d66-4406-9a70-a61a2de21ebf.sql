CREATE TABLE public.technical_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,

  visited_at TIMESTAMPTZ DEFAULT NULL,
  visited_by TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
  feasibility TEXT NOT NULL DEFAULT 'viavel' CHECK (feasibility IN ('viavel', 'viavel_com_ressalvas', 'inviavel')),
  feasibility_notes TEXT DEFAULT NULL,
  general_notes TEXT DEFAULT NULL,

  terrain_type TEXT DEFAULT NULL,
  access_width_cm INTEGER DEFAULT NULL,
  access_height_cm INTEGER DEFAULT NULL,
  needs_crane BOOLEAN DEFAULT FALSE,
  needs_winch BOOLEAN DEFAULT FALSE,
  access_notes TEXT DEFAULT NULL,

  pool_position TEXT DEFAULT NULL,
  solar_orientation TEXT DEFAULT NULL,
  distance_from_wall_cm INTEGER DEFAULT NULL,
  distance_from_trees_cm INTEGER DEFAULT NULL,
  has_slope BOOLEAN DEFAULT FALSE,
  slope_notes TEXT DEFAULT NULL,
  position_notes TEXT DEFAULT NULL,

  has_electrical_point BOOLEAN DEFAULT FALSE,
  electrical_distance_m INTEGER DEFAULT NULL,
  has_water_point BOOLEAN DEFAULT FALSE,
  water_distance_m INTEGER DEFAULT NULL,
  has_drain BOOLEAN DEFAULT FALSE,
  ground_level TEXT DEFAULT NULL,
  infrastructure_notes TEXT DEFAULT NULL,

  visit_photo_urls TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX technical_visits_lead_id_uniq ON public.technical_visits(lead_id);
CREATE INDEX technical_visits_franchise_id_idx ON public.technical_visits(franchise_id);

ALTER TABLE public.technical_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchise can read own technical visits"
  ON public.technical_visits FOR SELECT
  TO authenticated
  USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Franchise can insert own technical visits"
  ON public.technical_visits FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Franchise can update own technical visits"
  ON public.technical_visits FOR UPDATE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Franchise can delete own technical visits"
  ON public.technical_visits FOR DELETE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER trg_technical_visits_updated_at
  BEFORE UPDATE ON public.technical_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();