-- Ativar pg_cron se disponível (geralmente gerido pelo painel Supabase, mas registramos aqui a intenção)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Estas configurações são preferencialmente feitas via config.toml ou painel do Supabase.
-- Como estamos em um ambiente de migração SQL puro, registramos o desejo de agendamento:

/*
SELECT cron.schedule('send-daily-summary', '0 7 * * *', 'SELECT net.http_post(url := ''' || (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-daily-summary'', headers := ''{"Content-Type": "application/json", "Authorization": "Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY') || '"}'', body := ''{}'')');

SELECT cron.schedule('followup-reminders', '0 9 * * 1-5', 'SELECT net.http_post(url := ''' || (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/followup-reminders'', headers := ''{"Content-Type": "application/json", "Authorization": "Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY') || '"}'', body := ''{}'')');

SELECT cron.schedule('send-monthly-report', '0 8 1 * *', 'SELECT net.http_post(url := ''' || (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-monthly-report'', headers := ''{"Content-Type": "application/json", "Authorization": "Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY') || '"}'', body := ''{}'')');
*/

-- Garantir colunas de controle se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_followup_reminder_at') THEN
    ALTER TABLE public.leads ADD COLUMN last_followup_reminder_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
