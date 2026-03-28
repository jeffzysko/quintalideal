import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { cidades, type CityOption } from '@/lib/cities';
import { ExplorerProgress } from './ExplorerProgress';
import { MapPin, Search, Check } from 'lucide-react';
import { type Lang, t, UY_ENABLED_SLUGS } from '@/lib/i18n';

interface QuizOption {
  value: string;
  label: string;
  emoji?: string;
  image?: string;
}

interface QuizStepProps {
  step: number;
  totalSteps: number;
  question: string;
  options?: QuizOption[];
  type?: 'options' | 'city';
  onAnswer: (value: string) => void;
  onBack: () => void;
  explorerStep: number;
  franchiseSlug?: string;
  lang?: Lang;
  useImageLayout?: boolean;
}

function formatCityLabel(city: CityOption): string {
  if (city.pais === 'UY') return `${city.nome}, Uruguai 🇺🇾`;
  return `${city.nome}, ${city.estado || 'RS'}`;
}

export function QuizStep({ step, totalSteps: _totalSteps, question, options, type = 'options', onAnswer, onBack, explorerStep, franchiseSlug, lang = 'pt', useImageLayout = false }: QuizStepProps) {
  const [citySearch, setCitySearch] = useState('');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  const showUY = franchiseSlug ? UY_ENABLED_SLUGS.has(franchiseSlug) : false;

  const filteredCities = useMemo(() => {
    if (!citySearch || citySearch.length < 2) return [];
    const search = citySearch.toLowerCase();
    const pool = showUY ? cidades : cidades.filter(c => c.pais === 'BR');
    return pool.filter(c => c.nome.toLowerCase().includes(search)).slice(0, 8);
  }, [citySearch, showUY]);

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    setTimeout(() => onAnswer(value), 350);
  };

  const hasImages = useImageLayout && options?.some(o => o.image);

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="h-[100dvh] flex flex-col px-4 sm:px-6 py-3 sm:py-6 gradient-hero"
    >
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col">
        <ExplorerProgress currentStep={explorerStep} onBack={onBack} lang={lang} />

        <div className="flex-1 flex flex-col justify-center -mt-10 sm:-mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4 }}
            className="glass-card rounded-3xl p-5 sm:p-8"
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-5 sm:mb-8 text-foreground leading-snug tracking-tight">
              {question}
            </h2>

            {type === 'options' && options && !hasImages && (
              <div className="space-y-2">
                {options.map((opt, i) => {
                  const isSelected = selectedValue === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + Math.min(i * 0.05, 0.15) }}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 text-left group relative overflow-hidden active:scale-[0.98] ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border bg-background hover:border-primary/40 hover:bg-accent/30'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>

                      {opt.emoji && (
                        <span className="text-xl sm:text-2xl w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-muted group-hover:bg-accent transition-colors shrink-0">
                          {opt.emoji}
                        </span>
                      )}
                      <span className="font-medium text-[13px] sm:text-sm text-foreground">{opt.label}</span>

                      {isSelected && (
                        <motion.div
                          layoutId="selected-glow"
                          className="absolute inset-0 rounded-2xl pointer-events-none"
                          style={{ boxShadow: 'inset 0 0 0 2px hsl(207 90% 42%)' }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Image-based layout for preference step */}
            {type === 'options' && options && hasImages && (
              <div className="grid grid-cols-2 gap-2.5">
                {options.map((opt, i) => {
                  const isSelected = selectedValue === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + Math.min(i * 0.06, 0.15), type: 'spring', damping: 18 }}
                      onClick={() => handleSelect(opt.value)}
                      className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-200 active:scale-[0.97] group ${
                        isSelected
                          ? 'border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]'
                          : 'border-border hover:border-primary/40 hover:shadow-md'
                      }`}
                    >
                      {opt.image && (
                        <div className="aspect-[4/3] w-full overflow-hidden">
                          <img
                            src={opt.image}
                            alt={opt.label}
                            className={`w-full h-full object-cover transition-transform duration-300 ${
                              isSelected ? 'scale-105' : 'group-hover:scale-105'
                            }`}
                            loading="eager"
                          />
                        </div>
                      )}
                      <div className={`p-2.5 sm:p-3 text-center transition-colors ${
                        isSelected ? 'bg-primary/5' : 'bg-background'
                      }`}>
                        <div className="flex items-center justify-center gap-1.5">
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                            >
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </motion.div>
                          )}
                          {opt.emoji && !isSelected && <span className="text-sm">{opt.emoji}</span>}
                          <span className={`font-semibold text-xs sm:text-sm ${
                            isSelected ? 'text-primary' : 'text-foreground'
                          }`}>{opt.label}</span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {type === 'city' && (
              <div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                    placeholder={t('quiz_city_placeholder', lang)}
                    className="pl-11 py-6 rounded-2xl text-base bg-background border-border"
                    autoFocus
                  />
                </div>
                {filteredCities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 space-y-1"
                  >
                    {filteredCities.map((city, i) => {
                      const label = formatCityLabel(city);
                      const value = city.pais === 'UY' ? `${city.nome}, Uruguai` : city.nome;
                      return (
                        <motion.button
                          key={`${city.pais}-${city.nome}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.15) }}
                          onClick={() => onAnswer(value)}
                          className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-accent active:bg-accent/70 transition-colors flex items-center gap-3 text-sm group"
                        >
                          <MapPin className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">{label}</span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
                {citySearch.length >= 2 && filteredCities.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    {t('quiz_city_empty', lang)}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
