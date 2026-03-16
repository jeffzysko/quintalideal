import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, BarChart3, Users, TrendingUp, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PanelHeader } from '@/components/PanelHeader';
import { BackButton } from '@/components/BackButton';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { LeafletHeatmap } from '@/components/admin/LeafletHeatmap';

interface CityData {
  cidade: string;
  count: number;
  avgScore: number;
}

function getHeatColor(value: number, max: number): string {
  const ratio = Math.min(value / max, 1);
  if (ratio < 0.25) return `hsla(207, 90%, 60%, ${0.4 + ratio * 2})`;
  if (ratio < 0.5) return `hsla(180, 80%, 45%, ${0.6 + ratio})`;
  if (ratio < 0.75) return `hsla(45, 95%, 50%, ${0.7 + ratio * 0.3})`;
  return `hsla(0, 85%, 55%, ${0.8 + ratio * 0.2})`;
}

/* ── Premium KPI Card ── */
function KPICard({ icon: Icon, label, value, color, delay, accentGlow }: {
  icon: React.ElementType; label: string; value: string | number;
  color: string; delay: number; accentGlow: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 180, damping: 18 }}
    >
      <Card className="card-premium group relative overflow-hidden border-border/40">
        <div
          className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"
          style={{ background: accentGlow }}
        />
        <CardContent className="p-3 md:p-4 relative text-center">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5" style={{ background: `linear-gradient(135deg, ${accentGlow}22, ${accentGlow}44)` }}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <motion.p
            className="text-xl md:text-2xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            {value}
          </motion.p>
          <p className="text-[10px] md:text-xs text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function MapaQuintais() {
  
  const [leads, setLeads] = useState<{ cidade: string | null; pontuacao_quintal: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data } = await supabase
      .from('leads_map')
      .select('cidade, pontuacao_quintal');
    setLeads(data || []);
    setLoading(false);
  };

  const cityData = useMemo((): CityData[] => {
    const map: Record<string, { count: number; total: number }> = {};
    leads.forEach(l => {
      if (!l.cidade) return;
      if (!map[l.cidade]) map[l.cidade] = { count: 0, total: 0 };
      map[l.cidade].count++;
      map[l.cidade].total += l.pontuacao_quintal || 0;
    });
    return Object.entries(map)
      .map(([cidade, d]) => ({ cidade, count: d.count, avgScore: Math.round(d.total / d.count) }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const totalQuintais = leads.filter(l => l.cidade).length;
  const avgGeral = totalQuintais > 0
    ? Math.round(leads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalQuintais)
    : 0;
  const topCities = cityData.slice(0, 10);
  const maxCount = Math.max(...cityData.map(c => c.count), 1);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Mapa de Calor"
        subtitle="Densidade de leads por cidade"
        icon={<Flame className="w-4 h-4 text-destructive" />}
        fallbackPath="/admin"
        rightSlot={
          <Badge variant="outline" className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 border-primary/30 text-primary whitespace-nowrap animate-pulse-glow">
            {totalQuintais} quintais
          </Badge>
        }
      />

      <div className="px-4 md:px-6 py-4 md:py-6 max-w-5xl mx-auto">
        <Breadcrumbs items={[{ label: 'Mapa de Calor' }]} />

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
          <KPICard icon={Users} label="Quintais" value={totalQuintais} color="text-primary" delay={0.1} accentGlow="hsl(207, 90%, 54%)" />
          <KPICard icon={MapPin} label="Cidades" value={cityData.length} color="text-secondary" delay={0.15} accentGlow="hsl(330, 90%, 50%)" />
          <KPICard icon={TrendingUp} label="Média" value={`${avgGeral}%`} color="text-emerald-500" delay={0.2} accentGlow="hsl(152, 70%, 40%)" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full"
            />
          </div>
        ) : (
          <>
            {/* Leaflet Interactive Map */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 140, damping: 20 }}
              className="mb-6"
            >
              <LeafletHeatmap leads={leads} />
            </motion.div>

            {/* City ranking */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 140, damping: 20 }}
            >
              <Card className="card-premium border-border/40">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Ranking de Cidades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topCities.map((city, i) => {
                      const barColor = getHeatColor(city.count, maxCount);
                      return (
                        <motion.div
                          key={city.cidade}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.45 + i * 0.05 }}
                          className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                        >
                          <span className="text-sm font-bold text-muted-foreground w-6">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                          </span>
                          <div
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm group-hover:scale-125 transition-transform"
                            style={{ backgroundColor: barColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{city.cidade}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>{city.count} {city.count === 1 ? 'quintal' : 'quintais'}</span>
                              <span>Média: {city.avgScore}%</span>
                            </div>
                          </div>
                          <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: barColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(city.count / maxCount) * 100}%` }}
                              transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                    {topCities.length === 0 && (
                      <p className="text-muted-foreground text-center py-8 text-sm">Nenhum dado disponível</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
