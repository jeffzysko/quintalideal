ALTER TABLE public.pool_models
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}'::text[];