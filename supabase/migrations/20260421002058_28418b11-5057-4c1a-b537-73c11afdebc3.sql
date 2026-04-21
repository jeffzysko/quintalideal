CREATE OR REPLACE FUNCTION public.get_franchise_catalog(p_franchise_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  categoria_tamanho categoria_tamanho,
  comprimento NUMERIC,
  largura NUMERIC,
  profundidade NUMERIC,
  possui_prainha BOOLEAN,
  possui_spa BOOLEAN,
  imagem_principal TEXT,
  gallery_urls TEXT[],
  preco_min NUMERIC,
  preco_max NUMERIC,
  custom_price NUMERIC,
  is_active BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id,
    pm.nome_modelo AS name,
    pm.categoria_tamanho,
    pm.comprimento,
    pm.largura,
    pm.profundidade,
    pm.possui_prainha,
    pm.possui_spa,
    pm.imagem_principal,
    pm.gallery_urls,
    pm.preco_min,
    pm.preco_max,
    fmp.custom_price,
    COALESCE(fmp.is_active, TRUE) AS is_active
  FROM public.pool_models pm
  LEFT JOIN public.franchise_model_prices fmp
    ON fmp.pool_model_id = pm.id AND fmp.franchise_id = p_franchise_id
  WHERE pm.brand_id = (
    SELECT brand_id FROM public.franchises WHERE id = p_franchise_id
  )
  ORDER BY pm.categoria_tamanho, pm.nome_modelo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_franchise_catalog(UUID) TO authenticated;