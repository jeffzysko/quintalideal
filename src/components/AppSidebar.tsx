import {
  Home,
  CalendarDays,
  Settings,
  MessageCircle,
  HelpCircle,
  Bell,
  
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
  Package,
  
} from 'lucide-react';
import { useState, useEffect } from 'react';
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
  dataTour?: string;
}

// ── Admin sections ──
const ADMIN_TABS: SidebarNavItem[] = [
  { title: 'Inteligencia', url: '/admin?tab=overview', icon: BarChart3, matchTab: 'overview' },
  { title: 'Performance QI', url: '/admin?tab=performance-qi', icon: Target, matchTab: 'performance-qi' },
  { title: 'Analytics', url: '/admin?tab=analytics', icon: Activity, matchTab: 'analytics' },
  { title: 'Leads', url: '/admin?tab=leads', icon: Users, matchTab: 'leads' },
  { title: 'Franquias', url: '/admin?tab=franchises', icon: Building2, matchTab: 'franchises' },
  { title: 'Territorios', url: '/admin?tab=cities', icon: Globe, matchTab: 'cities' },
];

const SUPER_ADMIN_TABS: SidebarNavItem[] = [
  { title: 'Funil Geral', url: '/admin?tab=kanban', icon: Kanban, matchTab: 'kanban' },
  { title: 'Usuarios', url: '/admin?tab=users', icon: Users, matchTab: 'users' },
  { title: 'E-mails', url: '/admin?tab=emails', icon: Mail, matchTab: 'emails' },
  { title: 'WhatsApp', url: '/admin?tab=whatsapp', icon: MessageCircle, matchTab: 'whatsapp' },
  { title: 'Visao Franquia', url: '/admin?tab=franchise-view', icon: Eye, matchTab: 'franchise-view' },
  { title: 'Receita', url: '/superadmin/receita', icon: TrendingUp, matchPaths: ['/superadmin/receita'] },
];

// ── Franchise: always visible ──
const FRANCHISE_MAIN: SidebarNavItem[] = [
  { title: 'Inicio', url: '/hoje', icon: Home },
  { title: 'Leads / CRM', url: '/franquia?tab=funnel', icon: Kanban, matchTab: 'funnel' },
  { title: 'Propostas', url: '/propostas', icon: FileText, matchPaths: ['/propostas'], dataTour: 'nav-propostas' },
];

// ── Franchise: "Ferramentas" group ──
const FRANCHISE_TOOLS: SidebarNavItem[] = [
  { title: 'Agenda', url: '/agenda', icon: CalendarDays },
  { title: 'Catalogo de Piscinas', url: '/catalogo', icon: BookOpen, matchPaths: ['/catalogo'], dataTour: 'nav-catalogo' },
  { title: 'Pos-venda', url: '/franquia?tab=pos-venda', icon: Package, matchTab: 'pos-venda' },
  { title: 'Metas', url: '/franquia?tab=achievements', icon: TrendingUp, matchTab: 'achievements' },
  { title: 'Relatorios', url: '/franquia?tab=reports', icon: BarChart3, matchTab: 'reports' },
];

// ── Franchise: "Configuracoes" group ──
const FRANCHISE_CONFIG: SidebarNavItem[] = [
  { title: 'Planos', url: '/planos', icon: Star, matchPaths: ['/planos'], dataTour: 'nav-planos' },
  { title: 'Configuracoes', url: '/perfil', icon: Settings },
  { title: 'Suporte', url: '/suporte', icon: HelpCircle },
];

// ── Admin navigation ──
const ADMIN_NAV: SidebarNavItem[] = [
  { title: 'Inicio', url: '/hoje', icon: Home },
  { title: 'Agenda', url: '/agenda', icon: CalendarDays },
  { title: 'Notificacoes', url: '/notificacoes', icon: Bell },
];

const ADMIN_BOTTOM: SidebarNavItem[] = [
  { title: 'Integracoes', url: '/perfil#integracoes', icon: Webhook },
  { title: 'Configuracoes', url: '/perfil', icon: Settings },
  { title: 'Suporte', url: '/suporte', icon: HelpCircle },
];

function usePersistedCollapsible(key: string, defaultOpen: boolean, hasActive: boolean): [boolean, (open: boolean) => void] {
  const storageKey = `sidebar-${key}`;
  const [open, setOpen] = useState(() => {
    if (hasActive) return true;
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : defaultOpen;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, String(open));
  }, [open, storageKey]);

  // If an item becomes active, force open
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  return [open, setOpen];
}

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
      if (item.matchTab === 'funnel' && !currentTab && basePath === '/franquia') return true;
      return currentTab === item.matchTab;
    }
    if (location.pathname === basePath) return true;
    if (item.matchPaths) return item.matchPaths.some((p) => location.pathname.startsWith(p));
    return false;
  };

  const hasActiveItem = (items: SidebarNavItem[]) => items.some(isActive);

  const [toolsOpen, setToolsOpen] = usePersistedCollapsible('tools', false, hasActiveItem(FRANCHISE_TOOLS));
  const [configOpen, setConfigOpen] = usePersistedCollapsible('config', false, hasActiveItem(FRANCHISE_CONFIG));
  const [adminTabsOpen, setAdminTabsOpen] = usePersistedCollapsible('admin-tabs', true, hasActiveItem(ADMIN_TABS));
  const [superTabsOpen, setSuperTabsOpen] = usePersistedCollapsible('super-tabs', false, hasActiveItem(SUPER_ADMIN_TABS));

  const handleNav = (url: string) => navigate(url);

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

  const renderCollapsibleGroup = (
    label: string,
    items: SidebarNavItem[],
    open: boolean,
    setOpen: (o: boolean) => void,
  ) => (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
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
        {isAdmin ? (
          <>
            {/* Admin common nav */}
            <SidebarGroup>
              <SidebarGroupLabel>Navegacao</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_NAV.map((item) => renderNavItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Admin Fabrica tabs */}
            {renderCollapsibleGroup('Fabrica', ADMIN_TABS, adminTabsOpen, setAdminTabsOpen)}

            {/* Super Admin */}
            {isSuperAdmin && renderCollapsibleGroup('Super Admin', SUPER_ADMIN_TABS, superTabsOpen, setSuperTabsOpen)}
          </>
        ) : (
          <>
            {/* Franchise: always-visible items */}
            <SidebarGroup>
              <SidebarGroupLabel>Painel</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {FRANCHISE_MAIN.map((item) => renderNavItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Franchise: Ferramentas (collapsible) */}
            {renderCollapsibleGroup('Ferramentas', FRANCHISE_TOOLS, toolsOpen, setToolsOpen)}

            {/* Franchise: Configuracoes (collapsible) */}
            {renderCollapsibleGroup('Configuracoes', FRANCHISE_CONFIG, configOpen, setConfigOpen)}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && ADMIN_BOTTOM.map((item) => renderNavItem(item))}
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
