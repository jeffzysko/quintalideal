import {
  Home,
  Settings,
  HelpCircle,
  Bell,
  Workflow,
  BarChart3,
  Target,
  Activity,
  Users,
  Building2,
  Globe,
  Mail,
  Eye,
  Kanban,
  TrendingUp,
  Webhook,
  LogOut,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logoSplash from '@/assets/logo-splash.png';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

interface SidebarNavItem {
  title: string;
  url: string;
  icon: typeof Home;
  matchPaths?: string[];
  matchTab?: string; // matches ?tab= value
}

// ── Admin sub-tabs (shown under Painel Admin) ──
const ADMIN_TABS: SidebarNavItem[] = [
  { title: 'Inteligência', url: '/admin?tab=overview', icon: BarChart3, matchTab: 'overview' },
  { title: 'Performance QI', url: '/admin?tab=performance-qi', icon: Target, matchTab: 'performance-qi' },
  { title: 'Analytics', url: '/admin?tab=analytics', icon: Activity, matchTab: 'analytics' },
  { title: 'Leads', url: '/admin?tab=leads', icon: Users, matchTab: 'leads' },
  { title: 'Franquias', url: '/admin?tab=franchises', icon: Building2, matchTab: 'franchises' },
  { title: 'Territórios', url: '/admin?tab=cities', icon: Globe, matchTab: 'cities' },
];

// Super-admin-only tabs
const SUPER_ADMIN_TABS: SidebarNavItem[] = [
  { title: 'Funil Geral', url: '/admin?tab=kanban', icon: Kanban, matchTab: 'kanban' },
  { title: 'Usuários', url: '/admin?tab=users', icon: Users, matchTab: 'users' },
  { title: 'E-mails', url: '/admin?tab=emails', icon: Mail, matchTab: 'emails' },
  { title: 'Visão Franquia', url: '/admin?tab=franchise-view', icon: Eye, matchTab: 'franchise-view' },
];

// ── Franchise sub-tabs ──
const FRANCHISE_TABS: SidebarNavItem[] = [
  { title: 'Leads', url: '/franquia?tab=leads', icon: Users, matchTab: 'leads' },
  { title: 'Funil', url: '/franquia?tab=funnel', icon: Workflow, matchTab: 'funnel' },
  { title: 'Metas', url: '/franquia?tab=achievements', icon: TrendingUp, matchTab: 'achievements' },
  { title: 'Relatórios', url: '/franquia?tab=reports', icon: BarChart3, matchTab: 'reports' },
];

const ADMIN_NAV: SidebarNavItem[] = [
  { title: 'Início', url: '/hoje', icon: Home },
  { title: 'Notificações', url: '/notificacoes', icon: Bell },
];

const FRANCHISE_NAV: SidebarNavItem[] = [
  { title: 'Início', url: '/hoje', icon: Home },
  { title: 'Notificações', url: '/notificacoes', icon: Bell },
];

const BOTTOM_NAV: SidebarNavItem[] = [
  { title: 'Integrações', url: '/perfil#integracoes', icon: Webhook },
  { title: 'Configurações', url: '/perfil', icon: Settings },
  { title: 'Suporte', url: '/suporte', icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  const currentTab = new URLSearchParams(location.search).get('tab');

  const isActive = (item: SidebarNavItem) => {
    const basePath = item.url.split('?')[0];
    // Tab-based matching
    if (item.matchTab) {
      if (location.pathname !== basePath) return false;
      // Default tab: active when no ?tab param
      if (item.matchTab === 'overview' && !currentTab) return true;
      if (item.matchTab === 'leads' && !currentTab && basePath === '/franquia') return true;
      return currentTab === item.matchTab;
    }
    if (location.pathname === basePath) return true;
    if (item.matchPaths) return item.matchPaths.some((p) => location.pathname.startsWith(p));
    return false;
  };

  const handleNav = (url: string) => {
    navigate(url);
  };

  const renderNavItem = (item: SidebarNavItem, indent = false) => {
    const active = isActive(item);
    return (
      <SidebarMenuItem key={item.title + item.url}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
        >
          <button
            onClick={() => handleNav(item.url)}
            className={`w-full flex items-center gap-2 ${indent ? 'pl-4' : ''} ${active ? 'bg-primary/10 text-primary font-medium' : ''}`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.title}</span>
          </button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Build admin sub-tabs
  const adminTabs = [
    ...ADMIN_TABS,
    ...(isSuperAdmin ? SUPER_ADMIN_TABS : []),
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src={logoSplash}
            alt="Logo"
            className="h-8 w-8 shrink-0 object-contain"
          />
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-foreground truncate">
              Quintal Ideal
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(isAdmin ? ADMIN_NAV : FRANCHISE_NAV).map((item) => renderNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboard sub-navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {isAdmin ? 'Painel Admin' : 'Painel'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin
                ? adminTabs.map((item) => renderNavItem(item, false))
                : FRANCHISE_TABS.map((item) => renderNavItem(item, false))
              }
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {BOTTOM_NAV.map((item) => renderNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
