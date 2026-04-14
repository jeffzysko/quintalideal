import { describe, it, expect } from 'vitest';
import { calculateScore, recommendPool, recommendSize, isWithinBudget, type QuizAnswers, type PoolPriceInfo } from '@/lib/scoring';

const base = (overrides: Partial<QuizAnswers> = {}): QuizAnswers => ({
  espaco: 'mais-7',
  moradia: 'minha',
  intencao: '2026',
  uso: 'familia-grande',
  orcamento: '30-50',
  preferencia: 'prainha',
  cidade: 'São Paulo',
  ...overrides,
});

describe('calculateScore', () => {
  it('returns max score for best answers', () => {
    expect(calculateScore(base())).toBe(100);
  });

  it('returns min score for lowest answers', () => {
    expect(calculateScore(base({
      espaco: 'ate-3', moradia: 'planejando', intencao: 'pesquisando',
      uso: 'casal', orcamento: 'ate-18',
    }))).toBe(34);
  });

  it('handles mid-range answers', () => {
    const score = calculateScore(base({
      espaco: '5-7', moradia: 'construindo', intencao: '2026-2027',
      uso: 'familia-pequena', orcamento: '18-30',
    }));
    expect(score).toBeGreaterThan(34);
    expect(score).toBeLessThan(100);
  });

  it('handles unknown values gracefully (returns 0 for unmatched)', () => {
    const score = calculateScore(base({
      espaco: 'xyz' as string, moradia: 'abc' as string,
      intencao: '' as string, uso: '' as string, orcamento: '' as string,
    }));
    expect(score).toBe(0);
  });
});

describe('recommendPool', () => {
  it('recommends Italiana for small space with prainha (Tortuga too large)', () => {
    expect(recommendPool(base({ espaco: 'ate-3' }))).toBe('Italiana');
  });

  it('recommends Navagio for small space with spa', () => {
    expect(recommendPool(base({ espaco: '3-5', preferencia: 'spa', uso: 'casal' }))).toBe('Navagio');
  });

  it('recommends Italiana for small space with other preference', () => {
    expect(recommendPool(base({ espaco: 'ate-3', preferencia: 'simples', uso: 'casal' }))).toBe('Italiana');
  });

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

  it('falls back when pool exceeds budget', () => {
    const prices: PoolPriceInfo[] = [
      { nome_modelo: 'Tradicional', preco_min: 25000, preco_max: 45000 },
      { nome_modelo: 'Bonaire', preco_min: 18000, preco_max: 30000 },
    ];
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'spa', uso: 'casal', orcamento: 'ate-18' }), prices)).toBe('Bonaire');
  });
});

describe('recommendSize', () => {
  it('returns correct size for known model', () => {
    expect(recommendSize('5-7', 'Tortuga')).toBe('7,00 x 3,30m');
  });

  it('returns default for unknown model', () => {
    expect(recommendSize('5-7', 'Unknown')).toBe('6,00 x 3,00m');
  });
});

describe('isWithinBudget', () => {
  const prices: PoolPriceInfo[] = [
    { nome_modelo: 'Tradicional', preco_min: 15000, preco_max: 35000 },
  ];

  it('returns true for overlapping ranges', () => {
    expect(isWithinBudget('Tradicional', '18-30', prices)).toBe(true);
  });

  it('returns true for unknown model', () => {
    expect(isWithinBudget('Unknown', '18-30', prices)).toBe(true);
  });
});
