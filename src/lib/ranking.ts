export interface YardClassification {
  emoji: string;
  label: string;
  level: string;
  color: string;
}

export function getYardClassification(score: number): YardClassification {
  if (score >= 86) return { emoji: '🏝️', label: 'Quintal Premium', level: 'premium', color: '#ffd700' };
  if (score >= 71) return { emoji: '🌴', label: 'Quintal Pronto para Splash', level: 'pronto', color: '#00e5ff' };
  if (score >= 56) return { emoji: '🌿', label: 'Quintal Promissor', level: 'promissor', color: '#76ff03' };
  return { emoji: '🌱', label: 'Quintal Iniciante', level: 'iniciante', color: '#90caf9' };
}

export function getRankingGaucho(score: number): { percent: string; label: string } {
  if (score >= 90) return { percent: '10%', label: 'TOP 10% dos quintais do Rio Grande do Sul' };
  if (score >= 85) return { percent: '15%', label: 'TOP 15% dos quintais do Rio Grande do Sul' };
  if (score >= 80) return { percent: '20%', label: 'TOP 20% dos quintais do Rio Grande do Sul' };
  if (score >= 75) return { percent: '30%', label: 'TOP 30% dos quintais do Rio Grande do Sul' };
  if (score >= 70) return { percent: '40%', label: 'TOP 40% dos quintais do Rio Grande do Sul' };
  if (score >= 65) return { percent: '50%', label: 'TOP 50% dos quintais do Rio Grande do Sul' };
  return { percent: '60%+', label: 'Seu quintal tem potencial!' };
}

export function getSharePhrase(score: number): string {
  const classification = getYardClassification(score);
  const phrases: Record<string, string[]> = {
    premium: [
      'Meu quintal é nível Premium! 🏝️',
      'Descobri que meu quintal tem potencial máximo!',
      'Meu quintal está entre os melhores do RS!',
    ],
    pronto: [
      'Meu quintal está pronto para uma Splash! 🌴',
      'Descobri o potencial incrível do meu quintal!',
      'Será que seu quintal aguenta uma Splash?',
    ],
    promissor: [
      'Meu quintal tem futuro! 🌿',
      'Descobri o índice do meu quintal. E o seu?',
      'Agora fiquei com vontade de colocar piscina!',
    ],
    iniciante: [
      'Descobri o índice do meu quintal! 🌱',
      'Será que seu quintal tem mais potencial que o meu?',
      'Fiz o teste do quintal. Faça o seu também!',
    ],
  };
  const options = phrases[classification.level];
  return options[Math.floor(Math.random() * options.length)];
}

export function getSocialComparison(score: number): string {
  if (score >= 90) return 'Seu quintal está entre os 10% com maior potencial do RS!';
  if (score >= 80) return 'Seu quintal está entre os 20% com maior potencial do RS!';
  if (score >= 70) return 'Seu quintal está acima da média dos quintais gaúchos!';
  if (score >= 60) return 'A maioria dos quintais da sua região tem entre 55% e 75%.';
  return 'Muitos quintais começam assim e se transformam em paraísos!';
}
