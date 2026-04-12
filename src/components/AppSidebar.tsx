import {
  Home,
  LayoutDashboard,
  Map,
  Trophy,
  Settings,
  HelpCircle,
  Radar,
  Bell,
  Workflow,
  
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
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
}

const ADMIN_NAV: SidebarNavItem[] = [
  { title: 'Início', url: '/hoje', icon: Home },
  { title: 'Painel Admin', url: '/admin', icon: LayoutDashboard, matchPaths: ['/admin'] },
  { title: 'Radar de Mercado', url: '/admin/radar', icon: Radar },
  { title: 'Mapa', url: '/mapa', icon: Map },
  { title: 'Ranking', url: '/ranking', icon: Trophy },
  { title: 'Notificações', url: '/notificacoes', icon: Bell },
];

const FRANCHISE_NAV: SidebarNavItem[] = [
  { title: 'Início', url: '/hoje', icon: Home },
  { title: 'Painel', url: '/franquia', icon: LayoutDashboard, matchPaths: ['/franquia', '/painel'] },
  { title: 'Funil', url: '/franquia?tab=funnel', icon: Workflow },
  { title: 'Mapa', url: '/mapa', icon: Map },
  { title: 'Ranking', url: '/ranking', icon: Trophy },
  { title: 'Notificações', url: '/notificacoes', icon: Bell },
];

const BOTTOM_NAV: SidebarNavItem[] = [
  { title: 'Configurações', url: '/perfil', icon: Settings },
  { title: 'Suporte', url: '/suporte', icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { role } = useAuth();
  const location = useLocation();

  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const mainNav = isAdmin ? ADMIN_NAV : FRANCHISE_NAV;

  const isActive = (item: SidebarNavItem) => {
    const basePath = item.url.split('?')[0];
    if (location.pathname === basePath) return true;
    if (item.matchPaths) return item.matchPaths.some((p) => location.pathname.startsWith(p));
    return false;
  };

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
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === '/hoje'}
                        className="hover:bg-muted/50"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {BOTTOM_NAV.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-muted/50"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
