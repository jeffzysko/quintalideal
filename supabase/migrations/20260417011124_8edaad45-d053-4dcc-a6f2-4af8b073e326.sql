-- Add real sale value column to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS valor_venda numeric;

COMMENT ON COLUMN public.leads.valor_venda IS 'Real sale value when the lead is closed (status_lead = vendido) or when a linked proposal is accepted. Source of truth for revenue, replacing budget estimates.';

-- Trigger: when a proposal becomes "aceita" and is linked to a lead,
-- automatically set lead.valor_venda from proposal.total (server-side validated source of truth).
CREATE OR REPLACE FUNCTION public.sync_lead_value_from_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- When a proposal is accepted, copy its total to the linked lead as the real sale value.
  IF NEW.status = 'aceita' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.total IS DISTINCT FROM NEW.total) THEN
    UPDATE public.leads
    SET valor_venda = NEW.total,
        updated_at = now()
    WHERE id = NEW.lead_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_value_from_proposal ON public.proposals;
CREATE TRIGGER trg_sync_lead_value_from_proposal
AFTER INSERT OR UPDATE OF status, total, lead_id ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.sync_lead_value_from_proposal();

-- Backfill: any already-accepted proposals push their total to their linked lead
UPDATE public.leads l
SET valor_venda = p.total
FROM public.proposals p
WHERE p.lead_id = l.id
  AND p.status = 'aceita'
  AND l.valor_venda IS NULL;