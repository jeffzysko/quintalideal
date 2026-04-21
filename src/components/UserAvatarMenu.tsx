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
import { LogOut, Settings, ChevronDown, Sun, Moon, Monitor, LifeBuoy, Webhook, Building2, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserAvatarMenu() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const go = (path: string) => {
    setOpen(false);
    setTimeout(() => navigate(path), 16);
  };

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const email = user?.email || '';
  const initials = email ? email.substring(0, 2).toUpperCase() : 'U';

  const roleLabel =
    role === 'franquia' ? 'Franquia' :
    role === 'super_admin' ? 'Super Admin' : '';

  const roleBadgeClass =
    role === 'super_admin' ? 'bg-primary/15 text-primary border-primary/25' :
    role === 'franquia' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25' :
    'bg-muted text-muted-foreground border-border';

  

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
        className="w-56 rounded-2xl p-1.5 border-border/40 backdrop-blur-xl data-[state=closed]:duration-0"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card) / 0.95), hsl(var(--card) / 0.85))',
          boxShadow: '0 12px 40px -10px hsl(var(--primary) / 0.1), 0 6px 20px -6px rgba(0,0,0,0.12)',
        }}
      >
        {/* User info */}
        <div className="px-3 py-2.5 rounded-xl bg-muted/40 mb-1">
          <p className="text-sm font-semibold text-foreground truncate">{email}</p>
          {roleLabel && (
            <span className={`inline-flex items-center mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadgeClass}`}>
              {roleLabel}
            </span>
          )}
        </div>

        {/* Theme switcher */}
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/30">
            {([
              { value: 'light', icon: Sun, label: 'Claro' },
              { value: 'dark', icon: Moon, label: 'Escuro' },
              { value: 'system', icon: Monitor, label: 'Auto' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTheme(opt.value); }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-all duration-200',
                  theme === opt.value
                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <opt.icon className="w-3 h-3" />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 bg-border/30" />

        {/* Main actions */}
        <DropdownMenuItem onClick={() => go('/perfil')} className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5">
          <Settings className="w-4 h-4 text-muted-foreground" />
          Configurações
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => go('/perfil#notificacoes')} className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5">
          <Bell className="w-4 h-4 text-muted-foreground" />
          Notificações
        </DropdownMenuItem>

        {role === 'franquia' && (
          <DropdownMenuItem onClick={() => go('/perfil#franquia')} className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            Organização
          </DropdownMenuItem>
        )}

        {(role === 'franquia' || role === 'super_admin') && (
          <DropdownMenuItem onClick={() => go('/perfil#integracoes')} className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5">
            <Webhook className="w-4 h-4 text-muted-foreground" />
            Integrações
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => go('/suporte')} className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5">
          <LifeBuoy className="w-4 h-4 text-muted-foreground" />
          Suporte
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-border/30" />

        <DropdownMenuItem
          onClick={() => { setOpen(false); void signOut(); }}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5 text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
