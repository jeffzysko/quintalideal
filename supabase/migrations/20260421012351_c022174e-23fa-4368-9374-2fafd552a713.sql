-- =====================================================
-- Cleanup: Remove all admin_fabrica references from RLS policies and functions
-- Replace with super_admin only
-- =====================================================

-- ANALYTICS_EVENTS
DROP POLICY IF EXISTS "Admins can read all events" ON public.analytics_events;
CREATE POLICY "Admins can read all events" ON public.analytics_events
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Service can delete old events" ON public.analytics_events;
CREATE POLICY "Service can delete old events" ON public.analytics_events
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ERROR_LOGS
DROP POLICY IF EXISTS "Admins can read error logs" ON public.error_logs;
CREATE POLICY "Admins can read error logs" ON public.error_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update error logs" ON public.error_logs;
CREATE POLICY "Admins can update error logs" ON public.error_logs
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- FRANCHISE_APPLICATIONS
DROP POLICY IF EXISTS "Admins can read franchise applications" ON public.franchise_applications;
CREATE POLICY "Admins can read franchise applications" ON public.franchise_applications
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update franchise applications" ON public.franchise_applications;
CREATE POLICY "Admins can update franchise applications" ON public.franchise_applications
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- FRANCHISE_COVERED_CITIES
DROP POLICY IF EXISTS "Admins can delete covered cities" ON public.franchise_covered_cities;
CREATE POLICY "Admins can delete covered cities" ON public.franchise_covered_cities
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage covered cities" ON public.franchise_covered_cities;
CREATE POLICY "Admins can manage covered cities" ON public.franchise_covered_cities
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update covered cities" ON public.franchise_covered_cities;
CREATE POLICY "Admins can update covered cities" ON public.franchise_covered_cities
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- FRANCHISE_GOALS
DROP POLICY IF EXISTS "Admins can read all goals" ON public.franchise_goals;
CREATE POLICY "Admins can read all goals" ON public.franchise_goals
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- FRANCHISES
DROP POLICY IF EXISTS "Admins can delete franchises" ON public.franchises;
CREATE POLICY "Admins can delete franchises" ON public.franchises
  FOR DELETE USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert franchises" ON public.franchises;
CREATE POLICY "Admins can insert franchises" ON public.franchises
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can read all franchises" ON public.franchises;
CREATE POLICY "Admins can read all franchises" ON public.franchises
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update franchises" ON public.franchises;
CREATE POLICY "Admins can update franchises" ON public.franchises
  FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role));

-- LEAD_ACTIVITIES
DROP POLICY IF EXISTS "Admins can insert lead activities" ON public.lead_activities;
CREATE POLICY "Admins can insert lead activities" ON public.lead_activities
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all lead activities" ON public.lead_activities;
CREATE POLICY "Admins can read all lead activities" ON public.lead_activities
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- LEAD_FOLLOWUPS
DROP POLICY IF EXISTS "Admins can read all followups" ON public.lead_followups;
CREATE POLICY "Admins can read all followups" ON public.lead_followups
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- LEAD_TAGS
DROP POLICY IF EXISTS "Franchise can delete own tags" ON public.lead_tags;
CREATE POLICY "Franchise can delete own tags" ON public.lead_tags
  FOR DELETE USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can insert own tags" ON public.lead_tags;
CREATE POLICY "Franchise can insert own tags" ON public.lead_tags
  FOR INSERT WITH CHECK (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can read own tags" ON public.lead_tags;
CREATE POLICY "Franchise can read own tags" ON public.lead_tags
  FOR SELECT USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can update own tags" ON public.lead_tags;
CREATE POLICY "Franchise can update own tags" ON public.lead_tags
  FOR UPDATE USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- LEAD_TAG_ASSIGNMENTS
DROP POLICY IF EXISTS "Franchise can delete own tag assignments" ON public.lead_tag_assignments;
CREATE POLICY "Franchise can delete own tag assignments" ON public.lead_tag_assignments
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = lead_tag_assignments.lead_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND l.franquia_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Franchise can insert own tag assignments" ON public.lead_tag_assignments;
CREATE POLICY "Franchise can insert own tag assignments" ON public.lead_tag_assignments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = lead_tag_assignments.lead_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND l.franquia_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Franchise can read own tag assignments" ON public.lead_tag_assignments;
CREATE POLICY "Franchise can read own tag assignments" ON public.lead_tag_assignments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = lead_tag_assignments.lead_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND l.franquia_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

-- LEADS
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;
CREATE POLICY "Admins can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can read all leads" ON public.leads;
CREATE POLICY "Admins can read all leads" ON public.leads
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all leads" ON public.leads;
CREATE POLICY "Admins can update all leads" ON public.leads
  FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role));

