import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { BackButton } from '@/components/BackButton';
import logoSplash from '@/assets/logo-splash.png';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onBack: () => void;
  rightSlot?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, onBack, rightSlot }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-30"
    >
      {/* Full-width blur backdrop */}
      <div className="absolute inset-0 backdrop-blur-2xl bg-background/60" />

      <div className="relative px-3 pt-2.5">
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
            <div className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 gap-2">
              {/* Left: Back + Logo + Title */}
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="rounded-xl shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>

                <motion.img
                  src={logoSplash}
                  alt="Splash"
                  className="h-7 md:h-9 shrink-0 hidden sm:block"
                  style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))' }}
                  animate={{
                    filter: [
                      'drop-shadow(0 0 6px hsl(207 90% 54% / 0.3))',
                      'drop-shadow(0 0 12px hsl(207 90% 54% / 0.5))',
                      'drop-shadow(0 0 6px hsl(207 90% 54% / 0.3))',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div className="h-5 w-px bg-border/40 hidden sm:block" />

                <div className="min-w-0">
                  <h1 className="text-sm md:text-base font-semibold tracking-tight text-foreground flex items-center gap-1.5">
                    {icon && <span className="shrink-0">{icon}</span>}
                    <span className="truncate">{title}</span>
                  </h1>
                  {subtitle && (
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 hidden sm:block truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Right slot */}
              {rightSlot && (
                <div className="shrink-0">
                  {rightSlot}
                </div>
              )}
            </div>
          </div>
        </header>
      </div>
    </motion.div>
  );
}
