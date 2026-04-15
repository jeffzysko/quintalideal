
CREATE OR REPLACE FUNCTION public.public_accept_proposal(_token uuid, _name text, _user_agent text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _proposal_id uuid;
  _status proposal_status;
  _franchise_id uuid;
BEGIN
  SELECT id, status, franchise_id INTO _proposal_id, _status, _franchise_id
  FROM public.proposals WHERE public_token = _token;

  IF _proposal_id IS NULL THEN RETURN false; END IF;
  IF _status IN ('aceita', 'recusada') THEN RETURN false; END IF;

  UPDATE public.proposals
  SET status = 'aceita', accepted_at = now(), accepted_by_name = _name, updated_at = now()
  WHERE id = _proposal_id;

  -- Log usage event
  INSERT INTO public.usage_logs (franchise_id, event_type, metadata)
  VALUES (_franchise_id, 'orcamento_accepted', jsonb_build_object('proposal_id', _proposal_id));

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.public_refuse_proposal(_token uuid, _reason text, _user_agent text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _proposal_id uuid;
  _status proposal_status;
  _franchise_id uuid;
BEGIN
  SELECT id, status, franchise_id INTO _proposal_id, _status, _franchise_id
  FROM public.proposals WHERE public_token = _token;

  IF _proposal_id IS NULL THEN RETURN false; END IF;
  IF _status IN ('aceita', 'recusada') THEN RETURN false; END IF;

  UPDATE public.proposals
  SET status = 'recusada', refused_at = now(), refused_reason = _reason, updated_at = now()
  WHERE id = _proposal_id;

  -- Log usage event
  INSERT INTO public.usage_logs (franchise_id, event_type, metadata)
  VALUES (_franchise_id, 'orcamento_rejected', jsonb_build_object('proposal_id', _proposal_id, 'reason', _reason));

  RETURN true;
END;
$$;
