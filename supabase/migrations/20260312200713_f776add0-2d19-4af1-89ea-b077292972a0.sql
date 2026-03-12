
-- Create territory match status enum
CREATE TYPE public.territory_match_status AS ENUM (
  'matched_unique_franchise',
  'matched_multiple_franchises',
  'kept_with_origin_franchise',
  'no_city_match_found'
);

-- Create franchise_covered_cities table
CREATE TABLE public.franchise_covered_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  city_name text NOT NULL,
  city_name_normalized text NOT NULL,
  is_primary_city boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (franchise_id, city_name_normalized)
);

-- Index for fast city lookups
CREATE INDEX idx_fcc_city_normalized ON public.franchise_covered_cities(city_name_normalized);
CREATE INDEX idx_fcc_franchise_id ON public.franchise_covered_cities(franchise_id);

-- RLS
ALTER TABLE public.franchise_covered_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read covered cities"
  ON public.franchise_covered_cities FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins can manage covered cities"
  ON public.franchise_covered_cities FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can update covered cities"
  ON public.franchise_covered_cities FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can delete covered cities"
  ON public.franchise_covered_cities FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin_fabrica'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Add new columns to leads table
ALTER TABLE public.leads
  ADD COLUMN origin_franchise_id uuid REFERENCES public.franchises(id),
  ADD COLUMN lead_city_normalized text,
  ADD COLUMN territory_match_status public.territory_match_status,
  ADD COLUMN coverage_match_count integer DEFAULT 0,
  ADD COLUMN distribution_rule_used text;

-- Create normalize_city_name function for reuse
CREATE OR REPLACE FUNCTION public.normalize_city_name(_city text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    trim(
      regexp_replace(
        translate(
          _city,
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
        ),
        '\s+', ' ', 'g'
      )
    )
  )
$$;

-- Migrate existing cidades_atendidas data to franchise_covered_cities
INSERT INTO public.franchise_covered_cities (franchise_id, city_name, city_name_normalized, is_primary_city)
SELECT 
  f.id,
  unnested.city,
  public.normalize_city_name(unnested.city),
  (unnested.city = f.cidade_base) AS is_primary_city
FROM public.franchises f,
LATERAL unnest(f.cidades_atendidas) AS unnested(city)
WHERE f.cidades_atendidas IS NOT NULL 
  AND array_length(f.cidades_atendidas, 1) > 0
ON CONFLICT (franchise_id, city_name_normalized) DO NOTHING;

-- Also insert cidade_base for franchises that don't have it in cidades_atendidas
INSERT INTO public.franchise_covered_cities (franchise_id, city_name, city_name_normalized, is_primary_city)
SELECT 
  f.id,
  f.cidade_base,
  public.normalize_city_name(f.cidade_base),
  true
FROM public.franchises f
WHERE f.cidade_base IS NOT NULL
ON CONFLICT (franchise_id, city_name_normalized) DO NOTHING;
