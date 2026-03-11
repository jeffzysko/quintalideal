import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { cidadesRS } from '@/lib/cities';
import { ExplorerProgress } from './ExplorerProgress';
import { MapPin, Search, Check } from 'lucide-react';

interface QuizOption {
  value: string;
  label: string;
  emoji?: string;
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
}

export function QuizStep({ step, totalSteps, question, options, type = 'options', onAnswer, onBack, explorerStep }: QuizStepProps) {
  const [citySearch, setCitySearch] = useState('');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  const filteredCities = useMemo(() => {
    if (!citySearch || citySearch.length < 2) return [];
    const search = citySearch.toLowerCase();
    return cidadesRS.filter(c => c.toLowerCase().includes(search)).slice(0, 6);
  }, [citySearch]);

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    setTimeout(() => onAnswer(value), 350);
  };

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
        <ExplorerProgress currentStep={explorerStep} onBack={onBack} />

        <div className="flex-1 flex flex-col justify-center -mt-14 sm:-mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4 }}
            className="glass-card rounded-3xl p-5 sm:p-8"
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-5 sm:mb-8 text-foreground leading-snug tracking-tight">
              {question}
            </h2>

            {type === 'options' && options && (
              <div className="space-y-2">
                {options.map((opt, i) => {
                  const isSelected = selectedValue === opt.value;
                  return (
                    <motion.button
                      key={opt.value}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + i * 0.05 }}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 text-left group relative overflow-hidden active:scale-[0.98] ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border bg-background hover:border-primary/40 hover:bg-accent/30'
                      }`}
                    >
                      {/* Selection indicator */}
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

                      {/* Selected glow */}
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

            {type === 'city' && (
              <div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={citySearch}
                    onChange={e => setCitySearch(e.target.value)}
                    placeholder="Digite o nome da sua cidade..."
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
                    {filteredCities.map((city, i) => (
                      <motion.button
                        key={city}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => onAnswer(city)}
                        className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-accent active:bg-accent/70 transition-colors flex items-center gap-3 text-sm group"
                      >
                        <MapPin className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{city}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
                {citySearch.length >= 2 && filteredCities.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Nenhuma cidade encontrada
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
