import { MetricCard, MetricCardProps } from './MetricCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const GRID_MAP: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
};

interface MetricGridProps {
  metrics: MetricCardProps[];
  loading?: boolean;
  columns?: number;
}

function MetricSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-12 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-3 w-28 rounded" />
      </CardContent>
    </Card>
  );
}

export function MetricGrid({ metrics, loading, columns }: MetricGridProps) {
  const cols = columns ?? metrics.length;
  const gridCols = GRID_MAP[Math.min(cols, 6)] || GRID_MAP[4];

  if (loading) {
    return (
      <div className={`grid ${gridCols} gap-3 sm:gap-4 mb-6 sm:mb-8`}>
        {Array.from({ length: cols }).map((_, i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols} gap-3 sm:gap-4 mb-6 sm:mb-8`}>
      {metrics.map((metric, i) => (
        <MetricCard key={metric.label} {...metric} delay={i * 0.05} />
      ))}
    </div>
  );
}
