
-- Notifications table for franchise alerts
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'new_lead',
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Franchise can read own notifications
CREATE POLICY "Franchise can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid())
  );

-- Franchise can update own notifications (mark as read)
CREATE POLICY "Franchise can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid())
  );

-- Admins can read all notifications
CREATE POLICY "Admins can read all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Admins can update all notifications
CREATE POLICY "Admins can update all notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin_fabrica'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Service role inserts (from edge function) bypass RLS, but add policy for completeness
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for quick lookups
CREATE INDEX idx_notifications_franchise_read ON public.notifications (franchise_id, read, created_at DESC);
