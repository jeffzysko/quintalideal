import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { POOL_MODELS, CATEGORIES, CATEGORY_COLORS, type PoolModel } from '@/lib/pool-catalog';
import { PageHeader } from '@/components/PageHeader';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Ruler, Droplets, ArrowDown, Star, FileText } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export default function CatalogoPiscinas() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<PoolModel | null>(null);

  const filtered = useMemo(() => {
    return POOL_MODELS.filter(m => {
      if (category !== 'Todos' && m.category !== category) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [category, search]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24 md:pb-12">
        <PageHeader
          title="Catálogo de Modelos"
          fallbackPath="/hoje"
          rightSlot={
            <div className="flex items-center gap-1">
              <NotificationBell />
              <UserAvatarMenu />
            </div>
          }
        />

        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar modelo..."
                className="pl-9 h-10"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-all',
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border/40 text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {cat === 'Classica' ? 'Classica' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Droplets}
              title="Nenhum modelo encontrado"
              description="Tente ajustar os filtros ou alterar o termo de busca."
            />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filtered.map(model => (
                <Card key={model.id} className="glass-card-interactive overflow-hidden group" onClick={() => setSelectedModel(model)}>
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={model.image}
                      alt={model.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <Badge variant="outline" className={cn('absolute top-2 left-2 text-[10px] font-semibold backdrop-blur-sm', CATEGORY_COLORS[model.category])}>
                      {model.category}
                    </Badge>
                    {model.id === 'tradicional' && (
                      <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-0 text-[10px] gap-0.5">
                        <Star className="w-3 h-3" /> Mais vendido
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground truncate">{model.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Ruler className="w-3 h-3 shrink-0" />
                      <span>{model.dimensions}</span>
                      <span className="text-border">|</span>
                      <Droplets className="w-3 h-3 shrink-0" />
                      <span>{model.capacity}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Ideal para: <span className="font-medium text-foreground">{model.idealFor}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 italic truncate">{model.highlight}</p>
                    <Button variant="ghost" size="sm" className="w-full h-8 text-xs text-primary mt-1">
                      Ver detalhes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Detail Sheet */}
        <Sheet open={!!selectedModel} onOpenChange={() => setSelectedModel(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {selectedModel && (
              <>
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center gap-2">
                    {selectedModel.name}
                    {selectedModel.id === 'tradicional' && (
                      <Badge className="bg-amber-500 text-white border-0 text-[10px] gap-0.5">
                        <Star className="w-3 h-3" /> Mais vendido
                      </Badge>
                    )}
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden border border-border/40">
                    <img
                      src={selectedModel.image}
                      alt={selectedModel.name}
                      className="w-full aspect-[4/3] object-cover"
                    />
                  </div>

                  <Badge variant="outline" className={cn('text-xs font-semibold', CATEGORY_COLORS[selectedModel.category])}>
                    {selectedModel.category}
                  </Badge>

                  <div className="space-y-2">
                    {[
                      { label: 'Dimensões', value: selectedModel.dimensions, icon: Ruler },
                      { label: 'Capacidade', value: selectedModel.capacity, icon: Droplets },
                      { label: 'Profundidade', value: selectedModel.depth, icon: ArrowDown },
                    ].map(spec => (
                      <div key={spec.label} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-muted/40">
                        <spec.icon className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{spec.label}</p>
                          <p className="text-sm font-semibold text-foreground">{spec.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-0.5">Ideal para</p>
                    <p className="text-sm font-semibold text-foreground">{selectedModel.idealFor}</p>
                  </div>

                  <p className="text-sm text-muted-foreground italic">"{selectedModel.highlight}"</p>

                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      setSelectedModel(null);
                      navigate(`/propostas/nova?modelo=${encodeURIComponent(selectedModel.name)}`);
                    }}
                  >
                    <FileText className="w-4 h-4" /> Usar em proposta
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </PageTransition>
  );
}
