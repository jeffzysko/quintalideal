ALTER TABLE public.pool_models 
  ADD COLUMN preco_min numeric DEFAULT NULL,
  ADD COLUMN preco_max numeric DEFAULT NULL;