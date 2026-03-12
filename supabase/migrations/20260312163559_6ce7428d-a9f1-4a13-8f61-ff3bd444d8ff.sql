DROP FUNCTION IF EXISTS public.get_public_franchise_by_slug(text);

CREATE FUNCTION public.get_public_franchise_by_slug(_slug text)
 RETURNS TABLE(id uuid, nome_franquia text, slug_url text, whatsapp text, ativa boolean, meta_pixel_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT f.id, f.nome_franquia, f.slug_url, f.whatsapp, f.ativa, f.meta_pixel_id
  FROM public.franchises f
  WHERE f.slug_url = _slug
    AND f.ativa = true
  LIMIT 1;
$function$;