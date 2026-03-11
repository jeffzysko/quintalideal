import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Prefetch likely routes after initial load
function usePrefetchRoutes() {
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./pages/Login");
      import("./pages/FranchiseLanding");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
}

// Lazy load non-critical routes
const MapaQuintais = lazy(() => import("./pages/MapaQuintais"));
const FranchiseLanding = lazy(() => import("./pages/FranchiseLanding"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PainelRouter = lazy(() => import("./pages/PainelRouter"));
const FranchiseDashboard = lazy(() => import("./pages/FranchiseDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const RadarMercado = lazy(() => import("./pages/RadarMercado"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function AppRoutes() {
  usePrefetchRoutes();
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/explorar" element={<Index />} />
              <Route path="/mapa" element={<MapaQuintais />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica']}>
                    <ProfileSettings />
                  </ProtectedRoute>
                }
              />
              <Route path="/painel" element={<PainelRouter />} />
              <Route
                path="/franquia"
                element={
                  <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica']}>
                    <FranchiseDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/painel/lead/:id"
                element={
                  <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica']}>
                    <LeadDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin_fabrica']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/radar"
                element={
                  <ProtectedRoute allowedRoles={['admin_fabrica']}>
                    <RadarMercado />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/lead/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin_fabrica']}>
                    <LeadDetail />
                  </ProtectedRoute>
                }
              />
              {/* Franchise dynamic landing - must be last before catch-all */}
              <Route path="/:slug" element={<FranchiseLanding />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;