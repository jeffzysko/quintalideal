import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles) {
    if (!role) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(role)) return <Navigate to="/painel" replace />;
  }

  return <>{children}</>;
}
