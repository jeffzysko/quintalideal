import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Clock, Eye, Inbox, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SITE_URL } from '@/lib/constants';
import { FranchiseContactSettings } from '@/components/franchise/FranchiseContactSettings';

interface LeadRow {
  id: string;
  nome: string | null;
  cidade: string | null;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
  status_lead: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  novo: 'bg-primary/10 text-primary border-primary/20',
  contatado: 'bg-amber-50 text-amber-700 border-amber-200',
  em_negociacao: 'bg-violet-50 text-violet-700 border-violet-200',
  vendido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  perdido: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabels: Record<string, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  em_negociacao: 'Em Negociação',
  vendido: 'Vendido',
  perdido: 'Perdido',
};

export default function FranchiseDashboard() {
  const { franchiseId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [franchiseSlug, setFranchiseSlug] = useState<string | null>(null);

  useEffect(() => {
    if (franchiseId) {
      loadLeads();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [franchiseId, authLoading]);

  const loadLeads = async () => {
    setLoading(true);
    
    // Load franchise slug for the copy link button
    if (franchiseId) {
      const { data: franchiseData } = await supabase
        .from('franchises')
        .select('slug_url')
        .eq('id', franchiseId)
        .maybeSingle();
      if (franchiseData) setFranchiseSlug(franchiseData.slug_url);
    }

    let query = supabase
      .from('leads')
      .select('id, nome, cidade, pontuacao_quintal, modelo_recomendado, status_lead, created_at')
      .order('created_at', { ascending: false });
    
    if (franchiseId) {
      query = query.eq('franquia_id', franchiseId);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('Error loading leads:', error);
    }
    setLeads(data || []);
    setLoading(false);
  };

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status_lead === 'novo').length;
  const inNegotiation = leads.filter(l => l.status_lead === 'em_negociacao').length;
  const sold = leads.filter(l => l.status_lead === 'vendido').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Dashboard da Franquia</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalLeads}</p>
              <p className="text-xs text-muted-foreground">Total de Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-secondary" />
            <div>
              <p className="text-2xl font-bold">{newLeads}</p>
              <p className="text-xs text-muted-foreground">Novos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-violet-500" />
            <div>
              <p className="text-2xl font-bold">{inNegotiation}</p>
              <p className="text-xs text-muted-foreground">Em Negociação</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{sold}</p>
              <p className="text-xs text-muted-foreground">Vendidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : leads.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-16 px-4"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Inbox className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum lead ainda</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                Seus leads aparecerão aqui assim que os primeiros clientes responderem ao quiz da sua página. Compartilhe seu link para começar!
              </p>
              <Button variant="outline" className="gap-2" onClick={() => {
                const url = franchiseSlug ? `${SITE_URL}/${franchiseSlug}` : SITE_URL;
                navigator.clipboard.writeText(url);
                toast.success('Link copiado!');
              }}>
                <Share2 className="w-4 h-4" />
                Copiar link do quiz
              </Button>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Nome</th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Cidade</th>
                    <th className="text-left py-3 px-2 font-medium">Pontuação</th>
                    <th className="text-left py-3 px-2 font-medium hidden md:table-cell">Modelo</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">{lead.nome || '—'}</td>
                      <td className="py-3 px-2 hidden md:table-cell">{lead.cidade || '—'}</td>
                      <td className="py-3 px-2">
                        <span className="font-bold text-primary">{lead.pontuacao_quintal || 0}%</span>
                      </td>
                      <td className="py-3 px-2 hidden md:table-cell">{lead.modelo_recomendado || '—'}</td>
                      <td className="py-3 px-2">
                        <Badge className={`${statusColors[lead.status_lead] || ''} border text-xs`} variant="secondary">
                          {statusLabels[lead.status_lead] || lead.status_lead}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/painel/lead/${lead.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}