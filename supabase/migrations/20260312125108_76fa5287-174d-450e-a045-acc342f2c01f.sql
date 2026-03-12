-- Make public franchise landing view readable for anonymous visitors
-- by running with view owner privileges instead of caller RLS context.
ALTER VIEW public.franchises_public SET (security_invoker = off);

-- Ensure public clients can query the safe public view
GRANT SELECT ON TABLE public.franchises_public TO anon, authenticated;