-- NOTIFICATION_PREFERENCES
DROP POLICY IF EXISTS "Admins can read all notification prefs" ON public.notification_preferences;
CREATE POLICY "Admins can read all notification prefs" ON public.notification_preferences
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Admins can read all notifications" ON public.notifications;
CREATE POLICY "Admins can read all notifications" ON public.notifications
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all notifications" ON public.notifications;
CREATE POLICY "Admins can update all notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'franquia'::app_role));

-- POOL_MODELS
DROP POLICY IF EXISTS "Admins can insert pool models" ON public.pool_models;
CREATE POLICY "Admins can insert pool models" ON public.pool_models
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update pool models" ON public.pool_models;
CREATE POLICY "Admins can update pool models" ON public.pool_models
  FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role));

-- POST_SALE_CHECKLIST
DROP POLICY IF EXISTS "Franchise access post_sale_checklist" ON public.post_sale_checklist;
CREATE POLICY "Franchise access post_sale_checklist" ON public.post_sale_checklist
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM post_sale_projects p
    WHERE p.id = post_sale_checklist.project_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM post_sale_projects p
    WHERE p.id = post_sale_checklist.project_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

-- POST_SALE_CHECKLIST_TEMPLATES
DROP POLICY IF EXISTS "Franchise can delete own checklist templates" ON public.post_sale_checklist_templates;
CREATE POLICY "Franchise can delete own checklist templates" ON public.post_sale_checklist_templates
  FOR DELETE TO authenticated USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can insert own checklist templates" ON public.post_sale_checklist_templates;
