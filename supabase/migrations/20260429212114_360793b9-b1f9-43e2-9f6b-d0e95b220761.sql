-- Add columns to lead_followups if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_followups' AND column_name = 'tipo') THEN
        ALTER TABLE public.lead_followups ADD COLUMN tipo TEXT DEFAULT 'manual';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lead_followups' AND column_name = 'status') THEN
        ALTER TABLE public.lead_followups ADD COLUMN status TEXT DEFAULT 'pendente';
    END IF;
END $$;

-- Update public_register_proposal_view to mark automatic follow-ups as dispensado
CREATE OR REPLACE FUNCTION public.public_register_proposal_view(_token uuid, _user_agent text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _proposal_id uuid;
  _lead_id uuid;
  _recent_view boolean;
BEGIN
  SELECT id, lead_id INTO _proposal_id, _lead_id
  FROM public.proposals WHERE public_token = _token;

  IF _proposal_id IS NULL THEN RETURN false; END IF;

  -- Check for recent view (5 min dedup)
  SELECT EXISTS(
    SELECT 1 FROM public.proposal_views
    WHERE proposal_id = _proposal_id AND viewed_at > now() - interval '5 minutes'
  ) INTO _recent_view;

  IF NOT _recent_view THEN
    INSERT INTO public.proposal_views (proposal_id, user_agent)
    VALUES (_proposal_id, _user_agent);

    -- Update status to 'visualizada' if still 'enviada'
    UPDATE public.proposals
    SET status = 'visualizada', updated_at = now()
    WHERE id = _proposal_id AND status = 'enviada';
    
    -- Cancel automatic follow-ups when proposal is opened
    IF _lead_id IS NOT NULL THEN
      UPDATE public.lead_followups
      SET status = 'dispensado'
      WHERE lead_id = _lead_id
        AND tipo = 'automatico'
        AND status = 'pendente';
    END IF;
  END IF;

  RETURN true;
END;
$function$;