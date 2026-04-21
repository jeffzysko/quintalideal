import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Save, Ruler } from 'lucide-react';
import { toast } from 'sonner';

interface FranchiseCatalogProps {
  franchiseId: string;
}

interface CatalogModel {
  id: string;
  name: string;
  categoria_tamanho: string;
  comprimento: number | null;
  largura: number | null;
  profundidade: number | null;
  possui_prainha: boolean | null;
  possui_spa: boolean | null;
  imagem_principal: string | null;
  gallery_urls: string[] | null;
  preco_min: number | null;
  preco_max: number | null;
  custom_price: number | null;
  is_active: boolean;
}

interface RowState {
  price: string;
  active: boolean;
  saving: boolean;
}

const formatBRL = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function FranchiseCatalog({ franchiseId }: FranchiseCatalogProps) {
  const queryClient = useQueryClient();
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  const { data: franchise } = useQuery({
    queryKey: ['franchise-brand', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('franchises')
        .select('brand_id, brands(name)')
        .eq('id', franchiseId)
        .maybeSingle();
      return data;
    },
    enabled: !!franchiseId,
  });

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['franchise-catalog', franchiseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_franchise_catalog', {
        p_franchise_id: franchiseId,
      });
      if (error) throw error;
      return (data || []) as CatalogModel[];
    },
    enabled: !!franchiseId,
  });

  // Initialize row state when models load
  useEffect(() => {
    if (!models.length) return;
    setRowState((prev) => {
      const next = { ...prev };
      for (const m of models) {
        if (!next[m.id]) {
          next[m.id] = {
            price: String(m.custom_price ?? m.preco_min ?? ''),
            active: m.is_active,
            saving: false,
          };
        }
      }
      return next;
    });
  }, [models]);

  const handleSave = async (model: CatalogModel) => {
    const state = rowState[model.id];
    if (!state) return;

    const priceNum = state.price === '' ? null : Number(state.price);
    if (priceNum != null && (Number.isNaN(priceNum) || priceNum < 0)) {
      toast.error('Preço inválido');
      return;
    }

    setRowState((p) => ({ ...p, [model.id]: { ...p[model.id], saving: true } }));

    const { error } = await supabase
      .from('franchise_model_prices')
      .upsert(
        {
          franchise_id: franchiseId,
          pool_model_id: model.id,
          custom_price: priceNum,
          is_active: state.active,
        },
        { onConflict: 'franchise_id,pool_model_id' },
      );

    setRowState((p) => ({ ...p, [model.id]: { ...p[model.id], saving: false } }));

    if (error) {
      toast.error('Erro ao salvar', { description: error.message });
      return;
    }

    toast.success('Modelo atualizado');
    queryClient.invalidateQueries({ queryKey: ['franchise-catalog', franchiseId] });
  };

  const brandName = (franchise as any)?.brands?.name || 'sua marca';

  if (!franchise?.brand_id) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Sua franquia ainda não está vinculada a uma marca. Entre em contato com o administrador.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-primary" />
            </div>
            Catálogo de modelos — {brandName}
          </CardTitle>
          <CardDescription className="text-xs">
            Estes são os modelos disponíveis para sua loja. Você pode ajustar o preço ou ocultar modelos que não trabalha.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum modelo cadastrado para esta marca ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const state = rowState[m.id];
            const cover = m.gallery_urls?.[0] || m.imagem_principal || '/placeholder.svg';
            const basePrice = m.preco_min;
            const hasOverride =
              state &&
              state.price !== '' &&
              basePrice != null &&
              Number(state.price) !== basePrice;

            return (
              <Card key={m.id} className="overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={cover}
                    alt={m.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h3 className="font-semibold text-sm">{m.name}</h3>
                    {(m.comprimento || m.largura || m.profundidade) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Ruler className="w-3 h-3" />
                        {[m.comprimento, m.largura, m.profundidade]
                          .filter(Boolean)
                          .map((v) => `${v}m`)
                          .join(' x ')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Preço base da marca</Label>
                    <p
                      className={`text-xs ${hasOverride ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}
                    >
                      {formatBRL(basePrice)}
                      {m.preco_max && m.preco_max !== basePrice ? ` — ${formatBRL(m.preco_max)}` : ''}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`price-${m.id}`} className="text-xs font-medium">
                      Seu preço (R$)
                    </Label>
                    <Input
                      id={`price-${m.id}`}
                      type="number"
                      min="0"
                      step="100"
                      placeholder={basePrice ? String(basePrice) : 'Definir preço'}
                      value={state?.price ?? ''}
                      onChange={(e) =>
                        setRowState((p) => ({
                          ...p,
                          [m.id]: { ...p[m.id], price: e.target.value },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="space-y-0.5">
                      <Label htmlFor={`active-${m.id}`} className="text-xs font-medium cursor-pointer">
                        Ativo na minha loja
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Se desativado, não aparece no cadastro de leads
                      </p>
                    </div>
                    <Switch
                      id={`active-${m.id}`}
                      checked={state?.active ?? true}
                      onCheckedChange={(checked) =>
                        setRowState((p) => ({
                          ...p,
                          [m.id]: { ...p[m.id], active: checked },
                        }))
                      }
                    />
                  </div>

                  <Button
                    onClick={() => handleSave(m)}
                    disabled={state?.saving}
                    className="w-full mt-auto gap-2"
                    size="sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {state?.saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
