/**
 * Formats a Brazilian phone number for WhatsApp links (wa.me).
 * Always prepends country code 55, handling the ambiguity with DDD 55
 * (e.g. Santa Maria, Santa Rosa) where phones already start with "55".
 *
 * Phones in the database are stored WITHOUT the country code prefix.
 * Example: "54993608000" → "5554993608000"
 */
export function toWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Always add country code — phones in DB never include it
  return `55${digits}`;
}
