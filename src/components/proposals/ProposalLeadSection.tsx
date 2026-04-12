import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { Search, Link2, ExternalLink, X } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/lead-constants';
import type { ProposalFormData } from '@/pages/NewProposal';
import { cn } from '@/lib/utils';

interface Props {
  form: Pick<ProposalFormData, 'lead_id'>;
  updateForm: (u: Partial<ProposalFormData>) => void;
  franchiseId: string | null;
}

interface LeadResult {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  status_lead: string;
}

export function ProposalLeadSection({ updateForm, franchiseId }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LeadResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadResult | null>(null);
  const [skipped, setSkipped] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2 || !franchiseId) {
      setResults([]);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const searchTerm = `%${query.trim()}%`;
      const { data } = await supabase
        .from('leads')
        .select('id, nome, email, telefone, cidade, status_lead')
        .or(`nome.ilike.${searchTerm},email.ilike.${searchTerm},telefone.ilike.${searchTerm}`)
        .limit(8);
      setResults(data || []);
      setShowDropdown(true);
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, franchiseId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectLead = (lead: LeadResult) => {
    setSelectedLead(lead);
    setShowDropdown(false);
    setQuery('');
    updateForm({
      lead_id: lead.id,
      client_name: lead.nome || '',
      client_phone: lead.telefone || '',
      client_email: lead.email || '',
    });
  };

  const unlinkLead = () => {
    setSelectedLead(null);
    setSkipped(false);
    updateForm({ lead_id: null });
  };

  const skipLead = () => {
    setSkipped(true);
    updateForm({ lead_id: null });
  };

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          Vinculação de Lead
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedLead ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {(selectedLead.nome || '?')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{selectedLead.nome || 'Sem nome'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[selectedLead.status_lead])}>
                  {STATUS_LABELS[selectedLead.status_lead] || selectedLead.status_lead}
                </Badge>
                {selectedLead.telefone && <span className="text-xs text-muted-foreground">{selectedLead.telefone}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href={`/painel/lead/${selectedLead.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={unlinkLead}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar lead por nome, email ou telefone..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {showDropdown && results.length > 0 && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {results.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => selectLead(lead)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {(lead.nome || '?')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.nome || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.email || lead.telefone || ''}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[lead.status_lead])}>
                      {STATUS_LABELS[lead.status_lead] || lead.status_lead}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && results.length === 0 && query.length >= 2 && !searching && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg p-4 text-center text-sm text-muted-foreground">
                Nenhum lead encontrado
              </div>
            )}
          </div>
        )}
        {!selectedLead && (
          <button
            onClick={() => updateForm({ lead_id: null })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Criar proposta sem vincular lead
          </button>
        )}
      </CardContent>
    </Card>
  );
}
