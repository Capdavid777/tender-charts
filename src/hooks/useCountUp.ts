import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const DURATION = 700;

// Matches the first number in the string, e.g. "1,377,267.86" in "R1,377,267.86"
const NUM_RE = /-?\d[\d,\s]*(\.\d+)?/;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animates the numeric portion of an already-formatted display string
 * (e.g. "R1,377,267.86", "68.0%") from 0 up to its final value, keeping
 * any prefix/suffix, decimal count and thousands separators intact.
 */
export function useCountUp(value: string): string {
  const prefersReduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    const match = value.match(NUM_RE);
    if (!match) {
      setDisplay(value);
      return;
    }

    const raw = match[0];
    const target = Number(raw.replace(/[,\s]/g, ''));
    if (!Number.isFinite(target)) {
      setDisplay(value);
      return;
    }

    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
    const grouped = /[,\s]/.test(raw);
    const prefix = value.slice(0, match.index ?? 0);
    const suffix = value.slice((match.index ?? 0) + raw.length);

    const format = (n: number) =>
      prefix +
      n.toLocaleString('en-ZA', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: grouped,
      }) +
      suffix;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1);
      setDisplay(format(target * easeOut(t)));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, prefersReduced]);

  return display;
}
