-- Migration: Composite indexes for common multi-column query patterns

-- 1. lead_activities: activity_type + created_at
--    Used by: AdminPerformanceComparison, SLAIndicator, AdminDashboard activities query
--    Pattern: WHERE activity_type = 'status_change' ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_lead_activities_type_created
  ON public.lead_activities (activity_type, created_at DESC);

-- 2. leads: franquia_id + updated_at
--    Used by: AdminInactiveAlerts (last update per franchise)
CREATE INDEX IF NOT EXISTS idx_leads_franquia_updated
  ON public.leads (franquia_id, updated_at DESC);

-- 3. leads: franquia_id + status_lead + created_at
--    Used by: filtered paginated queries combining franchise + status filters
CREATE INDEX IF NOT EXISTS idx_leads_franquia_status_created
  ON public.leads (franquia_id, status_lead, created_at DESC);

-- 4. leads: lead_city_normalized
--    Used by: roundRobinByLeastLeads (territory distribution on lead creation)
CREATE INDEX IF NOT EXISTS idx_leads_city_normalized
  ON public.leads (lead_city_normalized)
  WHERE lead_city_normalized IS NOT NULL;

-- 5. analytics_events: franchise_id + created_at
--    Used by: AdminAnalytics per-franchise funnel + time-window filter
CREATE INDEX IF NOT EXISTS idx_analytics_franchise_created
  ON public.analytics_events (franchise_id, created_at DESC)
  WHERE franchise_id IS NOT NULL;

-- 6. leads: status_lead + created_at
--    Used by: get_admin_kpi_stats RPC and count queries by status
CREATE INDEX IF NOT EXISTS idx_leads_status_created
  ON public.leads (status_lead, created_at DESC);
