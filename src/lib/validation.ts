/**
 * Shared validation helpers for phone and email (Brazilian format).
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Validate Brazilian phone: 10 or 11 digits (DDD + number) */
export function isValidBRPhone(digits: string): boolean {
  const clean = digits.replace(/\D/g, '');
  return clean.length >= 10 && clean.length <= 11;
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
  // Strip 55 country code
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
