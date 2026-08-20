import type { QueryClient } from '@tanstack/react-query';

/**
 * Single source of truth for the route chunk loaders.
 * Used by React.lazy in App.tsx and by nav hover preloading in DashboardLayout.
 */
export const routeLoaders = {
  '/dashboard': () => import('@/pages/Dashboard'),
  '/room-types': () => import('@/pages/RoomTypes'),
  '/historical': () => import('@/pages/Historical'),
  '/analysis': () => import('@/pages/Analysis'),
  '/website-analytics': () => import('@/pages/WebsiteAnalytics'),
  '/upload': () => import('@/pages/Upload'),
  '/changelog': () => import('@/pages/Changelog'),
} as const;

export type RoutePath = keyof typeof routeLoaders;

/** A route module may export this to warm its own data once its chunk is loaded. */
type PrefetchableModule = {
  prefetchRouteData?: (queryClient: QueryClient, month?: string) => void;
};

const started = new Set<string>();

export function preloadRoute(path: string, queryClient?: QueryClient, month?: string) {
  const loader = routeLoaders[path as RoutePath];
  if (!loader || started.has(path)) return;
  started.add(path);
  loader()
    .then((mod) => {
      if (queryClient) (mod as PrefetchableModule).prefetchRouteData?.(queryClient, month);
    })
    .catch(() => {
      // Allow a retry on the next hover if the chunk failed to load.
      started.delete(path);
    });
}
