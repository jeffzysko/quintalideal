import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, MapPin, Droplets, Share2, Star, ArrowLeft, Sparkles, Crown, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import logoQuintalIdeal from '@/assets/lettering-quintal-ideal.svg';
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

function getScoreTier(score: number): { label: string; color: string; bg: string; icon: typeof Star; glow?: string } {
  if (score >= 85) return { label: 'Diamante', color: 'text-primary', bg: 'bg-primary/10', icon: Sparkles, glow: 'shadow-[0_0_20px_hsl(var(--primary)/0.3)]' };
  if (score >= 70) return { label: 'Ouro', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Trophy, glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' };
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
      navigator.share({ title: 'Ranking dos Quintais - Quintal Ideal', text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success('Link copiado!');
    }
  };

  const top3 = leads.slice(0, 3);
  const rest = leads.slice(3);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      {/* === HERO === */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #06101f 0%, #0b2a52 35%, #0d3468 60%, #081d38 100%)' }}
      >
        {/* Ambient circles */}
        <div className="absolute top-[-60px] right-[-40px] w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-40px] left-[-30px] w-48 h-48 rounded-full bg-primary/5 blur-2xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-5 pb-8 md:pt-8 md:pb-12">
          {/* Nav bar */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-xl text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="rounded-xl text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
          </div>

          {/* Centered logo + title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.img
              src={logoQuintalIdeal}
              alt="Quintal Ideal"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.8, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="mx-auto w-12 md:w-14 mb-4"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(30,136,229,0.15), rgba(0,229,255,0.08))',
                border: '1px solid rgba(30,136,229,0.25)',
              }}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Ranking ao Vivo</span>
            </motion.div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
              Os Melhores Quintais
              <br />
              <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                para Piscina
              </span>
            </h1>
            <p className="text-sm md:text-base text-white/50 max-w-md mx-auto">
              Descubra quais quintais têm o maior potencial para receber uma piscina.
            </p>
          </motion.div>

          {/* Stats row */}
          {!loading && stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center gap-4 md:gap-8 mt-6"
            >
              {[
                { value: stats.total, label: 'Avaliados', icon: <Droplets className="w-3.5 h-3.5" /> },
                { value: `${stats.avgScore}%`, label: 'Média', icon: <Star className="w-3.5 h-3.5" /> },
                { value: stats.diamondCount, label: 'Diamantes 💎', icon: null },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-lg md:text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-[10px] md:text-xs text-white/40">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* === TOP 3 PODIUM === */}
      {!loading && top3.length === 3 && (
        <div className="max-w-3xl mx-auto px-4 -mt-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="grid grid-cols-3 gap-2 sm:gap-3"
          >
            {/* 2nd place */}
            <PodiumCard lead={top3[1]} index={1} />
            {/* 1st place */}
            <PodiumCard lead={top3[0]} index={0} />
            {/* 3rd place */}
            <PodiumCard lead={top3[2]} index={2} />
          </motion.div>
        </div>
      )}

      {/* === LIST === */}
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
          <div className="space-y-2.5">
            {rest.map((lead, i) => {
              const tier = getScoreTier(lead.pontuacao_quintal);
              const TierIcon = tier.icon;
              const rank = i + 4;

              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + Math.min(i * 0.025, 0.12) }}
                >
                  <Card className={`transition-all hover:shadow-md ${tier.glow || ''}`}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs bg-muted text-muted-foreground">
                          {rank}º
                        </div>

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

                        <div className="shrink-0 text-right">
                          <p className={`text-xl font-extrabold ${lead.pontuacao_quintal >= 70 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {lead.pontuacao_quintal}
                          </p>
                          <p className="text-[9px] text-muted-foreground">pontos</p>
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
              transition={{ delay: 0.6 }}
              className="text-center pt-8 pb-4"
            >
              <p className="text-sm text-muted-foreground mb-3">Quer ver seu quintal no ranking?</p>
              <Link to="/">
                <Button size="lg" className="rounded-2xl gap-2 shadow-xl shadow-primary/20 gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.02] transition-all duration-300">
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

/* ===== Podium Card Component ===== */
function PodiumCard({ lead, index }: { lead: RankedLead; index: number }) {
  const tier = getScoreTier(lead.pontuacao_quintal);
  const isFirst = index === 0;

  const heights = ['min-h-[180px]', 'min-h-[150px]', 'min-h-[140px]'];
  // Static order classes — Tailwind can't detect dynamic `order-${n}`
  const orderClasses = ['order-1', 'order-first', 'order-last'] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + [1, 0, 2][index] * 0.1 }}
      className={`${orderClasses[index]} ${isFirst ? '-mt-2' : 'mt-2'}`}
    >
      <div
        className={`rounded-2xl border border-border/60 bg-card p-3 text-center flex flex-col items-center justify-center gap-1.5 ${heights[index]} ${isFirst ? 'ring-2 ring-primary/30 shadow-lg shadow-primary/10' : 'shadow-sm'}`}
      >
        <span className="text-2xl sm:text-3xl">{getMedalEmoji(index)}</span>
        {isFirst && <Crown className="w-4 h-4 text-amber-400 -mt-1" />}
        <p className={`text-2xl sm:text-3xl font-black ${isFirst ? 'text-primary' : 'text-foreground'}`}>
          {lead.pontuacao_quintal}
        </p>
        <p className="text-[9px] text-muted-foreground">pontos</p>
        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${tier.color} ${tier.bg} border-transparent`}>
          {tier.label}
        </Badge>
        {lead.cidade && (
          <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
            <MapPin className="w-2.5 h-2.5" />
            {lead.cidade}
          </p>
        )}
      </div>
    </motion.div>
  );
}
