ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS score_label TEXT DEFAULT 'Índice do Quintal';

DROP FUNCTION IF EXISTS public.get_public_franchise_by_slug(text);

CREATE OR REPLACE FUNCTION public.get_public_franchise_by_slug(_slug text)
 RETURNS TABLE(id uuid, nome_franquia text, slug_url text, whatsapp text, ativa boolean, meta_pixel_id text, brand_id uuid, brand_name text, brand_logo_url text, brand_primary_color text, brand_secondary_color text, brand_slogan text, brand_score_label text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    f.id,
    f.nome_franquia,
    f.slug_url,
    f.whatsapp,
    f.ativa,
    f.meta_pixel_id,
    b.id AS brand_id,
    b.name AS brand_name,
    b.logo_url AS brand_logo_url,
    b.primary_color AS brand_primary_color,
    b.secondary_color AS brand_secondary_color,
    b.slogan AS brand_slogan,
    COALESCE(b.score_label, 'Índice do Quintal') AS brand_score_label
  FROM public.franchises f
  LEFT JOIN public.brands b ON b.id = f.brand_id
  WHERE f.slug_url = _slug
    AND f.ativa = true
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_franchise_by_slug(TEXT) TO anon, authenticated;