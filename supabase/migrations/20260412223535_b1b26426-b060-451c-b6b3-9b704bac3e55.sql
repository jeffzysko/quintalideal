
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
    'video_url', p.video_url,
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
