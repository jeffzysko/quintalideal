ALTER TABLE public.franchises
  ADD COLUMN IF NOT EXISTS stripe_customer_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text DEFAULT NULL;