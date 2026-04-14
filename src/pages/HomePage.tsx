import { useState, useCallback, useMemo } from 'react';
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

export default function HomePage() {
  const navigate = useNavigate();
  const [citySearch, setCitySearch] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [matches, setMatches] = useState<FranchiseMatch[]>([]);
  const [nearestFranchise, setNearestFranchise] = useState<FranchiseMatch | null>(null);
  const [searchedCity, setSearchedCity] = useState('');

  const filteredCities = useMemo(() => {
    if (!citySearch || citySearch.length < 2) return [];
    const search = citySearch.toLowerCase();
    return cidades.filter(c => c.nome.toLowerCase().includes(search)).slice(0, 8);
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
        {/* Background */}
        <div className="absolute inset-0">
          <img src={heroPool} alt="" className="w-full h-full object-cover scale-105" loading="eager" fetchPriority="high" />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(180deg, rgba(8,20,40,0.4) 0%, rgba(8,20,40,0.2) 30%, rgba(8,20,40,0.5) 60%, rgba(8,20,40,0.92) 100%)',
          }} />
        </div>

        {/* Floating water drops */}
        <m.div
          animate={{ y: [-8, 8, -8] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[15%] left-[10%] text-3xl opacity-20 hidden sm:block"
        >💧</m.div>
        <m.div
          animate={{ y: [6, -10, 6] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-[25%] right-[12%] text-2xl opacity-15 hidden sm:block"
        >💧</m.div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-10 sm:py-10 max-w-lg mx-auto w-full" style={{ marginTop: '-3vh' }}>
          <m.img
            src={logoQuintalIdeal}
            alt="Quintal Ideal"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-5 sm:mb-6 w-36 sm:w-44 md:w-52 h-auto drop-shadow-2xl brightness-0 invert"
          />

          <m.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center text-[1.75rem] sm:text-[2rem] md:text-[2.75rem] font-extrabold leading-[1.08] mb-3 sm:mb-4 text-white tracking-tight"
          >
            A piscina ideal para<br />
            <span className="bg-gradient-to-r from-blue-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent">
              o seu quintal
            </span>
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-center text-[13px] sm:text-sm md:text-base text-white/55 mb-6 sm:mb-8 max-w-xs mx-auto leading-relaxed"
          >
            Digite sua cidade para encontrar a unidade parceira mais próxima para fazer o quiz do seu quintal.
          </m.p>

          {/* City search */}
          <m.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="w-full max-w-xs"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
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
                className="pl-11 py-6 rounded-2xl text-[15px] bg-white/10 backdrop-blur-md border-white/15 text-white placeholder:text-white/35 focus:border-primary/50 focus:ring-primary/20"
                autoFocus
              />
            </div>

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {showAutocomplete && (
                <m.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-2 space-y-1"
                >
                  {filteredCities.map((city, i) => (
                    <m.button
                      key={`${city.pais}-${city.nome}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.15) }}
                      onClick={() => handleCitySelect(city.nome)}
                      className="w-full text-left px-4 py-3.5 rounded-xl bg-white/5 backdrop-blur-sm hover:bg-white/15 active:bg-white/20 transition-colors flex items-center gap-3 text-sm group"
                    >
                      <MapPin className="w-4 h-4 text-blue-300 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="font-medium text-white/90">{formatCityLabel(city)}</span>
                    </m.button>
                  ))}
                </m.div>
              )}

              {showNoResults && (
                <m.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-white/40 mt-4 text-center"
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
                className="flex items-center justify-center gap-2 mt-4"
              >
                <div className="animate-spin w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                <span className="text-white/50 text-sm">Buscando unidade...</span>
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
                  className="mt-4 space-y-2"
                >
                  <p className="text-white/60 text-xs text-center mb-2">
                    Encontramos {matches.length} unidades para {searchedCity}:
                  </p>
                  {matches.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => navigate(`/${f.slug_url}`)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all group"
                    >
                      <div className="text-left">
                        <span className="block text-sm font-semibold">{f.nome_franquia}</span>
                        <span className="block text-[11px] text-white/50">{f.cidade_base}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
                    </button>
                  ))}
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
                  <div className="px-4 py-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
                    <p className="text-white/70 text-sm mb-2">
                      Ainda não temos cobertura para "<span className="font-semibold">{searchedCity}</span>".
                    </p>
                    {nearestFranchise && (
                      <>
                        <p className="text-white/50 text-xs mb-3">A unidade mais próxima é:</p>
                        <button
                          onClick={() => navigate(`/${nearestFranchise.slug_url}`)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-all group"
                        >
                          <div className="text-left">
                            <span className="block text-sm font-semibold">{nearestFranchise.nome_franquia}</span>
                            <span className="block text-[11px] text-white/50">{nearestFranchise.cidade_base}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
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
                  <p className="text-center text-red-300/80 text-sm">Erro ao buscar. Verifique sua conexão.</p>
                  <button
                    type="button"
                    onClick={() => handleCitySelect(citySearch)}
                    className="text-xs text-white/60 underline underline-offset-2 hover:text-white/80 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </m.div>
              )}
            </AnimatePresence>
          </m.div>

          {/* Trust indicators */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center justify-center gap-3 sm:gap-5 mt-6 sm:mt-8 mb-2 flex-wrap"
          >
            <div className="flex items-center gap-1.5 text-white/35">
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="text-[9px] sm:text-[10px] font-medium">60 segundos</span>
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5 text-white/35">
              <Shield className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="text-[9px] sm:text-[10px] font-medium">100% gratuito</span>
            </div>
            <div className="w-px h-3 bg-white/15" />
            <div className="flex items-center gap-1.5 text-white/35">
              <Droplets className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="text-[9px] sm:text-[10px] font-medium">+3.200 análises</span>
            </div>
          </m.div>
        </div>
      </div>
    </LazyMotion>
  );
}
