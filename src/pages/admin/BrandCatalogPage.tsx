import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { PageTransition } from '@/components/PageTransition';

type CategoriaTamanho = 'pequena' | 'media' | 'grande';

interface PoolModel {
  id: string;
  brand_id: string | null;
  nome_modelo: string;
  descricao: string | null;
  imagem_principal: string | null;
  gallery_urls: string[] | null;
  categoria_tamanho: CategoriaTamanho;
  comprimento: number | null;
  largura: number | null;
  profundidade: number | null;
  preco_min: number | null;
  preco_max: number | null;
  tamanho: string | null;
  possui_prainha: boolean | null;
  possui_spa: boolean | null;
}

const EMPTY: Partial<PoolModel> = {
  nome_modelo: '',
  categoria_tamanho: 'media',
  gallery_urls: [],
  possui_prainha: false,
  possui_spa: false,
};

export default function BrandCatalogPage() {
  const { brandId } = useParams<{ brandId: string }>();
  const [brandName, setBrandName] = useState('');
  const [models, setModels] = useState<PoolModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<PoolModel>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!brandId) return;
    setLoading(true);
    const [{ data: brand }, { data: pm, error }] = await Promise.all([
      supabase.from('brands').select('name').eq('id', brandId).maybeSingle(),
      supabase.from('pool_models').select('*').eq('brand_id', brandId).order('nome_modelo'),
    ]);
    if (error) toast.error('Falha ao carregar modelos');
    setBrandName(brand?.name ?? '');
    setModels((pm ?? []) as PoolModel[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [brandId]);

  const openNew = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const openEdit = (m: PoolModel) => {
    // Backward-compat: if gallery is empty but legacy imagem_principal exists, seed gallery
    const gallery = m.gallery_urls && m.gallery_urls.length > 0
      ? m.gallery_urls
      : (m.imagem_principal ? [m.imagem_principal] : []);
    setEditing({ ...m, gallery_urls: gallery, imagem_principal: m.imagem_principal ?? gallery[0] ?? null });
    setOpen(true);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `models/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('quintal-photos').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from('quintal-photos').getPublicUrl(path).data.publicUrl;
  };

  const handleMainPhoto = async (file: File) => {
    setUploading(true);
    const url = await uploadPhoto(file);
    setUploading(false);
    if (url) setEditing((p) => ({ ...p, imagem_principal: url }));
  };

  const handleGalleryAdd = async (files: FileList) => {
    setUploading(true);
    const current = editing.gallery_urls ?? [];
    const slots = Math.max(0, 3 - current.length);
    const uploads = await Promise.all(Array.from(files).slice(0, slots).map(uploadPhoto));
    setUploading(false);
    const next = [...current, ...uploads.filter(Boolean) as string[]];
    setEditing((p) => ({ ...p, gallery_urls: next, imagem_principal: p.imagem_principal ?? next[0] ?? null }));
  };

  const removeGallery = (idx: number) => {
    setEditing((p) => {
      const next = (p.gallery_urls ?? []).filter((_, i) => i !== idx);
      // Keep imagem_principal in sync if it pointed at the removed one
      const removedUrl = (p.gallery_urls ?? [])[idx];
      const newMain = p.imagem_principal === removedUrl ? (next[0] ?? null) : p.imagem_principal;
      return { ...p, gallery_urls: next, imagem_principal: newMain };
    });
  };

  const handleSave = async () => {
    if (!editing.nome_modelo?.trim()) { toast.error('Informe o nome do modelo'); return; }
    if (!brandId) return;
    setSaving(true);
    // Ensure imagem_principal stays in sync with the first gallery photo for legacy compatibility
    const gallery = editing.gallery_urls ?? [];
    const mainImage = editing.imagem_principal ?? gallery[0] ?? null;
    const payload = {
      brand_id: brandId,
      nome_modelo: editing.nome_modelo!,
      descricao: editing.descricao ?? null,
      imagem_principal: mainImage,
      gallery_urls: editing.gallery_urls ?? [],
      categoria_tamanho: (editing.categoria_tamanho ?? 'media') as CategoriaTamanho,
      comprimento: editing.comprimento ?? null,
      largura: editing.largura ?? null,
      profundidade: editing.profundidade ?? null,
      preco_min: editing.preco_min ?? null,
      preco_max: editing.preco_max ?? null,
      tamanho: editing.tamanho ?? null,
      possui_prainha: editing.possui_prainha ?? false,
      possui_spa: editing.possui_spa ?? false,
    };
    const q = editing.id
      ? supabase.from('pool_models').update(payload).eq('id', editing.id)
      : supabase.from('pool_models').insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Modelo salvo');
    setOpen(false);
    load();
  };

  const handleDelete = async (m: PoolModel) => {
    if (!confirm(`Remover modelo "${m.nome_modelo}"?`)) return;
    const { error } = await supabase.from('pool_models').delete().eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Modelo removido');
    load();
  };

  return (
    <PageTransition>
    <div>
      <PageHeader
        title={brandName ? `Catálogo · ${brandName}` : 'Catálogo'}
        subtitle="Modelos de piscina disponíveis para esta marca"
        fallbackPath="/admin/marcas"
        rightSlot={
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Adicionar modelo
          </Button>
        }
      />
      <div className="container max-w-6xl mx-auto px-4 py-6 pb-16 space-y-6">

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : models.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum modelo cadastrado.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const cover = m.gallery_urls?.[0] || m.imagem_principal || null;
            return (
            <Card key={m.id} className="overflow-hidden">
              <div className="aspect-video bg-muted">
                {cover ? (
                  <img src={cover} alt={m.nome_modelo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sem foto</div>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="font-semibold">{m.nome_modelo}</div>
                {m.descricao && <p className="text-sm text-muted-foreground line-clamp-2">{m.descricao}</p>}
                <div className="text-sm text-muted-foreground">
                  {m.comprimento && m.largura && <span>{m.comprimento}m x {m.largura}m</span>}
                </div>
                {(m.preco_min ?? m.preco_max) && (
                  <div className="text-sm font-medium">
                    {m.preco_min && `R$ ${m.preco_min.toLocaleString('pt-BR')}`}
                    {m.preco_max && ` - R$ ${m.preco_max.toLocaleString('pt-BR')}`}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(m)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(m)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );})}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{editing.id ? 'Editar modelo' : 'Novo modelo'}</SheetTitle></SheetHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome do modelo *</Label>
              <Input value={editing.nome_modelo ?? ''} onChange={(e) => setEditing((p) => ({ ...p, nome_modelo: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={editing.descricao ?? ''} onChange={(e) => setEditing((p) => ({ ...p, descricao: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={editing.categoria_tamanho ?? 'media'} onValueChange={(v) => setEditing((p) => ({ ...p, categoria_tamanho: v as CategoriaTamanho }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pequena">Pequena</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="grande">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>Comprimento (m)</Label>
                <Input type="number" step="0.1" value={editing.comprimento ?? ''} onChange={(e) => setEditing((p) => ({ ...p, comprimento: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-2">
                <Label>Largura (m)</Label>
                <Input type="number" step="0.1" value={editing.largura ?? ''} onChange={(e) => setEditing((p) => ({ ...p, largura: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-2">
                <Label>Profundidade (m)</Label>
                <Input type="number" step="0.1" value={editing.profundidade ?? ''} onChange={(e) => setEditing((p) => ({ ...p, profundidade: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Preço mínimo (R$)</Label>
                <Input type="number" value={editing.preco_min ?? ''} onChange={(e) => setEditing((p) => ({ ...p, preco_min: e.target.value ? Number(e.target.value) : null }))} />
              </div>
              <div className="space-y-2">
                <Label>Preço máximo (R$)</Label>
                <Input type="number" value={editing.preco_max ?? ''} onChange={(e) => setEditing((p) => ({ ...p, preco_max: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tamanho (texto livre)</Label>
              <Input placeholder="ex.: 8x4m" value={editing.tamanho ?? ''} onChange={(e) => setEditing((p) => ({ ...p, tamanho: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Possui prainha</Label>
                <Switch checked={editing.possui_prainha ?? false} onCheckedChange={(v) => setEditing((p) => ({ ...p, possui_prainha: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Possui spa</Label>
                <Switch checked={editing.possui_spa ?? false} onCheckedChange={(v) => setEditing((p) => ({ ...p, possui_spa: v }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto principal</Label>
              <div className="flex items-center gap-3">
                {editing.imagem_principal && (
                  <img src={editing.imagem_principal} alt="" className="h-16 w-16 rounded object-cover border" />
                )}
                <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleMainPhoto(e.target.files[0])} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Galeria (até 3 fotos extras)</Label>
              <div className="flex flex-wrap gap-2">
                {(editing.gallery_urls ?? []).map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="h-16 w-16 rounded object-cover border" />
                    <button onClick={() => removeGallery(i)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {(editing.gallery_urls?.length ?? 0) < 3 && (
                <Input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => e.target.files && handleGalleryAdd(e.target.files)} />
              )}
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      </div>
    </div>
    </PageTransition>
  );
}
