-- 1. Tabela brands
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT DEFAULT NULL,
  primary_color TEXT DEFAULT '#16a34a',
  secondary_color TEXT DEFAULT '#15803d',
  slogan TEXT DEFAULT NULL,
  proposal_header TEXT DEFAULT NULL,
  proposal_footer TEXT DEFAULT NULL,
  proposal_validity_days INTEGER DEFAULT 7,
  payment_terms TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage brands"
  ON public.brands FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated users read brands"
  ON public.brands FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. brand_id em franchises
ALTER TABLE public.franchises
  ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- 3. brand_id em pool_models
ALTER TABLE public.pool_models
  ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE;

-- 4. franchise_model_prices
CREATE TABLE public.franchise_model_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  pool_model_id UUID NOT NULL REFERENCES public.pool_models(id) ON DELETE CASCADE,
  custom_price NUMERIC(10,2) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(franchise_id, pool_model_id)
);

ALTER TABLE public.franchise_model_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all prices"
  ON public.franchise_model_prices FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Franchise reads own prices"
  ON public.franchise_model_prices FOR SELECT
  TO authenticated
  USING (franchise_id = public.get_user_franquia_id(auth.uid()));

CREATE POLICY "Franchise inserts own prices"
  ON public.franchise_model_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'franquia'::app_role)
    AND franchise_id = public.get_user_franquia_id(auth.uid())
  );

CREATE POLICY "Franchise updates own prices"
  ON public.franchise_model_prices FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'franquia'::app_role)
    AND franchise_id = public.get_user_franquia_id(auth.uid())
  );

CREATE POLICY "Franchise deletes own prices"
  ON public.franchise_model_prices FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'franquia'::app_role)
    AND franchise_id = public.get_user_franquia_id(auth.uid())
  );

-- 5. blocked_at em profiles e bloqueio dos admin_fabrica
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ DEFAULT NULL;

UPDATE public.profiles
SET blocked_at = now()
WHERE user_id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin_fabrica'::app_role
);

-- 6. Marca inicial Splash + vínculos
INSERT INTO public.brands (name, primary_color, secondary_color)
VALUES ('Splash', '#16a34a', '#15803d');

UPDATE public.franchises
SET brand_id = (SELECT id FROM public.brands WHERE name = 'Splash' LIMIT 1)
WHERE brand_id IS NULL;

UPDATE public.pool_models
SET brand_id = (SELECT id FROM public.brands WHERE name = 'Splash' LIMIT 1)
WHERE brand_id IS NULL;