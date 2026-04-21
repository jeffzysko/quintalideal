import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Pencil, BookOpen, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { PageTransition } from '@/components/PageTransition';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  slogan: string | null;
  proposal_header: string | null;
  proposal_footer: string | null;
  proposal_validity_days: number | null;
  payment_terms: string | null;
  is_active: boolean;
  franchise_count?: number;
  model_count?: number;
}

const EMPTY: Partial<Brand> = {
  name: '',
  primary_color: '#16a34a',
  secondary_color: '#15803d',
  proposal_validity_days: 7,
  is_active: true,
};

export default function BrandsPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Brand>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: brandsData, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Falha ao carregar marcas');
      setLoading(false);
      return;
    }

    const ids = (brandsData ?? []).map((b) => b.id);
    const counts: Record<string, { f: number; m: number }> = {};
    if (ids.length) {
      const [{ data: fr }, { data: pm }] = await Promise.all([
        supabase.from('franchises').select('brand_id').in('brand_id', ids),
        supabase.from('pool_models').select('brand_id').in('brand_id', ids),
      ]);
      ids.forEach((id) => (counts[id] = { f: 0, m: 0 }));
      (fr ?? []).forEach((r: any) => r.brand_id && (counts[r.brand_id].f += 1));
      (pm ?? []).forEach((r: any) => r.brand_id && (counts[r.brand_id].m += 1));
    }

    setBrands(
      (brandsData ?? []).map((b) => ({
        ...b,
        franchise_count: counts[b.id]?.f ?? 0,
        model_count: counts[b.id]?.m ?? 0,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(EMPTY);
    setOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setOpen(true);
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `brands/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('quintal-photos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('quintal-photos').getPublicUrl(path);
      setEditing((p) => ({ ...p, logo_url: data.publicUrl }));
      toast.success('Logo enviado');
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editing.name?.trim()) {
      toast.error('Informe o nome da marca');
      return;
    }
    setSaving(true);
    const payload = {
      name: editing.name!,
      logo_url: editing.logo_url ?? null,
      primary_color: editing.primary_color ?? '#16a34a',
      secondary_color: editing.secondary_color ?? '#15803d',
      slogan: editing.slogan ?? null,
      proposal_header: editing.proposal_header ?? null,
      proposal_footer: editing.proposal_footer ?? null,
      proposal_validity_days: editing.proposal_validity_days ?? 7,
      payment_terms: editing.payment_terms ?? null,
      is_active: editing.is_active ?? true,
    };
    const q = editing.id
      ? supabase.from('brands').update(payload).eq('id', editing.id)
      : supabase.from('brands').insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Marca salva');
    setOpen(false);
    load();
  };

  return (
    <PageTransition>
    <div>
      <PageHeader
        title="Marcas"
        subtitle="Gerencie as marcas e suas identidades visuais"
        fallbackPath="/admin"
        rightSlot={
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Nova marca
          </Button>
        }
      />
      <div className="container max-w-6xl py-6 space-y-6">

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : brands.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma marca cadastrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {b.logo_url && <AvatarImage src={b.logo_url} alt={b.name} />}
                    <AvatarFallback style={{ backgroundColor: b.primary_color ?? undefined, color: 'white' }}>
                      {b.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{b.name}</div>
                    <Badge variant={b.is_active ? 'default' : 'secondary'} className="mt-1">
                      {b.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {b.franchise_count} franquias
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" /> {b.model_count} modelos
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(b)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/admin/marcas/${b.id}/catalogo`)}
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Catálogo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing.id ? 'Editar marca' : 'Nova marca'}</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="identity" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="identity" className="flex-1">Identidade</TabsTrigger>
              <TabsTrigger value="proposal" className="flex-1">Proposta</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da marca *</Label>
                <Input
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {editing.logo_url && (
                    <img src={editing.logo_url} alt="Logo" className="h-12 w-12 rounded object-contain border" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cor principal</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="w-14 p-1 h-10"
                      value={editing.primary_color ?? '#16a34a'}
                      onChange={(e) => setEditing((p) => ({ ...p, primary_color: e.target.value }))}
                    />
                    <Input
                      value={editing.primary_color ?? ''}
                      onChange={(e) => setEditing((p) => ({ ...p, primary_color: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="w-14 p-1 h-10"
                      value={editing.secondary_color ?? '#15803d'}
                      onChange={(e) => setEditing((p) => ({ ...p, secondary_color: e.target.value }))}
                    />
                    <Input
                      value={editing.secondary_color ?? ''}
                      onChange={(e) => setEditing((p) => ({ ...p, secondary_color: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Slogan</Label>
                <Input
                  value={editing.slogan ?? ''}
                  onChange={(e) => setEditing((p) => ({ ...p, slogan: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Marca ativa</Label>
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing((p) => ({ ...p, is_active: v }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="proposal" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Texto de abertura da proposta</Label>
                <Textarea
                  rows={3}
                  value={editing.proposal_header ?? ''}
                  onChange={(e) => setEditing((p) => ({ ...p, proposal_header: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Condições de pagamento padrão</Label>
                <Textarea
                  rows={3}
                  value={editing.payment_terms ?? ''}
                  onChange={(e) => setEditing((p) => ({ ...p, payment_terms: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Validade padrão (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  value={editing.proposal_validity_days ?? 7}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, proposal_validity_days: Number(e.target.value) || 7 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Texto de rodapé</Label>
                <Textarea
                  rows={3}
                  value={editing.proposal_footer ?? ''}
                  onChange={(e) => setEditing((p) => ({ ...p, proposal_footer: e.target.value }))}
                />
              </div>
            </TabsContent>
          </Tabs>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
