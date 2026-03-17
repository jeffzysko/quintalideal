import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Workflow, CalendarClock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel', path: '/franquia', roles: ['franquia'] },
  { icon: LayoutDashboard, label: 'Painel', path: '/admin', roles: ['admin_fabrica', 'super_admin'] },
  { icon: CalendarClock, label: 'Hoje', path: '/hoje', roles: ['franquia', 'admin_fabrica', 'super_admin'] },
  { icon: Users, label: 'Leads', path: '/franquia', roles: ['franquia'] },
  { icon: Workflow, label: 'Funil', path: '/franquia', roles: ['franquia'] },
  { icon: Settings, label: 'Perfil', path: '/perfil', roles: ['franquia', 'admin_fabrica', 'super_admin'] },
];

// Simplified nav for each role
function getNavForRole(role: string | null): { icon: typeof LayoutDashboard; label: string; path: string; tabParam?: string }[] {
  if (role === 'admin_fabrica' || role === 'super_admin') {
    return [
      { icon: LayoutDashboard, label: 'Painel', path: '/admin' },
      { icon: CalendarClock, label: 'Hoje', path: '/hoje' },
      { icon: Users, label: 'Leads', path: '/admin', tabParam: 'leads' },
      { icon: Settings, label: 'Perfil', path: '/perfil' },
    ];
  }
  // franquia
  return [
    { icon: LayoutDashboard, label: 'Painel', path: '/franquia' },
    { icon: CalendarClock, label: 'Hoje', path: '/hoje' },
    { icon: Workflow, label: 'Funil', path: '/franquia', tabParam: 'funnel' },
    { icon: Settings, label: 'Perfil', path: '/perfil' },
  ];
}

export function BottomNav() {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Only show for authenticated users on authenticated pages
  if (!user || !role) return null;

  // Don't show on public pages
  const publicPaths = ['/', '/login', '/forgot-password', '/reset-password', '/termos', '/privacidade', '/install', '/ranking', '/mapa'];
  if (publicPaths.includes(location.pathname)) return null;

  const navItems = getNavForRole(role);

  const isActive = (item: typeof navItems[0]) => {
    if (item.tabParam) return false; // Tab params are secondary nav
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
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
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
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
