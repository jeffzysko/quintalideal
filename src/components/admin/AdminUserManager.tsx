import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, UserPlus, Shield, Building2, Eye, Search, Loader2, Send } from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
  full_name: string | null;
  telefone: string | null;
  franquia_id: string | null;
  franchise_name: string | null;
}

interface Franchise {
  id: string;
  nome_franquia: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin_fabrica: 'Admin Fábrica',
  franquia: 'Franquia',
};

const ROLE_COLORS: Record<string, string> = {
  admin_fabrica: 'bg-primary/10 text-primary border-primary/20',
  franquia: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
};

export function AdminUserManager() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingAll, setResendingAll] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formRole, setFormRole] = useState<string>('franquia');
  const [formFranchiseId, setFormFranchiseId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, franchisesRes] = await Promise.all([
        supabase.functions.invoke('manage-users', { body: { action: 'list' } }),
        supabase.from('franchises').select('id, nome_franquia').order('nome_franquia'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (franchisesRes.error) throw franchisesRes.error;

      setUsers(usersRes.data?.users || []);
      setFranchises(franchisesRes.data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar usuários: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingUser(null);
    setFormEmail('');
    setFormName('');
    setFormTelefone('');
    setFormRole('franquia');
    setFormFranchiseId('');
    setDialogOpen(true);
  }

  function openEditDialog(user: ManagedUser) {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormName(user.full_name || '');
    setFormTelefone(user.telefone || '');
    setFormRole(user.roles[0] || 'franquia');
    setFormFranchiseId(user.franquia_id || '');
    setDialogOpen(true);
  }

  function extractError(data: any, error: any): string | null {
    if (data?.error) return data.error;
    if (error?.message && !error.message.includes('non-2xx')) return error.message;
    if (error?.context?.body) {
      try {
        const body = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
        if (body?.error) return body.error;
      } catch {}
    }
    return error?.message || 'Erro desconhecido';
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editingUser) {
        // Update
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'update',
            user_id: editingUser.id,
            full_name: formName,
            telefone: formTelefone,
            role: formRole,
            franchise_id: formRole === 'franquia' ? formFranchiseId : null,
          },
        });
        if (error || data?.error) {
          toast.error(extractError(data, error));
          return;
        }
        toast.success('Usuário atualizado com sucesso.');
      } else {
        // Create
        if (!formEmail) {
          toast.error('E-mail é obrigatório.');
          setSaving(false);
          return;
        }
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'create',
            email: formEmail,
            full_name: formName,
            role: formRole,
            franchise_id: formRole === 'franquia' ? formFranchiseId : null,
          },
        });
        if (error || data?.error) {
          toast.error(extractError(data, error));
          return;
        }
        toast.success(data?.message || 'Usuário criado com sucesso.');
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', user_id: deleteUser.id },
      });
      if (error || data?.error) {
        toast.error(extractError(data, error));
        return;
      }
      toast.success('Usuário excluído com sucesso.');
      setDeleteUser(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResendInvite(user: ManagedUser) {
    setResendingId(user.id);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'resend_invite', user_id: user.id },
      });
      if (error || data?.error) {
        toast.error(extractError(data, error));
        return;
      }
      toast.success(data?.message || `Convite reenviado para ${user.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reenviar convite.');
    } finally {
      setResendingId(null);
    }
  }

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      (u.email?.toLowerCase().includes(term)) ||
      (u.full_name?.toLowerCase().includes(term)) ||
      (u.franchise_name?.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Gestão de Usuários ({users.length})
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button size="sm" onClick={openCreateDialog} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Novo Usuário</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="hidden md:table-cell">Franquia</TableHead>
                    <TableHead className="hidden lg:table-cell">Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell>
                        {user.roles.map((r) => {
                          const Icon = r === 'admin_fabrica' ? Shield : r === 'franquia' ? Building2 : Eye;
                          return (
                            <Badge key={r} variant="outline" className={`text-xs gap-1 ${ROLE_COLORS[r] || ''}`}>
                              <Icon className="w-3 h-3" />
                              {ROLE_LABELS[r] || r}
                            </Badge>
                          );
                        })}
                        {user.roles.length === 0 && <span className="text-xs text-muted-foreground">Sem papel</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {user.franchise_name || '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => handleResendInvite(user)}
                            disabled={resendingId === user.id}
                            title="Reenviar convite"
                          >
                            {resendingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(user)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteUser(user)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Altere as informações do usuário.' : 'Preencha os dados para criar um novo usuário. Um e-mail de convite será enviado.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="user-email">E-mail</Label>
              <Input
                id="user-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                disabled={!!editingUser}
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="user-name">Nome completo</Label>
              <Input
                id="user-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div>
              <Label htmlFor="user-phone">Telefone</Label>
              <Input
                id="user-phone"
                value={formTelefone}
                onChange={(e) => setFormTelefone(e.target.value)}
                placeholder="(11) 99999-0000"
                disabled={!editingUser}
              />
            </div>
            <div>
              <Label htmlFor="user-role">Papel</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_fabrica">Admin Fábrica</SelectItem>
                  <SelectItem value="franquia">Franquia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formRole === 'franquia' && (
              <div>
                <Label htmlFor="user-franchise">Franquia</Label>
                <Select value={formFranchiseId} onValueChange={setFormFranchiseId}>
                  <SelectTrigger id="user-franchise">
                    <SelectValue placeholder="Selecione a franquia" />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingUser ? 'Salvar' : 'Criar e Enviar Convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.full_name || deleteUser?.email}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
