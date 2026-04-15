CREATE OR REPLACE FUNCTION public.notify_new_application_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'franchise_applications',
    'record', row_to_json(NEW)::jsonb
  );

  PERFORM net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/notify-new-application',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    ),
    body := payload
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_franchise_application
AFTER INSERT ON public.franchise_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_application_webhook();