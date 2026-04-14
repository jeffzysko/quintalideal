import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';

interface PanelHeaderProps {
  title?: string;
  children?: ReactNode;
}

export function PanelHeader({ title, children }: PanelHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-30 overflow-hidden md:hidden"
    >
      {/* Full-width blur backdrop — extends into safe area (Dynamic Island / notch) */}
      <div className="absolute inset-0 backdrop-blur-2xl bg-background/60" />

      {/* Safe area spacer — pushes content below the Dynamic Island / notch */}
      <div className="w-full" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      
      <div className="relative px-3 pt-2.5 pb-0.5">
      <header className="relative mx-auto max-w-7xl rounded-2xl overflow-hidden">
        {/* Animated glow border */}
        <div className="absolute inset-0 rounded-2xl p-px overflow-hidden">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), hsl(207 90% 54% / 0.15), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-border 4s ease-in-out infinite',
            }}
          />
        </div>

        {/* Glass background */}
        <div
          className="relative rounded-2xl border border-border/30 backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--card) / 0.85), hsl(var(--card) / 0.7))',
            boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.08), 0 4px 16px -4px rgba(0,0,0,0.1), inset 0 1px 0 0 hsl(0 0% 100% / 0.06)',
          }}
        >
          <div className="h-14 md:h-16 flex items-center justify-between px-3 sm:px-4 md:px-6">
            {/* Left: Logo + title */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <motion.div
                className="shrink-0"
                style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))' }}
                animate={{
                  filter: [
                    'drop-shadow(0 0 6px hsl(207 90% 54% / 0.3))',
                    'drop-shadow(0 0 12px hsl(207 90% 54% / 0.5))',
                    'drop-shadow(0 0 6px hsl(207 90% 54% / 0.3))',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <img
                  src={logoQuintalIdeal}
                  alt="Quintal Ideal"
                  className="h-7 md:h-9 w-auto dark:brightness-0 dark:invert"
                />
              </motion.div>
              {title && (
                <>
                  <div className="h-5 w-px bg-border/40 hidden sm:block" />
                  <span className="text-sm font-semibold text-foreground tracking-tight truncate hidden sm:block">
                    {title}
                  </span>
                </>
              )}
            </div>

            {/* Right: Actions */}
            <nav className="flex items-center gap-0.5 sm:gap-1">
              {children}
            </nav>
          </div>
        </div>
      </header>
      </div>
    </motion.div>
  );
}
