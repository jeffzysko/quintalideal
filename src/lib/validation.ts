/**
 * Shared validation helpers for phone and email (Brazilian format).
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Official Brazilian area codes (DDDs) */
const VALID_DDDS = new Set([
  '11','12','13','14','15','16','17','18','19', // SP
  '21','22','24',                                // RJ
  '27','28',                                     // ES
  '31','32','33','34','35','37','38',            // MG
  '41','42','43','44','45','46',                 // PR
  '47','48','49',                                // SC
  '51','53','54','55',                           // RS
  '61',                                          // DF
  '62','64',                                     // GO
  '63',                                          // TO
  '65','66',                                     // MT
  '67',                                          // MS
  '68',                                          // AC
  '69',                                          // RO
  '71','73','74','75','77',                      // BA
  '79',                                          // SE
  '81','82',                                     // PE / AL
  '83',                                          // PB
  '84',                                          // RN
  '85','88',                                     // CE
  '86','89',                                     // PI
  '87',                                          // PE (interior)
  '91','93','94',                                // PA
  '92','97',                                     // AM
  '95',                                          // RR
  '96',                                          // AP
  '98','99',                                     // MA
]);

/** Validate Brazilian phone: 10 or 11 digits with valid DDD (supports fixo and celular) */
export function isValidBRPhone(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 10 || clean.length > 11) return false;
  const ddd = clean.slice(0, 2);
  return VALID_DDDS.has(ddd);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return EMAIL_REGEX.test(trimmed) && trimmed.length <= 255;
}

/** Format digits as (XX) XXXXX-XXXX, stripping country code 55 */
export function formatPhoneBR(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Parse formatted phone to raw local digits (without 55) */
export function unformatPhone(masked: string): string {
  return masked.replace(/\D/g, '').slice(0, 11);
}
