import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Smartphone, Building2, Wifi, WifiOff, Monitor, CalendarClock, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, addMonths, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FranchiseWARow {
  id: string;
  nome_franquia: string;
  whatsapp_mode: string;
  zapi_instance_active: boolean;
  whatsapp_plan_active: boolean;
  zapi_instance_id: string | null;
  whatsapp_plan_expires_at: string | null;
  whatsapp_plan_price: number | null;
  whatsapp_plan_notes: string | null;
}

const DURATION_OPTIONS = [
  { value: '1', label: '1 mês' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
];

export function AdminWhatsAppPlans() {
  const queryClient = useQueryClient();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Activation modal state
  const [activatingFranchise, setActivatingFranchise] = useState<FranchiseWARow | null>(null);
  const [duration, setDuration] = useState('1');
  const [price, setPrice] = useState('79.90');
  const [notes, setNotes] = useState('');
  const [activating, setActivating] = useState(false);

  // Deactivation dialog state
  const [deactivatingFranchise, setDeactivatingFranchise] = useState<FranchiseWARow | null>(null);

  const { data: franchises = [], isLoading } = useQuery({
    queryKey: ['admin-whatsapp-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchises')
        .select('id, nome_franquia, whatsapp_mode, zapi_instance_active, whatsapp_plan_active, zapi_instance_id, whatsapp_plan_expires_at, whatsapp_plan_price, whatsapp_plan_notes')
        .eq('ativa', true)
        .order('nome_franquia', { ascending: true });
      if (error) throw error;
      return (data || []) as FranchiseWARow[];
    },
  });

  // Summary stats
  const summary = useMemo(() => {
    const now = new Date();
    const in7Days = addDays(now, 7);
    const activePlans = franchises.filter(f => f.whatsapp_plan_active);
    const expiringSoon = activePlans.filter(f => {
      if (!f.whatsapp_plan_expires_at) return false;
      const exp = new Date(f.whatsapp_plan_expires_at);
      return isBefore(exp, in7Days) && !isBefore(exp, now);
    });
    const totalRevenue = activePlans.reduce((sum, f) => sum + (f.whatsapp_plan_price || 0), 0);
    return { activeCount: activePlans.length, expiringCount: expiringSoon.length, totalRevenue };
  }, [franchises]);

  const handleToggle = (franchise: FranchiseWARow, active: boolean) => {
    if (active) {
      setActivatingFranchise(franchise);
      setDuration('1');
      setPrice('79.90');
      setNotes('');
    } else {
      setDeactivatingFranchise(franchise);
    }
  };

  const handleConfirmActivation = async () => {
    if (!activatingFranchise) return;
    setActivating(true);

    const months = parseInt(duration);
    const expiresAt = addMonths(new Date(), months).toISOString();
    const priceValue = parseFloat(price) || 0;

    const { error } = await supabase
      .from('franchises')
      .update({
        whatsapp_plan_active: true,
        whatsapp_plan_expires_at: expiresAt,
        whatsapp_plan_price: priceValue,
        whatsapp_plan_notes: notes || null,
      })
      .eq('id', activatingFranchise.id);

    if (error) {
      toast.error('Erro ao ativar plano.');
    } else {
      toast.success(`Plano ativado para ${activatingFranchise.nome_franquia}!`);
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-plans'] });
    }
    setActivating(false);
    setActivatingFranchise(null);
  };

  const handleConfirmDeactivation = async () => {
    if (!deactivatingFranchise) return;
    setTogglingId(deactivatingFranchise.id);

    const { error } = await supabase
      .from('franchises')
      .update({ whatsapp_plan_active: false })
      .eq('id', deactivatingFranchise.id);

    if (error) {
      toast.error('Erro ao desativar plano.');
    } else {
      toast.success('Plano WhatsApp desativado.');
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-plans'] });
    }
    setTogglingId(null);
    setDeactivatingFranchise(null);
  };

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

  const getConnectionBadge = (row: FranchiseWARow) => {
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

  const getPlanStatusBadge = (row: FranchiseWARow) => {
    if (!row.whatsapp_plan_active) {
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">Inativo</Badge>;
    }
    if (row.whatsapp_plan_expires_at) {
      const exp = new Date(row.whatsapp_plan_expires_at);
      if (isBefore(exp, new Date())) {
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Expirado</Badge>;
      }
      if (isBefore(exp, addDays(new Date(), 7))) {
        return <Badge className="bg-warning/15 text-warning-foreground border-warning/30 text-[10px]">Expirando</Badge>;
      }
    }
    return <Badge variant="success" className="text-[10px]">Ativo</Badge>;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sem vencimento';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatCurrency = (value: number | null) => {
    if (!value || value === 0) return '—';
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-success" />
            <div>
              <p className="text-lg font-bold">{summary.activeCount}</p>
              <p className="text-[10px] text-muted-foreground">Planos ativos</p>
            </div>
          </div>
        </Card>
        <Card className={`p-3 ${summary.expiringCount > 0 ? 'border-warning/50 bg-warning/5' : ''}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${summary.expiringCount > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-lg font-bold">{summary.expiringCount}</p>
              <p className="text-[10px] text-muted-foreground">Expirando em 7d</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold">{formatCurrency(summary.totalRevenue)}</p>
              <p className="text-[10px] text-muted-foreground">Receita mensal</p>
            </div>
          </div>
        </Card>
      </div>

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
                    <TableHead className="text-xs">Conexão</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Validade</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs text-right">Plano</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {franchises.map(f => {
                    const isExpired = f.whatsapp_plan_active && f.whatsapp_plan_expires_at && isBefore(new Date(f.whatsapp_plan_expires_at), new Date());
                    const isExpiringSoon = f.whatsapp_plan_active && f.whatsapp_plan_expires_at && !isExpired && isBefore(new Date(f.whatsapp_plan_expires_at), addDays(new Date(), 7));
                    return (
                    <TableRow key={f.id} className={isExpired ? 'bg-destructive/5' : isExpiringSoon ? 'bg-warning/5' : ''}>
                      <TableCell className="text-xs font-medium">{f.nome_franquia}</TableCell>
                      <TableCell>{getModeBadge(f)}</TableCell>
                      <TableCell>{getConnectionBadge(f)}</TableCell>
                      <TableCell>{getPlanStatusBadge(f)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {(isExpired || isExpiringSoon) && <AlertTriangle className="w-3 h-3 text-warning-foreground" />}
                          {formatDate(f.whatsapp_plan_expires_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{formatCurrency(f.whatsapp_plan_price)}</TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={f.whatsapp_plan_active}
                          disabled={togglingId === f.id}
                          onCheckedChange={(val) => handleToggle(f, val)}
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

      {/* Activation Modal */}
      <Dialog open={!!activatingFranchise} onOpenChange={(open) => !open && setActivatingFranchise(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              Ativar Plano WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configurar plano para <strong>{activatingFranchise?.nome_franquia}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Duração</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Valor cobrado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="79.90"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anotações internas sobre esta ativação..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivatingFranchise(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleConfirmActivation} disabled={activating} className="gap-2 rounded-xl">
              {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              Confirmar ativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivation Confirmation */}
      <AlertDialog open={!!deactivatingFranchise} onOpenChange={(open) => !open && setDeactivatingFranchise(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar plano WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              O franqueado <strong>{deactivatingFranchise?.nome_franquia}</strong> voltará a usar o número da plataforma. Esta ação pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeactivation}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
