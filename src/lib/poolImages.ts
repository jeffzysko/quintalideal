// Minimalist SVG pool illustrations — no proprietary images
// Each pool model gets a unique stylized icon/illustration as a data URL

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
}

// Color palette (brand-aligned)
const WATER = '#38bdf8';       // sky-400
const WATER_DARK = '#0ea5e9';  // sky-500
const DECK = '#d4a574';        // warm wood
const DECK_DARK = '#b8956a';
const GREEN = '#4ade80';       // green-400
const SAND = '#fde68a';        // amber-200
const BG = '#f0f9ff';          // sky-50
const STONE = '#94a3b8';       // slate-400

const traditionalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <rect x="60" y="70" width="280" height="140" rx="12" fill="${WATER}" opacity="0.3"/>
  <rect x="80" y="85" width="240" height="110" rx="8" fill="${WATER}"/>
  <rect x="80" y="85" width="240" height="30" rx="8" fill="${WATER_DARK}" opacity="0.3"/>
  <line x1="100" y1="120" x2="300" y2="120" stroke="white" stroke-width="1" opacity="0.4"/>
  <line x1="110" y1="140" x2="290" y2="140" stroke="white" stroke-width="1" opacity="0.3"/>
  <line x1="120" y1="160" x2="280" y2="160" stroke="white" stroke-width="1" opacity="0.2"/>
</svg>`;

const nassauSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <ellipse cx="200" cy="140" rx="150" ry="70" fill="${WATER}" opacity="0.3"/>
  <ellipse cx="200" cy="140" rx="130" ry="55" fill="${WATER}"/>
  <ellipse cx="200" cy="125" rx="130" ry="20" fill="${WATER_DARK}" opacity="0.25"/>
  <circle cx="160" cy="140" r="4" fill="white" opacity="0.5"/>
  <circle cx="220" cy="150" r="3" fill="white" opacity="0.4"/>
  <circle cx="240" cy="130" r="5" fill="white" opacity="0.3"/>
</svg>`;

const tortugaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <path d="M70 130 Q70 80 200 80 Q330 80 330 130 Q330 200 270 200 L230 200 Q210 200 210 180 Q210 160 190 160 L130 160 Q70 160 70 130Z" fill="${WATER}" opacity="0.3"/>
  <path d="M90 130 Q90 95 200 95 Q310 95 310 130 Q310 185 260 185 L225 185 Q210 185 210 170 Q210 155 195 155 L145 155 Q90 155 90 130Z" fill="${WATER}"/>
  <path d="M210 155 Q210 170 225 170 L260 170 Q300 170 300 140" fill="${SAND}" opacity="0.6"/>
  <text x="245" y="175" font-size="10" fill="${DECK_DARK}" font-family="sans-serif" opacity="0.6">prainha</text>
</svg>`;

const bonaireSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <rect x="70" y="70" width="260" height="140" rx="20" fill="${WATER}" opacity="0.3"/>
  <rect x="90" y="85" width="220" height="110" rx="14" fill="${WATER}"/>
  <circle cx="130" cy="140" r="6" fill="white" opacity="0.6"/>
  <circle cx="155" cy="130" r="4" fill="white" opacity="0.5"/>
  <circle cx="145" cy="155" r="5" fill="white" opacity="0.4"/>
  <circle cx="120" cy="125" r="3" fill="white" opacity="0.5"/>
  <circle cx="165" cy="148" r="3" fill="white" opacity="0.3"/>
  <text x="143" y="175" font-size="9" fill="white" font-family="sans-serif" text-anchor="middle" opacity="0.7">hidro</text>
  <rect x="270" y="85" width="40" height="110" rx="14" fill="${WATER_DARK}" opacity="0.4"/>
  <text x="290" y="145" font-size="9" fill="white" font-family="sans-serif" text-anchor="middle" opacity="0.7">spa</text>
</svg>`;

const cancunSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <path d="M80 100 Q80 70 140 70 L300 70 Q340 70 340 100 L340 180 Q340 210 300 210 L200 210 Q180 210 170 195 L160 180 Q150 165 130 165 L120 165 Q80 165 80 130Z" fill="${WATER}" opacity="0.3"/>
  <path d="M95 100 Q95 82 140 82 L295 82 Q325 82 325 100 L325 175 Q325 198 295 198 L205 198 Q188 198 180 185 L172 173 Q165 162 148 162 L135 162 Q95 162 95 135Z" fill="${WATER}"/>
  <path d="M95 95 Q95 82 140 82 L295 82 Q325 82 325 100 L325 105 Q260 110 200 105 Q140 100 95 105Z" fill="${WATER_DARK}" opacity="0.2"/>
