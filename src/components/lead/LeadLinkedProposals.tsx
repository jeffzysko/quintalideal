import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, ExternalLink, Loader2 } from 'lucide-react';

interface LinkedProposal {
  id: string;
  status: string;
  total: number;
  client_name: string;
  created_at: string;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'outline' },
  enviada: { label: 'Enviada', variant: 'secondary' },
  visualizada: { label: 'Visualizada', variant: 'secondary' },
  em_negociacao: { label: 'Em Negociação', variant: 'default' },
  aceita: { label: 'Aceita', variant: 'default' },
  recusada: { label: 'Recusada', variant: 'destructive' },
};

interface Props {
  leadId: string;
  leadName?: string | null;
}

export function LeadLinkedProposals({ leadId, leadName }: Props) {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<LinkedProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('proposals')
      .select('id, status, total, client_name, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProposals(data || []);
        setLoading(false);
      });
  }, [leadId]);

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Propostas</span>
            {proposals.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {proposals.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              const params = new URLSearchParams({ lead_id: leadId });
              if (leadName) params.set('lead_name', leadName);
              navigate(`/propostas/nova?${params.toString()}`);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Proposta
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : proposals.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">
            Nenhuma proposta vinculada a este lead.
          </p>
        ) : (
          <div className="space-y-2">
            {proposals.map((p) => {
              const cfg = statusLabels[p.status] || { label: p.status, variant: 'outline' as const };
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/propostas/${p.id}`)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{fmt(p.total)}</span>
                  <Badge variant={cfg.variant} className="text-xs shrink-0">{cfg.label}</Badge>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
