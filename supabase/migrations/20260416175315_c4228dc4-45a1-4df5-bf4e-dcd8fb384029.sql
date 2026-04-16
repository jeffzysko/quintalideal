CREATE OR REPLACE FUNCTION public.admin_get_cron_jobs()
 RETURNS TABLE(jobid bigint, jobname text, schedule text, active boolean, last_run_started timestamp with time zone, last_run_status text, last_run_duration interval)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
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
    'cleanup-old-analytics',
    'send-daily-summary'
  )
  ORDER BY j.jobname;
END;
$function$;