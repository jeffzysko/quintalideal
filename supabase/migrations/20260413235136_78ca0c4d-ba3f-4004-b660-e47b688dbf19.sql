
ALTER TABLE public.whatsapp_messages
ADD COLUMN scheduled_for timestamp with time zone DEFAULT NULL;
