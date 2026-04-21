import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  Sun,
  Settings,
  FileText,
  Kanban,
  Plus,
  LayoutDashboard,
  Package,
  MoreHorizontal,
  Building2,
  Users,
  BarChart2,
  Star,
  CalendarDays,
  BookOpen,
  TrendingUp,
  HelpCircle,
  Bell,
  Radar,
  Activity,
  Eye,
  Inbox,
  AlertTriangle,
  MessageCircle,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

interface NavItem {
  icon: typeof Sun;
  label: string;
  path: string;
  matchPaths?: string[];
  isAction?: boolean;
}

const SUPER_ADMIN_PRIMARY: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel', path: '/admin', matchPaths: ['/admin'] },
  { icon: Building2, label: 'Franquias', path: '/admin?tab=franchises' },
  { icon: Plus, label: '', path: '/propostas/nova', isAction: true },
  { icon: Eye, label: 'Visão', path: '/admin?tab=franchise-view' },
];

const SUPER_ADMIN_MORE: NavItem[] = [
  { icon: Sun, label: 'Início', path: '/hoje' },
  { icon: Kanban, label: 'Funil Geral', path: '/admin?tab=kanban' },
  { icon: Inbox, label: 'Candidaturas', path: '/admin?tab=candidaturas' },
  { icon: Star, label: 'Marcas', path: '/admin/marcas' },
  { icon: Users, label: 'Usuários', path: '/admin?tab=users' },
  { icon: DollarSign, label: 'Faturamento', path: '/superadmin/receita' },
  { icon: Radar, label: 'Radar de Mercado', path: '/admin/radar' },
  { icon: Activity, label: 'Status do Sistema', path: '/superadmin/status' },
  { icon: AlertTriangle, label: 'Logs de Erro', path: '/admin?tab=errors' },
  { icon: MessageCircle, label: 'WhatsApp', path: '/admin?tab=whatsapp' },
  { icon: CalendarDays, label: 'Agenda', path: '/agenda' },
  { icon: Bell, label: 'Notificações', path: '/notificacoes' },
  { icon: Settings, label: 'Configurações', path: '/perfil' },
  { icon: HelpCircle, label: 'Suporte', path: '/suporte' },
];

const FRANCHISE_PRIMARY: NavItem[] = [
  { icon: Sun, label: 'Hoje', path: '/hoje' },
  { icon: Kanban, label: 'Leads', path: '/franquia', matchPaths: ['/franquia', '/painel'] },
  { icon: Plus, label: '', path: '/propostas/nova', isAction: true },
  { icon: FileText, label: 'Propostas', path: '/propostas', matchPaths: ['/propostas'] },
];

const FRANCHISE_MORE: NavItem[] = [
  { icon: Package, label: 'Pós-venda', path: '/franquia?tab=pos-venda' },
  { icon: BarChart2, label: 'Relatórios', path: '/relatorio-crm' },
  { icon: BookOpen, label: 'Catálogo de Piscinas', path: '/catalogo' },
  { icon: CalendarDays, label: 'Agenda', path: '/agenda' },
  { icon: TrendingUp, label: 'Metas', path: '/franquia?tab=achievements' },
  { icon: Bell, label: 'Notificações', path: '/notificacoes' },
  { icon: Star, label: 'Planos', path: '/planos' },
  { icon: Settings, label: 'Configurações', path: '/perfil' },
  { icon: HelpCircle, label: 'Suporte', path: '/suporte' },
];

export function BottomNav() {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!user || !role) return null;

  const authenticatedPrefixes = ['/admin', '/franquia', '/hoje', '/agenda', '/perfil', '/suporte', '/docs', '/notificacoes', '/lead', '/painel', '/radar', '/propostas', '/catalogo', '/relatorio-crm', '/superadmin', '/planos'];
  const isAuthenticatedPage = authenticatedPrefixes.some(p => location.pathname.startsWith(p));
  if (!isAuthenticatedPage) return null;

  const primary = role === 'super_admin' ? SUPER_ADMIN_PRIMARY : FRANCHISE_PRIMARY;
  const more = role === 'super_admin' ? SUPER_ADMIN_MORE : FRANCHISE_MORE;

  const isActive = (item: NavItem) => {
    if (item.isAction) return false;
    const basePath = item.path.split('?')[0];
    if (location.pathname === basePath) return true;
    if (item.matchPaths) return item.matchPaths.some(p => location.pathname.startsWith(p));
    return false;
  };

  const handleNav = (path: string) => {
    setMoreOpen(false);
    navigate(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/95 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="flex items-stretch justify-around h-14">
        {primary.map((item) => {
          const active = isActive(item);

          if (item.isAction) {
            return (
              <button
                key="action-fab"
                onClick={() => {
                  navigator.vibrate?.(30);
                  navigate(item.path);
                }}
                aria-label="Nova proposta"
                className="flex-1 flex items-start justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-b from-primary to-primary/80 shadow-lg shadow-primary/30 -mt-5 flex items-center justify-center active:scale-95 transition-transform">
                  <Plus className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 relative transition-colors min-h-[48px]',
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

        <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
          <DrawerTrigger asChild>
            <button
              className="flex flex-col items-center justify-center gap-0.5 flex-1 relative transition-colors min-h-[48px] text-muted-foreground active:text-foreground"
              aria-label="Mais opções"
            >
              <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
              <span className="text-[10px] leading-tight font-medium">Mais</span>
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Mais opções</DrawerTitle>
            </DrawerHeader>
            <div className="grid grid-cols-3 gap-2 p-4 pb-8">
              {more.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNav(item.path)}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors text-center"
                >
                  <item.icon className="w-5 h-5 text-foreground" />
                  <span className="text-[11px] font-medium leading-tight text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
