
-- Performance indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_leads_cidade ON public.leads (cidade);
CREATE INDEX IF NOT EXISTS idx_leads_franquia_id ON public.leads (franquia_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_lead ON public.leads (status_lead);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_referred_by ON public.leads (referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON public.leads (telefone) WHERE telefone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_ref_code ON public.leads (ref_code) WHERE ref_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_franchises_slug_url ON public.franchises (slug_url);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
