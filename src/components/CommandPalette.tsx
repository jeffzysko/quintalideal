import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Users,
  Bell,
  Settings,
  Map,
  BarChart3,
  
  UserPlus,
  Calendar,
  FileText,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface LeadResult {
  id: string;
  nome: string | null;
  cidade: string | null;
  status_lead: string;
  pontuacao_quintal: number | null;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const { user, role, franchiseId } = useAuth();
  const { theme, setTheme } = useTheme();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const isFranchise = role === 'franquia';

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    if (!user) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [user]);

  // Search leads with debounce
  const searchLeads = useCallback(
    async (term: string) => {
      if (term.length < 2) {
        setLeads([]);
        return;
      }
      setSearching(true);
      try {
        let q = supabase
          .from('leads')
          .select('id, nome, cidade, status_lead, pontuacao_quintal')
          .or(`nome.ilike.%${term}%,cidade.ilike.%${term}%,email.ilike.%${term}%`)
          .order('created_at', { ascending: false })
          .limit(8);

        if (isFranchise && franchiseId) {
          q = q.eq('franquia_id', franchiseId);
        }

        const { data } = await q;
        setLeads(data || []);
      } catch {
        setLeads([]);
      } finally {
        setSearching(false);
      }
    },
    [isFranchise, franchiseId]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLeads(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchLeads]);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  if (!user) return null;

  const basePath = isAdmin ? '/admin' : '/painel';

  // Navigation items based on role
  const navItems = [
    ...(isAdmin
      ? [
          { icon: LayoutDashboard, label: 'Painel Admin', path: '/admin' },
          { icon: Users, label: 'Leads', path: '/admin?tab=leads' },
          { icon: BarChart3, label: 'Radar de Mercado', path: '/admin/radar' },
        ]
      : []),
    ...(isFranchise
      ? [
          { icon: LayoutDashboard, label: 'Meu Painel', path: '/franquia' },
        ]
      : []),
    { icon: Calendar, label: 'Hoje', path: '/hoje' },
    { icon: Bell, label: 'Notificações', path: '/notificacoes' },
    { icon: Map, label: 'Mapa de Quintais', path: '/mapa' },
    { icon: Settings, label: 'Perfil', path: '/perfil' },
    { icon: HelpCircle, label: 'Suporte', path: '/suporte' },
    ...(isAdmin
      ? [{ icon: FileText, label: 'Docs Webhook', path: '/docs/webhook' }]
      : []),
  ];

  const STATUS_EMOJI: Record<string, string> = {
    novo: '🔵',
    contatado: '🟡',
    em_negociacao: '🟣',
    vendido: '🟢',
    perdido: '🔴',
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar leads, páginas ou ações…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? 'Buscando…' : 'Nenhum resultado encontrado.'}
        </CommandEmpty>

        {/* Lead search results */}
        {leads.length > 0 && (
          <CommandGroup heading="Leads">
            {leads.map((lead) => (
              <CommandItem
                key={lead.id}
                value={`lead-${lead.nome}-${lead.cidade}`}
                onSelect={() => go(`${basePath}/lead/${lead.id}`)}
              >
                <UserPlus className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{lead.nome || 'Sem nome'}</span>
                  {lead.cidade && (
                    <span className="text-muted-foreground text-xs ml-2">{lead.cidade}</span>
                  )}
                </div>
                <span className="text-xs shrink-0">
                  {STATUS_EMOJI[lead.status_lead] || '⚪'} {lead.pontuacao_quintal || 0}%
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Navigation */}
        <CommandGroup heading="Navegação">
          {navItems.map((item) => (
            <CommandItem
              key={item.path}
              value={`nav-${item.label}`}
              onSelect={() => go(item.path)}
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Quick actions */}
        <CommandGroup heading="Ações rápidas">
          <CommandItem
            value="action-theme"
            onSelect={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
              setOpen(false);
            }}
          >
            {theme === 'dark' ? (
              <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
