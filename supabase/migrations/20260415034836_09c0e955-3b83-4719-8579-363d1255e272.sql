
CREATE OR REPLACE FUNCTION public.has_orcamento_access(_franchise_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.franchises
    WHERE id = _franchise_id
      AND (
        orcamento_plan_active = true
        OR whatsapp_plan_active = true
        OR orcamento_stripe_subscription_status = 'trialing'
      )
  )
$$;