</svg>`;

const atalaiaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <path d="M90 90 Q90 70 120 70 L280 70 Q310 70 310 90 L310 180 Q310 200 280 200 L120 200 Q90 200 90 180Z" fill="${WATER}" opacity="0.3"/>
  <path d="M105 95 Q105 80 125 80 L275 80 Q295 80 295 95 L295 175 Q295 190 275 190 L125 190 Q105 190 105 175Z" fill="${WATER}"/>
  <rect x="105" y="80" width="190" height="25" rx="8" fill="${WATER_DARK}" opacity="0.2"/>
  <line x1="130" y1="130" x2="270" y2="130" stroke="white" stroke-width="1" opacity="0.3"/>
  <line x1="140" y1="150" x2="260" y2="150" stroke="white" stroke-width="1" opacity="0.2"/>
</svg>`;

const farolDaBarraSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <path d="M80 110 Q80 70 150 70 L310 70 Q340 70 340 100 L340 180 Q340 210 310 210 L150 210 Q80 210 80 170Z" fill="${WATER}" opacity="0.3"/>
  <path d="M95 110 Q95 82 150 82 L300 82 Q325 82 325 100 L325 175 Q325 198 300 198 L150 198 Q95 198 95 168Z" fill="${WATER}"/>
  <ellipse cx="200" cy="140" rx="40" ry="15" fill="white" opacity="0.15"/>
  <circle cx="180" cy="135" r="3" fill="white" opacity="0.4"/>
  <circle cx="220" cy="145" r="4" fill="white" opacity="0.3"/>
</svg>`;

const tropicalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <ellipse cx="200" cy="145" rx="140" ry="65" fill="${WATER}" opacity="0.3"/>
  <ellipse cx="200" cy="145" rx="120" ry="50" fill="${WATER}"/>
  <ellipse cx="200" cy="130" rx="120" ry="18" fill="${WATER_DARK}" opacity="0.2"/>
  <circle cx="80" cy="100" r="20" fill="${GREEN}" opacity="0.3"/>
  <circle cx="70" cy="110" r="15" fill="${GREEN}" opacity="0.4"/>
  <circle cx="320" cy="95" r="18" fill="${GREEN}" opacity="0.3"/>
  <circle cx="330" cy="108" r="12" fill="${GREEN}" opacity="0.4"/>
</svg>`;

const italianaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <rect x="70" y="65" width="260" height="150" rx="24" fill="${WATER}" opacity="0.3"/>
  <rect x="88" y="78" width="224" height="124" rx="18" fill="${WATER}"/>
  <rect x="88" y="78" width="224" height="30" rx="18" fill="${WATER_DARK}" opacity="0.2"/>
  <rect x="100" y="170" width="200" height="4" rx="2" fill="${DECK}" opacity="0.5"/>
  <rect x="110" y="180" width="180" height="4" rx="2" fill="${DECK}" opacity="0.3"/>
</svg>`;

const navagioSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
  <rect width="400" height="250" fill="${BG}" rx="16"/>
  <path d="M70 120 Q70 65 160 65 L300 65 Q340 65 340 110 L340 190 Q340 215 300 215 L160 215 Q70 215 70 170Z" fill="${WATER}" opacity="0.3"/>
  <path d="M88 120 Q88 80 160 80 L290 80 Q325 80 325 108 L325 185 Q325 203 290 203 L160 203 Q88 203 88 168Z" fill="${WATER}"/>
  <path d="M88 100 Q88 80 160 80 L290 80 Q325 80 325 108 L310 105 Q240 95 170 100 Q120 104 88 108Z" fill="${WATER_DARK}" opacity="0.2"/>
  <path d="M280 165 Q300 160 310 180 Q315 195 290 203 L280 203 Q290 190 285 175Z" fill="${SAND}" opacity="0.5"/>
</svg>`;

export const poolImages: Record<string, string> = {
  'Tradicional': svgToDataUrl(traditionalSvg),
  'Nassau': svgToDataUrl(nassauSvg),
  'Tortuga': svgToDataUrl(tortugaSvg),
  'Bonaire': svgToDataUrl(bonaireSvg),
  'Cancún': svgToDataUrl(cancunSvg),
  'Cancun': svgToDataUrl(cancunSvg),
  'Atalaia': svgToDataUrl(atalaiaSvg),
  'Farol da Barra': svgToDataUrl(farolDaBarraSvg),
  'Tropical': svgToDataUrl(tropicalSvg),
  'Italiana': svgToDataUrl(italianaSvg),
  'Navagio': svgToDataUrl(navagioSvg),
};

export function getPoolImage(poolName: string): string | undefined {
  return poolImages[poolName];
}
