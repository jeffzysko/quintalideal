import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, MapPin, Droplets, Share2, Star, ArrowLeft, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import logoSplash from '@/assets/logo-splash.png';
import { useNavigate, Link } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { toast } from 'sonner';

interface RankedLead {
  id: string;
  cidade: string | null;
  pontuacao_quintal: number;
  modelo_recomendado: string | null;
  created_at: string;
  ref_code: string | null;
}

function getScoreTier(score: number): { label: string; color: string; bg: string; icon: typeof Star } {
  if (score >= 85) return { label: 'Diamante', color: 'text-primary', bg: 'bg-primary/10', icon: Sparkles };
  if (score >= 70) return { label: 'Ouro', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Trophy };
  if (score >= 55) return { label: 'Prata', color: 'text-muted-foreground', bg: 'bg-muted', icon: Star };
  return { label: 'Bronze', color: 'text-amber-700', bg: 'bg-amber-700/10', icon: Star };
}

function getMedalEmoji(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}º`;
}

export default function RankingQuintais() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<RankedLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from('leads_map')
      .select('id, cidade, pontuacao_quintal, modelo_recomendado, created_at')
      .not('pontuacao_quintal', 'is', null)
      .order('pontuacao_quintal', { ascending: false })
      .limit(50);

    setLeads((data || []).map(d => ({ ...d, ref_code: null, pontuacao_quintal: d.pontuacao_quintal ?? 0 })));
    setLoading(false);
  };

  const stats = useMemo(() => {
    if (!leads.length) return { total: 0, avgScore: 0, topCity: '', diamondCount: 0 };
    const avgScore = Math.round(leads.reduce((s, l) => s + l.pontuacao_quintal, 0) / leads.length);
    const cityCounts: Record<string, number> = {};
    leads.forEach(l => { if (l.cidade) cityCounts[l.cidade] = (cityCounts[l.cidade] || 0) + 1; });
    const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const diamondCount = leads.filter(l => l.pontuacao_quintal >= 85).length;
    return { total: leads.length, avgScore, topCity, diamondCount };
  }, [leads]);

  const handleShare = () => {
    const url = window.location.href;
    const text = `🏊 Confira o Ranking dos Melhores Quintais para Piscina! Veja se a sua cidade está no topo.`;
    if (navigator.share) {
      navigator.share({ title: 'Ranking dos Quintais - Splash Piscinas', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success('Link copiado!');
    }
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 py-8 md:py-12 text-center">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logoSplash} alt="Splash" className="h-8 md:h-10" />
            <Button variant="outline" size="sm" onClick={handleShare} className="rounded-xl gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              <Trophy className="w-4 h-4" />
              Ranking ao Vivo
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
              Os Melhores Quintais<br />para Piscina
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              Descubra quais quintais têm o maior potencial para receber uma piscina Splash.
            </p>
          </motion.div>

          {/* Stats row */}
          {!loading && stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center gap-4 md:gap-8 mt-6"
            >
              <div className="text-center">
                <p className="text-lg md:text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Avaliados</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-lg md:text-2xl font-bold text-foreground">{stats.avgScore}%</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Média</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-lg md:text-2xl font-bold text-primary">{stats.diamondCount}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Diamantes 💎</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-semibold mb-1">Ranking em construção</p>
              <p className="text-sm text-muted-foreground mb-4">
                Seja o primeiro a analisar seu quintal e aparecer no ranking!
              </p>
              <Link to="/">
                <Button className="rounded-xl">Analisar meu Quintal →</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {leads.map((lead, i) => {
              const tier = getScoreTier(lead.pontuacao_quintal);
              const TierIcon = tier.icon;
              const isTop3 = i < 3;

              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className={`transition-all hover:shadow-md ${isTop3 ? 'ring-1 ring-primary/20 shadow-sm' : ''}`}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${isTop3 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {getMedalEmoji(i)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0 ${tier.color} ${tier.bg} border-transparent`}>
                              <TierIcon className="w-3 h-3 mr-1" />
                              {tier.label}
                            </Badge>
                            {lead.modelo_recomendado && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Droplets className="w-3 h-3" />
                                {lead.modelo_recomendado}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {lead.cidade && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {lead.cidade}
                              </span>
                            )}
                            <span>·</span>
                            <span>{new Date(lead.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="shrink-0 text-right">
                          <p className={`text-xl md:text-2xl font-extrabold ${lead.pontuacao_quintal >= 70 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {lead.pontuacao_quintal}
                          </p>
                          <p className="text-[10px] text-muted-foreground">pontos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center pt-6 pb-4"
            >
              <p className="text-sm text-muted-foreground mb-3">Quer ver seu quintal no ranking?</p>
              <Link to="/">
                <Button size="lg" className="rounded-xl gap-2 shadow-lg">
                  <Droplets className="w-4 h-4" />
                  Analisar meu Quintal
                </Button>
              </Link>
            </motion.div>
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
