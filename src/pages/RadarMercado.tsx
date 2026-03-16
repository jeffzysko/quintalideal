import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, BarChart3, Users, TrendingUp, Target, Home,
  Crown, Sparkles, AlertTriangle, Trophy, Flame,
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell } from 'recharts';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PanelHeader } from '@/components/PanelHeader';
import { BackButton } from '@/components/BackButton';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';

interface LeadData {
  cidade: string | null;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
  respostas_questionario: Record<string, string> | null;
  franquia_id: string | null;
  status_lead: string;
  created_at: string;
}

interface Franchise {
  id: string;
  nome_franquia: string;
}

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
  'Gramado': { x: 60, y: 50 },
  'Canela': { x: 61, y: 49 },
  'São Borja': { x: 15, y: 40 },
  'Santa Rosa': { x: 22, y: 20 },
  'Alegrete': { x: 15, y: 70 },
  'Vacaria': { x: 65, y: 30 },
};

const ESPACO_LABELS: Record<string, string> = {
  'ate-3': 'Pequeno (até 3m)',
  '3-5': 'Médio (3-5m)',
  '5-7': 'Grande (5-7m)',
  'mais-7': 'Extra Grande (7m+)',
};

const USO_LABELS: Record<string, string> = {
  'casal': 'Relaxar (Casal)',
  'familia-pequena': 'Família pequena',
  'familia-grande': 'Família grande',
  'amigos': 'Diversão e festas',
};

const INTENCAO_LABELS: Record<string, string> = {
  '2026': '🔥 Comprar este ano',
  '2026-2027': '🟡 Planejando',
  'pesquisando': '🔵 Apenas pesquisando',
};

const PIE_COLORS = ['#1e88e5', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb'];
const INTENCAO_COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];

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
        {/* Accent glow */}
        <div
          className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"
          style={{ background: accentGlow }}
        />
        <CardContent className="p-3 sm:p-5 relative">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${accentGlow}22, ${accentGlow}44)` }}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
            </div>
          </div>
          <motion.p
            className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            {value}
          </motion.p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 font-medium">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Section Card wrapper ── */
function SectionCard({ children, title, icon, subtitle, delay, className = '' }: {
  children: React.ReactNode; title: string; icon: React.ReactNode;
  subtitle?: string; delay: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 140, damping: 20 }}
    >
      <Card className={`card-premium border-border/40 overflow-hidden ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

