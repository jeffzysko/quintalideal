import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Droplets, Shield, Clock, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';
import heroPool from '@/assets/hero-pool.webp';
import { cidades, type CityOption } from '@/lib/cities';

interface FranchiseMatch {
  id: string;
  nome_franquia: string;
  slug_url: string;
  cidade_base: string;
}

type SearchState = 'idle' | 'searching' | 'results' | 'no-match' | 'error';

function formatCityLabel(city: CityOption): string {
  if (city.pais === 'UY') return `${city.nome}, Uruguai 🇺🇾`;
  return `${city.nome}, ${city.estado || 'RS'}`;
}

/* ── Floating light orbs for depth ── */
function LightOrbs() {
  return (
    <>
      <m.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0], opacity: [0.08, 0.15, 0.08] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[10%] left-[5%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%)' }}
      />
      <m.div
        animate={{ x: [0, -20, 0], y: [0, 25, 0], opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-[15%] right-[3%] w-[25vw] h-[25vw] max-w-[350px] max-h-[350px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
      />
    </>
  );
}

/* ── Trust badge pill ── */
function TrustBadges() {
  const badges = [
    { icon: Clock, label: '60 segundos' },
    { icon: Shield, label: '100% gratuito' },
    { icon: Droplets, label: '+3.200 analises' },
  ];

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.6 }}
      className="flex items-center justify-center gap-2 sm:gap-3 mt-6 sm:mt-8"
    >
      <div className="inline-flex items-center gap-3 sm:gap-5 px-5 py-2.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
        {badges.map(({ icon: Icon, label }, i) => (
          <div key={label} className="flex items-center gap-1.5">
            {i > 0 && <div className="w-px h-3 bg-white/10 -ml-1 mr-1 sm:-ml-1.5 sm:mr-1.5" />}
            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-300/60" />
            <span className="text-[9px] sm:text-xs font-medium text-white/40 tracking-wide">{label}</span>
          </div>
        ))}
      </div>
    </m.div>
  );
}

