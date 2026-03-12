ALTER TABLE public.franchises ADD COLUMN webhook_url text DEFAULT NULL;
ALTER TABLE public.franchises ADD COLUMN webhook_secret text DEFAULT NULL;