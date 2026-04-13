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
  it('recommends Family for small space with prainha (Prainha too large)', () => {
    expect(recommendPool(base({ espaco: 'ate-3' }))).toBe('Family');
  });

  it('recommends Compacta Premium for small space with spa', () => {
    expect(recommendPool(base({ espaco: '3-5', preferencia: 'spa', uso: 'casal' }))).toBe('Compacta Premium');
  });

  it('recommends Family for small space with other preference', () => {
    expect(recommendPool(base({ espaco: 'ate-3', preferencia: 'simples', uso: 'casal' }))).toBe('Family');
  });

  it('recommends Prainha for medium space with prainha', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'prainha' }))).toBe('Prainha');
  });

  it('recommends Retangular for medium space with spa', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'spa', uso: 'casal' }))).toBe('Retangular');
  });

  it('recommends Elegance for medium space + high budget + family', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'simples', orcamento: '30-50' }))).toBe('Elegance');
  });

  it('recommends Retangular for medium space + family without high budget', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'simples', orcamento: '18-30' }))).toBe('Retangular');
  });

  it('recommends Confort for medium space with casal', () => {
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'nao-sei', uso: 'casal', orcamento: '18-30' }))).toBe('Confort');
  });

  it('recommends Prainha for large space with prainha', () => {
    expect(recommendPool(base())).toBe('Prainha');
  });

  it('recommends Supreme for large space with spa', () => {
    expect(recommendPool(base({ preferencia: 'spa', uso: 'casal' }))).toBe('Supreme');
  });

  it('recommends Supreme for large space + high budget + family', () => {
    expect(recommendPool(base({ preferencia: 'simples', orcamento: '30-50' }))).toBe('Supreme');
  });

  it('recommends Retangular Plus for large space + family without high budget', () => {
    expect(recommendPool(base({ preferencia: 'simples', orcamento: '18-30' }))).toBe('Retangular Plus');
  });

  it('recommends Retangular for large space + casal', () => {
    expect(recommendPool(base({ preferencia: 'simples', uso: 'casal', orcamento: '18-30' }))).toBe('Retangular');
  });

  it('falls back when pool exceeds budget', () => {
    const prices: PoolPriceInfo[] = [
      { nome_modelo: 'Retangular', preco_min: 25000, preco_max: 45000 },
      { nome_modelo: 'Elegance', preco_min: 18000, preco_max: 30000 },
    ];
    expect(recommendPool(base({ espaco: '5-7', preferencia: 'spa', uso: 'casal', orcamento: 'ate-18' }), prices)).toBe('Elegance');
  });
});

describe('recommendSize', () => {
  it('returns correct size for known model', () => {
    expect(recommendSize('5-7', 'Prainha')).toBe('7,00 x 3,30m');
  });

  it('returns default for unknown model', () => {
    expect(recommendSize('5-7', 'Unknown')).toBe('6,00 x 3,00m');
  });
});

describe('isWithinBudget', () => {
  const prices: PoolPriceInfo[] = [
    { nome_modelo: 'Retangular', preco_min: 15000, preco_max: 35000 },
  ];

  it('returns true for overlapping ranges', () => {
    expect(isWithinBudget('Retangular', '18-30', prices)).toBe(true);
  });

  it('returns true for unknown model', () => {
    expect(isWithinBudget('Unknown', '18-30', prices)).toBe(true);
  });
});
