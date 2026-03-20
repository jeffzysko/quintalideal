/**
 * Web Vitals monitoring using native PerformanceObserver API.
 * Reports LCP, FCP, CLS, FID/INP, and TTFB to the console in development.
 * In production, logs are suppressed — swap reportMetric() for your analytics
 * endpoint (e.g., Supabase, PostHog, or DataDog) if needed.
 */

interface Metric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

function rate(name: string, value: number): Metric['rating'] {
  const thresholds: Record<string, [number, number]> = {
    LCP:  [2500, 4000],
    FCP:  [1800, 3000],
    CLS:  [0.1,  0.25],
    FID:  [100,  300],
    INP:  [200,  500],
    TTFB: [800,  1800],
  };
  const [good, poor] = thresholds[name] ?? [Infinity, Infinity];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function reportMetric(metric: Metric) {
  if (import.meta.env.DEV) {
    const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '🔴';
    console.log(`[WebVitals] ${emoji} ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`);
  }
  // Production hook — uncomment to send to your analytics:
  // fetch('/api/vitals', { method: 'POST', body: JSON.stringify(metric), keepalive: true });
}

export function initWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  // LCP — Largest Contentful Paint
  try {
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      reportMetric({ name: 'LCP', value: last.startTime, rating: rate('LCP', last.startTime) });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  // FCP — First Contentful Paint
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if ((entry as PerformanceEntry & { name: string }).name === 'first-contentful-paint') {
          reportMetric({ name: 'FCP', value: entry.startTime, rating: rate('FCP', entry.startTime) });
        }
      }
    }).observe({ type: 'paint', buffered: true });
  } catch {}

  // CLS — Cumulative Layout Shift
  try {
    let clsValue = 0;
    let clsSessionValue = 0;
    let clsSessionEntries: PerformanceEntry[] = [];
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!e.hadRecentInput) {
          const firstEntry = clsSessionEntries[0];
          const lastEntry = clsSessionEntries[clsSessionEntries.length - 1];
          if (clsSessionEntries.length &&
              e.startTime - (lastEntry as PerformanceEntry & { startTime: number }).startTime < 1000 &&
              e.startTime - (firstEntry as PerformanceEntry & { startTime: number }).startTime < 5000) {
            clsSessionValue += e.value;
            clsSessionEntries.push(entry);
          } else {
            clsSessionValue = e.value;
            clsSessionEntries = [entry];
          }
          if (clsSessionValue > clsValue) {
            clsValue = clsSessionValue;
            reportMetric({ name: 'CLS', value: clsValue * 1000, rating: rate('CLS', clsValue) });
          }
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}

  // FID — First Input Delay
  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { processingStart: number };
        const value = e.processingStart - entry.startTime;
        reportMetric({ name: 'FID', value, rating: rate('FID', value) });
      }
    }).observe({ type: 'first-input', buffered: true });
  } catch {}

  // INP — Interaction to Next Paint (Chrome 96+)
  try {
    new PerformanceObserver(list => {
      let maxDuration = 0;
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { duration: number; interactionId?: number };
        if ((e.interactionId ?? 0) > 0 && e.duration > maxDuration) {
          maxDuration = e.duration;
          reportMetric({ name: 'INP', value: maxDuration, rating: rate('INP', maxDuration) });
        }
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  } catch {}

  // TTFB — Time to First Byte
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const ttfb = nav.responseStart - nav.requestStart;
      reportMetric({ name: 'TTFB', value: ttfb, rating: rate('TTFB', ttfb) });
    }
  } catch {}
}
