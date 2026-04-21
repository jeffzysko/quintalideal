import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, LucideIcon, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  previousValue?: number;
  format?: 'number' | 'percent' | 'currency' | 'time';
  iconBg?: string;
  color?: string;
  delay?: number;
  onClick?: () => void;
  tooltip?: string;
}

function formatDelta(current: number, previous: number): { label: string; direction: 'up' | 'down' | 'neutral' } {
  if (previous === 0 && current === 0) return { label: '—', direction: 'neutral' };
  if (previous === 0) return { label: '+100%', direction: 'up' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { label: '0%', direction: 'neutral' };
  return {
    label: `${pct > 0 ? '+' : ''}${pct}%`,
    direction: pct > 0 ? 'up' : 'down',
  };
}

const COLOR_BG_MAP: Record<string, string> = {
  'text-primary': 'icon-bg-blue',
  'text-emerald-600': 'icon-bg-green',
  'text-secondary': 'icon-bg-pink',
  'text-violet-600': 'icon-bg-violet',
  'text-amber-600': 'icon-bg-amber',
};

export const MetricCard = memo(function MetricCard({ icon: Icon, label, value, previousValue, iconBg, color = 'text-primary', delay = 0, onClick, tooltip }: MetricCardProps) {
  const bg = iconBg || COLOR_BG_MAP[color] || 'icon-bg-blue';
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const hasDelta = previousValue !== undefined && !isNaN(numericValue);
  const delta = hasDelta ? formatDelta(numericValue, previousValue!) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
    >
      <Card
        className={`${onClick ? 'card-premium-interactive' : 'card-premium'} group`}
        onClick={onClick}
      >
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start gap-2 sm:gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center group-hover:scale-105 transition-transform`}>
              <Icon className={`w-[18px] h-[18px] sm:w-5 sm:h-5 ${color}`} />
            </div>
            <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1.5">
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground transition-colors" aria-label="Mais informações">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
              {delta && (
                <div className={`flex max-w-full items-center gap-0.5 whitespace-nowrap text-xs sm:text-xs font-semibold rounded-lg px-1.5 py-0.5 ${
                  delta.direction === 'up' ? 'text-emerald-600 bg-emerald-500/10' :
                  delta.direction === 'down' ? 'text-destructive bg-destructive/10' :
                  'text-muted-foreground bg-muted'
                }`}>
                  {delta.direction === 'up' ? <TrendingUp className="w-3 h-3" /> :
                   delta.direction === 'down' ? <TrendingDown className="w-3 h-3" /> :
                   <Minus className="w-3 h-3" />}
                  {delta.label}
                </div>
              )}
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-none">
            {value}
          </p>
          <p className="text-xs sm:text-xs text-muted-foreground mt-1.5 font-medium">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
});
