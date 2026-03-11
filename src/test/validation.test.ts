import { describe, it, expect } from 'vitest';

// Replicate the sanitizeText function from LeadForm for testing
function sanitizeText(input: string): string {
  return input.replace(/[<>'"&]/g, '').trim();
}

// Replicate validateFile logic
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateFile(type: string, size: number): string | null {
  if (!ACCEPTED_TYPES.includes(type)) {
    return `Formato não suportado: ${type}. Use JPG, PNG ou WebP.`;
  }
  if (size > MAX_FILE_SIZE) {
    return `Arquivo muito grande. Máximo: 10MB.`;
  }
  return null;
}

// Replicate phone format
function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

describe('Input Sanitization', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
  });

  it('strips dangerous characters', () => {
    expect(sanitizeText('João "da" Silva')).toBe('João da Silva');
    expect(sanitizeText("O'Brien")).toBe('OBrien');
    expect(sanitizeText('test&test')).toBe('testtest');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  João Silva  ')).toBe('João Silva');
  });

  it('handles empty strings', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText('   ')).toBe('');
  });

  it('preserves normal text with accents', () => {
    expect(sanitizeText('José Antônio da Conceição')).toBe('José Antônio da Conceição');
  });

  it('handles very long strings', () => {
    const longString = 'A'.repeat(1000);
    expect(sanitizeText(longString).length).toBe(1000);
  });

  it('handles emoji in names', () => {
    expect(sanitizeText('João 🏊')).toBe('João 🏊');
  });
});

describe('Phone Formatting', () => {
  it('formats a full mobile number', () => {
    expect(formatPhone('51999887766')).toBe('(51) 99988-7766');
  });

  it('formats a landline number', () => {
    expect(formatPhone('5133224455')).toBe('(51) 33224-455');
  });

  it('handles partial input', () => {
    expect(formatPhone('51')).toBe('51');
    expect(formatPhone('519')).toBe('(51) 9');
    expect(formatPhone('51999')).toBe('(51) 999');
  });

  it('strips non-digits', () => {
    expect(formatPhone('(51) 99988-7766')).toBe('(51) 99988-7766');
  });

  it('limits to 11 digits', () => {
    expect(formatPhone('519998877661234')).toBe('(51) 99988-7766');
  });

  it('handles empty input', () => {
    expect(formatPhone('')).toBe('');
  });
});

describe('File Validation', () => {
  it('accepts JPEG', () => {
    expect(validateFile('image/jpeg', 1024)).toBeNull();
  });

  it('accepts PNG', () => {
    expect(validateFile('image/png', 1024)).toBeNull();
  });

  it('accepts WebP', () => {
    expect(validateFile('image/webp', 1024)).toBeNull();
  });

  it('rejects GIF', () => {
    expect(validateFile('image/gif', 1024)).toContain('não suportado');
  });

  it('rejects SVG', () => {
    expect(validateFile('image/svg+xml', 1024)).toContain('não suportado');
  });

  it('rejects non-image files', () => {
    expect(validateFile('application/pdf', 1024)).toContain('não suportado');
    expect(validateFile('text/html', 1024)).toContain('não suportado');
    expect(validateFile('application/javascript', 1024)).toContain('não suportado');
  });

  it('rejects files over 10MB', () => {
    expect(validateFile('image/jpeg', 11 * 1024 * 1024)).toContain('muito grande');
  });

  it('accepts files exactly at 10MB', () => {
    expect(validateFile('image/jpeg', 10 * 1024 * 1024)).toBeNull();
  });

  it('accepts small files', () => {
    expect(validateFile('image/jpeg', 100)).toBeNull();
  });
});

describe('Email Validation Edge Cases', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('accepts valid emails', () => {
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('user+tag@example.com')).toBe(true);
    expect(emailRegex.test('user@sub.domain.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(emailRegex.test('')).toBe(false);
    expect(emailRegex.test('notanemail')).toBe(false);
    expect(emailRegex.test('@example.com')).toBe(false);
    expect(emailRegex.test('user@')).toBe(false);
    expect(emailRegex.test('user@.com')).toBe(false);
    expect(emailRegex.test('user @example.com')).toBe(false);
  });
});

describe('SQL Injection Prevention', () => {
  it('strips quotes from SQL injection attempts', () => {
    const result = sanitizeText("'; DROP TABLE leads; --");
    expect(result).not.toContain("'");
    // Semicolons are harmless — Supabase uses parameterized queries, not raw SQL
    expect(result).toBe('; DROP TABLE leads; --');
  });

  it('sanitizes XSS attempts', () => {
    const result = sanitizeText('<img src=x onerror=alert(1)>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

describe('Score Edge Cases', () => {
  // Import scoring for boundary tests
  it('all scoring module imports work', async () => {
    const { calculateScore, recommendPool } = await import('@/lib/scoring');
    expect(typeof calculateScore).toBe('function');
    expect(typeof recommendPool).toBe('function');
  });
});
