
-- Fix search_path on normalize_city_name
CREATE OR REPLACE FUNCTION public.normalize_city_name(_city text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
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
