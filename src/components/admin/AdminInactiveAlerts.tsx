import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Activity, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Franchise {
  id: string;
  nome_franquia: string;
  ativa: boolean;
  last_accessed_at?: string | null;
  last_lead_activity_at?: string | null;
}

interface Lead {
  franquia_id: string | null;
  status_lead: string;
  updated_at: string;
}

interface AdminInactiveAlertsProps {
  franchises: Franchise[];
  leads: Lead[];
  inactiveDaysThreshold?: number;
  noActivityDaysThreshold?: number;
}

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getSeverity(days: number | null, threshold: number): 'critical' | 'warning' | 'ok' {
  if (days === null) return 'critical';
  if (days >= threshold * 2) return 'critical';
  if (days >= threshold) return 'warning';
  return 'ok';
}

export function AdminInactiveAlerts({
  franchises,
  leads,
  inactiveDaysThreshold = 7,
  noActivityDaysThreshold = 14,
}: AdminInactiveAlertsProps) {
  const alerts = useMemo(() => {
    const activeFranchises = franchises.filter(f => f.ativa);

    // Single pass: last lead update + stuck leads per franchise
    const lastLeadUpdate: Record<string, string> = {};
    const stuckLeads: Record<string, number> = {};
    for (const l of leads) {
      if (!l.franquia_id) continue;
      if (!lastLeadUpdate[l.franquia_id] || l.updated_at > lastLeadUpdate[l.franquia_id]) {
        lastLeadUpdate[l.franquia_id] = l.updated_at;
      }
      if (l.status_lead === 'novo') {
        stuckLeads[l.franquia_id] = (stuckLeads[l.franquia_id] || 0) + 1;
      }
    }

    return activeFranchises.map(f => {
      const accessDays = daysSince(f.last_accessed_at);
      const activityDays = daysSince(f.last_lead_activity_at || lastLeadUpdate[f.id]);
      const accessSeverity = getSeverity(accessDays, inactiveDaysThreshold);
      const activitySeverity = getSeverity(activityDays, noActivityDaysThreshold);
      const stuck = stuckLeads[f.id] || 0;

      return {
        id: f.id,
        name: f.nome_franquia,
        accessDays,
        activityDays,
        accessSeverity,
        activitySeverity,
        stuckLeads: stuck,
        overallSeverity: accessSeverity === 'critical' || activitySeverity === 'critical'
          ? 'critical'
          : accessSeverity === 'warning' || activitySeverity === 'warning'
          ? 'warning'
          : 'ok',
      };
    }).filter(a => a.overallSeverity !== 'ok')
      .sort((a, b) => {
        const order = { critical: 0, warning: 1, ok: 2 };
        return order[a.overallSeverity] - order[b.overallSeverity];
      });
  }, [franchises, leads, inactiveDaysThreshold, noActivityDaysThreshold]);

  if (alerts.length === 0) {
    return (
      <Card className="card-premium border-border/40">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-foreground">Todas as franquias ativas! ✅</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum alerta de inatividade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-premium border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Alertas de Inatividade
          <Badge variant="outline" className="text-[10px] ml-auto">
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, i) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl p-3 border ${
              alert.overallSeverity === 'critical'
                ? 'bg-destructive/5 border-destructive/20'
                : 'bg-amber-500/5 border-amber-500/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                alert.overallSeverity === 'critical' ? 'bg-destructive/10' : 'bg-amber-500/10'
              }`}>
                <Building2 className={`w-4 h-4 ${
                  alert.overallSeverity === 'critical' ? 'text-destructive' : 'text-amber-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{alert.name}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {alert.accessSeverity !== 'ok' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {alert.accessDays === null ? 'Nunca acessou' : `${alert.accessDays}d sem acessar`}
                    </span>
                  )}
                  {alert.activitySeverity !== 'ok' && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Activity className="w-3 h-3" />
                      {alert.activityDays === null ? 'Sem atividade' : `${alert.activityDays}d sem movimentar leads`}
                    </span>
                  )}
                  {alert.stuckLeads > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                      {alert.stuckLeads} lead{alert.stuckLeads > 1 ? 's' : ''} parado{alert.stuckLeads > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
              <Badge
                variant={alert.overallSeverity === 'critical' ? 'destructive' : 'outline'}
                className="text-[10px] shrink-0"
              >
                {alert.overallSeverity === 'critical' ? 'Crítico' : 'Atenção'}
              </Badge>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
