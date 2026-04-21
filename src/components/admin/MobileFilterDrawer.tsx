import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { X, SlidersHorizontal } from 'lucide-react';
import { STATUS_LABELS, Franchise } from '@/lib/lead-constants';

const TEMP_LABELS: Record<string, string> = {
  quente: '🔥 Quente',
  morno: '☀️ Morno',
  frio: '❄️ Frio',
};

interface MobileFilterDrawerProps {
  searchInput: string;
  onSearchChange: (v: string) => void;
  cidadeInput: string;
  onCidadeChange: (v: string) => void;
  filterFranquia: string;
  onFranquiaChange: (v: string) => void;
  filterStatus: string;
  onStatusChange: (v: string) => void;
  filterModelo: string;
  onModeloChange: (v: string) => void;
  filterTemperatura: string;
  onTemperaturaChange: (v: string) => void;
  franchises: Franchise[];
  models: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileFilterDrawer({
  searchInput, onSearchChange,
  cidadeInput, onCidadeChange,
  filterFranquia, onFranquiaChange,
  filterStatus, onStatusChange,
  filterModelo, onModeloChange,
  filterTemperatura, onTemperaturaChange,
  franchises, models,
  open, onOpenChange,
}: MobileFilterDrawerProps) {
  const activeCount = [
    searchInput, cidadeInput,
    filterFranquia !== 'all' ? filterFranquia : '',
    filterStatus !== 'all' ? filterStatus : '',
    filterModelo !== 'all' ? filterModelo : '',
    filterTemperatura !== 'all' ? filterTemperatura : '',
  ].filter(Boolean).length;

  const clearAll = () => {
    onSearchChange('');
    onCidadeChange('');
    onFranquiaChange('all');
    onStatusChange('all');
    onModeloChange('all');
    onTemperaturaChange('all');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Filtros
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-xs h-5 px-1.5 bg-primary/10 text-primary">
                  {activeCount}
                </Badge>
              )}
            </DrawerTitle>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground h-8">
                <X className="w-3.5 h-3.5 mr-1" />
                Limpar tudo
              </Button>
            )}
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</label>
            <Input
              placeholder="Buscar nome..."
              value={searchInput}
              onChange={e => onSearchChange(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</label>
            <Input
              placeholder="Filtrar cidade..."
              value={cidadeInput}
              onChange={e => onCidadeChange(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Franquia</label>
            <Select value={filterFranquia} onValueChange={onFranquiaChange}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Franquia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Franquias</SelectItem>
                {franchises.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</label>
            <Select value={filterStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Temperatura</label>
            <Select value={filterTemperatura} onValueChange={onTemperaturaChange}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Temperatura" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Temperaturas</SelectItem>
                {Object.entries(TEMP_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelo</label>
            <Select value={filterModelo} onValueChange={onModeloChange}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Modelo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Modelos</SelectItem>
                {models.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DrawerClose asChild>
            <Button className="w-full mt-2" size="lg">
              Aplicar Filtros
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// Active filter chips to show above the list
export function ActiveFilterChips({
  searchInput, cidadeInput, filterFranquia, filterStatus, filterModelo, filterTemperatura,
  onSearchChange, onCidadeChange, onFranquiaChange, onStatusChange, onModeloChange, onTemperaturaChange,
  franchises,
}: {
  searchInput: string;
  cidadeInput: string;
  filterFranquia: string;
  filterStatus: string;
  filterModelo: string;
  filterTemperatura: string;
  onSearchChange: (v: string) => void;
  onCidadeChange: (v: string) => void;
  onFranquiaChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onModeloChange: (v: string) => void;
  onTemperaturaChange: (v: string) => void;
  franchises: Franchise[];
}) {
  const chips: { label: string; onClear: () => void }[] = [];
  if (searchInput) chips.push({ label: `"${searchInput}"`, onClear: () => onSearchChange('') });
  if (cidadeInput) chips.push({ label: `📍 ${cidadeInput}`, onClear: () => onCidadeChange('') });
  if (filterFranquia !== 'all') {
    const name = franchises.find(f => f.id === filterFranquia)?.nome_franquia || filterFranquia;
    chips.push({ label: `🏢 ${name}`, onClear: () => onFranquiaChange('all') });
  }
  if (filterStatus !== 'all') chips.push({ label: STATUS_LABELS[filterStatus] || filterStatus, onClear: () => onStatusChange('all') });
  if (filterTemperatura !== 'all') chips.push({ label: TEMP_LABELS[filterTemperatura] || filterTemperatura, onClear: () => onTemperaturaChange('all') });
  if (filterModelo !== 'all') chips.push({ label: `🏊 ${filterModelo}`, onClear: () => onModeloChange('all') });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {chips.map((chip, i) => (
        <Badge
          key={i}
          variant="secondary"
          className="text-xs font-medium gap-1 pr-1 bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
          onClick={chip.onClear}
        >
          {chip.label}
          <X className="w-3 h-3" />
        </Badge>
      ))}
    </div>
  );
}
