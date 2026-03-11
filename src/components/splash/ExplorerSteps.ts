export interface ExplorerStep {
  emoji: string;
  title: string;
  message: string;
}

export const explorerSteps: ExplorerStep[] = [
  { emoji: '📸', title: 'Foto do quintal', message: 'Vamos começar olhando o espaço.' },
  { emoji: '📏', title: 'Espaço disponível', message: 'Agora precisamos entender o tamanho do seu território.' },
  { emoji: '🏠', title: 'Tipo de casa', message: 'Esse quintal já é seu?' },
  { emoji: '🌞', title: 'Estilo de uso', message: 'Como você imagina aproveitar sua piscina?' },
  { emoji: '📅', title: 'Plano de piscina', message: 'Quando você gostaria de ter sua piscina?' },
  { emoji: '💧', title: 'Preferência', message: 'O que você gostaria na sua piscina?' },
  { emoji: '📍', title: 'Localização', message: 'Onde fica seu quintal?' },
];
