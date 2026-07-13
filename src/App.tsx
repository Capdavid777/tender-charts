import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const queryClient = new QueryClient();

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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <MonthProvider>
          <Suspense fallback={<PageFallback />}>
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
                <Dashboard key="dashboard" />
              </ProtectedRoute>
            } />
            <Route path="/room-types" element={
              <ProtectedRoute>
                <RoomTypes key="room-types" />
              </ProtectedRoute>
            } />
            <Route path="/historical" element={
              <ProtectedRoute>
                <Historical key="historical" />
              </ProtectedRoute>
            } />
            <Route path="/upload" element={
              <AdminRoute>
                <Upload key="upload" />
              </AdminRoute>
            } />
            <Route path="/analysis" element={
              <ProtectedRoute>
                <Analysis key="analysis" />
              </ProtectedRoute>
            } />
            <Route path="/website-analytics" element={
              <ProtectedRoute>
                <WebsiteAnalytics key="website-analytics" />
              </ProtectedRoute>
            } />
            <Route path="/changelog" element={
              <AdminRoute>
                <Changelog key="changelog" />
              </AdminRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </MonthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;