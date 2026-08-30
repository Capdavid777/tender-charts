import { useEffect, useRef, useState } from 'react';
import { warmWhenIdle } from '@/lib/idleWarm';

interface InViewOnceOptions {
  /** How far ahead of the viewport to trigger. */
  rootMargin?: string;
  /**
   * When set, the element also mounts during browser idle time (once the page
   * is visible) even if it was never scrolled to. Lower number = warmed first.
   */
  warmPriority?: number;
}

/**
 * useInViewOnce — returns a ref + boolean that flips to `true` the first
 * time the element approaches the viewport, on a fast scroll toward it, or
 * during idle time when `warmPriority` is set. Never flips back, so revealed
 * content stays mounted.
 */
export function useInViewOnce<T extends HTMLElement = HTMLDivElement>(
  options: string | InViewOnceOptions = {},
) {
  const opts: InViewOnceOptions = typeof options === 'string' ? { rootMargin: options } : options;
  const { rootMargin = '200px', warmPriority } = opts;

  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  // Idle warm-up: mount ahead of time so fast scrolls never hit a skeleton.
  useEffect(() => {
    if (inView || warmPriority === undefined) return;
    return warmWhenIdle(() => setInView(true), warmPriority);
  }, [inView, warmPriority]);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    let observer: IntersectionObserver | null = null;
    let currentMargin = '';

    const connect = (margin: string) => {
      if (margin === currentMargin) return;
      currentMargin = margin;
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setInView(true);
            observer?.disconnect();
          }
        },
        { rootMargin: margin },
      );
      observer.observe(el);
    };

    connect(rootMargin);

    // Fast-scroll awareness: widen the trigger margin while the user is
    // scrolling quickly so content is mounted before it reaches the viewport.
    let lastY = window.scrollY;
    let lastT = performance.now();
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const now = performance.now();
        const dy = Math.abs(window.scrollY - lastY);
        const dt = Math.max(now - lastT, 1);
        lastY = window.scrollY;
        lastT = now;
        const velocity = dy / dt; // px per ms
        if (velocity > 1.2) connect('1400px');
        else if (velocity > 0.5) connect('700px');
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    };
  }, [inView, rootMargin]);

  return { ref, inView };
}
