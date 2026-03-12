-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Allow deletion of analytics events (needed for cleanup)
CREATE POLICY "Service can delete old events"
ON public.analytics_events
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);