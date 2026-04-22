CREATE OR REPLACE FUNCTION public.get_franchise_benchmarks(p_franchise_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_super_admin boolean;
  _is_own_franchise boolean;
  _window_start timestamptz := now() - interval '30 days';
  _prev_window_start timestamptz := now() - interval '60 days';
  _prev_window_end timestamptz := now() - interval '30 days';

  _own_total int := 0;
  _own_sold int := 0;
  _own_conv numeric := 0;
  _own_score numeric := 0;

  _own_total_prev int := 0;
  _own_sold_prev int := 0;
  _own_conv_prev numeric := 0;

  _network_avg_conv numeric := 0;
  _network_max_conv numeric := 0;
  _network_avg_score numeric := 0;
  _network_max_score numeric := 0;

  _total_franchises int := 0;
  _better_franchises int := 0;
  _posicao int := 0;
  _percentil int := 0;
BEGIN
  -- Authorization: only super_admin OR a user belonging to this franchise
  _is_super_admin := public.has_role(auth.uid(), 'super_admin'::app_role);
  _is_own_franchise := (public.get_user_franquia_id(auth.uid()) = p_franchise_id);

  IF NOT (_is_super_admin OR _is_own_franchise) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Own franchise stats (last 30 days)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status_lead = 'vendido'),
    COALESCE(AVG(pontuacao_quintal), 0)
  INTO _own_total, _own_sold, _own_score
  FROM public.leads
  WHERE franquia_id = p_franchise_id
    AND created_at >= _window_start;

  _own_conv := CASE WHEN _own_total > 0 THEN (_own_sold::numeric / _own_total::numeric) * 100 ELSE 0 END;

  -- Own franchise stats (previous 30 days, for variation)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status_lead = 'vendido')
  INTO _own_total_prev, _own_sold_prev
  FROM public.leads
  WHERE franquia_id = p_franchise_id
    AND created_at >= _prev_window_start
    AND created_at < _prev_window_end;

  _own_conv_prev := CASE WHEN _own_total_prev > 0 THEN (_own_sold_prev::numeric / _own_total_prev::numeric) * 100 ELSE 0 END;

  -- Network aggregates: per-franchise conversion + score (only active franchises with leads in the window)
  WITH per_franchise AS (
    SELECT
      l.franquia_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE l.status_lead = 'vendido') AS sold,
      COALESCE(AVG(l.pontuacao_quintal), 0) AS avg_score
    FROM public.leads l
    JOIN public.franchises f ON f.id = l.franquia_id
    WHERE l.franquia_id IS NOT NULL
      AND f.ativa = true
      AND l.created_at >= _window_start
    GROUP BY l.franquia_id
    HAVING COUNT(*) >= 1
  ),
  per_franchise_conv AS (
    SELECT franquia_id,
           CASE WHEN total > 0 THEN (sold::numeric / total::numeric) * 100 ELSE 0 END AS conv,
           avg_score
    FROM per_franchise
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE conv > _own_conv),
    COALESCE(AVG(conv), 0),
    COALESCE(MAX(conv), 0),
    COALESCE(AVG(avg_score), 0),
    COALESCE(MAX(avg_score), 0)
  INTO
    _total_franchises,
    _better_franchises,
    _network_avg_conv,
    _network_max_conv,
    _network_avg_score,
    _network_max_score
  FROM per_franchise_conv;

  -- Position: 1-based; if franchise has no leads in window, place it at the end
  IF _own_total = 0 THEN
    _posicao := GREATEST(_total_franchises, 1);
    _percentil := 0;
  ELSE
    _posicao := _better_franchises + 1;
    -- Percentile: % of network the franchise is above
    _percentil := CASE
      WHEN _total_franchises > 0 THEN ROUND(((_total_franchises - _posicao)::numeric / _total_franchises::numeric) * 100)
      ELSE 0
    END;
  END IF;

  RETURN jsonb_build_object(
    'posicao', _posicao,
    'total', _total_franchises,
    'percentil', _percentil,
    'pontuacao_propria', ROUND(_own_score),
    'media_rede', ROUND(_network_avg_score),
    'maximo_rede', ROUND(_network_max_score),
    'taxa_conversao_propria', ROUND(_own_conv),
    'taxa_conversao_anterior', ROUND(_own_conv_prev),
    'taxa_conversao_media', ROUND(_network_avg_conv),
    'taxa_conversao_maxima', ROUND(_network_max_conv),
    'leads_30d', _own_total,
    'vendas_30d', _own_sold,
    'window_days', 30
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_franchise_benchmarks(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_franchise_benchmarks(uuid) TO authenticated;