import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, ChevronDown, Sun, Moon, LifeBuoy, BarChart3, Webhook, Building2, Bell } from 'lucide-react';

export function UserAvatarMenu() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const go = (path: string) => {
    setOpen(false);
    // Delay navigation slightly so the menu closes first
    requestAnimationFrame(() => navigate(path));
  };
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const email = user?.email || '';
  const initials = email ? email.substring(0, 2).toUpperCase() : 'U';

  const roleLabel =
    role === 'admin_fabrica' ? 'Administrador' :
    role === 'franquia' ? 'Franquia' :
    role === 'super_admin' ? 'Super Admin' : '';

  const roleBadgeClass =
    role === 'super_admin' ? 'bg-primary/15 text-primary border-primary/25' :
    role === 'admin_fabrica' ? 'bg-amber-500/15 text-amber-600 border-amber-500/25' :
    role === 'franquia' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' :
    'bg-muted text-muted-foreground border-border';

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.avatar_url) setAvatarUrl((data as any).avatar_url);
      });
  }, [user]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={true}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-xl pl-0.5 pr-2 py-0.5 hover:bg-muted/60 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
          aria-label="Menu do usuário"
        >
          <Avatar className="h-8 w-8 border-2 border-primary/20 ring-2 ring-primary/5 transition-all group-hover:ring-primary/15 group-hover:border-primary/40">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-[11px] font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-64 rounded-2xl p-2 border-border/40 backdrop-blur-xl data-[state=closed]:duration-0"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card) / 0.95), hsl(var(--card) / 0.85))',
          boxShadow: '0 16px 48px -12px hsl(var(--primary) / 0.1), 0 8px 24px -8px rgba(0,0,0,0.15)',
        }}
      >
        <div className="px-3 py-3 rounded-xl bg-muted/40 mb-1.5">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">{email}</p>
              {roleLabel && (
                <span className={`inline-flex items-center mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadgeClass}`}>
                  {roleLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenuItem
          onSelect={() => setTheme(isDark ? 'light' : 'dark')}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm gap-3 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium">{isDark ? 'Modo claro' : 'Modo escuro'}</p>
            <p className="text-[10px] text-muted-foreground">Alternar aparência</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => go('/perfil')}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm gap-3 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Configurações</p>
            <p className="text-[10px] text-muted-foreground">Perfil e preferências</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => go('/perfil#notificacoes')}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm gap-3 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Notificações</p>
            <p className="text-[10px] text-muted-foreground">Push e preferências</p>
          </div>
        </DropdownMenuItem>

        {role === 'franquia' && (
          <DropdownMenuItem
            onSelect={() => navigate('/perfil#franquia')}
            className="cursor-pointer rounded-xl px-3 py-2.5 text-sm gap-3 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Organização</p>
              <p className="text-[10px] text-muted-foreground">Configurações da franquia</p>
            </div>
          </DropdownMenuItem>
        )}

        {(role === 'franquia' || role === 'admin_fabrica' || role === 'super_admin') && (
          <>
            <DropdownMenuSeparator className="my-1.5 bg-border/30" />
            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Integrações
            </p>
            <DropdownMenuItem
              onSelect={() => navigate('/perfil#integracoes')}
              className="cursor-pointer rounded-xl px-3 py-2.5 text-sm gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              Meta Pixel
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => navigate('/perfil#integracoes')}
              className="cursor-pointer rounded-xl px-3 py-2.5 text-sm gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <Webhook className="w-4 h-4 text-muted-foreground" />
              </div>
              Webhook CRM
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="my-1.5 bg-border/30" />

        <DropdownMenuItem
          onSelect={() => navigate('/suporte')}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm gap-3 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            <LifeBuoy className="w-4 h-4 text-muted-foreground" />
          </div>
          Suporte & Guia
        </DropdownMenuItem>

        <DropdownMenuItem
          onSelect={() => void signOut()}
          className="cursor-pointer rounded-xl px-3 py-2.5 text-sm gap-3 text-destructive focus:text-destructive transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
