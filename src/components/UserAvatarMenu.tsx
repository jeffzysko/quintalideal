import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, ChevronDown, Sun, Moon, LifeBuoy } from 'lucide-react';

export function UserAvatarMenu() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const email = user?.email || '';
  const initials = email
    ? email.substring(0, 2).toUpperCase()
    : 'U';

  const roleLabel =
    role === 'admin_fabrica' ? 'Administrador' :
    role === 'franquia' ? 'Franquia' : '';

  const isDark = theme === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 py-0.5 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu do usuário"
        >
          <Avatar className="h-8 w-8 border border-border/60">
            <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-xl p-1.5 shadow-lg border-border/50">
        <div className="px-3 py-2.5">
          <p className="text-sm font-medium text-foreground leading-tight truncate">{email}</p>
          {roleLabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{roleLabel}</p>
          )}
        </div>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-muted-foreground" />
          )}
          {isDark ? 'Modo claro' : 'Modo escuro'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/perfil')}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/suporte')}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5"
        >
          <LifeBuoy className="w-4 h-4 text-muted-foreground" />
          Suporte & Guia
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm gap-2.5 text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
