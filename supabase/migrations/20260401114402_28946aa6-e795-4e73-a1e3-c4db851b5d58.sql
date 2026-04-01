
-- Performance indexes for scale

-- Leads: critical query patterns
CREATE INDEX IF NOT EXISTS idx_leads_franquia_created ON public.leads (franquia_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status_lead);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_city_normalized ON public.leads (lead_city_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_modelo_recomendado ON public.leads (modelo_recomendado);
CREATE INDEX IF NOT EXISTS idx_leads_origin_franchise ON public.leads (origin_franchise_id);
CREATE INDEX IF NOT EXISTS idx_leads_franquia_status ON public.leads (franquia_id, status_lead);

-- Lead activities: SLA and timeline queries
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type_created ON public.lead_activities (activity_type, created_at DESC);

-- Lead followups: today page queries
CREATE INDEX IF NOT EXISTS idx_lead_followups_franchise_completed ON public.lead_followups (franchise_id, completed, scheduled_at);

-- Analytics events: dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_franchise ON public.analytics_events (franchise_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events (session_id);

-- Franchise covered cities: territory resolution
CREATE INDEX IF NOT EXISTS idx_covered_cities_normalized ON public.franchise_covered_cities (city_name_normalized);
CREATE INDEX IF NOT EXISTS idx_covered_cities_franchise ON public.franchise_covered_cities (franchise_id);

-- Notifications: franchise queries
CREATE INDEX IF NOT EXISTS idx_notifications_franchise_read ON public.notifications (franchise_id, read, created_at DESC);

-- Webhook logs: health widget
CREATE INDEX IF NOT EXISTS idx_webhook_logs_franchise_created ON public.webhook_logs (franchise_id, created_at DESC);

-- Profiles: user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Push subscriptions: franchise lookup
CREATE INDEX IF NOT EXISTS idx_push_subs_franchise ON public.push_subscriptions (franchise_id);
