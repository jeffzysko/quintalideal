-- The http extension is not available; disable the broken trigger 
-- to unblock lead inserts. Notification will be handled differently.
DROP TRIGGER IF EXISTS on_new_lead_notify ON public.leads;
DROP FUNCTION IF EXISTS public.notify_new_lead_webhook();