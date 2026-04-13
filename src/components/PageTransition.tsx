import { ReactNode, useEffect, useRef } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Force reflow then add the "entered" class
    el.getBoundingClientRect();
    el.classList.add('page-transition-entered');
  }, []);

  return (
    <div
      ref={ref}
      className={`page-transition ${className || ''}`}
    >
      {children}
    </div>
  );
}
