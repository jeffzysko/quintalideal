import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Building2, ChevronDown, Check, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Franchise {
  id: string;
  nome_franquia: string;
  cidade_base: string;
  ativa: boolean;
}

interface OrganizationSwitcherProps {
  activeFranchiseId: string | null;
  onSwitch: (franchiseId: string | null) => void;
  compact?: boolean;
}

export function OrganizationSwitcher({ activeFranchiseId, onSwitch, compact }: OrganizationSwitcherProps) {
  const { role } = useAuth();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from('franchises')
      .select('id, nome_franquia, cidade_base, ativa')
      .eq('ativa', true)
      .order('nome_franquia')
      .then(({ data }) => {
        setFranchises(data || []);
        setLoading(false);
      });
  }, [isAdmin]);

  if (!isAdmin || loading) return null;

  const activeFranchise = franchises.find(f => f.id === activeFranchiseId);
  const filtered = franchises.filter(f =>
    f.nome_franquia.toLowerCase().includes(search.toLowerCase()) ||
    f.cidade_base.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-all duration-200",
            "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "border border-border/40 bg-card/50 backdrop-blur-sm",
            compact && "px-2 py-1"
          )}
        >
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-medium text-foreground truncate max-w-[160px]">
            {activeFranchise ? activeFranchise.nome_franquia : 'Todas as franquias'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-72 rounded-2xl p-2 border-border/40 backdrop-blur-xl max-h-[400px] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card) / 0.95), hsl(var(--card) / 0.85))',
          boxShadow: '0 16px 48px -12px hsl(var(--primary) / 0.1), 0 8px 24px -8px rgba(0,0,0,0.15)',
        }}
      >
        {/* Search */}
        <div className="px-1 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar franquia..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-8 text-base md:text-xs rounded-lg border-border/30 bg-muted/30"
            />
          </div>
        </div>

        <DropdownMenuSeparator className="my-1 bg-border/30" />

        {/* "All" option */}
        <DropdownMenuItem
          onClick={() => onSwitch(null)}
          className={cn(
            "cursor-pointer rounded-xl px-3 py-2 text-sm gap-2 transition-colors",
            !activeFranchiseId && "bg-primary/10"
          )}
        >
          <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="flex-1 font-medium">Todas as franquias</span>
          {!activeFranchiseId && <Check className="w-4 h-4 text-primary shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 bg-border/30" />

        {/* Franchise list */}
        <div className="max-h-[280px] overflow-y-auto scrollbar-none space-y-0.5">
          {filtered.map(f => (
            <DropdownMenuItem
              key={f.id}
              onClick={() => onSwitch(f.id)}
              className={cn(
                "cursor-pointer rounded-xl px-3 py-2 text-sm gap-2 transition-colors",
                activeFranchiseId === f.id && "bg-primary/10"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">
                  {f.nome_franquia.replace('Splash ', '').charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{f.nome_franquia}</p>
                <p className="text-[10px] text-muted-foreground">{f.cidade_base}</p>
              </div>
              {activeFranchiseId === f.id && <Check className="w-4 h-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma franquia encontrada</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
