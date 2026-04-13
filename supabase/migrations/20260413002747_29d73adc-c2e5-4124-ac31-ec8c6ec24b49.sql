
-- Allow franchise owners and admins to delete proposal_views for their proposals
CREATE POLICY "Users can delete views of own proposals"
ON public.proposal_views
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_views.proposal_id
    AND (
      (has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
      OR has_role(auth.uid(), 'admin_fabrica'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Allow franchise owners and admins to delete proposal_questions for their proposals
CREATE POLICY "Users can delete questions of own proposals"
ON public.proposal_questions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_questions.proposal_id
    AND (
      (has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
      OR has_role(auth.uid(), 'admin_fabrica'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);

-- Allow franchise owners and admins to delete proposal_negotiations for their proposals
CREATE POLICY "Users can delete negotiations of own proposals"
ON public.proposal_negotiations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_negotiations.proposal_id
    AND (
      (has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
      OR has_role(auth.uid(), 'admin_fabrica'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);
