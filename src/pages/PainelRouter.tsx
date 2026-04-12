import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function PainelRouter() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role === 'super_admin' || role === 'admin_fabrica') return <Navigate to="/admin" replace />;
  if (role === 'franquia') return <Navigate to="/hoje" replace />;
  return <Navigate to="/login" replace />;
}
