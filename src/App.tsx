import { lazy, Suspense, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AdminRoute from "@/components/auth/AdminRoute";
import { MonthProvider } from "@/contexts/MonthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import {
  DashboardSkeleton,
  RoomTypesSkeleton,
  HistoricalSkeleton,
  AnalysisSkeleton,
  WebsiteAnalyticsSkeleton,
  UploadSkeleton,
  ChangelogSkeleton,
  NotFoundSkeleton,
} from "./components/PageSkeletons";

const Dashboard = lazy(() => routeLoaders["/dashboard"]());
const RoomTypes = lazy(() => routeLoaders["/room-types"]());
const Historical = lazy(() => routeLoaders["/historical"]());
const Upload = lazy(() => routeLoaders["/upload"]());
const Analysis = lazy(() => routeLoaders["/analysis"]());
const WebsiteAnalytics = lazy(() => routeLoaders["/website-analytics"]());
const Changelog = lazy(() => routeLoaders["/changelog"]());
const NotFound = lazy(() => import("./pages/NotFound"));

function withSuspense(node: React.ReactNode, fallback: React.ReactNode) {
  return <Suspense fallback={fallback}>{node}</Suspense>;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cached data for 24h so persisted entries survive reloads.
      gcTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "rs-dashboard-query-cache",
});

// Bump when query shapes change to invalidate old persisted data.
const CACHE_BUSTER = "v2";

// Lazy-load the command palette so it doesn't block initial render.
const CommandPalette = lazy(() => import("./components/CommandPalette"));


// Redirect authenticated users away from login
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Wraps <Routes> so that route changes are rendered inside a
// document.startViewTransition() call, producing a smooth cross-fade.
// Falls back to instant navigation on browsers without the API.
function ViewTransitionRoutes({ children }: { children: (loc: ReturnType<typeof useLocation>) => React.ReactNode }) {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(location);

  useEffect(() => {
    if (location === displayed) return;
    const startVT = (document as unknown as { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!startVT || reduce) {
      setDisplayed(location);
      return;
    }
    startVT.call(document, () => {
      flushSync(() => setDisplayed(location));
    });
  }, [location, displayed]);

  return <>{children(displayed)}</>;
}

const App = () => (

  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24, buster: CACHE_BUSTER }}
  >
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <MonthProvider>
          <ViewTransitionRoutes>
            {(loc) => (
              <Routes location={loc}>
                {/* Public route - Login */}
                <Route path="/" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />

                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    {withSuspense(<Dashboard key="dashboard" />, <DashboardSkeleton />)}
                  </ProtectedRoute>
                } />
                <Route path="/room-types" element={
                  <ProtectedRoute>
                    {withSuspense(<RoomTypes key="room-types" />, <RoomTypesSkeleton />)}
                  </ProtectedRoute>
                } />
                <Route path="/historical" element={
                  <ProtectedRoute>
                    {withSuspense(<Historical key="historical" />, <HistoricalSkeleton />)}
                  </ProtectedRoute>
                } />
                <Route path="/upload" element={
                  <AdminRoute>
                    {withSuspense(<Upload key="upload" />, <UploadSkeleton />)}
                  </AdminRoute>
                } />
                <Route path="/analysis" element={
                  <ProtectedRoute>
                    {withSuspense(<Analysis key="analysis" />, <AnalysisSkeleton />)}
                  </ProtectedRoute>
                } />
                <Route path="/website-analytics" element={
                  <ProtectedRoute>
                    {withSuspense(<WebsiteAnalytics key="website-analytics" />, <WebsiteAnalyticsSkeleton />)}
                  </ProtectedRoute>
                } />
                <Route path="/changelog" element={
                  <AdminRoute>
                    {withSuspense(<Changelog key="changelog" />, <ChangelogSkeleton />)}
                  </AdminRoute>
                } />

                {/* Catch-all */}
                <Route path="*" element={withSuspense(<NotFound />, <NotFoundSkeleton />)} />
              </Routes>
            )}
          </ViewTransitionRoutes>

          {/* Global command palette — available to authenticated users */}
          <Suspense fallback={null}>
            <CommandPalette queryClient={queryClient} />
          </Suspense>
          </MonthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;