CREATE POLICY "Franchise can insert own checklist templates" ON public.post_sale_checklist_templates
  FOR INSERT TO authenticated WITH CHECK (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can read own checklist templates" ON public.post_sale_checklist_templates;
CREATE POLICY "Franchise can read own checklist templates" ON public.post_sale_checklist_templates
  FOR SELECT TO authenticated USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can update own checklist templates" ON public.post_sale_checklist_templates;
CREATE POLICY "Franchise can update own checklist templates" ON public.post_sale_checklist_templates
  FOR UPDATE TO authenticated USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- POST_SALE_PROJECTS
DROP POLICY IF EXISTS "Franchise can delete own post sale projects" ON public.post_sale_projects;
CREATE POLICY "Franchise can delete own post sale projects" ON public.post_sale_projects
  FOR DELETE TO authenticated USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can insert own post sale projects" ON public.post_sale_projects;
CREATE POLICY "Franchise can insert own post sale projects" ON public.post_sale_projects
  FOR INSERT TO authenticated WITH CHECK (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can read own post sale projects" ON public.post_sale_projects;
CREATE POLICY "Franchise can read own post sale projects" ON public.post_sale_projects
  FOR SELECT TO authenticated USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Franchise can update own post sale projects" ON public.post_sale_projects;
CREATE POLICY "Franchise can update own post sale projects" ON public.post_sale_projects
  FOR UPDATE TO authenticated USING (
    (has_role(auth.uid(), 'franquia'::app_role) AND franchise_id = get_user_franquia_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- POST_SALE_REVIEWS
DROP POLICY IF EXISTS "Franchise read own reviews" ON public.post_sale_reviews;
CREATE POLICY "Franchise read own reviews" ON public.post_sale_reviews
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM post_sale_projects p
    WHERE p.id = post_sale_reviews.project_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

-- PROFILES
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'super_admin'::app_role));

-- PROPOSAL_ATTACHMENTS
DROP POLICY IF EXISTS "Authenticated users can read own proposal attachments" ON public.proposal_attachments;
CREATE POLICY "Authenticated users can read own proposal attachments" ON public.proposal_attachments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_attachments.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Users can delete attachments of own proposals" ON public.proposal_attachments;
CREATE POLICY "Users can delete attachments of own proposals" ON public.proposal_attachments
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_attachments.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Users can insert attachments to own proposals" ON public.proposal_attachments;
CREATE POLICY "Users can insert attachments to own proposals" ON public.proposal_attachments
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_attachments.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

-- PROPOSAL_ITEMS
DROP POLICY IF EXISTS "Users can delete items of own proposals" ON public.proposal_items;
CREATE POLICY "Users can delete items of own proposals" ON public.proposal_items
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_items.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Users can insert items to own proposals" ON public.proposal_items;
CREATE POLICY "Users can insert items to own proposals" ON public.proposal_items
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_items.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Users can read items of accessible proposals" ON public.proposal_items;
CREATE POLICY "Users can read items of accessible proposals" ON public.proposal_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_items.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Users can update items of own proposals" ON public.proposal_items;
CREATE POLICY "Users can update items of own proposals" ON public.proposal_items
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_items.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

-- PROPOSAL_NEGOTIATIONS
DROP POLICY IF EXISTS "Franchise can read own proposal negotiations" ON public.proposal_negotiations;
CREATE POLICY "Franchise can read own proposal negotiations" ON public.proposal_negotiations
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_negotiations.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Franchise can update own proposal negotiations" ON public.proposal_negotiations;
CREATE POLICY "Franchise can update own proposal negotiations" ON public.proposal_negotiations
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_negotiations.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

DROP POLICY IF EXISTS "Users can delete negotiations of own proposals" ON public.proposal_negotiations;
CREATE POLICY "Users can delete negotiations of own proposals" ON public.proposal_negotiations
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_negotiations.proposal_id
      AND ((has_role(auth.uid(), 'franquia'::app_role) AND p.franchise_id = get_user_franquia_id(auth.uid()))
           OR has_role(auth.uid(), 'super_admin'::app_role))
  ));

-- =====================================================
-- FUNCTIONS: remove admin_fabrica references
-- =====================================================

CREATE OR REPLACE FUNCTION public.protect_franquia_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.franquia_id IS DISTINCT FROM NEW.franquia_id THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'You are not allowed to change franquia_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_whatsapp_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.whatsapp_plan_active = true
     AND NEW.whatsapp_plan_expires_at IS NOT NULL
     AND NEW.whatsapp_plan_expires_at < now() THEN
    NEW.whatsapp_plan_active := false;
    NEW.whatsapp_mode := 'platform';
    NEW.zapi_instance_active := false;
  END IF;

  IF OLD.whatsapp_plan_active = true AND NEW.whatsapp_plan_active = false THEN
    NEW.whatsapp_mode := 'platform';
  END IF;

  IF OLD.whatsapp_plan_active IS DISTINCT FROM NEW.whatsapp_plan_active THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      NEW.whatsapp_plan_active := OLD.whatsapp_plan_active;
    END IF;
  END IF;

  IF NEW.whatsapp_mode = 'own' AND NEW.whatsapp_plan_active = false THEN
    NEW.whatsapp_mode := 'platform';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_orcamento_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.whatsapp_plan_active = true THEN
    NEW.orcamento_plan_active := true;
  END IF;

  IF OLD.orcamento_plan_active IS DISTINCT FROM NEW.orcamento_plan_active THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      IF NEW.whatsapp_plan_active = false OR NEW.whatsapp_plan_active = OLD.whatsapp_plan_active THEN
        NEW.orcamento_plan_active := OLD.orcamento_plan_active;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_webhook_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT has_role(auth.uid(), 'super_admin'::app_role)
  THEN
    NEW.webhook_url := OLD.webhook_url;
    NEW.webhook_secret := OLD.webhook_secret;
  END IF;
  RETURN NEW;
END;
$function$;