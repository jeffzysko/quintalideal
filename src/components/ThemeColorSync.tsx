import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Syncs the <meta name="theme-color"> tag with the current theme
 * so the browser chrome / PWA status bar matches.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    // Light: splash blue, Dark: dark background
    meta.setAttribute('content', resolvedTheme === 'dark' ? '#0a1628' : '#08a1d6');
  }, [resolvedTheme]);

  return null;
}