/* ── Scroll indicator ── */
function ScrollHint() {
  return null;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [citySearch, setCitySearch] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [matches, setMatches] = useState<FranchiseMatch[]>([]);
  const [nearestFranchise, setNearestFranchise] = useState<FranchiseMatch | null>(null);
  const [searchedCity, setSearchedCity] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = heroPool;
    img.onload = () => setImgLoaded(true);
    if (img.complete) setImgLoaded(true);
  }, []);

  const filteredCities = useMemo(() => {
    if (!citySearch || citySearch.length < 2) return [];
    const search = citySearch.toLowerCase();
    return cidades.filter(c => c.nome.toLowerCase().includes(search)).slice(0, 6);
  }, [citySearch]);

  const handleCitySelect = useCallback(async (cityName: string) => {
    setSearchedCity(cityName);
    setCitySearch(cityName);
    setSearchState('searching');
    setMatches([]);
    setNearestFranchise(null);

    try {
      const normalized = cityName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const { data: cityMatches, error: cityError } = await supabase
        .from('franchise_covered_cities')
        .select('franchise_id, city_name, is_primary_city')
        .eq('city_name_normalized', normalized);

      if (cityError) throw cityError;

      if (cityMatches && cityMatches.length > 0) {
        const franchiseIds = [...new Set(cityMatches.map(c => c.franchise_id))];

        const { data: franchises, error: fError } = await supabase
          .from('franchises_public')
          .select('id, nome_franquia, slug_url, cidade_base')
          .in('id', franchiseIds)
          .eq('ativa', true);

        if (fError) throw fError;

        const validFranchises = (franchises || []).filter(
          (f): f is FranchiseMatch => !!f.id && !!f.slug_url && !!f.nome_franquia && !!f.cidade_base
        );

        if (validFranchises.length === 1) {
          navigate(`/${validFranchises[0].slug_url}`);
          return;
        }

        if (validFranchises.length > 1) {
          setMatches(validFranchises);
          setSearchState('results');
          return;
        }
      }

      const { data: allFranchises } = await supabase
        .from('franchises_public')
        .select('id, nome_franquia, slug_url, cidade_base')
        .eq('ativa', true)
        .order('cidade_base')
        .limit(1);

      if (allFranchises && allFranchises.length > 0) {
        const f = allFranchises[0];
        if (f.id && f.slug_url && f.nome_franquia && f.cidade_base) {
          setNearestFranchise(f as FranchiseMatch);
        }
      }
      setSearchState('no-match');
    } catch (err) {
      console.error('City search error:', err);
      setSearchState('error');
    }
  }, [navigate]);

  const showAutocomplete = filteredCities.length > 0 && searchState !== 'searching' && searchState !== 'results' && searchState !== 'no-match';
  const showNoResults = citySearch.length >= 2 && filteredCities.length === 0 && searchState === 'idle';

  return (
    <LazyMotion features={domAnimation}>
      <div className="h-[100dvh] flex flex-col relative overflow-hidden">
        {/* ── Background image with cinematic overlay ── */}
        <m.div
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: imgLoaded ? 1.02 : 1.15, opacity: imgLoaded ? 1 : 0 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img
            src={heroPool}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </m.div>

        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 40%, rgba(8,20,40,0.15) 0%, transparent 70%),
            linear-gradient(180deg, 
              rgba(8,20,40,0.55) 0%, 
              rgba(8,20,40,0.2) 25%, 
              rgba(8,20,40,0.25) 45%,
              rgba(8,20,40,0.6) 70%, 
              rgba(8,20,40,0.95) 100%
            )
          `,
        }} />

        {/* Subtle vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)',
        }} />

        {/* Floating light orbs */}
        <LightOrbs />

        {/* ── Main content ── */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 safe-bottom max-w-md sm:max-w-lg mx-auto w-full">
          {/* Logo */}
          <m.img
            src={logoQuintalIdeal}
            alt="Quintal Ideal"
            initial={{ opacity: 0, y: -15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-4 sm:mb-6 w-32 sm:w-40 md:w-48 h-auto brightness-0 invert"
            style={{ filter: 'brightness(0) invert(1) drop-shadow(0 4px 20px rgba(255,255,255,0.15))' }}
          />

          {/* Headline */}
          <m.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center text-[1.65rem] sm:text-[2.25rem] md:text-[2.85rem] lg:text-[3.4rem] font-extrabold leading-[1.05] mb-3 sm:mb-4 text-white tracking-tight"
          >
            A piscina ideal para{' '}
            <span className="bg-gradient-to-r from-sky-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent">
              o seu quintal
            </span>
          </m.h1>

          {/* Subtitle */}
          <m.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-center text-[13px] sm:text-sm md:text-base text-white/60 mb-7 sm:mb-9 max-w-[300px] sm:max-w-sm mx-auto leading-relaxed"
          >
            Encontre a unidade parceira da sua cidade e descubra o modelo ideal em 60 segundos.
          </m.p>

          {/* ── Search card with glassmorphism ── */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xs sm:max-w-sm"
          >
            <div className="relative group">
              {/* Glow behind input */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-400/20 via-blue-500/20 to-cyan-400/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30 pointer-events-none z-10" />
                <Input
                  value={citySearch}
                  onChange={e => {
                    setCitySearch(e.target.value);
                    if (searchState !== 'idle') {
                      setSearchState('idle');
                      setMatches([]);
                      setNearestFranchise(null);
                    }
                  }}
                  placeholder="Digite sua cidade..."
                  aria-label="Busca por cidade"
                  className="pl-11 pr-4 h-14 rounded-2xl text-[15px] bg-white/[0.07] backdrop-blur-xl border-white/[0.12] text-white placeholder:text-white/30 focus:border-sky-400/40 focus:ring-sky-400/15 focus:bg-white/[0.1] transition-all duration-300 shadow-lg shadow-black/10"
                  autoFocus
                />
              </div>
            </div>

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {showAutocomplete && (
                <m.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 rounded-xl bg-white/[0.07] backdrop-blur-xl border border-white/[0.1] overflow-hidden shadow-xl shadow-black/20"
                >
                  {filteredCities.map((city, i) => (
                    <m.button
                      key={`${city.pais}-${city.nome}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.15) }}
                      onClick={() => handleCitySelect(city.nome)}
                      className="w-full text-left px-4 py-3 hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors flex items-center gap-3 text-sm group border-b border-white/[0.04] last:border-b-0"
                    >
                      <MapPin className="w-4 h-4 text-sky-300/70 shrink-0 group-hover:text-sky-300 group-hover:scale-110 transition-all" />
                      <span className="font-medium text-white/85 group-hover:text-white transition-colors">{formatCityLabel(city)}</span>
                    </m.button>
                  ))}
                </m.div>
              )}

              {showNoResults && (
                <m.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-white/35 mt-4 text-center"
                >
                  Nenhuma cidade encontrada. Tente outro nome.
                </m.p>
              )}
            </AnimatePresence>

            {/* Loading */}
            {searchState === 'searching' && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-2.5 mt-5"
              >
                <div className="animate-spin w-4 h-4 border-2 border-sky-300/30 border-t-sky-300 rounded-full" />
                <span className="text-white/45 text-sm">Buscando unidade...</span>
              </m.div>
            )}

            {/* Multiple franchises */}
            <AnimatePresence>
              {searchState === 'results' && matches.length > 1 && (
                <m.div
                  key="multi"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4"
                >
                  <p className="text-white/50 text-xs text-center mb-3">
                    Encontramos {matches.length} unidades para {searchedCity}:
                  </p>
                  <div className="space-y-2 rounded-xl bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] p-2 shadow-xl shadow-black/15">
                    {matches.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => navigate(`/${f.slug_url}`)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] active:bg-white/[0.14] transition-all group"
                      >
                        <div className="text-left">
                          <span className="block text-sm font-semibold text-white/90">{f.nome_franquia}</span>
                          <span className="block text-xs text-white/40">{f.cidade_base}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </m.div>
              )}

              {searchState === 'no-match' && (
                <m.div
                  key="no-match"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4"
                >
                  <div className="px-4 py-4 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-center shadow-xl shadow-black/15">
                    <p className="text-white/60 text-sm mb-2">
                      Ainda nao temos cobertura para "<span className="font-semibold text-white/80">{searchedCity}</span>".
                    </p>
                    {nearestFranchise && (
                      <>
                        <p className="text-white/40 text-xs mb-3">A unidade mais proxima e:</p>
                        <button
                          onClick={() => navigate(`/${nearestFranchise.slug_url}`)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.12] transition-all group"
                        >
                          <div className="text-left">
                            <span className="block text-sm font-semibold">{nearestFranchise.nome_franquia}</span>
                            <span className="block text-xs text-white/40">{nearestFranchise.cidade_base}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      </>
                    )}
                  </div>
                </m.div>
              )}

              {searchState === 'error' && (
                <m.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2 mt-4"
                >
                  <p className="text-center text-red-300/70 text-sm">Erro ao buscar. Verifique sua conexao.</p>
                  <button
                    type="button"
                    onClick={() => handleCitySelect(citySearch)}
                    className="text-xs text-white/50 underline underline-offset-2 hover:text-white/70 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>

          {/* Trust badges */}
          <TrustBadges />
        </div>

        {/* Scroll hint */}
        <ScrollHint />
      </div>
    </LazyMotion>
  );
}
