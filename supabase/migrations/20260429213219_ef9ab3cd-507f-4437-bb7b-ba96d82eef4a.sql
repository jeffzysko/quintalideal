-- Create table for tracking proposal section views
CREATE TABLE public.proposal_section_views (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_section_views ENABLE ROW LEVEL SECURITY;

-- Allow public insertion (to track client views without auth)
CREATE POLICY "Allow public insert for proposal section views"
ON public.proposal_section_views
FOR INSERT
WITH CHECK (true);

-- Allow franchise users to view their own proposal section analytics
CREATE POLICY "Franchise users can view section views for their proposals"
ON public.proposal_section_views
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.proposals p
        JOIN public.profiles prof ON p.franchise_id = prof.franquia_id
        WHERE p.id = proposal_section_views.proposal_id
        AND prof.user_id = auth.uid()
    )
    OR
    (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') AND public.has_role(auth.uid(), 'super_admin'::app_role))
);

-- Add index for performance
CREATE INDEX idx_proposal_section_views_proposal_id ON public.proposal_section_views(proposal_id);
