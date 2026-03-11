import { describe, it, expect } from 'vitest';
import { getRankingGaucho } from '@/lib/ranking';

describe('getRankingGaucho', () => {
  it('returns TOP 10% for score >= 90', () => {
    expect(getRankingGaucho(90).percent).toBe('10%');
    expect(getRankingGaucho(100).percent).toBe('10%');
    expect(getRankingGaucho(95).percent).toBe('10%');
  });

  it('returns TOP 15% for score 85-89', () => {
    expect(getRankingGaucho(85).percent).toBe('15%');
    expect(getRankingGaucho(89).percent).toBe('15%');
  });

  it('returns TOP 20% for score 80-84', () => {
    expect(getRankingGaucho(80).percent).toBe('20%');
    expect(getRankingGaucho(84).percent).toBe('20%');
  });

  it('returns generic message for low scores', () => {
    expect(getRankingGaucho(50).label).toBe('Seu quintal tem potencial!');
    expect(getRankingGaucho(0).label).toBe('Seu quintal tem potencial!');
    expect(getRankingGaucho(64).label).toBe('Seu quintal tem potencial!');
  });

  it('handles boundary scores correctly', () => {
    expect(getRankingGaucho(65).percent).toBe('50%');
    expect(getRankingGaucho(70).percent).toBe('40%');
    expect(getRankingGaucho(75).percent).toBe('30%');
  });
});
