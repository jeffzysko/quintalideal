export function getRankingGaucho(score: number): { percent: string; label: string } {
  if (score >= 90) return { percent: '10%', label: 'TOP 10% dos quintais do Rio Grande do Sul' };
  if (score >= 85) return { percent: '15%', label: 'TOP 15% dos quintais do Rio Grande do Sul' };
  if (score >= 80) return { percent: '20%', label: 'TOP 20% dos quintais do Rio Grande do Sul' };
  if (score >= 75) return { percent: '30%', label: 'TOP 30% dos quintais do Rio Grande do Sul' };
  if (score >= 70) return { percent: '40%', label: 'TOP 40% dos quintais do Rio Grande do Sul' };
  if (score >= 65) return { percent: '50%', label: 'TOP 50% dos quintais do Rio Grande do Sul' };
  return { percent: '60%+', label: 'Seu quintal tem potencial!' };
}
