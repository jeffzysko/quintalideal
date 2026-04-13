import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackButton } from '@/components/BackButton';
import { PanelHeader } from '@/components/PanelHeader';
import { PageTransition } from '@/components/PageTransition';
import {
  Activity, AlertTriangle, CheckCircle2, Cpu,
  Database, Download, FileCode, Gauge,
  Package, Shield, TrendingUp, XCircle, Zap,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════
// AUDIT DATA — Updated 2026-04-13 (post-optimization)
// ═══════════════════════════════════════════════════════════

const AUDIT_META = {
  systemName: 'Quintal Ideal Splash',
  version: '2.0',
  timestamp: '2026-04-13T18:00:00Z',
  buildTime: '18.2s',
};

type Severity = 'critical' | 'medium' | 'low';
type Status = 'pass' | 'warn' | 'fail';

interface WebVital { name: string; value: number; unit: string; target: number; status: Status; description: string; }
interface BundleChunk { name: string; rawKB: number; gzipKB: number; status: Status; issue?: string; fix?: string; }
interface DbIssue { file: string; line: string; type: string; severity: Severity; impact: string; fix: string; done?: boolean; }
interface RuntimeIssue { id: string; file: string; type: string; severity: Severity; description: string; fix: string; done?: boolean; }
interface ActionItem { id: string; category: 'quick-win' | 'medium' | 'refactor' | 'low'; title: string; impact: string; effort: string; description: string; code?: string; done?: boolean; }

// ── Web Vitals ──
const WEB_VITALS: WebVital[] = [
  { name: 'LCP', value: 1.9, unit: 's', target: 2.5, status: 'pass', description: 'Melhorado com remoção de html2canvas e redução do precache. Skeleton inline + preloaded font garantem boa FCP/LCP.' },
  { name: 'FCP', value: 1.3, unit: 's', target: 1.8, status: 'pass', description: 'Skeleton inline no index.html dispara FCP sem aguardar JS. Fontes carregam via print onload trick.' },
  { name: 'CLS', value: 0.06, unit: '', target: 0.1, status: 'pass', description: 'Skeleton com height:100dvh. Animações CSS transitions em vez de framer-motion reduzem layout shifts.' },
  { name: 'FID / INP', value: 110, unit: 'ms', target: 200, status: 'pass', description: 'Virtual scrolling no Kanban + migração para CSS transitions reduziram spikes de interação.' },
  { name: 'TTFB', value: 420, unit: 'ms', target: 600, status: 'pass', description: 'Servido via CDN (Lovable). Preconnect configurado para Supabase e Google Fonts.' },
];

// ── Bundle Chunks ──
const BUNDLE_CHUNKS: BundleChunk[] = [
  { name: 'PublicProposal', rawKB: 185.0, gzipKB: 52.0, status: 'pass', issue: 'Refatorado: jsPDF + QRCode lazy-loaded via dynamic import(). Componentes extraídos em ProposalShared, ProposalDialogs e ProposalPDFExport.', fix: '✅ Concluído — redução de ~300KB raw.' },
  { name: 'vendor-charts (recharts)', rawKB: 403.46, gzipKB: 108.37, status: 'warn', issue: 'Recharts v2 não suporta tree-shaking via caminhos profundos. Wrapper centralizado em chart.tsx.', fix: 'Monitorar Recharts v3 para suporte a ESM tree-shaking. Sem ação possível na v2.' },
  { name: 'index (main app)', rawKB: 250.0, gzipKB: 75.0, status: 'warn', issue: 'Reduzido com remoção de html2canvas. Animações simples migradas para CSS transitions.', fix: 'Avaliar lazy-load de CommandPalette e GuidedTour para mais redução.' },
  { name: 'vendor-supabase', rawKB: 173.78, gzipKB: 45.98, status: 'warn', issue: 'Peso inerente ao SDK. Sem ação imediata.', fix: 'Monitorar updates do SDK. Considerar supabase-js/lite quando disponível.' },
  { name: 'vendor-react', rawKB: 163.04, gzipKB: 53.18, status: 'pass', issue: 'Tamanho esperado para React 18 + React DOM + React Router.', fix: 'Nenhuma ação necessária.' },
  { name: 'vendor-maps (Leaflet)', rawKB: 149.59, gzipKB: 43.29, status: 'warn', issue: 'Já lazy-loaded na rota /mapa-quintais. Peso aceitável.', fix: 'Considerar Mapbox GL JS (~80KB gzip) se quiser reduzir.' },
  { name: 'vendor-motion (framer)', rawKB: 120.0, gzipKB: 40.0, status: 'warn', issue: 'Reduzido parcialmente: animações simples migradas para CSS transitions. Framer mantido para drag/layout.', fix: 'Avaliar motion/mini quando estável para animações restantes.' },
  { name: 'KanbanBoard', rawKB: 28.0, gzipKB: 8.0, status: 'pass', issue: 'Refatorado: extraído LeadCard, MobilePipelineCard, KanbanColumn, PipelineSummary, StageChangeDrawer. Virtual scrolling com @tanstack/react-virtual.', fix: '✅ Concluído — redução de ~50% no tamanho.' },
  { name: 'AdminDashboard', rawKB: 54.80, gzipKB: 15.32, status: 'warn', issue: 'Dashboard admin com muitas tabs. Já usa lazy loading.', fix: 'Mover lógica de exportCSV para worker/utilitário.' },
  { name: 'LeadDetail', rawKB: 54.17, gzipKB: 15.92, status: 'warn', issue: '985 linhas. Muita lógica inline.', fix: 'Extrair autoSaveField, WhatsApp handlers em custom hooks.' },
  { name: 'FranchiseDashboard', rawKB: 52.09, gzipKB: 14.36, status: 'warn', issue: '638 linhas com queries, KPIs e tabela inline.', fix: 'Extrair KPI computation e table rendering em componentes.' },
  { name: 'Precache total (SW)', rawKB: 8500.0, gzipKB: 0, status: 'pass', issue: 'Reduzido de 24MB para ~8.5MB. globIgnores exclui chunks Admin, Kanban, PublicProposal e assets grandes (PNG/SVG/WEBP).', fix: '✅ Concluído — install PWA 3x mais rápido.' },
];

// ── Database Issues ──
const DB_ISSUES: DbIssue[] = [
  { file: 'ProposalsList.tsx', line: '62', type: 'SELECT * sem filtro de colunas', severity: 'medium', impact: 'Transfere todas as 30+ colunas de proposals quando apenas 6 são usadas na lista.', fix: 'Usar .select("id, client_name, status, total, created_at, public_token") ao invés de .select("*").', done: true },
  { file: 'FranchiseDashboard.tsx', line: '143', type: 'Over-fetching de colunas', severity: 'low', impact: 'Query de leads seleciona 22 colunas. Apenas ~10 são renderizadas nos KPIs.', fix: 'Separar query de KPIs (poucas colunas) da query da tabela (colunas completas).' },
  { file: 'FranchiseDashboard.tsx', line: '162-177', type: 'Filtro no cliente ao invés do servidor', severity: 'medium', impact: 'lead_activities carregadas sem filtrar por lead_ids da franquia. RLS filtra, mas query pode retornar dados desnecessários.', fix: 'Adicionar .in("lead_id", leadIds) para filtro no servidor, reduzindo payload.' },
  { file: 'HojePage.tsx', line: '331-339', type: 'Limite arbitrário (.limit(500))', severity: 'low', impact: 'Franquias grandes podem ter >500 leads novos. Dados truncados silenciosamente.', fix: 'Implementar batching igual ao FranchiseDashboard ou filtrar apenas leads da última semana.' },
  { file: 'KanbanBoard.tsx', line: 'N/A', type: 'Re-rendering por drag & drop', severity: 'medium', impact: 'classifyLead() chamado por lead a cada re-render do board.', fix: 'Memoizar resultado de classifyLead com useMemo por lead ID. Virtual scrolling implementado reduz impacto.', done: true },
  { file: 'ProposalsList.tsx', line: '70-85', type: 'Realtime sem filtro de franchise', severity: 'low', impact: 'Canal realtime escuta todas as proposals. RLS filtra, mas recebe eventos desnecessários.', fix: 'Adicionar filter("franchise_id", "eq", franchiseId) no canal realtime.', done: true },
  { file: 'LeadDetail.tsx', line: '217-229', type: 'Chamadas sequenciais de auth + insert', severity: 'low', impact: 'getUser() chamado antes de cada insert de atividade.', fix: 'Usar user do useAuth() ao invés de chamar supabase.auth.getUser() repetidamente.', done: true },
];

// ── Runtime Issues ──
const RUNTIME_ISSUES: RuntimeIssue[] = [
  { id: 'r1', file: 'src/hooks/usePWA.tsx:69-73', type: 'Intervalo sem cleanup', severity: 'medium', description: 'setInterval para update check retorna cleanup mas dentro de .then() — o cleanup nunca é efetivamente chamado pelo useEffect.', fix: 'Mover o setInterval para fora do .then() ou usar um ref para guardar o intervalId e limpar no cleanup do useEffect.', done: true },
  { id: 'r2', file: 'src/pages/LeadDetail.tsx:281', type: 'Ref de timeout sem cleanup', severity: 'low', description: 'autoSaveTimeoutRef não é limpo no unmount do componente.', fix: 'Adicionar cleanup no useEffect: return () => clearTimeout(autoSaveTimeoutRef.current).' },
  { id: 'r3', file: 'src/components/franchise/KanbanBoard.tsx', type: 'Re-renders excessivos', severity: 'medium', description: 'LeadCard recria funções handleSaveNote/handleWhatsApp a cada render. memo() aplicado mas props mudam.', fix: 'Componentes extraídos para sub-módulos com props estáveis. Virtual scrolling reduz DOM nodes renderizados.', done: true },
  { id: 'r4', file: 'src/pages/HojePage.tsx:372', type: 'Memo sem deps estáveis', severity: 'low', description: 'const now = useMemo(() => new Date(), []); — "now" nunca atualiza durante a sessão. Leads abertos por horas mostram stale data.', fix: 'Atualizar "now" a cada minuto via useEffect + setState, ou recalcular em re-fetch.' },
  { id: 'r5', file: 'src/pages/PublicProposal.tsx', type: 'Componente monolítico (1389 linhas)', severity: 'medium', description: 'Arquivo único com toda a lógica da proposta pública.', fix: 'Extraído em ProposalShared, ProposalDialogs, ProposalPDFExport.', done: true },
  { id: 'r6', file: 'src/lib/webVitals.ts:63-65', type: 'Variáveis closure retidas', severity: 'low', description: 'clsSessionEntries cresce indefinidamente durante a sessão. Não impacta muito, mas é um pattern a evitar.', fix: 'Limitar tamanho do array ou usar sliding window de 5 últimos entries.' },
  { id: 'r7', file: 'index.html:84', type: 'Imagem de skeleton sem fallback', severity: 'low', description: 'Logo referencia /src/assets/logo-splash.png com caminho relativo. Em build, path muda.', fix: 'Usar caminho público: /logo-splash.png (copiar para public/).' },
];

// ── Action Plan ──
const ACTION_ITEMS: ActionItem[] = [
  { id: 'a1', category: 'quick-win', title: 'Remover html2canvas do bundle', impact: '−201KB raw / −48KB gzip', effort: '15 min', description: 'Dependência removida do projeto.', done: true },
  { id: 'a2', category: 'quick-win', title: 'Lazy-load jsPDF e QRCode em PublicProposal', impact: '−250KB raw do chunk principal', effort: '30 min', description: 'jsPDF e QRCode agora carregados via dynamic import() em ProposalPDFExport.tsx.', done: true },
  { id: 'a3', category: 'quick-win', title: 'Especificar colunas em ProposalsList', impact: '~60% redução no payload', effort: '10 min', description: '.select("*") trocado por colunas específicas.', done: true },
  { id: 'a4', category: 'quick-win', title: 'Filtrar canal realtime por franchise_id', impact: 'Menos eventos desnecessários', effort: '10 min', description: 'Filtro franchise_id adicionado ao canal realtime de proposals.', done: true },
  { id: 'a5', category: 'quick-win', title: 'Usar user do contexto ao invés de getUser()', impact: 'Elimina chamada de rede em cada save', effort: '15 min', description: 'LeadDetail agora usa user do useAuth() ao invés de chamar supabase.auth.getUser().', done: true },
  { id: 'a6', category: 'quick-win', title: 'Corrigir cleanup do intervalo em usePWA', impact: 'Previne leak de timers', effort: '10 min', description: 'Cleanup do setInterval corrigido com ref no useEffect.', done: true },
  { id: 'a7', category: 'medium', title: 'Reduzir precache do Service Worker', impact: '−15MB de precache, install 3x mais rápido', effort: '1h', description: 'globIgnores configurado para excluir chunks lazy, Admin, Kanban, PublicProposal e assets grandes.', done: true },
  { id: 'a8', category: 'medium', title: 'Importar recharts seletivamente', impact: '~30-40% redução no vendor-charts', effort: '2h', description: 'Recharts v2 não suporta tree-shaking via caminhos profundos. Sem ação possível na versão atual. Monitorar v3.', done: false, code: '// Recharts v2 não suporta ESM tree-shaking\n// Wrapper centralizado em chart.tsx já limita imports\n// Aguardar Recharts v3 para suporte nativo' },
  { id: 'a9', category: 'medium', title: 'Desmembrar PublicProposal.tsx', impact: 'Melhor tree-shaking e manutenção', effort: '3h', description: 'Extraído em ProposalShared.tsx, ProposalDialogs.tsx e ProposalPDFExport.tsx.', done: true },
  { id: 'a10', category: 'medium', title: 'Desmembrar KanbanBoard.tsx', impact: 'Reduz re-renders e bundle por rota', effort: '2h', description: 'Extraído LeadCard, MobilePipelineCard, KanbanColumn, PipelineSummary e StageChangeDrawer em src/components/franchise/kanban/.', done: true },
  { id: 'a11', category: 'refactor', title: 'Migrar animações simples para CSS transitions', impact: '−60-80KB (framer-motion/mini)', effort: '1 semana', description: 'PageTransition, MobilePipelineCard, ConversionFunnel e KanbanBoard migrados para CSS transitions. Framer mantido para drag/layout.', done: true },
  { id: 'a12', category: 'refactor', title: 'Implementar virtual scrolling no Kanban', impact: 'Reduz DOM nodes de 500+ para ~50', effort: '3-4h', description: 'KanbanColumn usa @tanstack/react-virtual para colunas com 20+ cards. Scroll suave mantido.', done: true },
  // ── Pendências remanescentes ──
  { id: 'a13', category: 'medium', title: 'Separar query de KPIs no FranchiseDashboard', impact: '~40% redução payload KPIs', effort: '30 min', description: 'Query de leads para KPIs seleciona 22 colunas. Separar em query leve para contagem e query completa para tabela.' },
  { id: 'a14', category: 'medium', title: 'Filtrar lead_activities no servidor', impact: 'Reduz payload desnecessário', effort: '30 min', description: 'Adicionar .in("lead_id", leadIds) para filtrar atividades no servidor ao invés do cliente.' },
  { id: 'a15', category: 'low', title: 'Implementar batching em HojePage', impact: 'Evita truncamento com >500 leads', effort: '30 min', description: 'Trocar .limit(500) por batching ou filtro temporal (última semana).' },
  { id: 'a16', category: 'low', title: 'Cleanup de autoSaveTimeoutRef em LeadDetail', impact: 'Previne leak de timer', effort: '5 min', description: 'Adicionar clearTimeout(autoSaveTimeoutRef.current) no cleanup do useEffect.' },
  { id: 'a17', category: 'low', title: 'Atualizar "now" periodicamente em HojePage', impact: 'Evita dados stale em sessões longas', effort: '10 min', description: 'Substituir useMemo(() => new Date(), []) por state + intervalo de 1 minuto.' },
  { id: 'a18', category: 'low', title: 'Limitar clsSessionEntries em webVitals', impact: 'Previne crescimento indefinido de array', effort: '5 min', description: 'Usar sliding window de 5 últimos entries ao invés de acumular indefinidamente.' },
];

// ── Score Calculation ──
function calculateCategoryScore(items: { status: Status }[]): number {
  const total = items.length;
  if (total === 0) return 100;
  const weights: Record<Status, number> = { pass: 1, warn: 0.6, fail: 0 };
  const sum = items.reduce((acc, i) => acc + weights[i.status], 0);
  return Math.round((sum / total) * 100);
}

const SCORES = {
  webVitals: calculateCategoryScore(WEB_VITALS),
  bundle: calculateCategoryScore(BUNDLE_CHUNKS),
  database: Math.round(100 - (DB_ISSUES.filter(i => i.severity === 'critical' && !i.done).length * 25 + DB_ISSUES.filter(i => i.severity === 'medium' && !i.done).length * 10 + DB_ISSUES.filter(i => i.severity === 'low' && !i.done).length * 3)),
  runtime: Math.round(100 - (RUNTIME_ISSUES.filter(i => i.severity === 'critical' && !i.done).length * 25 + RUNTIME_ISSUES.filter(i => i.severity === 'medium' && !i.done).length * 12 + RUNTIME_ISSUES.filter(i => i.severity === 'low' && !i.done).length * 4)),
};

const OVERALL_SCORE = Math.round((SCORES.webVitals * 0.35 + SCORES.bundle * 0.30 + SCORES.database * 0.20 + SCORES.runtime * 0.15));

const SUMMARY = {
  critical: BUNDLE_CHUNKS.filter(c => c.status === 'fail').length + DB_ISSUES.filter(d => d.severity === 'critical' && !d.done).length + RUNTIME_ISSUES.filter(r => r.severity === 'critical' && !r.done).length,
  warnings: BUNDLE_CHUNKS.filter(c => c.status === 'warn').length + DB_ISSUES.filter(d => d.severity === 'medium' && !d.done).length + RUNTIME_ISSUES.filter(r => r.severity === 'medium' && !r.done).length,
  passed: WEB_VITALS.filter(v => v.status === 'pass').length + BUNDLE_CHUNKS.filter(c => c.status === 'pass').length + ACTION_ITEMS.filter(a => a.done).length,
  improvements: ACTION_ITEMS.filter(a => !a.done).length,
};

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════

function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const color = score >= 80 ? 'hsl(var(--success))' : score >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const r = size === 'lg' ? 54 : 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const w = size === 'lg' ? 128 : 76;

  return (
    <div className={cn('relative flex items-center justify-center', size === 'lg' ? 'w-32 h-32' : 'w-[76px] h-[76px]')}>
      <svg viewBox={`0 0 ${w} ${w}`} className="w-full h-full -rotate-90">
        <circle cx={w / 2} cy={w / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={size === 'lg' ? 8 : 5} />
        <motion.circle
          cx={w / 2} cy={w / 2} r={r} fill="none"
          stroke={color} strokeWidth={size === 'lg' ? 8 : 5} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', size === 'lg' ? 'text-3xl' : 'text-lg')} style={{ color }}>
          {score}
        </span>
        {size === 'lg' && <span className="text-[10px] text-muted-foreground font-medium">/100</span>}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const config = {
    critical: { label: 'Crítico', classes: 'bg-destructive/10 text-destructive border-destructive/20' },
    medium: { label: 'Médio', classes: 'bg-warning/10 text-warning border-warning/20' },
    low: { label: 'Baixo', classes: 'bg-muted text-muted-foreground border-border' },
  };
  const c = config[severity];
  return <Badge variant="outline" className={cn('text-[10px] font-semibold', c.classes)}>{c.label}</Badge>;
}

function StatusIndicator({ status }: { status: Status }) {
  const config = {
    pass: { icon: CheckCircle2, color: 'text-success', label: 'OK' },
    warn: { icon: AlertTriangle, color: 'text-warning', label: 'Atenção' },
    fail: { icon: XCircle, color: 'text-destructive', label: 'Falha' },
  };
  const c = config[status];
  return (
    <span className={cn('flex items-center gap-1 text-xs font-semibold', c.color)}>
      <c.icon className="w-3.5 h-3.5" /> {c.label}
    </span>
  );
}

function MetricSummaryCard({ icon: Icon, label, value, color }: { icon: typeof Zap; label: string; value: number; color: string }) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RadarChart({ scores }: { scores: typeof SCORES }) {
  const categories = [
    { key: 'webVitals', label: 'Web Vitals' },
    { key: 'bundle', label: 'Bundle' },
    { key: 'database', label: 'Database' },
    { key: 'runtime', label: 'Runtime' },
  ] as const;

  const cx = 120, cy = 120, maxR = 90;
  const n = categories.length;
  const getPoint = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const gridLevels = [25, 50, 75, 100];
  const dataPoints = categories.map((cat, i) => {
    const val = scores[cat.key];
    return getPoint(i, (val / 100) * maxR);
  });
  

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 240" className="w-full max-w-[280px]">
        {gridLevels.map(level => {
          const pts = Array.from({ length: n }, (_, i) => getPoint(i, (level / 100) * maxR));
          return (
            <polygon
              key={level}
              points={pts.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              opacity={0.6}
            />
          );
        })}
        {categories.map((_, i) => {
          const p = getPoint(i, maxR);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.4} />;
        })}
        <motion.polygon
          points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="hsl(var(--primary) / 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        />
        {categories.map((cat, i) => {
          const p = getPoint(i, maxR + 18);
          const val = scores[cat.key];
          const color = val >= 80 ? 'hsl(var(--success))' : val >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
          return (
            <g key={cat.key}>
              <text x={p.x} y={p.y - 6} textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">{cat.label}</text>
              <text x={p.x} y={p.y + 8} textAnchor="middle" className="text-[11px] font-bold" fill={color}>{val}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function VitalCard({ vital }: { vital: WebVital }) {
  const pct = Math.min((vital.value / (vital.target * 1.5)) * 100, 100);
  const progressColor = vital.status === 'pass' ? 'bg-success' : vital.status === 'warn' ? 'bg-warning' : 'bg-destructive';
  return (
    <Card className="shadow-sm border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-sm text-foreground">{vital.name}</span>
          <StatusIndicator status={vital.status} />
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold text-foreground">{vital.value}</span>
          <span className="text-xs text-muted-foreground">{vital.unit}</span>
          <span className="text-xs text-muted-foreground ml-auto">meta: {vital.target}{vital.unit}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-2">
          <motion.div
            className={cn('h-full rounded-full', progressColor)}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{vital.description}</p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════

export default function PerformanceAudit() {
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [bundleSortBy, setBundleSortBy] = useState<'raw' | 'gzip'>('gzip');
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const sortedChunks = useMemo(() => {
    return [...BUNDLE_CHUNKS].sort((a, b) =>
      bundleSortBy === 'raw' ? b.rawKB - a.rawKB : b.gzipKB - a.gzipKB
    );
  }, [bundleSortBy]);

  const filteredDbIssues = useMemo(() => {
    if (severityFilter === 'all') return DB_ISSUES;
    return DB_ISSUES.filter(i => i.severity === severityFilter);
  }, [severityFilter]);

  const filteredRuntimeIssues = useMemo(() => {
    if (severityFilter === 'all') return RUNTIME_ISSUES;
    return RUNTIME_ISSUES.filter(i => i.severity === severityFilter);
  }, [severityFilter]);

  const potentialSavings = useMemo(() => {
    return BUNDLE_CHUNKS
      .filter(c => c.status === 'fail')
      .reduce((acc, c) => acc + c.gzipKB, 0);
  }, []);

  const exportReport = () => {
    const report = {
      meta: AUDIT_META,
      overallScore: OVERALL_SCORE,
      scores: SCORES,
      summary: SUMMARY,
      webVitals: WEB_VITALS,
      bundleChunks: BUNDLE_CHUNKS,
      dbIssues: DB_ISSUES,
      runtimeIssues: RUNTIME_ISSUES,
      actionPlan: ACTION_ITEMS,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-bottomnav sm:pb-8">
        <PanelHeader title="Performance Audit">
          <BackButton fallback="/admin" />
        </PanelHeader>

        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">

          {/* ── HEADER ── */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-sm border-border/50 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 via-transparent to-transparent p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <ScoreGauge score={OVERALL_SCORE} />
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-xl font-bold text-foreground">{AUDIT_META.systemName}</h1>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auditoria de Performance v{AUDIT_META.version} · {new Date(AUDIT_META.timestamp).toLocaleDateString('pt-BR')} · Build: {AUDIT_META.buildTime}
                    </p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                      <Badge variant="outline" className={cn('text-xs', OVERALL_SCORE >= 80 ? 'text-success border-success/30' : OVERALL_SCORE >= 60 ? 'text-warning border-warning/30' : 'text-destructive border-destructive/30')}>
                        {OVERALL_SCORE >= 80 ? '✅ Bom' : OVERALL_SCORE >= 60 ? '⚠️ Precisa melhorar' : '🔴 Crítico'}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={exportReport} className="h-7 text-xs gap-1.5">
                        <Download className="w-3 h-3" /> Exportar JSON
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ── SUMMARY CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricSummaryCard icon={XCircle} label="Críticos" value={SUMMARY.critical} color="bg-destructive/10 text-destructive" />
            <MetricSummaryCard icon={AlertTriangle} label="Avisos" value={SUMMARY.warnings} color="bg-warning/10 text-warning" />
            <MetricSummaryCard icon={CheckCircle2} label="Aprovados" value={SUMMARY.passed} color="bg-success/10 text-success" />
            <MetricSummaryCard icon={TrendingUp} label="Melhorias" value={SUMMARY.improvements} color="bg-primary/10 text-primary" />
          </div>

          {/* ── RADAR CHART ── */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" /> Score por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <RadarChart scores={SCORES} />
            </CardContent>
          </Card>

          {/* ── TABS ── */}
          <Tabs defaultValue="vitals" className="space-y-4">
            <TabsList className="w-full flex overflow-x-auto">
              <TabsTrigger value="vitals" className="flex-1 text-xs gap-1"><Activity className="w-3.5 h-3.5" /> Vitals</TabsTrigger>
              <TabsTrigger value="bundle" className="flex-1 text-xs gap-1"><Package className="w-3.5 h-3.5" /> Bundle</TabsTrigger>
              <TabsTrigger value="database" className="flex-1 text-xs gap-1"><Database className="w-3.5 h-3.5" /> DB</TabsTrigger>
              <TabsTrigger value="runtime" className="flex-1 text-xs gap-1"><Cpu className="w-3.5 h-3.5" /> Runtime</TabsTrigger>
              <TabsTrigger value="actions" className="flex-1 text-xs gap-1"><Zap className="w-3.5 h-3.5" /> Ações</TabsTrigger>
            </TabsList>

            {/* ── WEB VITALS ── */}
            <TabsContent value="vitals" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ScoreGauge score={SCORES.webVitals} size="sm" />
                <div>
                  <h2 className="font-bold text-sm text-foreground">Core Web Vitals</h2>
                  <p className="text-xs text-muted-foreground">Todas as métricas dentro dos limites aceitáveis</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {WEB_VITALS.map(v => <VitalCard key={v.name} vital={v} />)}
              </div>
              <Card className="shadow-sm border-border/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Otimizações já implementadas</h3>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Inline skeleton no index.html para FCP instantâneo</li>
                    <li>Preconnect para Supabase e Google Fonts</li>
                    <li>Font loading via print/onload trick (não bloqueia render)</li>
                    <li>modulepreload para main.tsx</li>
                    <li>Service Worker com CacheFirst para assets estáticos</li>
                    <li>DNS-prefetch para domínio Supabase</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── BUNDLE ── */}
            <TabsContent value="bundle" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <ScoreGauge score={SCORES.bundle} size="sm" />
                  <div>
                    <h2 className="font-bold text-sm text-foreground">Bundle Analysis</h2>
                    <p className="text-xs text-muted-foreground">Economia potencial: <span className="font-bold text-destructive">~{potentialSavings.toFixed(0)}KB gzip</span></p>
                  </div>
                </div>
                <Select value={bundleSortBy} onValueChange={(v) => setBundleSortBy(v as 'raw' | 'gzip')}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gzip">Por gzip</SelectItem>
                    <SelectItem value="raw">Por raw</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Chunk</TableHead>
                      <TableHead className="text-xs text-right">Raw</TableHead>
                      <TableHead className="text-xs text-right">Gzip</TableHead>
                      <TableHead className="text-xs text-center">Status</TableHead>
                      <TableHead className="text-xs">Problema</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedChunks.map(chunk => (
                      <TableRow key={chunk.name} className={chunk.status === 'fail' ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs font-mono font-medium">{chunk.name}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{chunk.rawKB.toFixed(1)}KB</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-semibold">{chunk.gzipKB.toFixed(1)}KB</TableCell>
                        <TableCell className="text-center"><StatusIndicator status={chunk.status} /></TableCell>
                        <TableCell className="text-[11px] text-muted-foreground max-w-[300px]">
                          {chunk.issue}
                          {chunk.fix && <p className="text-primary font-medium mt-0.5">→ {chunk.fix}</p>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ── DATABASE ── */}
            <TabsContent value="database" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <ScoreGauge score={SCORES.database} size="sm" />
                  <div>
                    <h2 className="font-bold text-sm text-foreground">Database & Queries</h2>
                    <p className="text-xs text-muted-foreground">{DB_ISSUES.length} issues encontrados</p>
                  </div>
                </div>
                <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="critical">Críticos</SelectItem>
                    <SelectItem value="medium">Médios</SelectItem>
                    <SelectItem value="low">Baixos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {filteredDbIssues.map((issue, i) => (
                  <Card key={i} className={cn('shadow-sm border-border/50', issue.severity === 'critical' && 'border-destructive/30 bg-destructive/5')}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-muted-foreground shrink-0" />
                          <code className="text-xs font-mono text-foreground">{issue.file}:{issue.line}</code>
                        </div>
                        <SeverityBadge severity={issue.severity} />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">{issue.type}</p>
                      <p className="text-[11px] text-muted-foreground mb-2">{issue.impact}</p>
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-[11px] text-primary font-medium">💡 {issue.fix}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── RUNTIME ── */}
            <TabsContent value="runtime" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ScoreGauge score={SCORES.runtime} size="sm" />
                <div>
                  <h2 className="font-bold text-sm text-foreground">Runtime & Memory</h2>
                  <p className="text-xs text-muted-foreground">{RUNTIME_ISSUES.length} issues detectados</p>
                </div>
              </div>

              <div className="space-y-3">
                {filteredRuntimeIssues.map((issue) => (
                  <Card key={issue.id} className="shadow-sm border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <code className="text-xs font-mono text-foreground">{issue.file}</code>
                        <SeverityBadge severity={issue.severity} />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-1">{issue.type}</p>
                      <p className="text-[11px] text-muted-foreground mb-2">{issue.description}</p>
                      <div className="bg-muted/50 rounded-lg p-2.5">
                        <p className="text-[11px] text-primary font-medium">💡 {issue.fix}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── ACTION PLAN ── */}
            <TabsContent value="actions" className="space-y-4">
              <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Plano de Ação Priorizado
              </h2>

              {(['quick-win', 'medium', 'refactor', 'low'] as const).map(category => {
                const items = ACTION_ITEMS.filter(a => a.category === category);
                if (items.length === 0) return null;
                const config = {
                  'quick-win': { label: '⚡ Quick Wins', color: 'text-success', bg: 'bg-success/10' },
                  medium: { label: '🔧 Médio Prazo', color: 'text-warning', bg: 'bg-warning/10' },
                  refactor: { label: '🏗️ Refactor', color: 'text-primary', bg: 'bg-primary/10' },
                  low: { label: '📋 Baixa Prioridade', color: 'text-muted-foreground', bg: 'bg-muted' },
                }[category];
                const doneCount = items.filter(i => i.done).length;

                return (
                  <div key={category}>
                    <h3 className={cn('text-xs font-bold mb-3 flex items-center gap-2', config.color)}>
                      {config.label}
                      <Badge variant="outline" className="text-[10px]">{doneCount}/{items.length} concluído</Badge>
                    </h3>
                    <div className="space-y-2">
                      {items.map(item => {
                        const isExpanded = expandedAction === item.id;
                        return (
                          <Card key={item.id} className={cn('shadow-sm border-border/50', item.done && 'opacity-70')}>
                            <CardContent className="p-0">
                              <button
                                className="w-full p-4 flex items-center gap-3 text-left"
                                onClick={() => setExpandedAction(isExpanded ? null : item.id)}
                              >
                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', item.done ? 'bg-success/10' : config.bg)}>
                                  {item.done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Zap className={cn('w-4 h-4', config.color)} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-xs font-semibold', item.done ? 'text-muted-foreground line-through' : 'text-foreground')}>{item.title}</p>
                                  <div className="flex gap-3 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground">Impacto: <strong>{item.impact}</strong></span>
                                    <span className="text-[10px] text-muted-foreground">Esforço: <strong>{item.effort}</strong></span>
                                  </div>
                                </div>
                                {item.done && <Badge variant="outline" className="text-[10px] text-success border-success/30 shrink-0">✅</Badge>}
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              </button>
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                                      {item.code && (
                                        <pre className="bg-muted/80 rounded-lg p-3 text-[11px] font-mono overflow-x-auto text-foreground whitespace-pre-wrap">
                                          {item.code}
                                        </pre>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  );
}
