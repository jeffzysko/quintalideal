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
import { PageTransition } from "@/components/PageTransition";
import { CommandPalette } from "@/components/CommandPalette";
import HomePage from "./pages/HomePage";
import { Footer } from "@/components/Footer";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { NetworkStatus } from "@/components/NetworkStatus";
import { BottomNav } from "@/components/BottomNav";
import { PullToRefresh } from "@/components/PullToRefresh";
const NotFound = lazy(() => import("./pages/NotFound"));
const ExplorarPage = lazy(() => import("./pages/ExplorarPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));

// Prefetch likely routes when browser is idle
function usePrefetchRoutes() {
  useEffect(() => {
    const prefetch = () => {
      import("./pages/Login");
      import("./pages/FranchiseLanding");
    };
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetch, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(prefetch, 3000);
      return () => clearTimeout(timer);
    }
  }, []);
}

// Lazy load non-critical routes
const MapaQuintais = lazy(() => import("./pages/MapaQuintais"));
const RankingQuintais = lazy(() => import("./pages/RankingQuintais"));
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
const Notificacoes = lazy(() => import("./pages/Notificacoes"));
const HojePage = lazy(() => import("./pages/HojePage"));

const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
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

function AppRouteTree() {
  return (
    <Routes>
      {/* Pages WITHOUT footer (quiz/lead flow) */}
      <Route path="/" element={<HomePage />} />
      <Route path="/install" element={<ProtectedRoute allowedRoles={['franquia', 'admin_fabrica', 'super_admin']}><InstallPage /></ProtectedRoute>} />
      <Route path="/explorar" element={<ProtectedRoute allowedRoles={['admin_fabrica', 'super_admin']}><ExplorarPage /></ProtectedRoute>} />

      {/* Pages WITH footer */}
      <Route element={<LayoutWithFooter />}>
        <Route path="/mapa" element={<MapaQuintais />} />
        <Route path="/ranking" element={<RankingQuintais />} />
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
        <Route
          path="/notificacoes"
          element={
            <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica', 'super_admin']}>
              <Notificacoes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hoje"
          element={
            <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica', 'super_admin']}>
              <HojePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notificacoes/preferencias"
          element={
            <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica', 'super_admin']}>
              <NotificationPreferences />
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
            <ProtectedRoute allowedRoles={['franquia', 'admin_fabrica', 'super_admin']}>
              <LeadDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin_fabrica', 'super_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/radar"
          element={
            <ProtectedRoute allowedRoles={['admin_fabrica', 'super_admin']}>
              <RadarMercado />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/lead/:id"
          element={
            <ProtectedRoute allowedRoles={['admin_fabrica', 'super_admin']}>
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
                <ScrollToTop />
                <PullToRefresh>
                <Suspense fallback={<LazyFallback />}>
                  <AnimatedRoutes />
                </Suspense>
                <CookieConsentBanner />
                <CommandPalette />
                <PWAUpdatePrompt />
                <PWAInstallBanner />
                <NetworkStatus />
                <BottomNav />
                </PullToRefresh>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default AppRoutes;