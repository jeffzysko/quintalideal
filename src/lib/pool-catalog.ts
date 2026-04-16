import tradicionalImg from '@/assets/pools/tradicional.jpg';
import tradicionalPraiaImg from '@/assets/pools/tradicional-praia.jpg';
import tropicalImg from '@/assets/pools/tropical.jpg';
import atalaiaImg from '@/assets/pools/atalaia.png';
import bonaireImg from '@/assets/pools/bonaire.png';
import cancunImg from '@/assets/pools/cancun.jpg';
import farolImg from '@/assets/pools/faroldabarra.jpg';
import italianaImg from '@/assets/pools/italiana.jpg';
import nassauImg from '@/assets/pools/nassau.png';
import navagioImg from '@/assets/pools/navagio.webp';
import tortugaImg from '@/assets/pools/tortuga.jpg';

export interface PoolModel {
  id: string;
  name: string;
  image: string;
  category: 'Compacta' | 'Classica' | 'Premium' | 'Especial';
  dimensions: string;
  capacity: string;
  depth: string;
  idealFor: string;
  highlight: string;
}

export const POOL_MODELS: PoolModel[] = [
  { id: 'tradicional', name: 'Tradicional', image: tradicionalImg, category: 'Classica', dimensions: '7m x 3,5m', capacity: '24.500L', depth: '1,40m', idealFor: 'Familias com crianças', highlight: 'Modelo mais vendido da linha' },
  { id: 'tradicional-praia', name: 'Tradicional Praia', image: tradicionalPraiaImg, category: 'Classica', dimensions: '7m x 3,5m', capacity: '22.000L', depth: '1,20m', idealFor: 'Lazer e relaxamento', highlight: 'Entrada em rampa no estilo praia' },
  { id: 'tropical', name: 'Tropical', image: tropicalImg, category: 'Premium', dimensions: '8m x 4m', capacity: '32.000L', depth: '1,50m', idealFor: 'Familias grandes', highlight: 'Ampla area de natação' },
  { id: 'atalaia', name: 'Atalaia', image: atalaiaImg, category: 'Premium', dimensions: '9m x 4,5m', capacity: '40.000L', depth: '1,50m', idealFor: 'Espaços amplos', highlight: 'Design moderno e elegante' },
  { id: 'bonaire', name: 'Bonaire', image: bonaireImg, category: 'Compacta', dimensions: '5m x 3m', capacity: '15.000L', depth: '1,35m', idealFor: 'Quintais menores', highlight: 'Perfeita para espaços compactos' },
  { id: 'cancun', name: 'Cancun', image: cancunImg, category: 'Premium', dimensions: '8m x 4m', capacity: '35.000L', depth: '1,50m', idealFor: 'Adultos e esporte', highlight: 'Formato alongado ideal para nado' },
  { id: 'faroldabarra', name: 'Farol da Barra', image: farolImg, category: 'Especial', dimensions: '6m x 3,5m', capacity: '20.000L', depth: '1,40m', idealFor: 'Estilo praiano', highlight: 'Design exclusivo inspirado no litoral' },
  { id: 'italiana', name: 'Italiana', image: italianaImg, category: 'Especial', dimensions: '7m x 4m', capacity: '28.000L', depth: '1,45m', idealFor: 'Quintais com estilo', highlight: 'Linhas refinadas e elegantes' },
  { id: 'nassau', name: 'Nassau', image: nassauImg, category: 'Premium', dimensions: '9m x 5m', capacity: '45.000L', depth: '1,55m', idealFor: 'Grandes espaços', highlight: 'Nossa maior e mais completa piscina' },
  { id: 'navagio', name: 'Navagio', image: navagioImg, category: 'Especial', dimensions: '6,5m x 3,5m', capacity: '22.000L', depth: '1,40m', idealFor: 'Estilo mediterraneo', highlight: 'Inspirada nas ilhas gregas' },
  { id: 'tortuga', name: 'Tortuga', image: tortugaImg, category: 'Compacta', dimensions: '4,5m x 3m', capacity: '12.000L', depth: '1,30m', idealFor: 'Espaços muito pequenos', highlight: 'Cabe em qualquer quintal' },
];

export const CATEGORIES = ['Todos', 'Compacta', 'Classica', 'Premium', 'Especial'] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Compacta: 'bg-amber-50 text-amber-700 border-amber-200',
  Classica: 'bg-primary/10 text-primary border-primary/20',
  Premium: 'bg-violet-50 text-violet-700 border-violet-200',
  Especial: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
