import { describe, it, expect } from 'vitest';
import { calculateScore, recommendPool, type QuizAnswers } from '@/lib/scoring';

describe('calculateScore', () => {
  it('returns max score for best answers', () => {
    const answers: QuizAnswers = {
      espaco: 'mais-7',
      moradia: 'minha',
      intencao: '2026',
      uso: 'familia-grande',
      preferencia: 'prainha',
      cidade: 'Porto Alegre',
    };
    expect(calculateScore(answers)).toBe(100);
  });

  it('returns min score for lowest answers', () => {
    const answers: QuizAnswers = {
      espaco: 'ate-3',
      moradia: 'planejando',
      intencao: 'pesquisando',
      uso: 'casal',
      preferencia: 'simples',
      cidade: 'Bagé',
    };
    expect(calculateScore(answers)).toBe(35);
  });

  it('handles mid-range answers', () => {
    const answers: QuizAnswers = {
      espaco: '3-5',
      moradia: 'construindo',
      intencao: '2026-2027',
      uso: 'familia-pequena',
      preferencia: 'spa',
      cidade: 'Canoas',
    };
    const score = calculateScore(answers);
    expect(score).toBeGreaterThan(35);
    expect(score).toBeLessThan(100);
  });

  it('handles unknown values gracefully (returns 0 for unmatched)', () => {
    const answers: QuizAnswers = {
      espaco: 'invalid',
      moradia: 'invalid',
      intencao: 'invalid',
      uso: 'invalid',
      preferencia: 'invalid',
      cidade: 'invalid',
    };
    expect(calculateScore(answers)).toBe(0);
  });
});

describe('recommendPool', () => {
  it('recommends Tortuga for large space with prainha', () => {
    const answers: QuizAnswers = {
      espaco: 'mais-7',
      moradia: 'minha',
      intencao: '2026',
      uso: 'familia-grande',
      preferencia: 'prainha',
      cidade: 'Porto Alegre',
    };
    expect(recommendPool(answers)).toBe('Tortuga');
  });

  it('recommends Nassau for small space with prainha', () => {
    const answers: QuizAnswers = {
      espaco: 'ate-3',
      moradia: 'minha',
      intencao: '2026',
      uso: 'casal',
      preferencia: 'prainha',
      cidade: 'Canoas',
    };
    expect(recommendPool(answers)).toBe('Nassau');
  });

  it('recommends Navagio for small space with spa', () => {
    const answers: QuizAnswers = {
      espaco: '3-5',
      moradia: 'minha',
      intencao: '2026',
      uso: 'casal',
      preferencia: 'spa',
      cidade: 'Canoas',
    };
    expect(recommendPool(answers)).toBe('Navagio');
  });

  it('recommends Italiana for small space with simple preference', () => {
    const answers: QuizAnswers = {
      espaco: 'ate-3',
      moradia: 'minha',
      intencao: '2026',
      uso: 'casal',
      preferencia: 'simples',
      cidade: 'Canoas',
    };
    expect(recommendPool(answers)).toBe('Italiana');
  });

  it('recommends Cancún for large space with family', () => {
    const answers: QuizAnswers = {
      espaco: 'mais-7',
      moradia: 'minha',
      intencao: '2026',
      uso: 'familia-grande',
      preferencia: 'simples',
      cidade: 'Canoas',
    };
    expect(recommendPool(answers)).toBe('Cancún');
  });

  it('recommends Atalaia for large space with spa', () => {
    const answers: QuizAnswers = {
      espaco: 'mais-7',
      moradia: 'minha',
      intencao: '2026',
      uso: 'casal',
      preferencia: 'spa',
      cidade: 'Canoas',
    };
    expect(recommendPool(answers)).toBe('Atalaia');
  });

  it('recommends Tropical for medium space with unknown preference', () => {
    const answers: QuizAnswers = {
      espaco: '5-7',
      moradia: 'minha',
      intencao: '2026',
      uso: 'casal',
      preferencia: 'nao-sei',
      cidade: 'Canoas',
    };
    expect(recommendPool(answers)).toBe('Tropical');
  });

  it('recommends Bonaire for medium space with spa', () => {
    const answers: QuizAnswers = {
      espaco: '5-7',
      moradia: 'minha',
      intencao: '2026',
      uso: 'casal',
      preferencia: 'spa',
      cidade: 'Canoas',
    };
    expect(recommendPool(answers)).toBe('Bonaire');
  });
});
