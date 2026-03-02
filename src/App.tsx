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
import Dashboard from "./pages/Dashboard";
import RoomTypes from "./pages/RoomTypes";
import Historical from "./pages/Historical";
import Upload from "./pages/Upload";
import Analysis from "./pages/Analysis";
import NotFound from "./pages/NotFound";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

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
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </MonthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;