-- Add columns to proposal_views
ALTER TABLE public.proposal_views 
ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES public.franchises(id),
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Update existing data
UPDATE public.proposal_views pv
SET 
  franchise_id = p.franchise_id,
  client_name = p.client_name
FROM public.proposals p
WHERE pv.proposal_id = p.id;

-- Create function for trigger
CREATE OR REPLACE FUNCTION public.fill_proposal_view_metadata()
RETURNS TRIGGER AS $$
BEGIN
  SELECT franchise_id, client_name INTO NEW.franchise_id, NEW.client_name
  FROM public.proposals
  WHERE id = NEW.proposal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS tr_fill_proposal_view_metadata ON public.proposal_views;
CREATE TRIGGER tr_fill_proposal_view_metadata
BEFORE INSERT ON public.proposal_views
FOR EACH ROW
EXECUTE FUNCTION public.fill_proposal_view_metadata();

-- Ensure realtime is enabled for proposal_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_views;
