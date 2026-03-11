import tradicional from '@/assets/pools/tradicional.webp';
import nassau from '@/assets/pools/nassau.webp';
import tortuga from '@/assets/pools/tortuga.webp';
import bonaire from '@/assets/pools/bonaire.webp';
import cancun from '@/assets/pools/cancun.webp';
import atalaia from '@/assets/pools/atalaia.webp';
import faroldabarra from '@/assets/pools/faroldabarra.webp';
import tropical from '@/assets/pools/tropical.webp';
import italiana from '@/assets/pools/italiana.webp';
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
  'Navagio': navagio,
};

export function getPoolImage(poolName: string): string | undefined {
  return poolImages[poolName];
}
