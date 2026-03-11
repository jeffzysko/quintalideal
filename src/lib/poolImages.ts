import tradicional from '@/assets/pools/tradicional.jpg';
import nassau from '@/assets/pools/nassau.png';
import tortuga from '@/assets/pools/tortuga.jpg';
import bonaire from '@/assets/pools/bonaire.png';
import cancun from '@/assets/pools/cancun.jpg';
import atalaia from '@/assets/pools/atalaia.png';
import faroldabarra from '@/assets/pools/faroldabarra.jpg';
import tropical from '@/assets/pools/tropical.jpg';
import italiana from '@/assets/pools/italiana.jpg';
import navagio from '@/assets/pools/navagio.webp';

export const poolImages: Record<string, string> = {
  'Tradicional': tradicional,
  'Nassau': nassau,
  'Tortuga': tortuga,
  'Bonaire': bonaire,
  'Cancún': cancun,
  'Cancun': cancun,
  'Atalaia': atalaia,
  'Farol da Barra': faroldabarra,
  'Tropical': tropical,
  'Italiana': italiana,
  'Navagio': nassau, // fallback similar style
};

export function getPoolImage(poolName: string): string | undefined {
  return poolImages[poolName];
}
