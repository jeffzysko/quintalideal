import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import MapaQuintais from "./pages/MapaQuintais";
import FranchiseLanding from "./pages/FranchiseLanding";
import Login from "./pages/Login";
import PainelRouter from "./pages/PainelRouter";
import FranchiseDashboard from "./pages/FranchiseDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import LeadDetail from "./pages/LeadDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explorar" element={<Index />} />
            <Route path="/mapa" element={<MapaQuintais />} />
            <Route path="/login" element={<Login />} />
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
              path="/admin/lead/:id"
              element={
                <ProtectedRoute allowedRoles={['admin_fabrica']}>
                  <LeadDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/:slug" element={<FranchiseLanding />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
