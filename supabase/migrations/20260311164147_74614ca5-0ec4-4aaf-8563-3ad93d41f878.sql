CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_new_lead_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'record', row_to_json(NEW)::jsonb
  );

  PERFORM extensions.http_post(
    url := 'https://bbfkorzehzoaogrnuyqp.supabase.co/functions/v1/notify-new-lead',
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiZmtvcnplaHpvYW9ncm51eXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTgzMzEsImV4cCI6MjA4ODc3NDMzMX0.EaASD4L5hEPbONh0G3twgxCxnIoAatWTHWck5oaCHP8'
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_lead_notify
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_lead_webhook();