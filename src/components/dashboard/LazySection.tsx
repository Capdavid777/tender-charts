import { ReactNode } from 'react';
import { useInViewOnce } from '@/hooks/useInViewOnce';
import { cn } from '@/lib/utils';

interface LazySectionProps {
  children: ReactNode;
  /** Skeleton shown until the section nears the viewport. */
  fallback: ReactNode;
  /** Estimated height (px) used for content-visibility containment after mount. */
  estimatedHeight?: number;
  /**
   * Order in which this section is warmed during idle time (lower = sooner).
   * Omit to only mount on scroll.
   */
  warmPriority?: number;
  className?: string;
}

/**
 * LazySection — defers mounting below-the-fold content until it scrolls
 * near the viewport. A correctly-sized skeleton holds the space so there is
 * no layout jump when the real content swaps in. Once revealed it stays
 * mounted. `content-visibility: auto` keeps off-screen paint work cheap.
 */
export default function LazySection({
  children,
  fallback,
  estimatedHeight = 400,
  warmPriority,
  className,
}: LazySectionProps) {
  const { ref, inView } = useInViewOnce({ warmPriority });

  return (
    <div
      ref={ref}
      className={cn(className, inView && 'motion-safe:animate-fade-in-up')}
      style={inView ? { contentVisibility: 'auto', containIntrinsicSize: `auto ${estimatedHeight}px` } : undefined}
    >
      {inView ? children : fallback}
    </div>
  );
}
