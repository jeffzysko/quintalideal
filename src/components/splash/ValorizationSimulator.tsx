import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Calculator, Home, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type Lang, t } from '@/lib/i18n';

interface ValorizationSimulatorProps {
  score: number;
  lang?: Lang;
}

export function ValorizationSimulator({ score: _score, lang = 'pt' }: ValorizationSimulatorProps) {
  const [valorImovel, setValorImovel] = useState('');
  const [showResult, setShowResult] = useState(false);

  const numericValue = parseFloat(valorImovel.replace(/\D/g, '')) || 0;
  const valorMin = numericValue * 0.10;
  const valorMax = numericValue * 0.20;

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { setValorImovel(''); setShowResult(false); return; }
    const num = parseInt(raw);
    setValorImovel(num.toLocaleString('pt-BR'));
    setShowResult(false);
  };

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden mt-8">
      <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground">{t('valor_title', lang)}</h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground">{t('valor_subtitle', lang)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-5 sm:pb-6">
        <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300 font-medium" dangerouslySetInnerHTML={{ __html: t('valor_info', lang) }} />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={valorImovel ? `R$ ${valorImovel}` : ''}
              onChange={handleInputChange}
              placeholder={t('valor_placeholder', lang)}
              className="pl-10 py-5 rounded-xl text-sm bg-background border-border"
              inputMode="numeric"
            />
          </div>
          <Button
            onClick={() => numericValue > 0 && setShowResult(true)}
            disabled={numericValue === 0}
            className="shrink-0 rounded-xl px-5 py-3 sm:py-0 gradient-blue hover:opacity-90 w-full sm:w-auto"
          >
            <Calculator className="w-4 h-4 mr-1.5" />
            {t('valor_btn', lang)}
          </Button>
        </div>

        <AnimatePresence>
          {showResult && numericValue > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)' }}
              >
                <div className="p-5">
                  <p className="text-emerald-200 text-xs font-medium mb-1 uppercase tracking-wider">
                    {t('valor_result_label', lang)}
                  </p>
                  <p className="text-white text-2xl font-extrabold tracking-tight">
                    {formatCurrency(valorMin)} — {formatCurrency(valorMax)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-emerald-900/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '70%' }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="h-full bg-emerald-300 rounded-full"
                      />
                    </div>
                    <span className="text-emerald-200 text-xs font-bold">+10-20%</span>
                  </div>
                  <p className="text-emerald-300/60 text-xs mt-2">
                    {t('valor_based', lang).replace('{val}', formatCurrency(numericValue))}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showResult && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Ex:</span> {t('valor_example', lang)}{' '}
              <span className="font-bold text-emerald-600">R$ 100.000</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
