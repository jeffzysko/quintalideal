import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { cidadesRS } from '@/lib/cities';

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
}

export function QuizStep({ step, totalSteps, question, options, type = 'options', onAnswer, onBack }: QuizStepProps) {
  const [citySearch, setCitySearch] = useState('');
  const progress = ((step) / totalSteps) * 100;

  const filteredCities = useMemo(() => {
    if (!citySearch || citySearch.length < 2) return [];
    const search = citySearch.toLowerCase();
    return cidadesRS.filter(c => c.toLowerCase().includes(search)).slice(0, 6);
  }, [citySearch]);

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex flex-col px-6 py-8"
    >
      <div className="mb-6">
        <Progress value={progress} className="h-2 mb-2" />
        <div className="flex justify-between items-center">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar
          </button>
          <span className="text-xs text-muted-foreground">{step}/{totalSteps}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight" style={{ fontFamily: 'Montserrat' }}>
          {question}
        </h2>

        {type === 'options' && options && (
          <div className="space-y-3">
            {options.map(opt => (
              <motion.button
                key={opt.value}
                whileTap={{ scale: 0.97 }}
                onClick={() => onAnswer(opt.value)}
                className="w-full text-left px-5 py-4 rounded-2xl border-2 border-border bg-card hover:border-primary hover:bg-accent/50 transition-all font-medium text-base flex items-center gap-3"
              >
                {opt.emoji && <span className="text-2xl">{opt.emoji}</span>}
                {opt.label}
              </motion.button>
            ))}
          </div>
        )}

        {type === 'city' && (
          <div className="space-y-2">
            <Input
              value={citySearch}
              onChange={e => setCitySearch(e.target.value)}
              placeholder="Digite sua cidade..."
              className="text-lg py-6 rounded-xl"
              autoFocus
            />
            {filteredCities.length > 0 && (
              <div className="bg-card border rounded-xl overflow-hidden">
                {filteredCities.map(city => (
                  <button
                    key={city}
                    onClick={() => onAnswer(city)}
                    className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b last:border-b-0 border-border"
                  >
                    📍 {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
