// Pool model photos — real product images
import tradicionalImg from '@/assets/pools/tradicional.jpg';
import italianaImg from '@/assets/pools/italiana.jpg';
import nassauImg from '@/assets/pools/nassau.png';
import navagioImg from '@/assets/pools/navagio.webp';
import tortugaImg from '@/assets/pools/tortuga.jpg';
import bonaireImg from '@/assets/pools/bonaire.png';
import cancunImg from '@/assets/pools/cancun.jpg';
import atalaiaImg from '@/assets/pools/atalaia.png';
import farolDaBarraImg from '@/assets/pools/faroldabarra.jpg';
import tropicalImg from '@/assets/pools/tropical.jpg';

export const poolImages: Record<string, string> = {
  'Tradicional': tradicionalImg,
  'Nassau': nassauImg,
  'Tortuga': tortugaImg,
  'Bonaire': bonaireImg,
  'Cancún': cancunImg,
  'Atalaia': atalaiaImg,
  'Farol da Barra': farolDaBarraImg,
  'Tropical': tropicalImg,
  'Italiana': italianaImg,
  'Navagio': navagioImg,
};

// --- Feature images for quiz preference step (real pool photos) ---
import tradicionalPraiaImg from '@/assets/pools/tradicional-praia.jpg';

export const featureImages: Record<string, string> = {
  prainha: tradicionalPraiaImg,
  spa: navagioImg,
  simples: tradicionalImg,
};

export function getPoolImage(poolName: string): string | undefined {
  return poolImages[poolName];
}
