import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, ArrowRight, Droplets, Shield, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import logoSplash from '@/assets/logo-splash.png';
import heroPool from '@/assets/hero-pool.webp';

interface FranchiseMatch {
  id: string;
  nome_franquia: string;
  slug_url: string;
  cidade_base: string;
}

type SearchState = 'idle' | 'searching' | 'results' | 'no-match' | 'error';

export default function HomePage() {
  const navigate = useNavigate();
  const [cityInput, setCityInput] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [matches, setMatches] = useState<FranchiseMatch[]>([]);
  const [nearestFranchise, setNearestFranchise] = useState<FranchiseMatch | null>(null);

  const handleSearch = useCallback(async () => {
    const trimmed = cityInput.trim();
    if (!trimmed || trimmed.length < 2) return;

    setSearchState('searching');
    setMatches([]);
    setNearestFranchise(null);

    try {
      // Normalize input for comparison
      const normalized = trimmed
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Search franchise_covered_cities for matching city
      const { data: cityMatches, error: cityError } = await supabase
        .from('franchise_covered_cities')
        .select('franchise_id, city_name, is_primary_city')
        .ilike('city_name_normalized', `%${normalized}%`);

      if (cityError) throw cityError;

      if (cityMatches && cityMatches.length > 0) {
        // Get unique franchise IDs
        const franchiseIds = [...new Set(cityMatches.map(c => c.franchise_id))];

        // Fetch franchise details
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
          // Single match → redirect directly
          navigate(`/${validFranchises[0].slug_url}`);
          return;
        }

        if (validFranchises.length > 1) {
          // Multiple matches → show list
          setMatches(validFranchises);
          setSearchState('results');
          return;
        }
      }

      // No match found → suggest nearest franchise (first active one alphabetically as fallback)
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
  }, [cityInput, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  return (
    <div className="h-[100dvh] flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroPool}
          alt=""
          className="w-full h-full object-cover scale-105"
          loading="eager"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(8,20,40,0.4) 0%, rgba(8,20,40,0.2) 30%, rgba(8,20,40,0.5) 60%, rgba(8,20,40,0.92) 100%)',
          }}
        />
      </div>

      {/* Floating water drops */}
      <motion.div
        animate={{ y: [-8, 8, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[15%] left-[10%] text-3xl opacity-20 hidden sm:block"
      >
        💧
      </motion.div>
      <motion.div
        animate={{ y: [6, -10, 6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-[25%] right-[12%] text-2xl opacity-15 hidden sm:block"
      >
        💧
      </motion.div>

      {/* Content */}
      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-10 sm:py-10 max-w-lg mx-auto w-full"
        style={{ marginTop: '-3vh' }}
      >
        <motion.img
          src={logoSplash}
          alt="Splash Piscinas"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-5 sm:mb-6 w-28 sm:w-36 md:w-44 h-auto drop-shadow-2xl"
        />

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-[1.75rem] sm:text-[2rem] md:text-[2.75rem] font-extrabold leading-[1.08] mb-3 sm:mb-4 text-white tracking-tight"
        >
          Descubra o <br />
          <span className="bg-gradient-to-r from-blue-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent">
            potencial do seu quintal
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="text-center text-[13px] sm:text-sm md:text-base text-white/55 mb-6 sm:mb-8 max-w-xs mx-auto leading-relaxed"
        >
          Digite sua cidade para encontrar a unidade Splash mais próxima e fazer o quiz do seu quintal.
        </motion.p>

        {/* City search */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="w-full max-w-xs space-y-3"
        >
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/40 pointer-events-none" />
            <Input
              type="text"
              placeholder="Digite sua cidade..."
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value);
                if (searchState !== 'idle' && searchState !== 'searching') {
                  setSearchState('idle');
                }
              }}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4 py-6 rounded-2xl bg-white/10 backdrop-blur-md border-white/15 text-white placeholder:text-white/35 text-[15px] focus:border-blue-400/50 focus:ring-blue-400/20"
            />
          </div>

          <Button
            onClick={handleSearch}
            disabled={cityInput.trim().length < 2 || searchState === 'searching'}
            size="lg"
            className="text-[15px] px-8 py-7 rounded-2xl font-bold gap-3 w-full gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50"
          >
            {searchState === 'searching' ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Encontrar minha unidade
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </>
            )}
          </Button>
        </motion.div>

        {/* Results area */}
        <AnimatePresence mode="wait">
          {searchState === 'results' && matches.length > 1 && (
            <motion.div
              key="multi"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-xs mt-4 space-y-2"
            >
              <p className="text-white/60 text-xs text-center mb-2">
                Encontramos {matches.length} unidades na sua região:
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
            </motion.div>
          )}

          {searchState === 'no-match' && (
            <motion.div
              key="no-match"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-xs mt-4"
            >
              <div className="px-4 py-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
                <p className="text-white/70 text-sm mb-2">
                  Ainda não temos cobertura para "<span className="font-semibold">{cityInput.trim()}</span>".
                </p>
                {nearestFranchise && (
                  <>
                    <p className="text-white/50 text-xs mb-3">
                      A unidade mais próxima é:
                    </p>
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
            </motion.div>
          )}

          {searchState === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-xs mt-4"
            >
              <p className="text-center text-red-300/80 text-sm">
                Erro ao buscar. Tente novamente.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center gap-3 sm:gap-5 mt-6 sm:mt-8 mb-2 flex-wrap"
        >
          <div className="flex items-center gap-1.5 text-white/35">
            <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span className="text-[9px] sm:text-[10px] font-medium">3 minutos</span>
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
        </motion.div>
      </div>
    </div>
  );
}
