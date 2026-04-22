import { useState, useEffect } from 'react';
import {
  Settings,
  HelpCircle,
  Users,
  Building2,
  Kanban,
  TrendingUp,
  LogOut,
  FileText,
  Trophy,
  CreditCard,
  Package,
  LayoutDashboard,
  BarChart2,
  Activity,
  Sun,
  AlertTriangle,
  MessageCircle,
  DollarSign,
  ChevronDown,
  Download,
  Compass,
  Users2,
  Store,
  Code,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

interface SidebarNavItem {
  title: string;
  url: string;
  icon: typeof Sun;
  matchPaths?: string[];
  matchTab?: string;
  dataTour?: string;
  external?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  items: SidebarNavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// ── Super Admin ──
// NOTE: routes follow real existing paths. Items the user asked to "unify" (Analytics,
// Performance QI, Performance Audit, Relatórios) live as tabs inside /admin?tab=analytics
// once the page consolidation lands; here we expose only the unified entry point.
const SUPER_ADMIN_GROUPS: NavGroup[] = [
  {
    id: 'sa-overview',
    label: 'Visão Geral',
    collapsible: false,
    items: [
      { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, matchTab: 'overview' },
      { title: 'Analytics', url: '/admin?tab=analytics', icon: TrendingUp, matchTab: 'analytics' },
    ],
  },
  {
    id: 'sa-gestao',
    label: 'Gestão',
    collapsible: true,
    defaultOpen: true,
    items: [
      { title: 'Franquias', url: '/admin?tab=franchises', icon: Store, matchTab: 'franchises' },
      { title: 'Marcas', url: '/admin/marcas', icon: Building2, matchPaths: ['/admin/marcas'] },
      { title: 'Usuários', url: '/admin?tab=users', icon: Users, matchTab: 'users' },
    ],
  },
  {
    id: 'sa-monitoramento',
    label: 'Monitoramento',
    collapsible: true,
    defaultOpen: false,
    items: [
      { title: 'Leads', url: '/admin?tab=leads', icon: Users2, matchTab: 'leads' },
      { title: 'Explorar', url: '/explorar', icon: Compass, matchPaths: ['/explorar'] },
      { title: 'Status do Sistema', url: '/superadmin/status', icon: Activity, matchPaths: ['/superadmin/status'] },
      { title: 'Logs de Erro', url: '/admin?tab=errors', icon: AlertTriangle, matchTab: 'errors' },
    ],
  },
  {
    id: 'sa-financeiro',
    label: 'Financeiro',
    collapsible: true,
    defaultOpen: false,
    items: [
      { title: 'Faturamento', url: '/superadmin/receita', icon: DollarSign, matchPaths: ['/superadmin/receita'] },
    ],
  },
  {
    id: 'sa-comunicacao',
    label: 'Comunicação',
    collapsible: true,
    defaultOpen: false,
    items: [
      { title: 'WhatsApp', url: '/admin?tab=whatsapp', icon: MessageCircle, matchTab: 'whatsapp' },
    ],
  },
  {
    id: 'sa-config',
    label: 'Configurações',
    collapsible: true,
    defaultOpen: false,
    items: [
      { title: 'Configurações', url: '/perfil', icon: Settings, matchPaths: ['/perfil'] },
      { title: 'Suporte', url: '/suporte', icon: HelpCircle },
    ],
  },
];

// ── Franquia ──
const FRANCHISE_GROUPS: NavGroup[] = [
  {
    id: 'fr-principal',
    label: 'Principal',
    collapsible: false,
    items: [
      { title: 'Hoje', url: '/hoje', icon: Sun },
      { title: 'Leads', url: '/franquia?tab=funnel', icon: Kanban, matchTab: 'funnel' },
    ],
  },
  {
    id: 'fr-ferramentas',
    label: 'Ferramentas',
    collapsible: true,
    defaultOpen: true,
    items: [
      { title: 'Propostas', url: '/propostas', icon: FileText, matchPaths: ['/propostas'], dataTour: 'nav-propostas' },
      { title: 'Pós-venda', url: '/franquia?tab=pos-venda', icon: Package, matchTab: 'pos-venda' },
      { title: 'Metas', url: '/franquia?tab=achievements', icon: Trophy, matchTab: 'achievements' },
    ],
  },
  {
    id: 'fr-loja',
    label: 'Minha Loja',
    collapsible: true,
    defaultOpen: false,
    items: [
      { title: 'Relatórios', url: '/relatorio-crm', icon: BarChart2, matchPaths: ['/relatorio-crm'] },
      { title: 'Planos', url: '/planos', icon: CreditCard, matchPaths: ['/planos'], dataTour: 'nav-planos' },
      { title: 'Configurações', url: '/perfil', icon: Settings, matchPaths: ['/perfil'] },
      { title: 'Suporte', url: '/suporte', icon: HelpCircle },
    ],
  },
];

const STORAGE_PREFIX = 'sidebar-group-open:';

function useGroupOpen(id: string, defaultOpen: boolean) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen;
    const stored = window.localStorage.getItem(STORAGE_PREFIX + id);
    return stored === null ? defaultOpen : stored === '1';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + id, open ? '1' : '0');
    } catch {
      /* noop */
    }
  }, [id, open]);
  return [open, setOpen] as const;
}

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

  const renderNavItem = (item: SidebarNavItem) => {
    const active = isActive(item);
    return (
      <SidebarMenuItem key={item.title + item.url}>
        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
          <button
            onClick={() => navigate(item.url)}
            data-tour={item.dataTour}
            className={`w-full flex items-center gap-2 group-data-[collapsible=icon]:justify-center ${active ? 'bg-primary/10 text-primary font-medium' : ''}`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
          </button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const groups = isAdmin ? SUPER_ADMIN_GROUPS : FRANCHISE_GROUPS;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
          <img
            src={logoQuintalIdeal}
            alt="Quintal Ideal"
            className="h-8 shrink-0 object-contain brightness-0 invert"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <NavGroupSection
            key={group.id}
            group={group}
            renderNavItem={renderNavItem}
            collapsedSidebar={collapsed}
          />
        ))}
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Instalar app"
                  onClick={() => navigate('/install')}
                  className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="truncate text-xs group-data-[collapsible=icon]:hidden">Instalar app</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Docs do Webhook"
                    onClick={() => navigate('/docs/webhook')}
                    className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <Code className="h-4 w-4 shrink-0" />
                    <span className="truncate text-xs group-data-[collapsible=icon]:hidden">Docs do Webhook</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sair"
                  onClick={() => void signOut()}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0 text-destructive" />
                  <span className="truncate text-destructive group-data-[collapsible=icon]:hidden">Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function NavGroupSection({
  group,
  renderNavItem,
  collapsedSidebar,
}: {
  group: NavGroup;
  renderNavItem: (item: SidebarNavItem) => JSX.Element;
  collapsedSidebar: boolean;
}) {
  const [open, setOpen] = useGroupOpen(group.id, group.defaultOpen ?? true);

  // When sidebar is collapsed (icon-only), always render items flat.
  if (!group.collapsible || collapsedSidebar) {
    return (
      <SidebarGroup>
        {!collapsedSidebar && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>{group.items.map(renderNavItem)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors group-data-[collapsible=icon]:hidden"
          >
            <span className="uppercase tracking-wider">{group.label}</span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', open ? 'rotate-0' : '-rotate-90')}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <SidebarGroupContent>
            <SidebarMenu>{group.items.map(renderNavItem)}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
