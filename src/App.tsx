import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import Index from "./pages/Index";
import { Footer } from "@/components/Footer";
const NotFound = lazy(() => import("./pages/NotFound"));

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
const WebhookDocs = lazy(() => import("./pages/WebhookDocs"));
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const Suporte = lazy(() => import("./pages/Suporte"));

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

const NO_FOOTER_PATHS = new Set(['/', '/explorar']);

function LayoutWithFooter() {
  const { pathname } = useLocation();
  const hideFooter = NO_FOOTER_PATHS.has(pathname) || /^\/[^/]+$/.test(pathname) && !['mapa', 'login', 'forgot-password', 'reset-password', 'perfil', 'painel', 'franquia', 'admin', 'docs', 'termos', 'privacidade'].includes(pathname.slice(1).split('/')[0]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Outlet />
      </div>
      {!hideFooter && <Footer />}
    </div>
  );
}

function AppRoutes() {
  usePrefetchRoutes();
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<LazyFallback />}>
                  <Routes>
                    {/* Pages WITHOUT footer (quiz/lead flow) */}
                    <Route path="/" element={<Index />} />
                    <Route path="/explorar" element={<Index />} />

                    {/* Pages WITH footer */}
                    <Route element={<LayoutWithFooter />}>
                      <Route path="/mapa" element={<MapaQuintais />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/termos" element={<TermosDeUso />} />
                      <Route path="/privacidade" element={<PoliticaPrivacidade />} />
                      <Route
                        path="/suporte"
                        element={
                          <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica', 'super_admin']}>
                            <Suporte />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/perfil"
                        element={
                          <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica', 'super_admin']}>
                            <ProfileSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="/painel" element={<PainelRouter />} />
                      <Route
                        path="/franquia"
                        element={
                          <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica', 'super_admin']}>
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
                      <Route path="/docs/webhook" element={<WebhookDocs />} />
                    </Route>

                    {/* Franchise dynamic landing - NO footer (quiz flow) */}
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
}

export default AppRoutes;