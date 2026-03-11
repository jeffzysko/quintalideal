
-- Analytics events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_name text NOT NULL,
  franchise_id uuid REFERENCES public.franchises(id) ON DELETE SET NULL,
  city text,
  device_type text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (public users doing the quiz)
CREATE POLICY "Anyone can insert events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Admins can read all events
CREATE POLICY "Admins can read all events"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin_fabrica'));

-- Franchises can read their own events
CREATE POLICY "Franchise can read own events"
  ON public.analytics_events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'franquia') 
    AND franchise_id = public.get_user_franquia_id(auth.uid())
  );

-- Performance indices
CREATE INDEX idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_created ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_franchise ON public.analytics_events(franchise_id);
CREATE INDEX idx_analytics_city ON public.analytics_events(city);
