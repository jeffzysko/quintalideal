import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function PainelRouter() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (role === 'admin_fabrica') return <Navigate to="/admin" replace />;
  if (role === 'franquia') return <Navigate to="/franquia" replace />;
  return <Navigate to="/login" replace />;
}
