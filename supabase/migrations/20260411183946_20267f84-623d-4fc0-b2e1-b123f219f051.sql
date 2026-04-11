
-- Fix the security definer view warning
ALTER VIEW public.franchise_safe SET (security_invoker = on);
