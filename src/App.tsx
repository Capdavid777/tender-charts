import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

const Dashboard = lazy(() => import("./pages/Dashboard"));
const RoomTypes = lazy(() => import("./pages/RoomTypes"));
const Historical = lazy(() => import("./pages/Historical"));
const Upload = lazy(() => import("./pages/Upload"));
const Analysis = lazy(() => import("./pages/Analysis"));
const WebsiteAnalytics = lazy(() => import("./pages/WebsiteAnalytics"));
const Changelog = lazy(() => import("./pages/Changelog"));
const NotFound = lazy(() => import("./pages/NotFound"));

function withSuspense(node: React.ReactNode, fallback: React.ReactNode) {
  return <Suspense fallback={fallback}>{node}</Suspense>;
}

const queryClient = new QueryClient({
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
const CACHE_BUSTER = "v1";


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

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24, buster: CACHE_BUSTER }}
  >
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <MonthProvider>
          <Routes>
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
          </MonthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;