import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, BarChart3, Users, TrendingUp, Flame, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PageHeader } from '@/components/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CityData {
  cidade: string;
  count: number;
  avgScore: number;
}

// RS cities approximate positions (normalized 0-100 on a simplified RS map)
const cityPositions: Record<string, { x: number; y: number }> = {
  'Porto Alegre': { x: 68, y: 72 },
  'Caxias do Sul': { x: 60, y: 42 },
  'Pelotas': { x: 58, y: 92 },
  'Santa Maria': { x: 38, y: 58 },
  'Passo Fundo': { x: 52, y: 22 },
  'Canoas': { x: 66, y: 70 },
  'Novo Hamburgo': { x: 64, y: 62 },
  'São Leopoldo': { x: 65, y: 63 },
  'Rio Grande': { x: 60, y: 95 },
  'Viamão': { x: 70, y: 74 },
  'Gravataí': { x: 67, y: 68 },
  'Uruguaiana': { x: 8, y: 60 },
  'Santa Cruz do Sul': { x: 48, y: 55 },
  'Bagé': { x: 32, y: 85 },
  'Bento Gonçalves': { x: 58, y: 40 },
  'Erechim': { x: 55, y: 15 },
  'Lajeado': { x: 52, y: 50 },
  'Cruz Alta': { x: 38, y: 35 },
  'Ijuí': { x: 35, y: 30 },
  'Santo Ângelo': { x: 25, y: 30 },
  'Cachoeirinha': { x: 67, y: 69 },
  'Sapucaia do Sul': { x: 66, y: 67 },
  'Alvorada': { x: 69, y: 71 },
  'Guaíba': { x: 65, y: 75 },
  'Sapiranga': { x: 62, y: 58 },
  'Farroupilha': { x: 57, y: 41 },
  'Tramandaí': { x: 78, y: 68 },
  'Torres': { x: 82, y: 48 },
  'Capão da Canoa': { x: 80, y: 55 },
};

type HeatMode = 'volume' | 'score';

function getHeatColor(value: number, max: number, mode: HeatMode): string {
  const ratio = Math.min(value / max, 1);
  if (mode === 'volume') {
    // Blue → Cyan → Yellow → Orange → Red
    if (ratio < 0.25) return `hsla(207, 90%, 60%, ${0.4 + ratio * 2})`;
    if (ratio < 0.5) return `hsla(180, 80%, 45%, ${0.6 + ratio})`;
    if (ratio < 0.75) return `hsla(45, 95%, 50%, ${0.7 + ratio * 0.3})`;
    return `hsla(0, 85%, 55%, ${0.8 + ratio * 0.2})`;
  }
  // Score mode: green gradient
  if (ratio < 0.4) return `hsla(0, 70%, 55%, 0.7)`;
  if (ratio < 0.6) return `hsla(38, 90%, 50%, 0.75)`;
  if (ratio < 0.8) return `hsla(80, 70%, 45%, 0.8)`;
  return `hsla(152, 70%, 40%, 0.9)`;
}

function getGlowSize(count: number, max: number): number {
  return Math.max(30, Math.min(80, (count / max) * 80));
}

