import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionHeaderVariant = 'page' | 'section' | 'inline';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Lucide icon component (used by `section` variant).
   * Pass the component reference directly, e.g. `icon={BarChart3}`.
   */
  icon?: LucideIcon;
  /** Tailwind class for the icon background bubble (only `section` variant). */
  iconBg?: string;
  /** Right-side slot for actions (buttons, selectors, etc.). */
  rightSlot?: ReactNode;
  /** Visual variant. Defaults to `page` (sticky-style glass card). */
  variant?: SectionHeaderVariant;
  className?: string;
}

/**
 * Unified section heading component with three variants:
 * - `page`     → Glass-card header for tabbed pages (matches `<PageHeader>`).
 * - `section`  → Icon + title block for inner sections of a page.
 * - `inline`   → Compact title with bottom border for sub-sections.
 */
export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  iconBg = 'icon-bg-blue',
  rightSlot,
  variant = 'page',
  className,
}: SectionHeaderProps) {
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center justify-between border-b border-border/30 pb-3 mb-4',
          className
        )}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightSlot && <div className="shrink-0 ml-3">{rightSlot}</div>}
      </div>
    );
  }

  if (variant === 'section') {
    return (
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-5',
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                iconBg
              )}
            >
              <Icon className="w-[18px] h-[18px] text-primary" />
            </div>
          )}
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
      </div>
    );
  }

  // variant === 'page' → glass card (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn('sticky top-0 z-40 -mx-4 md:-mx-6 mb-4', className)}
    >
      <div className="relative px-4 md:px-6 pt-2.5">
        <header className="relative mx-auto max-w-7xl rounded-2xl overflow-hidden">
          {/* Animated glow border */}
          <div className="absolute inset-0 rounded-2xl p-px overflow-hidden">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), hsl(207 90% 54% / 0.15), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-border 4s ease-in-out infinite',
              }}
            />
          </div>

          {/* Glass background */}
          <div
            className="relative rounded-2xl border border-border/30 backdrop-blur-2xl"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--card) / 0.85), hsl(var(--card) / 0.7))',
              boxShadow:
                '0 8px 32px -8px hsl(var(--primary) / 0.08), 0 4px 16px -4px rgba(0,0,0,0.1), inset 0 1px 0 0 hsl(0 0% 100% / 0.06)',
            }}
          >
            <div className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 gap-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-sm md:text-base font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                  <span className="truncate">{title}</span>
                </h1>
                {subtitle && (
                  <p className="text-xs md:text-xs text-muted-foreground mt-0.5 hidden sm:block truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              {rightSlot && (
                <div className="shrink-0 flex items-center gap-2">{rightSlot}</div>
              )}
            </div>
          </div>
        </header>
      </div>
    </motion.div>
  );
}
