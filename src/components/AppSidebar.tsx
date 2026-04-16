import {
  Home,
  CalendarDays,
  Settings,
  MessageCircle,
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
  FileText,
  Star,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  matchTab?: string;
}

const ADMIN_TABS: SidebarNavItem[] = [
  { title: 'Inteligência', url: '/admin?tab=overview', icon: BarChart3, matchTab: 'overview' },
  { title: 'Performance QI', url: '/admin?tab=performance-qi', icon: Target, matchTab: 'performance-qi' },
  { title: 'Analytics', url: '/admin?tab=analytics', icon: Activity, matchTab: 'analytics' },
  { title: 'Leads', url: '/admin?tab=leads', icon: Users, matchTab: 'leads' },
  { title: 'Franquias', url: '/admin?tab=franchises', icon: Building2, matchTab: 'franchises' },
  { title: 'Territórios', url: '/admin?tab=cities', icon: Globe, matchTab: 'cities' },
];

const SUPER_ADMIN_TABS: SidebarNavItem[] = [
  { title: 'Funil Geral', url: '/admin?tab=kanban', icon: Kanban, matchTab: 'kanban' },
  { title: 'Usuários', url: '/admin?tab=users', icon: Users, matchTab: 'users' },
  { title: 'E-mails', url: '/admin?tab=emails', icon: Mail, matchTab: 'emails' },
  { title: 'WhatsApp', url: '/admin?tab=whatsapp', icon: MessageCircle, matchTab: 'whatsapp' },
  { title: 'Visão Franquia', url: '/admin?tab=franchise-view', icon: Eye, matchTab: 'franchise-view' },
  { title: 'Receita', url: '/superadmin/receita', icon: TrendingUp, matchPaths: ['/superadmin/receita'] },
];

const FRANCHISE_TABS: SidebarNavItem[] = [
  { title: 'Leads', url: '/franquia?tab=leads', icon: Users, matchTab: 'leads' },
  { title: 'Funil', url: '/franquia?tab=funnel', icon: Workflow, matchTab: 'funnel' },
  { title: 'Propostas', url: '/propostas', icon: FileText, matchPaths: ['/propostas'] },
  { title: 'Catalogo', url: '/catalogo', icon: BookOpen, matchPaths: ['/catalogo'] },
  { title: 'Metas', url: '/franquia?tab=achievements', icon: TrendingUp, matchTab: 'achievements' },
  { title: 'Relatorios', url: '/franquia?tab=reports', icon: BarChart3, matchTab: 'reports' },
  { title: 'Planos', url: '/planos', icon: Star, matchPaths: ['/planos'] },
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
  const { role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  const currentTab = new URLSearchParams(location.search).get('tab');

  const isActive = (item: SidebarNavItem) => {
    const basePath = item.url.split('?')[0];
    if (item.matchTab) {
      if (location.pathname !== basePath) return false;
      if (item.matchTab === 'overview' && !currentTab) return true;
      if (item.matchTab === 'leads' && !currentTab && basePath === '/franquia') return true;
      return currentTab === item.matchTab;
    }
    if (location.pathname === basePath) return true;
    if (item.matchPaths) return item.matchPaths.some((p) => location.pathname.startsWith(p));
    return false;
  };

  const hasActiveItem = (items: SidebarNavItem[]) => items.some(isActive);

  const handleNav = (url: string) => {
    navigate(url);
  };

  const getDataTour = (item: SidebarNavItem): string | undefined => {
    if (item.title === 'Propostas') return 'nav-propostas';
    if (item.title === 'Catalogo') return 'nav-catalogo';
    if (item.title === 'Planos') return 'nav-planos';
    return undefined;
  };

  const renderNavItem = (item: SidebarNavItem) => {
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
            data-tour={getDataTour(item)}
            className={`w-full flex items-center gap-2 ${active ? 'bg-primary/10 text-primary font-medium' : ''}`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.title}</span>
          </button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderCollapsibleGroup = (label: string, items: SidebarNavItem[]) => (
    <Collapsible defaultOpen={hasActiveItem(items)} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex w-full items-center justify-between [&[data-state=open]>svg]:rotate-90">
            {label}
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => renderNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <img
            src={logoQuintalIdeal}
            alt="Quintal Ideal"
            className="h-8 shrink-0 object-contain brightness-0 invert"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Common navigation — always open */}
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? 'Navegação' : 'Painel'}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(isAdmin ? ADMIN_NAV : FRANCHISE_NAV).map((item) => renderNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Franchise tabs — collapsible */}
        {!isAdmin && renderCollapsibleGroup('Gestão', FRANCHISE_TABS)}

        {/* Admin Fábrica tabs — collapsible */}
        {isAdmin && renderCollapsibleGroup('Fábrica', ADMIN_TABS)}

        {/* Super Admin exclusive tabs — collapsible */}
        {isSuperAdmin && renderCollapsibleGroup('Super Admin', SUPER_ADMIN_TABS)}
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {BOTTOM_NAV.map((item) => renderNavItem(item))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={collapsed ? 'Sair' : undefined}
                  onClick={() => void signOut()}
                >
                  <LogOut className="h-4 w-4 shrink-0 text-destructive" />
                  <span className="truncate text-destructive">Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
