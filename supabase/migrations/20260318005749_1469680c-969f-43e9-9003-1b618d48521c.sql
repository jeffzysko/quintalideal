ALTER TABLE public.leads ADD COLUMN lead_origin text NOT NULL DEFAULT 'quiz';

COMMENT ON COLUMN public.leads.lead_origin IS 'Origin of the lead: quiz (from platform quiz), manual (added by franchise user), referral, etc.';