/**
 * Maps notification table `type` values to notification_preferences keys.
 * Used to filter in-app notifications based on user preferences.
 */
export const NOTIFICATION_TYPE_TO_PREF_KEY: Record<string, string> = {
  new_lead: 'new_lead_assigned',
  followup: 'followup_overdue',
  followup_reminder: 'followup_reminder',
  status_change: 'stage_changed',
  alert: 'inactive_lead_alert',
  system: 'system_update',
  announcement: 'announcement',
};

/**
 * Given a notification type from the DB, returns the corresponding preference key.
 * Returns null if no mapping exists (notification should always be shown).
 */
export function getPrefKeyForType(type: string): string | null {
  return NOTIFICATION_TYPE_TO_PREF_KEY[type] ?? null;
}
