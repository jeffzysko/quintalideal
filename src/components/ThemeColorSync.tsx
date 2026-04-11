import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Syncs all <meta name="theme-color"> tags with the current theme
 * so the browser chrome / PWA status bar matches.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    const color = resolvedTheme === 'dark' ? '#0a1628' : '#08a1d6';
    metas.forEach((meta) => meta.setAttribute('content', color));
  }, [resolvedTheme]);

  return null;
}
