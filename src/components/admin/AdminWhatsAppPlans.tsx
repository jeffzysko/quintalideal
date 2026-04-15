import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Smartphone, Building2, Wifi, WifiOff, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface FranchiseWARow {
  id: string;
  nome_franquia: string;
  whatsapp_mode: string;
  zapi_instance_active: boolean;
  whatsapp_plan_active: boolean;
  zapi_instance_id: string | null;
}

export function AdminWhatsAppPlans() {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: franchises = [], isLoading } = useQuery({
    queryKey: ['admin-whatsapp-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchises')
        .select('id, nome_franquia, whatsapp_mode, zapi_instance_active, whatsapp_plan_active, zapi_instance_id')
        .eq('ativa', true)
        .order('nome_franquia', { ascending: true });
      if (error) throw error;
      return (data || []) as FranchiseWARow[];
    },
  });

  const togglePlanMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      setTogglingId(id);
      const updateData: Record<string, unknown> = { whatsapp_plan_active: active };
      // The trigger will auto-reset whatsapp_mode to 'platform' when deactivating
      const { error } = await supabase
        .from('franchises')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-plans'] });
      toast.success(active ? 'Plano WhatsApp ativado!' : 'Plano WhatsApp desativado.');
    },
    onError: () => toast.error('Erro ao atualizar plano.'),
    onSettled: () => setTogglingId(null),
  });

  const getModeBadge = (row: FranchiseWARow) => {
    if (!row.whatsapp_plan_active) {
      return <Badge variant="outline" className="text-[10px]">Padrão</Badge>;
    }
    if (row.whatsapp_mode === 'own') {
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] gap-1">
          <Smartphone className="w-3 h-3" />
          Próprio
        </Badge>
      );
    }
    return (
      <Badge className="bg-muted text-muted-foreground border-border/30 text-[10px] gap-1">
        <Monitor className="w-3 h-3" />
        Plataforma
      </Badge>
    );
  };

  const getStatusBadge = (row: FranchiseWARow) => {
    if (row.whatsapp_mode !== 'own' || !row.whatsapp_plan_active) {
      return <span className="text-[10px] text-muted-foreground">—</span>;
    }
    if (!row.zapi_instance_id) {
      return <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Não configurado</Badge>;
    }
    if (row.zapi_instance_active) {
      return (
        <Badge className="bg-success/10 text-success border-success/20 text-[10px] gap-1">
          <Wifi className="w-3 h-3" />
          Conectado
        </Badge>
      );
    }
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] gap-1">
        <WifiOff className="w-3 h-3" />
        Desconectado
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          Planos WhatsApp por Franqueado
        </CardTitle>
        <CardDescription className="text-xs">
          Ative o plano para permitir que franqueados configurem seu próprio número WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {franchises.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma franquia ativa encontrada.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Franquia</TableHead>
                  <TableHead className="text-xs">Modo</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Plano Próprio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {franchises.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs font-medium">{f.nome_franquia}</TableCell>
                    <TableCell>{getModeBadge(f)}</TableCell>
                    <TableCell>{getStatusBadge(f)}</TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={f.whatsapp_plan_active}
                        disabled={togglingId === f.id}
                        onCheckedChange={(val) => togglePlanMutation.mutate({ id: f.id, active: val })}
                        aria-label={`Ativar plano WhatsApp para ${f.nome_franquia}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
