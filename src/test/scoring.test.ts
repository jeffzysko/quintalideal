import { describe, it, expect } from 'vitest';
import { calculateScore, recommendPool, type QuizAnswers } from '@/lib/scoring';

const base = (overrides: Partial<QuizAnswers> = {}): QuizAnswers => ({
  espaco: 'mais-7',
  moradia: 'minha',
  intencao: '2026',
  uso: 'familia-grande',
  preferencia: 'prainha',
  orcamento: '30-50',
  cidade: 'Porto Alegre',
  ...overrides,
});

describe('calculateScore', () => {
  it('returns max score for best answers', () => {
    expect(calculateScore(base({ orcamento: 'acima-80' }))).toBe(100);
  });

  it('returns min score for lowest answers', () => {
    const answers = base({
      espaco: 'ate-3', moradia: 'planejando', intencao: 'pesquisando',
      uso: 'casal', preferencia: 'simples', orcamento: 'ate-30', cidade: 'Bagé',
    });
    expect(calculateScore(answers)).toBe(34);
  });

  it('handles mid-range answers', () => {
    const answers = base({
      espaco: '3-5', moradia: 'construindo', intencao: '2026-2027',
      uso: 'familia-pequena', preferencia: 'spa', orcamento: '30-50',
    });
    const score = calculateScore(answers);
    expect(score).toBeGreaterThan(34);
    expect(score).toBeLessThan(100);
  });

  it('handles unknown values gracefully (returns 0 for unmatched)', () => {
    const answers = base({
      espaco: 'invalid', moradia: 'invalid', intencao: 'invalid',
      uso: 'invalid', preferencia: 'invalid', orcamento: 'invalid',
    });
    expect(calculateScore(answers)).toBe(0);
  });
});

describe('recommendPool', () => {
  it('recommends Tortuga for large space with prainha', () => {
    expect(recommendPool(base())).toBe('Tortuga');
  });

  it('recommends Tortuga for small space with prainha', () => {
    expect(recommendPool(base({ espaco: 'ate-3' }))).toBe('Tortuga');
  });

  it('recommends Navagio for small space with spa', () => {
    expect(recommendPool(base({ espaco: '3-5', preferencia: 'spa', uso: 'casal' }))).toBe('Navagio');
  });

  it('recommends Italiana for small space with simple preference', () => {
    expect(recommendPool(base({ espaco: 'ate-3', preferencia: 'simples', uso: 'casal' }))).toBe('Italiana');
  });

  it('recommends Cancún for large space with family', () => {
    expect(recommendPool(base({ preferencia: 'simples', orcamento: '30-50' }))).toBe('Cancún');
  });

  it('recommends Atalaia for large space with spa', () => {
    expect(recommendPool(base({ preferencia: 'spa', uso: 'casal' }))).toBe('Atalaia');
  });

  it('recommends Tropical for medium space with unknown preference', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'nao-sei', uso: 'casal', orcamento: '30-50' }))).toBe('Tropical');
  });

  it('recommends Bonaire for medium space with spa', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'spa', uso: 'casal' }))).toBe('Bonaire');
  });

  it('recommends Atalaia for large space + high budget + family', () => {
    expect(recommendPool(base({ preferencia: 'simples', orcamento: 'acima-80' }))).toBe('Atalaia');
  });

  it('recommends Bonaire for medium space + high budget + family', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'simples', orcamento: 'acima-80' }))).toBe('Bonaire');
  });
});
