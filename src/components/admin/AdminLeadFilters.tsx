import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { STATUS_LABELS, Franchise } from '@/lib/lead-constants';

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
  franchises: Franchise[];
  models: string[];
}

export function AdminLeadFilters({
  searchInput, onSearchChange,
  cidadeInput, onCidadeChange,
  filterFranquia, onFranquiaChange,
  filterStatus, onStatusChange,
  filterModelo, onModeloChange,
  franchises, models,
}: AdminLeadFiltersProps) {
  return (
    <Card className="mb-4 sm:mb-6 border-border/50 shadow-sm">
      <CardContent className="p-2.5 sm:p-3 md:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
          <Input placeholder="Buscar nome..." value={searchInput} onChange={e => onSearchChange(e.target.value)} className="rounded-xl text-xs sm:text-sm h-8 sm:h-9 col-span-2 sm:col-span-1" />
          <Select value={filterFranquia} onValueChange={onFranquiaChange}>
            <SelectTrigger className="rounded-xl h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Franquia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Franquias</SelectItem>
              {franchises.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={onStatusChange}>
            <SelectTrigger className="rounded-xl h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterModelo} onValueChange={onModeloChange}>
            <SelectTrigger className="rounded-xl h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Modelo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Modelos</SelectItem>
              {models.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Filtrar cidade..." value={cidadeInput} onChange={e => onCidadeChange(e.target.value)} className="rounded-xl text-xs sm:text-sm h-8 sm:h-9" />
        </div>
      </CardContent>
    </Card>
  );
}
