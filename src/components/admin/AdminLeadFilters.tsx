import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { SlidersHorizontal } from 'lucide-react';
import { STATUS_LABELS, Franchise } from '@/lib/lead-constants';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileFilterDrawer, ActiveFilterChips } from './MobileFilterDrawer';

const TEMP_LABELS: Record<string, string> = {
  quente: '🔥 Quente',
  morno: '☀️ Morno',
  frio: '❄️ Frio',
};

interface AdminLeadFiltersProps {
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
}

export function AdminLeadFilters({
  searchInput, onSearchChange,
  cidadeInput, onCidadeChange,
  filterFranquia, onFranquiaChange,
  filterStatus, onStatusChange,
  filterModelo, onModeloChange,
  filterTemperatura, onTemperaturaChange,
  franchises, models,
}: AdminLeadFiltersProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCount = [
    searchInput, cidadeInput,
    filterFranquia !== 'all' ? filterFranquia : '',
    filterStatus !== 'all' ? filterStatus : '',
    filterModelo !== 'all' ? filterModelo : '',
    filterTemperatura !== 'all' ? filterTemperatura : '',
  ].filter(Boolean).length;

  if (isMobile) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Input
            placeholder="Buscar nome..."
            value={searchInput}
            onChange={e => onSearchChange(e.target.value)}
            className="flex-1 h-11"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 relative"
            onClick={() => setDrawerOpen(true)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </Button>
        </div>

        <ActiveFilterChips
          searchInput={searchInput}
          cidadeInput={cidadeInput}
          filterFranquia={filterFranquia}
          filterStatus={filterStatus}
          filterModelo={filterModelo}
          filterTemperatura={filterTemperatura}
          onSearchChange={onSearchChange}
          onCidadeChange={onCidadeChange}
          onFranquiaChange={onFranquiaChange}
          onStatusChange={onStatusChange}
          onModeloChange={onModeloChange}
          onTemperaturaChange={onTemperaturaChange}
          franchises={franchises}
        />

        <MobileFilterDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          searchInput={searchInput}
          onSearchChange={onSearchChange}
          cidadeInput={cidadeInput}
          onCidadeChange={onCidadeChange}
          filterFranquia={filterFranquia}
          onFranquiaChange={onFranquiaChange}
          filterStatus={filterStatus}
          onStatusChange={onStatusChange}
          filterModelo={filterModelo}
          onModeloChange={onModeloChange}
          filterTemperatura={filterTemperatura}
          onTemperaturaChange={onTemperaturaChange}
          franchises={franchises}
          models={models}
        />
      </div>
    );
  }

  return (
    <Card className="mb-4 sm:mb-6 border-border/50 shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 sm:gap-3">
          <Input placeholder="Buscar nome..." value={searchInput} onChange={e => onSearchChange(e.target.value)} className="rounded-xl h-11 sm:h-10" />
          <Select value={filterFranquia} onValueChange={onFranquiaChange}>
            <SelectTrigger className="rounded-xl h-11 sm:h-10"><SelectValue placeholder="Franquia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Franquias</SelectItem>
              {franchises.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="rounded-xl h-11 sm:h-10"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTemperatura} onValueChange={onTemperaturaChange}>
            <SelectTrigger className="rounded-xl h-11 sm:h-10"><SelectValue placeholder="Temperatura" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Temperaturas</SelectItem>
              {Object.entries(TEMP_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterModelo} onValueChange={onModeloChange}>
            <SelectTrigger className="rounded-xl h-11 sm:h-10"><SelectValue placeholder="Modelo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Modelos</SelectItem>
              {models.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Filtrar cidade..." value={cidadeInput} onChange={e => onCidadeChange(e.target.value)} className="rounded-xl h-11 sm:h-10" />
        </div>
      </CardContent>
    </Card>
  );
}

export { TEMP_LABELS };
