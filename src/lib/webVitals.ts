import type { Metric } from 'web-vitals';

const RATINGS: Record<string, string> = {
  good: '🟢',
  'needs-improvement': '🟡',
  poor: '🔴',
};

function report(metric: Metric) {
  const icon = RATINGS[metric.rating] ?? '⚪';
  const value =
    metric.name === 'CLS' ? metric.value.toFixed(3) : `${Math.round(metric.value)}ms`;
  // eslint-disable-next-line no-console
  console.log(
    `%c[Web Vitals] ${icon} ${metric.name}: ${value} (${metric.rating})`,
    'color:#2563eb;font-weight:600',
    metric,
  );

  // Optional: dispatch for any listener (analytics, overlays, etc.)
  window.dispatchEvent(new CustomEvent('web-vitals', { detail: metric }));
}

export async function initWebVitals() {
  try {
    const { onLCP, onINP, onCLS, onFCP, onTTFB } = await import('web-vitals');
    onLCP(report);
    onINP(report);
    onCLS(report);
    onFCP(report);
    onTTFB(report);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Web Vitals] failed to initialize', err);
  }
}
