import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface KPI {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  iconBg?: string;
}

interface AdminKPICardsProps {
  kpis: KPI[];
  columns?: number;
}

const COLOR_BG_MAP: Record<string, string> = {
  'text-primary': 'icon-bg-blue',
  'text-emerald-600': 'icon-bg-green',
  'text-secondary': 'icon-bg-pink',
  'text-violet-600': 'icon-bg-violet',
  'text-amber-600': 'icon-bg-amber',
};

// Static grid classes — Tailwind can't detect dynamic `grid-cols-${n}`
const GRID_MAP: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6',
};

export function AdminKPICards({ kpis, columns }: AdminKPICardsProps) {
  const gridCols = columns ? (GRID_MAP[columns] || GRID_MAP[6]) : GRID_MAP[6];

  return (
    <div className={`grid ${gridCols} gap-4 mb-8`}>
      {kpis.map((kpi, i) => {
        const iconBg = kpi.iconBg || COLOR_BG_MAP[kpi.color] || 'icon-bg-blue';
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.06, 0.15), type: 'spring', stiffness: 300, damping: 24 }}
          >
            <Card className="card-premium group overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {kpi.value}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
