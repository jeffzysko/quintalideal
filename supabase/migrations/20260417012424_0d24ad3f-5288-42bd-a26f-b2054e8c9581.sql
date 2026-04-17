-- Reviews table
CREATE TABLE IF NOT EXISTS public.post_sale_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.post_sale_projects(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT NULL,
  would_recommend boolean DEFAULT NULL,
  submitted_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_sale_reviews_project ON public.post_sale_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_post_sale_reviews_token ON public.post_sale_reviews(token);

ALTER TABLE public.post_sale_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read review by token" ON public.post_sale_reviews;
CREATE POLICY "Public read review by token"
ON public.post_sale_reviews FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public submit review" ON public.post_sale_reviews;
CREATE POLICY "Public submit review"
ON public.post_sale_reviews FOR UPDATE
TO anon, authenticated
USING (submitted_at IS NULL)
WITH CHECK (true);

DROP POLICY IF EXISTS "Franchise read own reviews" ON public.post_sale_reviews;
CREATE POLICY "Franchise read own reviews"
ON public.post_sale_reviews FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.post_sale_projects p
    WHERE p.id = post_sale_reviews.project_id
    AND (
      (public.has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = public.get_user_franquia_id(auth.uid()))
      OR public.has_role(auth.uid(), 'admin_fabrica'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Extend post_sale_projects
ALTER TABLE public.post_sale_projects
  ADD COLUMN IF NOT EXISTS followup_30_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_90_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_token text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS would_recommend boolean DEFAULT NULL;

-- RPC for public review submission
CREATE OR REPLACE FUNCTION public.submit_post_sale_review(
  _token text,
  _rating integer,
  _note text DEFAULT NULL,
  _recommend boolean DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_id uuid;
BEGIN
  SELECT project_id INTO _project_id FROM public.post_sale_reviews WHERE token = _token AND submitted_at IS NULL;
  IF _project_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.post_sale_reviews SET
    rating = _rating,
    comment = _note,
    would_recommend = _recommend,
    submitted_at = now()
  WHERE token = _token AND submitted_at IS NULL;

  UPDATE public.post_sale_projects SET
    satisfaction_rating = _rating,
    satisfaction_note = COALESCE(_note, satisfaction_note),
    would_recommend = _recommend,
    updated_at = now()
  WHERE id = _project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_post_sale_review(text, integer, text, boolean) TO anon, authenticated;