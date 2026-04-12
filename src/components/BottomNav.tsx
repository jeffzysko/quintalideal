import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { LayoutDashboard, Home, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  matchPaths?: string[];
}

function getNavForRole(role: string | null): NavItem[] {
  if (role === 'admin_fabrica' || role === 'super_admin') {
    return [
      { icon: Home, label: 'Início', path: '/hoje' },
      { icon: LayoutDashboard, label: 'Painel', path: '/admin', matchPaths: ['/admin'] },
      { icon: FileText, label: 'Propostas', path: '/propostas', matchPaths: ['/propostas'] },
      { icon: Settings, label: 'Perfil', path: '/perfil' },
    ];
  }

  return [
    { icon: Home, label: 'Início', path: '/hoje' },
    { icon: LayoutDashboard, label: 'Painel', path: '/franquia', matchPaths: ['/franquia', '/painel'] },
    { icon: FileText, label: 'Propostas', path: '/propostas', matchPaths: ['/propostas'] },
    { icon: Settings, label: 'Perfil', path: '/perfil' },
  ];
}

export function BottomNav() {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user || !role) return null;

  const authenticatedPrefixes = ['/admin', '/franquia', '/hoje', '/perfil', '/suporte', '/docs', '/notificacoes', '/lead', '/painel', '/radar', '/propostas'];
  const isAuthenticatedPage = authenticatedPrefixes.some(p => location.pathname.startsWith(p));
  if (!isAuthenticatedPage) return null;

  const navItems = getNavForRole(role);

  const isActive = (item: NavItem) => {
    const basePath = item.path.split('?')[0];
    if (location.pathname === basePath) return true;
    if (item.matchPaths) return item.matchPaths.some(p => location.pathname.startsWith(p));
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/95 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              data-tour={item.label === 'Início' ? 'nav-hoje' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 relative transition-colors min-h-[48px]',
                '-webkit-tap-highlight-color: transparent',
                active ? 'text-primary' : 'text-muted-foreground active:text-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute top-0 w-8 h-0.5 rounded-full bg-primary"
                  style={{ left: '50%', marginLeft: '-16px' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={cn('w-5 h-5', active && 'scale-110')} strokeWidth={active ? 2.5 : 2} />
              <span className={cn('text-[10px] leading-tight', active ? 'font-bold' : 'font-medium')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
