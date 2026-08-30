import { useEffect, useRef, useState } from 'react';

/**
 * useInViewOnce — returns a ref + boolean that flips to `true` the first
 * time the element approaches the viewport (default 200px margin), then
 * disconnects. Never flips back, so revealed content stays mounted.
 */
export function useInViewOnce<T extends HTMLElement = HTMLDivElement>(rootMargin = '200px') {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}
