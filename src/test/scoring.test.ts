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
    expect(calculateScore(base({ orcamento: '30-50' }))).toBe(100);
  });

  it('returns min score for lowest answers', () => {
    const answers = base({
      espaco: 'ate-3', moradia: 'planejando', intencao: 'pesquisando',
      uso: 'casal', preferencia: 'simples', orcamento: 'ate-18', cidade: 'Bagé',
    });
    expect(calculateScore(answers)).toBe(34);
  });

  it('handles mid-range answers', () => {
    const answers = base({
      espaco: '3-5', moradia: 'construindo', intencao: '2026-2027',
      uso: 'familia-pequena', preferencia: 'spa', orcamento: '18-30',
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
  // Espaço pequeno
  it('recommends Tortuga for small space with prainha', () => {
    expect(recommendPool(base({ espaco: 'ate-3' }))).toBe('Tortuga');
  });

  it('recommends Navagio for small space with spa', () => {
    expect(recommendPool(base({ espaco: '3-5', preferencia: 'spa', uso: 'casal' }))).toBe('Navagio');
  });

  it('recommends Italiana for small space with other preference', () => {
    expect(recommendPool(base({ espaco: 'ate-3', preferencia: 'simples', uso: 'casal' }))).toBe('Italiana');
  });

  // Espaço médio
  it('recommends Tortuga for medium space with prainha', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'prainha' }))).toBe('Tortuga');
  });

  it('recommends Tradicional for medium space with spa', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'spa', uso: 'casal' }))).toBe('Tradicional');
  });

  it('recommends Bonaire for medium space + high budget + family', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'simples', orcamento: '30-50' }))).toBe('Bonaire');
  });

  it('recommends Tradicional for medium space + family without high budget', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'simples', orcamento: '18-30' }))).toBe('Tradicional');
  });

  it('recommends Tropical for medium space with casal', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'nao-sei', uso: 'casal', orcamento: '18-30' }))).toBe('Tropical');
  });

  // Espaço grande
  it('recommends Tortuga for large space with prainha', () => {
    expect(recommendPool(base())).toBe('Tortuga');
  });

  it('recommends Atalaia for large space with spa', () => {
    expect(recommendPool(base({ preferencia: 'spa', uso: 'casal' }))).toBe('Atalaia');
  });

  it('recommends Atalaia for large space + high budget + family', () => {
    expect(recommendPool(base({ preferencia: 'simples', orcamento: '30-50' }))).toBe('Atalaia');
  });

  it('recommends Cancún for large space + family without high budget', () => {
    expect(recommendPool(base({ preferencia: 'simples', orcamento: '18-30' }))).toBe('Cancún');
  });

  it('recommends Tradicional for large space + casal', () => {
    expect(recommendPool(base({ preferencia: 'simples', uso: 'casal', orcamento: '18-30' }))).toBe('Tradicional');
  });

  // Budget validation
  it('falls back when pool exceeds budget', () => {
    const prices: PoolPriceInfo[] = [
      { nome_modelo: 'Tradicional', preco_min: 25000, preco_max: 45000 },
      { nome_modelo: 'Bonaire', preco_min: 18000, preco_max: 30000 },
    ];
    // Medium + spa + low budget → Tradicional doesn't fit, fallback to Bonaire
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'spa', uso: 'casal', orcamento: 'ate-18' }), prices)).toBe('Bonaire');
  });
});
