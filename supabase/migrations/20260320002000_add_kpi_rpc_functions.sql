-- Migration: RPC functions for KPI aggregation (eliminates waterfall loops)

-- ── Admin KPI stats ──────────────────────────────────────────────────────────
-- Replaces the N×1000-row waterfall loop in AdminDashboard.tsx
-- Returns aggregated KPIs in a single query.
-- p_franchise_id: optional — filter to a specific franchise (org switcher)
-- p_since: optional — filter to leads created after this timestamp
CREATE OR REPLACE FUNCTION get_admin_kpi_stats(
  p_franchise_id UUID DEFAULT NULL,
  p_since        TIMESTAMPTZ DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total',          COUNT(*),
    'by_status',      (
      SELECT json_object_agg(status_lead, cnt)
      FROM (
        SELECT status_lead, COUNT(*) AS cnt
        FROM leads l2
        WHERE (p_franchise_id IS NULL OR l2.franquia_id = p_franchise_id)
          AND (p_since IS NULL OR l2.created_at >= p_since)
        GROUP BY status_lead
      ) s
    ),
    'by_model',       (
      SELECT json_object_agg(modelo_recomendado, cnt)
      FROM (
        SELECT modelo_recomendado, COUNT(*) AS cnt
        FROM leads l2
        WHERE modelo_recomendado IS NOT NULL
          AND (p_franchise_id IS NULL OR l2.franquia_id = p_franchise_id)
          AND (p_since IS NULL OR l2.created_at >= p_since)
        GROUP BY modelo_recomendado
      ) m
    ),
    'by_city',        (
      SELECT json_agg(json_build_object('cidade', cidade, 'count', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT cidade, COUNT(*) AS cnt
        FROM leads l2
        WHERE cidade IS NOT NULL
          AND (p_franchise_id IS NULL OR l2.franquia_id = p_franchise_id)
          AND (p_since IS NULL OR l2.created_at >= p_since)
        GROUP BY cidade
        ORDER BY cnt DESC
        LIMIT 20
      ) c
    ),
    'leads_per_month', (
      SELECT json_agg(json_build_object('month', month_key, 'count', cnt) ORDER BY month_key)
      FROM (
        SELECT to_char(created_at, 'YYYY-MM') AS month_key, COUNT(*) AS cnt
        FROM leads l2
        WHERE (p_franchise_id IS NULL OR l2.franquia_id = p_franchise_id)
        GROUP BY month_key
      ) mp
    ),
    'avg_score',      ROUND(AVG(pontuacao_quintal)::NUMERIC, 0),
    'referral_count', COUNT(*) FILTER (WHERE referred_by IS NOT NULL),
    'new_count',      COUNT(*) FILTER (WHERE status_lead = 'novo'),
    'city_count',     COUNT(DISTINCT cidade) FILTER (WHERE cidade IS NOT NULL)
  )
  INTO result
  FROM leads l
  WHERE (p_franchise_id IS NULL OR l.franquia_id = p_franchise_id)
    AND (p_since IS NULL OR l.created_at >= p_since);

  RETURN result;
END;
$$;

-- ── Franchise KPI stats ──────────────────────────────────────────────────────
-- Replaces the N×1000-row waterfall loop in FranchiseDashboard.tsx
-- p_franchise_id: required
-- p_since: optional
CREATE OR REPLACE FUNCTION get_franchise_kpi_stats(
  p_franchise_id UUID,
  p_since        TIMESTAMPTZ DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total',           COUNT(*),
    'by_status',       (
      SELECT json_object_agg(status_lead, cnt)
      FROM (
        SELECT status_lead, COUNT(*) AS cnt
        FROM leads l2
        WHERE l2.franquia_id = p_franchise_id
          AND (p_since IS NULL OR l2.created_at >= p_since)
        GROUP BY status_lead
      ) s
    ),
    'new_count',       COUNT(*) FILTER (WHERE status_lead = 'novo'),
    'negotiating',     COUNT(*) FILTER (WHERE status_lead = 'em_negociacao'),
    'sold',            COUNT(*) FILTER (WHERE status_lead = 'vendido'),
    'referral_count',  COUNT(*) FILTER (WHERE referred_by IS NOT NULL),
    'sold_this_month', (
      SELECT COUNT(*)
      FROM leads l2
      WHERE l2.franquia_id = p_franchise_id
        AND l2.status_lead = 'vendido'
        AND date_trunc('month', l2.created_at) = date_trunc('month', NOW())
    ),
    'overdue_count',   (
      SELECT COUNT(*)
      FROM leads l2
      WHERE l2.franquia_id = p_franchise_id
        AND l2.status_lead = 'novo'
        AND l2.created_at < NOW() - INTERVAL '48 hours'
    )
  )
  INTO result
  FROM leads l
  WHERE l.franquia_id = p_franchise_id
    AND (p_since IS NULL OR l.created_at >= p_since);

  RETURN result;
END;
$$;

-- Grant execute to authenticated and anon roles
GRANT EXECUTE ON FUNCTION get_admin_kpi_stats(UUID, TIMESTAMPTZ) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_franchise_kpi_stats(UUID, TIMESTAMPTZ) TO authenticated, anon;