export default function MapaQuintais() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<{ cidade: string | null; pontuacao_quintal: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [heatMode, setHeatMode] = useState<HeatMode>('volume');
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

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
  const maxScore = Math.max(...cityData.map(c => c.avgScore), 1);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Mapa de Calor"
        subtitle="Densidade de leads por cidade"
        icon={<Flame className="w-4 h-4 text-destructive" />}
        onBack={() => navigate(-1)}
        rightSlot={
          <Badge variant="outline" className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 border-primary/30 text-primary whitespace-nowrap">
            {totalQuintais} quintais
          </Badge>
        }
      />

      <div className="px-4 md:px-6 py-4 md:py-6 max-w-5xl mx-auto">
        <Breadcrumbs items={[{ label: 'Mapa de Calor' }]} />

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4 md:mb-6">
          <Card>
            <CardContent className="p-3 md:p-4 text-center">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-primary mx-auto mb-1" />
              <p className="text-xl md:text-2xl font-bold">{totalQuintais}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Quintais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4 text-center">
              <MapPin className="w-5 h-5 md:w-6 md:h-6 text-secondary mx-auto mb-1" />
              <p className="text-xl md:text-2xl font-bold">{cityData.length}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Cidades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4 text-center">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-emerald-600 mx-auto mb-1" />
              <p className="text-xl md:text-2xl font-bold">{avgGeral}%</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">Média</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Heat Map */}
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="w-4 h-4 text-destructive" /> Mapa de Calor
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <Select value={heatMode} onValueChange={(v) => setHeatMode(v as HeatMode)}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume">Por Volume</SelectItem>
                      <SelectItem value="score">Por Potencial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative w-full aspect-[4/3] bg-muted/30 rounded-xl overflow-hidden border">
                  {/* RS outline */}
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 opacity-[0.07]">
                    <path
                      d="M 15,5 L 85,5 L 90,15 L 88,30 L 82,45 L 85,55 L 80,65 L 75,72 L 70,78 L 60,95 L 55,98 L 45,95 L 30,88 L 20,80 L 10,65 L 5,50 L 8,35 L 10,20 L 12,10 Z"
                      fill="hsl(var(--foreground))"
                      stroke="hsl(var(--foreground))"
                      strokeWidth="0.5"
                    />
                  </svg>

                  {/* Heat blobs */}
                  {cityData.map(city => {
                    const pos = cityPositions[city.cidade];
                    if (!pos) return null;
                    const heatValue = heatMode === 'volume' ? city.count : city.avgScore;
                    const heatMax = heatMode === 'volume' ? maxCount : maxScore;
                    const glowSize = getGlowSize(city.count, maxCount);
                    const color = getHeatColor(heatValue, heatMax, heatMode);
                    const isHovered = hoveredCity === city.cidade;

                    return (
                      <Tooltip key={city.cidade}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: isHovered ? 1.3 : 1, opacity: 1 }}
                            transition={{ delay: Math.random() * 0.4, type: 'spring', stiffness: 200 }}
                            className="absolute cursor-pointer"
                            style={{
                              left: `${pos.x}%`,
                              top: `${pos.y}%`,
                              transform: 'translate(-50%, -50%)',
                              width: glowSize,
                              height: glowSize,
                              zIndex: isHovered ? 50 : Math.round((city.count / maxCount) * 30),
                            }}
                            onMouseEnter={() => setHoveredCity(city.cidade)}
                            onMouseLeave={() => setHoveredCity(null)}
                          >
                            {/* Glow layer */}
                            <div
                              className="absolute inset-0 rounded-full blur-md transition-all duration-300"
                              style={{ backgroundColor: color, opacity: isHovered ? 0.9 : 0.5 }}
                            />
                            {/* Core dot */}
                            <div
                              className="absolute rounded-full border-2 border-background/50 shadow-lg transition-all duration-200"
                              style={{
                                backgroundColor: color,
                                width: Math.max(12, glowSize * 0.45),
                                height: Math.max(12, glowSize * 0.45),
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                            {/* Label */}
                            {(glowSize >= 30 || isHovered) && (
                              <span
                                className="absolute text-[9px] font-bold pointer-events-none whitespace-nowrap transition-opacity"
                                style={{
                                  left: '50%',
                                  top: `calc(50% + ${glowSize * 0.35}px)`,
                                  transform: 'translateX(-50%)',
                                  color: 'hsl(var(--foreground))',
                                  opacity: isHovered ? 1 : 0.7,
                                  textShadow: '0 1px 3px hsl(var(--background))',
                                }}
                              >
                                {city.cidade.length > 12 ? city.cidade.slice(0, 11) + '…' : city.cidade}
                              </span>
                            )}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-bold">{city.cidade}</p>
                          <p>{city.count} {city.count === 1 ? 'quintal' : 'quintais'} · Média {city.avgScore}%</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {heatMode === 'volume' ? 'Menor volume' : 'Menor potencial'}
                  </span>
                  <div className="flex gap-0.5">
                    {(heatMode === 'volume'
                      ? ['hsla(207,90%,60%,0.6)', 'hsla(180,80%,45%,0.7)', 'hsla(45,95%,50%,0.8)', 'hsla(0,85%,55%,0.9)']
                      : ['hsla(0,70%,55%,0.7)', 'hsla(38,90%,50%,0.75)', 'hsla(80,70%,45%,0.8)', 'hsla(152,70%,40%,0.9)']
                    ).map((c, i) => (
                      <div key={i} className="w-6 h-3 rounded-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {heatMode === 'volume' ? 'Maior volume' : 'Maior potencial'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* City ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Ranking de Cidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topCities.map((city, i) => {
                    const barColor = getHeatColor(city.count, maxCount, 'volume');
                    return (
                      <motion.div
                        key={city.cidade}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}º</span>
                        <div
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
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
                            transition={{ delay: i * 0.05 + 0.3, duration: 0.5 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}

                  {topCities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum quintal analisado ainda.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
    </PageTransition>
  );
}
