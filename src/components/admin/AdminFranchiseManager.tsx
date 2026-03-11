import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Trash2, Link2, Phone, Mail, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { SITE_URL } from '@/lib/constants';

interface Franchise {
  id: string;
  nome_franquia: string;
  slug_url: string;
  cidade_base: string;
  responsavel: string | null;
  whatsapp: string | null;
  email: string | null;
  created_at: string;
}

interface FranchiseFormData {
  nome_franquia: string;
  slug_url: string;
  cidade_base: string;
  responsavel: string;
  whatsapp: string;
  email: string;
}

const emptyForm: FranchiseFormData = {
  nome_franquia: '',
  slug_url: '',
  cidade_base: '',
  responsavel: '',
  whatsapp: '',
  email: '',
};

export function AdminFranchiseManager() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingFranchise, setDeletingFranchise] = useState<Franchise | null>(null);
  const [form, setForm] = useState<FranchiseFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('franchises')
      .select('*')
      .order('nome_franquia');
    setFranchises((data || []) as Franchise[]);
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (f: Franchise) => {
    setEditingId(f.id);
    setForm({
      nome_franquia: f.nome_franquia,
      slug_url: f.slug_url,
      cidade_base: f.cidade_base,
      responsavel: f.responsavel || '',
      whatsapp: f.whatsapp || '',
      email: f.email || '',
    });
    setDialogOpen(true);
  };

  const openDelete = (f: Franchise) => {
    setDeletingFranchise(f);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome_franquia.trim() || !form.slug_url.trim() || !form.cidade_base.trim()) {
      toast.error('Preencha os campos obrigatórios: Nome, Slug e Cidade.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('franchises')
          .update({
            nome_franquia: form.nome_franquia.trim(),
            slug_url: form.slug_url.trim(),
            cidade_base: form.cidade_base.trim(),
            responsavel: form.responsavel.trim() || null,
            whatsapp: form.whatsapp.trim() || null,
            email: form.email.trim() || null,
          })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Franquia atualizada!');
      } else {
        const { error } = await supabase
          .from('franchises')
          .insert({
            nome_franquia: form.nome_franquia.trim(),
            slug_url: form.slug_url.trim(),
            cidade_base: form.cidade_base.trim(),
            responsavel: form.responsavel.trim() || null,
            whatsapp: form.whatsapp.trim() || null,
            email: form.email.trim() || null,
          });
        if (error) throw error;
        toast.success('Franquia criada com sucesso!');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      const msg = err?.message?.includes('duplicate') 
        ? 'Já existe uma franquia com esse slug.' 
        : 'Erro ao salvar franquia.';
      toast.error(msg);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFranchise) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('franchises')
        .delete()
        .eq('id', deletingFranchise.id);
      if (error) throw error;
      toast.success('Franquia excluída.');
      setDeleteDialogOpen(false);
      setDeletingFranchise(null);
      load();
    } catch (err) {
      toast.error('Erro ao excluir franquia. Verifique se não há leads vinculados.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">Franquias Cadastradas</span>
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">{franchises.length}</Badge>
        </div>
        <Button onClick={openCreate} className="gap-1.5 rounded-xl">
          <Plus className="w-4 h-4" /> Nova Franquia
        </Button>
      </div>

      {franchises.length === 0 ? (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="py-16 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-1">Nenhuma franquia cadastrada</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie a primeira franquia para começar.</p>
            <Button onClick={openCreate} className="gap-1.5 rounded-xl">
              <Plus className="w-4 h-4" /> Criar Franquia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {franchises.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{f.nome_franquia}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" /> {f.cidade_base}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(f)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => openDelete(f)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <code className="bg-muted px-1.5 py-0.5 rounded truncate">{SITE_URL}/{f.slug_url}</code>
                    </div>
                    {f.responsavel && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-3 h-3 shrink-0" /> {f.responsavel}
                      </div>
                    )}
                    {f.whatsapp && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3 h-3 shrink-0" /> {f.whatsapp}
                      </div>
                    )}
                    {f.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3 h-3 shrink-0" /> {f.email}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Franquia' : 'Nova Franquia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome da Franquia *</Label>
              <Input
                value={form.nome_franquia}
                onChange={e => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    nome_franquia: val,
                    ...(!editingId ? { slug_url: generateSlug(val) } : {}),
                  }));
                }}
                placeholder="Splash Piscinas Porto Alegre"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Slug da URL *</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{SITE_URL}/</span>
                <Input
                  value={form.slug_url}
                  onChange={e => setForm(prev => ({ ...prev, slug_url: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="porto-alegre"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cidade Base *</Label>
              <Input
                value={form.cidade_base}
                onChange={e => setForm(prev => ({ ...prev, cidade_base: e.target.value }))}
                placeholder="Porto Alegre"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Responsável</Label>
              <Input
                value={form.responsavel}
                onChange={e => setForm(prev => ({ ...prev, responsavel: e.target.value }))}
                placeholder="João Silva"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">WhatsApp</Label>
                <Input
                  value={form.whatsapp}
                  onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="5551999999999"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@franquia.com"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-1.5">
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar Franquia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Franquia</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong>{deletingFranchise?.nome_franquia}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="rounded-xl">
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
