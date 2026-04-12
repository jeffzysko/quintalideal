
-- Remove overly permissive anon UPDATE policy
DROP POLICY IF EXISTS "Public can update proposal status via token" ON public.proposals;

-- Remove overly permissive anon SELECT policy (will use function instead)
DROP POLICY IF EXISTS "Public can read proposal by token" ON public.proposals;

-- Function to get proposal by public token (security definer bypasses RLS)
CREATE OR REPLACE FUNCTION public.public_get_proposal_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'public_token', p.public_token,
    'client_name', p.client_name,
    'client_document', p.client_document,
    'client_phone', p.client_phone,
    'client_email', p.client_email,
    'client_address', p.client_address,
    'client_contact_name', p.client_contact_name,
    'person_type', p.person_type,
    'status', p.status,
    'subtotal', p.subtotal,
    'total', p.total,
    'global_discount', p.global_discount,
    'global_discount_type', p.global_discount_type,
    'payment_method', p.payment_method,
    'payment_conditions', p.payment_conditions,
    'delivery_deadline', p.delivery_deadline,
    'validity_date', p.validity_date,
    'observations', p.observations,
    'created_at', p.created_at,
    'accepted_at', p.accepted_at,
    'accepted_by_name', p.accepted_by_name,
    'refused_at', p.refused_at,
    'refused_reason', p.refused_reason,
    'franchise_id', p.franchise_id,
    'items', (
      SELECT coalesce(jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'product_name', pi.product_name,
          'description', pi.description,
          'quantity', pi.quantity,
          'unit_price', pi.unit_price,
          'discount', pi.discount,
          'subtotal', pi.subtotal,
          'sort_order', pi.sort_order
        ) ORDER BY pi.sort_order
      ), '[]'::jsonb)
      FROM public.proposal_items pi WHERE pi.proposal_id = p.id
    ),
    'franchise', (
      SELECT jsonb_build_object(
        'nome_franquia', f.nome_franquia,
        'whatsapp', f.whatsapp,
        'email', f.email,
        'cidade_base', f.cidade_base
      )
      FROM public.franchises f WHERE f.id = p.franchise_id
    ),
    'seller', (
      SELECT jsonb_build_object(
        'full_name', pr.full_name,
        'avatar_url', pr.avatar_url,
        'telefone', pr.telefone
      )
      FROM public.profiles pr WHERE pr.user_id = p.created_by
    )
  ) INTO result
  FROM public.proposals p
  WHERE p.public_token = _token;

  RETURN result;
END;
$$;

-- Function to accept proposal by token
CREATE OR REPLACE FUNCTION public.public_accept_proposal(_token uuid, _name text, _user_agent text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proposal_id uuid;
  _status proposal_status;
BEGIN
  SELECT id, status INTO _proposal_id, _status
  FROM public.proposals WHERE public_token = _token;

  IF _proposal_id IS NULL THEN RETURN false; END IF;
  IF _status IN ('aceita', 'recusada') THEN RETURN false; END IF;

  UPDATE public.proposals
  SET status = 'aceita', accepted_at = now(), accepted_by_name = _name, updated_at = now()
  WHERE id = _proposal_id;

  RETURN true;
END;
$$;

-- Function to refuse proposal by token
CREATE OR REPLACE FUNCTION public.public_refuse_proposal(_token uuid, _reason text, _user_agent text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proposal_id uuid;
  _status proposal_status;
BEGIN
  SELECT id, status INTO _proposal_id, _status
  FROM public.proposals WHERE public_token = _token;

  IF _proposal_id IS NULL THEN RETURN false; END IF;
  IF _status IN ('aceita', 'recusada') THEN RETURN false; END IF;

  UPDATE public.proposals
  SET status = 'recusada', refused_at = now(), refused_reason = _reason, updated_at = now()
  WHERE id = _proposal_id;

  RETURN true;
END;
$$;

-- Function to register proposal view (with 5-min dedup)
CREATE OR REPLACE FUNCTION public.public_register_proposal_view(_token uuid, _user_agent text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proposal_id uuid;
  _recent_view boolean;
BEGIN
  SELECT id INTO _proposal_id
  FROM public.proposals WHERE public_token = _token;

  IF _proposal_id IS NULL THEN RETURN false; END IF;

  -- Check for recent view (5 min dedup)
  SELECT EXISTS(
    SELECT 1 FROM public.proposal_views
    WHERE proposal_id = _proposal_id AND viewed_at > now() - interval '5 minutes'
  ) INTO _recent_view;

  IF _recent_view THEN RETURN false; END IF;

  INSERT INTO public.proposal_views (proposal_id, user_agent)
  VALUES (_proposal_id, _user_agent);

  -- Update status to 'visualizada' if still 'enviada'
  UPDATE public.proposals
  SET status = 'visualizada', updated_at = now()
  WHERE id = _proposal_id AND status = 'enviada';

  RETURN true;
END;
$$;

-- Function to submit a question
CREATE OR REPLACE FUNCTION public.public_ask_proposal_question(_token uuid, _question text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _proposal_id uuid;
BEGIN
  SELECT id INTO _proposal_id
  FROM public.proposals WHERE public_token = _token;

  IF _proposal_id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.proposal_questions (proposal_id, question)
  VALUES (_proposal_id, _question);

  RETURN true;
END;
$$;

-- Remove the overly permissive anon INSERT policies (use functions instead)
DROP POLICY IF EXISTS "Anyone can insert proposal views" ON public.proposal_views;
DROP POLICY IF EXISTS "Anyone can insert proposal questions" ON public.proposal_questions;

-- Grant anon access to call these functions
GRANT EXECUTE ON FUNCTION public.public_get_proposal_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.public_accept_proposal(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_refuse_proposal(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_register_proposal_view(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.public_ask_proposal_question(uuid, text) TO anon;
