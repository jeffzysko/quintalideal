import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Application {
  id: string;
  nome_franquia: string;
  cidade_base: string;
  nome_responsavel: string;
  whatsapp_responsavel: string;
  email: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'agora';
  if (hours < 24) return `há ${hours}h`;
  if (hours < 48) return 'ontem';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  approved: { label: 'Aprovada', variant: 'default' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
};

export function AdminApplications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Approve modal
  const [approveApp, setApproveApp] = useState<Application | null>(null);
  const [approveSlug, setApproveSlug] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [approving, setApproving] = useState(false);

  // Reject modal
  const [rejectApp, setRejectApp] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['franchise-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franchise_applications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Application[];
    },
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('franchise-applications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'franchise_applications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['franchise-applications'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filtered = useMemo(() => {
    if (filter === 'all') return applications;
    return applications.filter(a => a.status === filter);
  }, [applications, filter]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedThisMonth = applications.filter(a => a.status === 'approved' && a.reviewed_at && a.reviewed_at >= startOfMonth).length;
  const rejectedThisMonth = applications.filter(a => a.status === 'rejected' && a.reviewed_at && a.reviewed_at >= startOfMonth).length;

  // ── Send WhatsApp via platform credentials ──
  async function sendWhatsApp(phone: string, message: string) {
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp-auto', {
        body: { phone, message },
      });
      if (error) console.error('WhatsApp send error:', error);
    } catch (err) {
      console.error('WhatsApp send error:', err);
    }
  }

  // ── Approve ──
  async function handleApprove() {
    if (!approveApp || !user) return;
    setApproving(true);
    try {
      const slug = approveSlug.trim() || slugify(approveApp.nome_franquia);

      // 1. Create franchise
      const { data: newFranchise, error: fError } = await supabase.from('franchises').insert({
        nome_franquia: approveApp.nome_franquia,
        cidade_base: approveApp.cidade_base,
        responsavel: approveApp.nome_responsavel,
        whatsapp: approveApp.whatsapp_responsavel,
        email: approveApp.email,
        slug_url: slug,
        ativa: true,
      }).select('id').single();

      if (fError) throw new Error(`Erro ao criar franquia: ${fError.message}`);

      // 2. Invite franchise user
      const { error: inviteError } = await supabase.functions.invoke('invite-franchise-user', {
        body: {
          email: approveApp.email,
          franchise_id: newFranchise.id,
          full_name: approveApp.nome_responsavel,
        },
      });
      if (inviteError) console.error('Invite error (non-blocking):', inviteError);

      // 3. Update application status
      await supabase
        .from('franchise_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: approveNotes || null,
        })
        .eq('id', approveApp.id);

      // 4. Send WhatsApp notification
      const waPhone = approveApp.whatsapp_responsavel.replace(/\D/g, '');
      const waMessage = `🎉 *Sua franquia foi aprovada!*\n\nOlá, ${approveApp.nome_responsavel}! Sua franquia *${approveApp.nome_franquia}* foi aprovada no Quintal Ideal.\n\nVocê receberá um e-mail em instantes com o link de acesso à plataforma. Qualquer dúvida, é só responder esta mensagem! 🌱`;
      sendWhatsApp(waPhone, waMessage);

      toast.success(`Franquia criada e convite enviado para ${approveApp.email}`);
      setApproveApp(null);
      setApproveSlug('');
      setApproveNotes('');
      queryClient.invalidateQueries({ queryKey: ['franchise-applications'] });
      queryClient.invalidateQueries({ queryKey: ['franchises-full'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar candidatura');
    } finally {
      setApproving(false);
    }
  }

  // ── Reject ──
  async function handleReject() {
    if (!rejectApp || !user) return;
    setRejecting(true);
    try {
      await supabase
        .from('franchise_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          admin_notes: rejectReason || null,
        })
        .eq('id', rejectApp.id);

      const waPhone = rejectApp.whatsapp_responsavel.replace(/\D/g, '');
      const waMessage = `Olá, ${rejectApp.nome_responsavel}. Analisamos sua candidatura para a franquia *${rejectApp.nome_franquia}* e no momento não será possível prosseguir. Agradecemos o interesse no Quintal Ideal! 🌱`;
      sendWhatsApp(waPhone, waMessage);

      toast.success('Candidatura rejeitada');
      setRejectApp(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['franchise-applications'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao rejeitar candidatura');
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className={`border-border/50 ${pendingCount > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : ''}`}>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{approvedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Aprovadas este mês</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{rejectedThisMonth}</p>
              <p className="text-xs text-muted-foreground">Rejeitadas este mês</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="rejected">Rejeitadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Candidaturas ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma candidatura encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Franquia</TableHead>
                    <TableHead className="text-xs">Cidade</TableHead>
                    <TableHead className="text-xs">Responsável</TableHead>
                    <TableHead className="text-xs">WhatsApp</TableHead>
                    <TableHead className="text-xs">E-mail</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(app => (
                    <TableRow key={app.id}>
                      <TableCell className="text-xs whitespace-nowrap">{timeAgo(app.created_at)}</TableCell>
                      <TableCell className="text-xs font-medium">{app.nome_franquia}</TableCell>
                      <TableCell className="text-xs">{app.cidade_base}</TableCell>
                      <TableCell className="text-xs">{app.nome_responsavel}</TableCell>
                      <TableCell className="text-xs">
                        <a
                          href={`https://wa.me/55${app.whatsapp_responsavel.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {app.whatsapp_responsavel}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-xs">{app.email}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_MAP[app.status]?.variant || 'outline'} className="text-[10px]">
                          {STATUS_MAP[app.status]?.label || app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {app.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => {
                                setApproveApp(app);
                                setApproveSlug(slugify(app.nome_franquia));
                              }}
                            >
                              ✅
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive hover:bg-destructive/10"
                              onClick={() => setRejectApp(app)}
                            >
                              ❌
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={!!approveApp} onOpenChange={(open) => !open && setApproveApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar candidatura</DialogTitle>
            <DialogDescription>
              Ao confirmar, a franquia será criada e um convite será enviado para {approveApp?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da franquia</label>
              <p className="text-sm text-muted-foreground">{approveApp?.nome_franquia}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug da URL</label>
              <Input
                value={approveSlug}
                onChange={e => setApproveSlug(e.target.value)}
                placeholder="nome-da-franquia"
              />
              <p className="text-[11px] text-muted-foreground">quintalideal.lovable.app/{approveSlug || 'slug'}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações internas (opcional)</label>
              <Textarea
                value={approveNotes}
                onChange={e => setApproveNotes(e.target.value)}
                placeholder="Notas internas..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveApp(null)} disabled={approving}>Cancelar</Button>
            <Button onClick={handleApprove} disabled={approving || !approveSlug.trim()}>
              {approving ? 'Aprovando...' : 'Aprovar e criar franquia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectApp} onOpenChange={(open) => !open && setRejectApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar candidatura</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição (opcional). O candidato receberá uma mensagem no WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{rejectApp?.nome_franquia} — {rejectApp?.cidade_base}</label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Motivo da rejeição..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectApp(null)} disabled={rejecting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? 'Rejeitando...' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
