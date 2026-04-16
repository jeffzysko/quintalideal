-- RPC para super_admin ler estado dos cron jobs e histórico de execuções
CREATE OR REPLACE FUNCTION public.admin_get_cron_jobs()
RETURNS TABLE(
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  last_run_started timestamptz,
  last_run_status text,
  last_run_duration interval
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.active,
    last_run.start_time AS last_run_started,
    last_run.status::text AS last_run_status,
    (last_run.end_time - last_run.start_time) AS last_run_duration
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT start_time, end_time, status
    FROM cron.job_run_details d
    WHERE d.jobid = j.jobid
    ORDER BY d.start_time DESC
    LIMIT 1
  ) last_run ON true
  WHERE j.jobname IN (
    'check-proposal-expiration',
    'check-proposal-expiration-hourly',
    'followup-reminders-daily',
    'send-monthly-franchise-report',
    'weekly-cleanup-logs',
    'cleanup-old-analytics'
  )
  ORDER BY j.jobname;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_cron_job_history(_jobname text, _limit int DEFAULT 5)
RETURNS TABLE(
  runid bigint,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  return_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    d.runid,
    d.start_time,
    d.end_time,
    d.status::text,
    d.return_message::text
  FROM cron.job_run_details d
  JOIN cron.job j ON j.jobid = d.jobid
  WHERE j.jobname = _jobname
  ORDER BY d.start_time DESC
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_cron_jobs() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_get_cron_job_history(text, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_cron_job_history(text, int) TO authenticated;