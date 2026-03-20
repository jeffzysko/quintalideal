import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export type TimeRange = '7' | '30' | '90' | '365' | 'all';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  className?: string;
  showAll?: boolean;
}

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '365', label: 'Último ano' },
  { value: 'all', label: 'Todo o período' },
];

export function TimeRangeSelector({ value, onChange, className = '', showAll = true }: TimeRangeSelectorProps) {
  const options = showAll ? OPTIONS : OPTIONS.filter(o => o.value !== 'all');

  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <SelectTrigger className={`w-[160px] min-h-[44px] sm:min-h-[36px] text-xs rounded-xl gap-1.5 ${className}`}>
        <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Filter items by time range, returning { current, previous } arrays for comparison */
export function filterByTimeRange<T extends { created_at: string }>(
  items: T[],
  range: TimeRange,
): { current: T[]; previous: T[] } {
  if (range === 'all') return { current: items, previous: [] };

  const days = parseInt(range);
  const now = Date.now();
  const currentStart = now - days * 86400000;
  const previousStart = currentStart - days * 86400000;

  const current: T[] = [];
  const previous: T[] = [];

  for (const item of items) {
    const t = Date.parse(item.created_at);
    if (t >= currentStart) current.push(item);
    else if (t >= previousStart) previous.push(item);
  }

  return { current, previous };
}