export default function RadarMercado() {
  
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('leads').select('cidade, pontuacao_quintal, modelo_recomendado, respostas_questionario, franquia_id, status_lead, created_at'),
      supabase.from('franchises').select('id, nome_franquia'),
    ]).then(([leadsRes, franchisesRes]) => {
      setLeads((leadsRes.data || []) as LeadData[]);
      setFranchises(franchisesRes.data || []);
      setLoading(false);
    });
  }, []);

  const franchiseMap = useMemo(() => {
    const m: Record<string, string> = {};
    franchises.forEach(f => { m[f.id] = f.nome_franquia; });
    return m;
  }, [franchises]);

  const cityDemand = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number; sold: number }> = {};
    leads.forEach(l => {
      if (!l.cidade) return;
      if (!map[l.cidade]) map[l.cidade] = { count: 0, totalScore: 0, sold: 0 };
      map[l.cidade].count++;
      map[l.cidade].totalScore += l.pontuacao_quintal || 0;
      if (l.status_lead === 'vendido') map[l.cidade].sold++;
    });
    return Object.entries(map)
      .map(([cidade, d]) => ({
        cidade,
        count: d.count,
        avgScore: Math.round(d.totalScore / d.count),
        sold: d.sold,
        conversionRate: d.count > 0 ? Math.round((d.sold / d.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const yardSizes = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const espaco = l.respostas_questionario?.espaco;
      if (espaco) counts[espaco] = (counts[espaco] || 0) + 1;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(counts)
      .map(([key, count]) => ({
        name: ESPACO_LABELS[key] || key,
        value: count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  const modelRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      if (l.modelo_recomendado) counts[l.modelo_recomendado] = (counts[l.modelo_recomendado] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([model, count], i) => ({ rank: i + 1, model, count }));
  }, [leads]);

  const customerProfile = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const uso = l.respostas_questionario?.uso;
      if (uso) counts[uso] = (counts[uso] || 0) + 1;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(counts)
      .map(([key, count]) => ({
        name: USO_LABELS[key] || key,
        value: count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  const purchaseIntent = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      const intencao = l.respostas_questionario?.intencao;
      if (intencao) counts[intencao] = (counts[intencao] || 0) + 1;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    return ['2026', '2026-2027', 'pesquisando']
      .filter(k => counts[k])
      .map(key => ({
        name: INTENCAO_LABELS[key] || key,
        value: counts[key] || 0,
        pct: Math.round(((counts[key] || 0) / total) * 100),
      }));
  }, [leads]);

  const franchiseRanking = useMemo(() => {
    const map: Record<string, { leads: number; sold: number }> = {};
    leads.forEach(l => {
      if (!l.franquia_id) return;
      if (!map[l.franquia_id]) map[l.franquia_id] = { leads: 0, sold: 0 };
      map[l.franquia_id].leads++;
      if (l.status_lead === 'vendido') map[l.franquia_id].sold++;
    });
    return Object.entries(map)
      .map(([id, d]) => ({
        id,
        name: franchiseMap[id] || id,
        leads: d.leads,
        sold: d.sold,
        conversion: d.leads > 0 ? Math.round((d.sold / d.leads) * 100) : 0,
      }))
      .sort((a, b) => b.leads - a.leads);
  }, [leads, franchiseMap]);

  const opportunities = useMemo(() => {
    return cityDemand
      .filter(c => c.count >= 3 && c.conversionRate < 20)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(c => ({
        cidade: c.cidade,
        leads: c.count,
        sold: c.sold,
        conversionRate: c.conversionRate,
        avgScore: c.avgScore,
      }));
  }, [cityDemand]);

  const totalLeads = leads.length;
  const totalCities = new Set(leads.map(l => l.cidade).filter(Boolean)).size;
  const avgScore = totalLeads > 0 ? Math.round(leads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / totalLeads) : 0;
  const hotBuyers = leads.filter(l => l.respostas_questionario?.intencao === '2026').length;
  const maxCount = Math.max(...cityDemand.map(c => c.count), 1);

  const getHeatColor = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.6) return { bg: 'rgba(239,68,68,0.7)', border: '#ef4444', shadow: '0 0 12px rgba(239,68,68,0.4)' };
    if (ratio > 0.3) return { bg: 'rgba(245,158,11,0.6)', border: '#f59e0b', shadow: '0 0 8px rgba(245,158,11,0.3)' };
    return { bg: 'rgba(34,197,94,0.5)', border: '#22c55e', shadow: '0 0 6px rgba(34,197,94,0.3)' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Radar de Mercado"
        subtitle="Inteligência do Mercado de Piscinas"
        icon={<Target className="w-4 h-4 text-primary" />}
        fallbackPath="/admin"
        rightSlot={
          <Badge variant="outline" className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 border-primary/30 text-primary animate-pulse-glow">
            {totalLeads} testes
          </Badge>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <Breadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Radar de Mercado' },
        ]} />

        {/* KPI Row — Premium */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <KPICard icon={Users} label="Testes Realizados" value={totalLeads} color="text-primary" delay={0.1} accentGlow="hsl(207, 90%, 54%)" />
          <KPICard icon={MapPin} label="Cidades Mapeadas" value={totalCities} color="text-secondary" delay={0.15} accentGlow="hsl(330, 90%, 50%)" />
          <KPICard icon={TrendingUp} label="Potencial Médio" value={`${avgScore}%`} color="text-emerald-500" delay={0.2} accentGlow="hsl(152, 70%, 40%)" />
          <KPICard icon={Flame} label="Compradores Quentes" value={hotBuyers} color="text-red-500" delay={0.25} accentGlow="hsl(0, 85%, 55%)" />
        </div>

        {/* 1. DEMAND HEATMAP */}
        <SectionCard
          title="Mapa de Demanda por Piscinas no RS"
          icon={<MapPin className="w-5 h-5 text-primary" />}
          subtitle="Heatmap baseado nos testes realizados por cidade"
          delay={0.3}
          className="mb-8"
        >
          <div className="relative w-full aspect-square sm:aspect-[4/3] rounded-xl overflow-hidden border border-border/30" style={{ background: 'linear-gradient(135deg, hsl(var(--muted) / 0.3), hsl(var(--muted) / 0.1))' }}>
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 opacity-[0.06]">
              <path
                d="M 15,5 L 85,5 L 90,15 L 88,30 L 82,45 L 85,55 L 80,65 L 75,72 L 70,78 L 60,95 L 55,98 L 45,95 L 30,88 L 20,80 L 10,65 L 5,50 L 8,35 L 10,20 L 12,10 Z"
                fill="hsl(var(--foreground))"
                stroke="hsl(var(--foreground))"
                strokeWidth="0.3"
              />
            </svg>

            {cityDemand.map(city => {
              const pos = cityPositions[city.cidade];
              if (!pos) return null;
              const size = Math.max(14, Math.min(48, (city.count / maxCount) * 48));
              const heat = getHeatColor(city.count);
              return (
                <motion.div
                  key={city.cidade}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: Math.random() * 0.6, type: 'spring', damping: 12 }}
                  className="absolute flex items-center justify-center group cursor-pointer"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: size,
                    height: size,
                  }}
                >
                  {/* Pulsing outer ring for high-demand cities */}
                  {city.count / maxCount > 0.5 && (
                    <motion.div
                      className="absolute rounded-full"
                      style={{ backgroundColor: heat.bg, width: size * 1.6, height: size * 1.6 }}
                      animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <div
                    className="rounded-full w-full h-full transition-transform duration-200 hover:scale-[1.3]"
                    style={{ backgroundColor: heat.bg, border: `2px solid ${heat.border}`, boxShadow: heat.shadow }}
                  />
                  {size >= 22 && (
                    <span className="absolute text-[7px] font-bold text-white pointer-events-none drop-shadow-sm">
                      {city.count}
                    </span>
                  )}
                  <div className="absolute bottom-full mb-1 bg-card/95 backdrop-blur-lg border border-border/50 rounded-xl p-2.5 shadow-xl text-xs hidden group-hover:block z-50 whitespace-nowrap">
                    <p className="font-bold text-foreground">{city.cidade}</p>
                    <p className="text-muted-foreground">{city.count} leads · Média {city.avgScore}%</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 mt-4">
            {[
              { color: 'bg-green-500', label: 'Baixo interesse' },
              { color: 'bg-amber-500', label: 'Interesse médio' },
              { color: 'bg-red-500', label: 'Alta demanda' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${l.color} shadow-sm`} />
                <span className="text-[10px] text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* 2. YARD SIZES */}
          <SectionCard title="Tamanho dos Quintais" icon={<Home className="w-4 h-4 text-primary" />} delay={0.4} className="h-full">
            {yardSizes.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <ChartContainer config={{}} className="h-[140px] w-[140px] sm:h-[180px] sm:w-[180px] shrink-0">
                  <PieChart>
                    <Pie data={yardSizes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                      {yardSizes.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-2 justify-center sm:flex-1">
                  {yardSizes.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-1.5 sm:gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[10px] sm:text-xs truncate">{s.name}</span>
                      <span className="text-[10px] sm:text-xs font-bold">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* 3. MODELS RANKING */}
          <SectionCard title="Modelos Mais Desejados" icon={<Crown className="w-4 h-4 text-amber-500" />} delay={0.5} className="h-full">
            {modelRanking.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {modelRanking.map((m, i) => (
                  <motion.div
                    key={m.model}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-lg font-bold text-muted-foreground/60 w-6">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${m.rank}º`}
                    </span>
                    <span className="text-sm font-medium flex-1">{m.model}</span>
                    <Badge variant="secondary" className="text-xs font-bold">{m.count}</Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 4. CUSTOMER PROFILE */}
          <SectionCard title="Perfil do Cliente Splash" icon={<Users className="w-4 h-4 text-primary" />} subtitle="Como os gaúchos querem usar a piscina" delay={0.6} className="h-full">
            {customerProfile.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {customerProfile.map((p, i) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground font-bold">{p.pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p.pct}%` }}
                        transition={{ delay: 0.8 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, hsl(var(--primary)), hsl(207 90% 64%))` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* 5. PURCHASE INTENT */}
          <SectionCard title="Momento de Compra" icon={<Flame className="w-4 h-4 text-red-500" />} subtitle="Intenção de compra dos consumidores" delay={0.7} className="h-full">
            {purchaseIntent.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {purchaseIntent.map((p, i) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="font-bold">{p.value} ({p.pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p.pct}%` }}
                        transition={{ delay: 1 + i * 0.1, duration: 0.6 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: INTENCAO_COLORS[i] || INTENCAO_COLORS[2] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* 7. FRANCHISE RANKING */}
        {franchiseRanking.length > 0 && (
          <SectionCard title="Ranking de Franquias" icon={<Trophy className="w-4 h-4 text-amber-500" />} delay={0.8} className="mb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">#</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Franquia</th>
                    <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Leads</th>
                    <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Vendidos</th>
                    <th className="text-center py-2 px-3 text-xs text-muted-foreground font-medium">Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {franchiseRanking.map((f, i) => (
                    <motion.tr
                      key={f.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.04 }}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold text-muted-foreground">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                      </td>
                      <td className="py-2.5 px-3 font-medium">{f.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-primary">{f.leads}</td>
                      <td className="py-2.5 px-3 text-center">{f.sold}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="secondary" className="text-xs">{f.conversion}%</Badge>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* 8. OPPORTUNITY DETECTION */}
        {opportunities.length > 0 && (
          <SectionCard
            title="Detecção de Oportunidades"
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            subtitle="Cidades com alta intenção mas poucas vendas"
            delay={0.9}
            className="mb-8 border-amber-500/20"
          >
            <div className="space-y-2">
              {opportunities.map((o, i) => (
                <motion.div
                  key={o.cidade}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.06 }}
                  className="flex items-center gap-3 py-3 px-4 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 animate-pulse-glow" />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{o.cidade}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {o.leads} leads · {o.sold} vendidos · Média {o.avgScore}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-600">{o.conversionRate}% conversão</p>
                    <p className="text-[10px] text-muted-foreground">Oportunidade</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Top Cities Table */}
        <SectionCard title="Ranking de Cidades — Top 15" icon={<BarChart3 className="w-4 h-4 text-primary" />} delay={1}>
          <div className="space-y-2">
            {cityDemand.slice(0, 15).map((city, i) => (
              <motion.div
                key={city.cidade}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.04 }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-bold text-muted-foreground w-7">{i + 1}º</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{city.cidade}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {city.count} leads · Média {city.avgScore}% · {city.sold} vendidos
                  </p>
                </div>
                <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getHeatColor(city.count).border }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(city.count / maxCount) * 100}%` }}
                    transition={{ delay: 1 + i * 0.04 + 0.2, duration: 0.5 }}
                  />
                </div>
              </motion.div>
            ))}
            {cityDemand.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado disponível ainda.</p>
            )}
          </div>
        </SectionCard>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center py-8 mt-4"
        >
          <div className="mx-auto w-16 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent rounded mb-3" />
          <p className="text-[10px] text-muted-foreground/50">
            Radar de Mercado Splash RS © {new Date().getFullYear()} · Dados em tempo real
          </p>
        </motion.div>
      </div>
    </div>
    </PageTransition>
  );
}
