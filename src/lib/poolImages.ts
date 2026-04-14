// Pool model photos — real product images
import tradicionalImg from '@/assets/pools/tradicional.jpg';
import italianaImg from '@/assets/pools/italiana.jpg';
import nassauImg from '@/assets/pools/nassau.jpg';
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

// --- Feature illustrations for quiz preference step ---

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

const WATER = '#38bdf8';
const WATER_DARK = '#0ea5e9';
const DECK = '#d4a574';
const DECK_DARK = '#b8956a';
const SAND = '#fde68a';
const BG = '#f0f9ff';

const featurePrainhaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <path d="M60 160 Q60 100 200 100 Q340 100 340 160 L340 200 Q340 210 330 210 L70 210 Q60 210 60 200Z" fill="${WATER}" opacity="0.3"/>
  <path d="M80 160 Q80 115 200 115 Q320 115 320 160 L320 195 Q320 200 315 200 L85 200 Q80 200 80 195Z" fill="${WATER}"/>
  <path d="M220 200 Q260 200 290 185 Q310 175 320 160 L320 195 Q320 200 315 200 L220 200Z" fill="${SAND}" opacity="0.7"/>
  <path d="M240 200 Q270 198 295 185 Q310 178 318 168 L320 195 Q320 200 315 200 L240 200Z" fill="${SAND}"/>
  <ellipse cx="290" cy="192" rx="8" ry="3" fill="${DECK}" opacity="0.4"/>
  <circle cx="130" cy="148" r="3" fill="white" opacity="0.5"/>
  <circle cx="170" cy="155" r="4" fill="white" opacity="0.4"/>
  <circle cx="150" cy="165" r="2.5" fill="white" opacity="0.3"/>
  <text x="200" y="235" font-size="11" fill="${DECK_DARK}" font-family="sans-serif" text-anchor="middle" font-weight="600" opacity="0.7">Prainha</text>
</svg>`;

const featureSpaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <ellipse cx="200" cy="145" rx="120" ry="60" fill="${WATER}" opacity="0.3"/>
  <ellipse cx="200" cy="145" rx="100" ry="48" fill="${WATER}"/>
  <ellipse cx="200" cy="132" rx="100" ry="16" fill="${WATER_DARK}" opacity="0.25"/>
  <circle cx="160" cy="140" r="5" fill="white" opacity="0.6"/>
  <circle cx="175" cy="150" r="3.5" fill="white" opacity="0.5"/>
  <circle cx="155" cy="155" r="4" fill="white" opacity="0.45"/>
  <circle cx="190" cy="145" r="3" fill="white" opacity="0.4"/>
  <circle cx="210" cy="138" r="4.5" fill="white" opacity="0.55"/>
  <circle cx="225" cy="150" r="3.5" fill="white" opacity="0.5"/>
  <circle cx="240" cy="142" r="4" fill="white" opacity="0.45"/>
  <circle cx="170" cy="130" r="2.5" fill="white" opacity="0.35"/>
  <circle cx="230" cy="130" r="2.5" fill="white" opacity="0.35"/>
  <path d="M170 110 Q172 100 168 90" stroke="${WATER_DARK}" stroke-width="1.5" fill="none" opacity="0.25" stroke-linecap="round"/>
  <path d="M200 105 Q203 95 198 85" stroke="${WATER_DARK}" stroke-width="1.5" fill="none" opacity="0.2" stroke-linecap="round"/>
  <path d="M230 108 Q232 98 228 88" stroke="${WATER_DARK}" stroke-width="1.5" fill="none" opacity="0.22" stroke-linecap="round"/>
  <text x="200" y="235" font-size="11" fill="${DECK_DARK}" font-family="sans-serif" text-anchor="middle" font-weight="600" opacity="0.7">Spa / Hidro</text>
</svg>`;

const featureSimplesSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <rect x="80" y="80" width="240" height="120" rx="10" fill="${WATER}" opacity="0.3"/>
  <rect x="95" y="93" width="210" height="94" rx="6" fill="${WATER}"/>
  <rect x="95" y="93" width="210" height="24" rx="6" fill="${WATER_DARK}" opacity="0.2"/>
  <line x1="115" y1="130" x2="285" y2="130" stroke="white" stroke-width="1" opacity="0.35"/>
  <line x1="120" y1="148" x2="280" y2="148" stroke="white" stroke-width="1" opacity="0.25"/>
  <line x1="125" y1="166" x2="275" y2="166" stroke="white" stroke-width="1" opacity="0.15"/>
  <rect x="80" y="200" width="240" height="3" rx="1.5" fill="${DECK}" opacity="0.4"/>
  <rect x="90" y="207" width="220" height="3" rx="1.5" fill="${DECK}" opacity="0.25"/>
  <text x="200" y="235" font-size="11" fill="${DECK_DARK}" font-family="sans-serif" text-anchor="middle" font-weight="600" opacity="0.7">Clássica</text>
</svg>`;

export const featureImages: Record<string, string> = {
  prainha: svgToDataUrl(featurePrainhaSvg),
  spa: svgToDataUrl(featureSpaSvg),
  simples: svgToDataUrl(featureSimplesSvg),
};

export function getPoolImage(poolName: string): string | undefined {
  return poolImages[poolName];
}
