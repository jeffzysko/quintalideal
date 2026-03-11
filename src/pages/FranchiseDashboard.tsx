import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Clock, Eye, Inbox, Share2, LogOut, Droplets, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SITE_URL } from '@/lib/constants';
import { FranchiseContactSettings } from '@/components/franchise/FranchiseContactSettings';
import { FranchiseReports } from '@/components/franchise/FranchiseReports';
import logoSplash from '@/assets/logo-splash.png';

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
  const { franchiseId, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [franchiseSlug, setFranchiseSlug] = useState<string | null>(null);
  const [franchiseName, setFranchiseName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'leads' | 'reports'>('leads');

  useEffect(() => {
    if (franchiseId) {
      loadLeads();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [franchiseId, authLoading]);

  const loadLeads = async () => {
    setLoading(true);
    
    if (franchiseId) {
      const { data: franchiseData } = await supabase
        .from('franchises')
        .select('slug_url, nome_franquia')
        .eq('id', franchiseId)
        .maybeSingle();
      if (franchiseData) {
        setFranchiseSlug(franchiseData.slug_url);
        setFranchiseName(franchiseData.nome_franquia || '');
      }
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

  const kpis = [
    { icon: Users, label: 'Total de Leads', value: totalLeads, color: 'text-primary' },
    { icon: Clock, label: 'Novos', value: newLeads, color: 'text-secondary' },
    { icon: TrendingUp, label: 'Em Negociação', value: inNegotiation, color: 'text-violet-600' },
    { icon: Droplets, label: 'Vendidos', value: sold, color: 'text-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logoSplash} alt="Splash" className="w-16" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {franchiseName || 'Dashboard da Franquia'}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Gestão de leads e contatos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-3 py-1.5 border-primary/30 text-primary">
              {totalLeads} leads
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="rounded-xl gap-1.5 text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Contact Settings */}
        {franchiseId && (
          <div className="mb-8">
            <FranchiseContactSettings franchiseId={franchiseId} />
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {kpis.map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
                  <p className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'leads' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users className="w-4 h-4 inline mr-1.5" /> Leads
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart3 className="w-4 h-4 inline mr-1.5" /> Relatórios
          </button>
        </div>

        {activeTab === 'leads' && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Leads Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
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
                  <Button variant="outline" className="gap-2 rounded-xl" onClick={() => {
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
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nome</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Score</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Modelo</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Data</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map(lead => (
                        <tr key={lead.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-3 font-medium">{lead.nome || '—'}</td>
                          <td className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.cidade || '—'}</td>
                          <td className="py-3.5 px-3">
                            <span className="font-bold text-primary">{lead.pontuacao_quintal || 0}%</span>
                          </td>
                          <td className="py-3.5 px-3 hidden md:table-cell text-muted-foreground">{lead.modelo_recomendado || '—'}</td>
                          <td className="py-3.5 px-3">
                            <Badge className={`${statusColors[lead.status_lead] || ''} border text-xs font-medium`} variant="secondary">
                              {statusLabels[lead.status_lead] || lead.status_lead}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3 hidden md:table-cell text-muted-foreground text-xs">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3.5 px-3">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/painel/lead/${lead.id}`)} className="rounded-lg">
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
        )}

        {activeTab === 'reports' && (
          <FranchiseReports leads={leads} />
        )}
      </div>
    </div>
  );
}
