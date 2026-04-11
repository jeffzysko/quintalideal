-- Revert webhook_logs to allow anon inserts (needed by edge functions with verify_jwt=false)
-- Edge functions like create-lead insert webhook_logs using the anon key
DROP POLICY IF EXISTS "Service can insert webhook logs" ON public.webhook_logs;
CREATE POLICY "Service can insert webhook logs"
  ON public.webhook_logs FOR INSERT
  TO public
  WITH CHECK (true);