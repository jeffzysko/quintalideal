import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  onClick,
  className,
}: StatCardProps) {
  const trendDirection = trend ? (trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'neutral') : null;
  const TrendIcon = trendDirection === 'up' ? TrendingUp : trendDirection === 'down' ? TrendingDown : Minus;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-border/40 bg-card p-5 shadow-sm',
        onClick && 'cursor-pointer hover:border-primary/30 hover:shadow-md transition-all',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-2 leading-none">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
          {trend && (
            <div
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold mt-2',
                trendDirection === 'up' && 'text-emerald-600',
                trendDirection === 'down' && 'text-destructive',
                trendDirection === 'neutral' && 'text-muted-foreground'
              )}
            >
              <TrendIcon className="w-3 h-3" />
              {trend.value > 0 ? '+' : ''}
              {trend.value}% <span className="font-normal text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </Card>
  );
}
