import {
  Home,
  CalendarDays,
  Settings,
  HelpCircle,
  Bell,
  Users,
  Building2,
  Kanban,
  TrendingUp,
  LogOut,
  FileText,
  Star,
  BookOpen,
  Package,
  LayoutDashboard,
  BarChart2,
  Activity,
  Radar,
  Sun,
  Eye,
  Inbox,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';

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
  dataTour?: string;
}

// ── Super Admin ──
const SUPER_ADMIN_MAIN: SidebarNavItem[] = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, matchTab: 'overview' },
  { title: 'Funil Geral', url: '/admin?tab=kanban', icon: Kanban, matchTab: 'kanban' },
  { title: 'Franquias', url: '/admin?tab=franchises', icon: Building2, matchTab: 'franchises' },
  { title: 'Visão Franquia', url: '/admin?tab=franchise-view', icon: Eye, matchTab: 'franchise-view' },
  { title: 'Candidaturas', url: '/admin?tab=candidaturas', icon: Inbox, matchTab: 'candidaturas' },
  { title: 'Marcas', url: '/admin/marcas', icon: Star, matchPaths: ['/admin/marcas'] },
  { title: 'Usuários', url: '/admin?tab=users', icon: Users, matchTab: 'users' },
  { title: 'Relatórios', url: '/superadmin/receita', icon: BarChart2, matchPaths: ['/superadmin/receita'] },
  { title: 'Configurações', url: '/perfil', icon: Settings },
];

const SUPER_ADMIN_EXTRA: SidebarNavItem[] = [
  { title: 'Início', url: '/hoje', icon: Sun },
  { title: 'Agenda', url: '/agenda', icon: CalendarDays },
  { title: 'Notificações', url: '/notificacoes', icon: Bell },
  { title: 'Radar de Mercado', url: '/admin/radar', icon: Radar, matchPaths: ['/admin/radar'] },
  { title: 'Status do Sistema', url: '/superadmin/status', icon: Activity, matchPaths: ['/superadmin/status'] },
  { title: 'Logs de Erro', url: '/admin?tab=errors', icon: AlertTriangle, matchTab: 'errors' },
  { title: 'WhatsApp', url: '/admin?tab=whatsapp', icon: MessageCircle, matchTab: 'whatsapp' },
  { title: 'Suporte', url: '/suporte', icon: HelpCircle },
];

// ── Franquia ──
const FRANCHISE_MAIN: SidebarNavItem[] = [
  { title: 'Hoje', url: '/hoje', icon: Sun },
  { title: 'Leads', url: '/franquia?tab=funnel', icon: Kanban, matchTab: 'funnel' },
  { title: 'Propostas', url: '/propostas', icon: FileText, matchPaths: ['/propostas'], dataTour: 'nav-propostas' },
  { title: 'Pós-venda', url: '/franquia?tab=pos-venda', icon: Package, matchTab: 'pos-venda' },
  { title: 'Relatórios', url: '/relatorio-crm', icon: BarChart2, matchPaths: ['/relatorio-crm'] },
  { title: 'Configurações', url: '/perfil', icon: Settings },
];

const FRANCHISE_EXTRA: SidebarNavItem[] = [
  { title: 'Agenda', url: '/agenda', icon: CalendarDays },
  { title: 'Catálogo de Piscinas', url: '/catalogo', icon: BookOpen, matchPaths: ['/catalogo'], dataTour: 'nav-catalogo' },
  { title: 'Metas', url: '/franquia?tab=achievements', icon: TrendingUp, matchTab: 'achievements' },
  { title: 'Planos', url: '/planos', icon: Star, matchPaths: ['/planos'], dataTour: 'nav-planos' },
  { title: 'Suporte', url: '/suporte', icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = role === 'super_admin';
  const currentTab = new URLSearchParams(location.search).get('tab');

  const isActive = (item: SidebarNavItem) => {
    const basePath = item.url.split('?')[0];
    if (item.matchTab) {
      if (location.pathname !== basePath) return false;
      if (item.matchTab === 'overview' && !currentTab) return true;
      if (item.matchTab === 'funnel' && !currentTab && basePath === '/franquia') return true;
      return currentTab === item.matchTab;
    }
    if (location.pathname === basePath) return true;
    if (item.matchPaths) return item.matchPaths.some((p) => location.pathname.startsWith(p));
    return false;
  };

  const handleNav = (url: string) => navigate(url);

  const renderNavItem = (item: SidebarNavItem) => {
    const active = isActive(item);
    return (
      <SidebarMenuItem key={item.title + item.url}>
        <SidebarMenuButton asChild isActive={active} tooltip={collapsed ? item.title : undefined}>
          <button
            onClick={() => handleNav(item.url)}
            data-tour={item.dataTour}
            className={`w-full flex items-center gap-2 ${active ? 'bg-primary/10 text-primary font-medium' : ''}`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.title}</span>
          </button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const mainItems = isAdmin ? SUPER_ADMIN_MAIN : FRANCHISE_MAIN;
  const extraItems = isAdmin ? SUPER_ADMIN_EXTRA : FRANCHISE_EXTRA;

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
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderNavItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Mais</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{extraItems.map(renderNavItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={collapsed ? 'Sair' : undefined} onClick={() => void signOut()}>
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
