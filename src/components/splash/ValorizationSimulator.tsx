import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Calculator, Home, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ValorizationSimulatorProps {
  score: number;
}

export function ValorizationSimulator({ score: _score }: ValorizationSimulatorProps) {
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
      {/* Header with accent */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Valorização do Imóvel</h3>
            <p className="text-xs text-muted-foreground">Simule o impacto no valor da sua casa</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        {/* Info banner */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
          <ArrowUpRight className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 font-medium">
            Casas com piscina valorizam entre <strong>10% e 20%</strong> do valor do imóvel
          </p>
        </div>

        {/* Input */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={valorImovel ? `R$ ${valorImovel}` : ''}
              onChange={handleInputChange}
              placeholder="Valor do imóvel"
              className="pl-10 py-5 rounded-xl text-sm bg-background border-border"
              inputMode="numeric"
            />
          </div>
          <Button
            onClick={() => numericValue > 0 && setShowResult(true)}
            disabled={numericValue === 0}
            className="shrink-0 rounded-xl px-5 gradient-blue hover:opacity-90"
          >
            <Calculator className="w-4 h-4 mr-1.5" />
            Simular
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
                    Valorização estimada
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
                    Baseado no valor de {formatCurrency(numericValue)} do seu imóvel
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showResult && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Ex:</span> Imóvel de R$ 500.000 → valorização de até{' '}
              <span className="font-bold text-emerald-600">R$ 100.000</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
