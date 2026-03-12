import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Users, Plus, Trash2, Loader2, Crown, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface FranchiseUser {
  id: string;
  email: string;
  full_name: string | null;
  telefone: string | null;
  is_owner: boolean;
  created_at: string;
}

interface FranchiseUsersSectionProps {
  franchiseId: string;
  currentUserId: string;
}

export function FranchiseUsersSection({ franchiseId, currentUserId }: FranchiseUsersSectionProps) {
  const [users, setUsers] = useState<FranchiseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FranchiseUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formTelefone, setFormTelefone] = useState('');

  useEffect(() => {
    loadUsers();
  }, [franchiseId]);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list_franchise_users', franchise_id: franchiseId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers(data?.users || []);
    } catch (err: any) {
      toast.error('Erro ao carregar usuários: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setFormEmail('');
    setFormName('');
    setFormTelefone('');
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!formEmail) {
      toast.error('E-mail é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create_franchise_user',
          franchise_id: franchiseId,
          email: formEmail,
          full_name: formName,
          telefone: formTelefone,
        },
      });
      if (error || data?.error) {
        const msg = data?.error || error?.message || 'Erro ao criar usuário.';
        toast.error(msg);
        return;
      }
      toast.success(data?.message || 'Usuário criado com sucesso.');
      setDialogOpen(false);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete_franchise_user',
          user_id: deleteTarget.id,
          franchise_id: franchiseId,
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'Erro ao excluir.');
        return;
      }
      toast.success('Usuário removido com sucesso.');
      setDeleteTarget(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir.');
    } finally {
      setSaving(false);
    }
  }

  const additionalUsers = users.filter(u => !u.is_owner);
  const canAdd = additionalUsers.length < 2;

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Usuários da Franquia
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Gerencie os usuários que acessam o painel desta franquia. Máximo de 3 (1 principal + 2 adicionais).
              </CardDescription>
            </div>
            {canAdd && (
              <Button size="sm" onClick={openCreateDialog} className="gap-1.5 shrink-0">
                <Plus className="w-4 h-4" /> Adicionar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {(u.full_name || u.email).substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {u.full_name || u.email}
                        </p>
                        {u.is_owner && (
                          <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-700 border-amber-500/20">
                            <Crown className="w-2.5 h-2.5" /> Principal
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  {!u.is_owner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário encontrado.</p>
              )}
            </div>
            {!canAdd && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Limite de 2 usuários adicionais atingido.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Adicionar Usuário
            </DialogTitle>
            <DialogDescription>
              O novo usuário terá acesso ao painel desta franquia. Um e-mail de convite será enviado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="fu-email">E-mail *</Label>
              <Input
                id="fu-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="fu-name">Nome completo</Label>
              <Input
                id="fu-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div>
              <Label htmlFor="fu-phone">Telefone</Label>
              <Input
                id="fu-phone"
                value={formTelefone}
                onChange={(e) => setFormTelefone(e.target.value)}
                placeholder="(51) 99999-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Criar e Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>? O acesso será revogado imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
