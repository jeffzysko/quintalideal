import { supabase } from '@/lib/supabase';

// Generate a unique session ID per browser session
function getSessionId(): string {
  let sid = sessionStorage.getItem('splash_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem('splash_session_id', sid);
  }
  return sid;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
  };
}

export type AnalyticsEvent =
  | 'landing_page_viewed'
  | 'quiz_started'
  | 'photo_uploaded'
  | 'quiz_question_answered'
  | 'quiz_completed'
  | 'result_viewed'
  | 'result_shared'
  | 'lead_created'
  | 'whatsapp_clicked';

export async function trackEvent(
  eventName: AnalyticsEvent,
  options?: {
    franchiseId?: string | null;
    city?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    const utm = getUtmParams();
    await supabase.from('analytics_events').insert({
      session_id: getSessionId(),
      event_name: eventName,
      franchise_id: options?.franchiseId || null,
      city: options?.city || null,
      device_type: getDeviceType(),
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      metadata: options?.metadata || {},
    });
  } catch {
    // Analytics should never break the user experience
  }
}
