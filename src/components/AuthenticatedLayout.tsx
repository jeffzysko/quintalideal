import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useIsMobile } from '@/hooks/use-mobile';
import { Footer } from '@/components/Footer';
import { Map, Trophy, Radar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/CommandPalette';
import { Search } from 'lucide-react';

/**
 * Layout for all authenticated pages.
 * - Desktop: collapsible sidebar + top bar with breadcrumbs, notifications, avatar
 * - Mobile: no sidebar (BottomNav handles navigation)
 */
export function AuthenticatedLayout() {
  const { user, role } = useAuth();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [paletteOpen, setCommandPaletteOpen] = useState(false);

  const isAdmin = role === 'super_admin';

  // Determine if footer should show
  const noFooterPaths = new Set(['/hoje']);
  const showFooter = !noFooterPaths.has(pathname);

  if (!user) {
    return <Outlet />;
  }

  const topNavItems = [
    ...(isAdmin ? [{ icon: Radar, label: 'Radar de Mercado', path: '/admin/radar' }] : []),
    { icon: Map, label: 'Mapa', path: '/mapa' },
    ...(isAdmin ? [{ icon: Trophy, label: 'Ranking', path: '/ranking' }] : []),
  ];

  // Mobile: simple layout (BottomNav is rendered globally)
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-1">
          <Outlet />
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setCommandPaletteOpen} />
        {showFooter && <Footer />}
      </div>
    );
  }

  // Desktop: sidebar + header. Default open; user can collapse to icon-only.
  return (
    <SidebarProvider defaultOpen>
      <DesktopShell topNavItems={topNavItems} pathname={pathname} navigate={navigate} showFooter={showFooter} onOpenPalette={() => setCommandPaletteOpen(true)} />
      <CommandPalette open={paletteOpen} onOpenChange={setCommandPaletteOpen} />
    </SidebarProvider>
  );
}

/** Inner shell — can use useSidebar() because it's inside SidebarProvider */
function DesktopShell({
  topNavItems,
  pathname,
  navigate,
  showFooter,
  onOpenPalette,
}: {
  topNavItems: { icon: React.ElementType; label: string; path: string }[];
  pathname: string;
  navigate: (path: string) => void;
  showFooter: boolean;
  onOpenPalette: () => void;
}) {
  const { state } = useSidebar();
  const sidebarOpen = state === 'expanded';

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 h-14">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="shrink-0 h-9 w-9" />
            </TooltipTrigger>
            <TooltipContent>{sidebarOpen ? 'Recolher menu' : 'Expandir menu'}</TooltipContent>
          </Tooltip>
          <div className="flex-1 min-w-0">
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onOpenPalette}>
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Buscar (⌘K)</TooltipContent>
            </Tooltip>
            {topNavItems.map((item) => (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Button
                    variant={pathname === item.path ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{item.label}</TooltipContent>
              </Tooltip>
            ))}
            <NotificationBell />
            <UserAvatarMenu />
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
        {showFooter && <Footer />}
      </div>
    </div>
  );
}
