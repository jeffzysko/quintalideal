import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ValorizationSimulatorProps {
  score: number;
}

export function ValorizationSimulator({ score }: ValorizationSimulatorProps) {
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border rounded-2xl p-5 mt-5 text-left shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-secondary" />
        <h3 className="font-bold text-sm" style={{ fontFamily: 'Montserrat' }}>
          Valorização do imóvel
        </h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Casas com piscina podem valorizar entre <strong>10% e 20%</strong>.
      </p>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
          <Input
            value={valorImovel}
            onChange={handleInputChange}
            placeholder="Valor do imóvel"
            className="pl-10 text-sm"
            inputMode="numeric"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => numericValue > 0 && setShowResult(true)}
          disabled={numericValue === 0}
          className="shrink-0"
        >
          <Calculator className="w-4 h-4 mr-1" />
          Simular
        </Button>
      </div>

      {showResult && numericValue > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-accent/30 rounded-xl p-4 border border-accent"
        >
          <p className="text-xs text-muted-foreground mb-1">
            Uma piscina como essa pode agregar aproximadamente:
          </p>
          <p className="text-lg font-bold text-secondary" style={{ fontFamily: 'Montserrat' }}>
            {formatCurrency(valorMin)} a {formatCurrency(valorMax)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">ao valor do seu imóvel.</p>
        </motion.div>
      )}

      {!showResult && (
        <div className="bg-accent/20 rounded-xl p-3 border border-accent/30">
          <p className="text-xs text-muted-foreground">
            <strong>Exemplo:</strong> Um imóvel de R$ 500.000 pode valorizar entre{' '}
            <strong className="text-secondary">R$ 50.000 e R$ 100.000</strong> com uma piscina.
          </p>
        </div>
      )}
    </motion.div>
  );
}
