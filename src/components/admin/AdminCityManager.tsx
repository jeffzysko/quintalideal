import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Plus, Trash2, AlertTriangle, Search, Building2, CheckCircle2,
  Pencil, LayoutGrid, LayoutList, Globe, ShieldAlert, ArrowRight, ChevronsUpDown,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/* ─── types ─── */
interface CoveredCity {
  id: string;
  franchise_id: string;
  city_name: string;
  city_name_normalized: string;
  is_primary_city: boolean;
  created_at: string;
  notes: string | null;
}

interface Franchise {
  id: string;
  nome_franquia: string;
  cidade_base: string;
}

interface UncoveredCity {
  cidade: string;
  lead_count: number;
}

/* ─── helpers ─── */
function normalizeCityName(city: string): string {
  const accents = "ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ";
  const plain  = "AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn";
  let result = city;
  for (let i = 0; i < accents.length; i++) {
    result = result.split(accents[i]).join(plain[i]);
  }
  return result.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type FilterTab = 'all' | 'primary' | 'shared' | 'uncovered';
type ViewMode = 'table' | 'cards';

/* ─── component ─── */
export function AdminCityManager() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [coveredCities, setCoveredCities] = useState<CoveredCity[]>([]);
  const [uncoveredCities, setUncoveredCities] = useState<UncoveredCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFranchise, setSelectedFranchise] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addFranchiseId, setAddFranchiseId] = useState('');
  const [addCityName, setAddCityName] = useState('');
  const [addPrimary, setAddPrimary] = useState(false);
  const [addNotes, setAddNotes] = useState('');
  const [addDuplicateWarning, setAddDuplicateWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editCity, setEditCity] = useState<CoveredCity | null>(null);
  const [editCityName, setEditCityName] = useState('');
  const [editFranchiseId, setEditFranchiseId] = useState('');
  const [editPrimary, setEditPrimary] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete
  const [deleteCity, setDeleteCity] = useState<CoveredCity | null>(null);

  /* ─── data loading ─── */
  const loadData = useCallback(async () => {
    setLoading(true);
    const [franchisesRes, citiesRes, uncoveredRes] = await Promise.all([
      supabase.from('franchises').select('id, nome_franquia, cidade_base').order('nome_franquia'),
      supabase.from('franchise_covered_cities').select('*').order('city_name'),
      supabase.from('leads')
        .select('cidade')
        .eq('territory_match_status', 'no_city_match_found')
        .not('cidade', 'is', null),
    ]);
    setFranchises(franchisesRes.data || []);
    setCoveredCities(citiesRes.data || []);

    // Aggregate uncovered cities
    const cityCount = new Map<string, number>();
    (uncoveredRes.data || []).forEach((l: { cidade: string | null }) => {
      if (l.cidade) {
        cityCount.set(l.cidade, (cityCount.get(l.cidade) || 0) + 1);
      }
    });
    setUncoveredCities(
      Array.from(cityCount.entries())
        .map(([cidade, lead_count]) => ({ cidade, lead_count }))
        .sort((a, b) => b.lead_count - a.lead_count)
    );
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── derived data ─── */
  const franchiseMap = useMemo(() => {
    const map: Record<string, Franchise> = {};
    franchises.forEach(f => { map[f.id] = f; });
    return map;
  }, [franchises]);

  const duplicateCities = useMemo(() => {
    const cityMap = new Map<string, string[]>();
    coveredCities.forEach(c => {
      const existing = cityMap.get(c.city_name_normalized) || [];
      existing.push(c.franchise_id);
      cityMap.set(c.city_name_normalized, existing);
    });
    const dups = new Map<string, string[]>();
    cityMap.forEach((fIds, cityNorm) => {
      if (fIds.length > 1) dups.set(cityNorm, fIds);
    });
    return dups;
  }, [coveredCities]);

  const filteredCities = useMemo(() => {
    let cities = coveredCities;

    // Franchise filter
    if (selectedFranchise !== 'all') {
      cities = cities.filter(c => c.franchise_id === selectedFranchise);
    }

    // Tab filter
    if (filterTab === 'primary') {
      cities = cities.filter(c => c.is_primary_city);
    } else if (filterTab === 'shared') {
      cities = cities.filter(c => duplicateCities.has(c.city_name_normalized));
    }

    // Search (city, franchise name, cidade base)
    if (searchQuery) {
      const q = normalizeCityName(searchQuery);
      cities = cities.filter(c => {
        const f = franchiseMap[c.franchise_id];
        return (
          c.city_name_normalized.includes(q) ||
          (f && normalizeCityName(f.nome_franquia).includes(q)) ||
          (f && normalizeCityName(f.cidade_base).includes(q))
        );
      });
    }

    return cities;
  }, [coveredCities, selectedFranchise, searchQuery, filterTab, duplicateCities, franchiseMap]);

  // Group by franchise for card view
  const citiesByFranchise = useMemo(() => {
    const map = new Map<string, CoveredCity[]>();
    filteredCities.forEach(c => {
      const list = map.get(c.franchise_id) || [];
      list.push(c);
      map.set(c.franchise_id, list);
    });
    return map;
  }, [filteredCities]);

  /* ─── duplicate check for add modal ─── */
  useEffect(() => {
    if (!addCityName.trim() || !addFranchiseId) {
      setAddDuplicateWarning(null);
      return;
    }
    const names = addCityName.split('\n').map(c => normalizeCityName(c)).filter(Boolean);
    const warnings: string[] = [];
    names.forEach(norm => {
      const existing = coveredCities.filter(c => c.city_name_normalized === norm);
      existing.forEach(e => {
        if (e.franchise_id === addFranchiseId) {
          warnings.push(`"${e.city_name}" já está cadastrada nesta franquia.`);
        } else {
          const fName = franchiseMap[e.franchise_id]?.nome_franquia || 'outra franquia';
          warnings.push(`"${e.city_name}" já está vinculada à ${fName}.`);
        }
      });
    });
    setAddDuplicateWarning(warnings.length > 0 ? warnings.join('\n') : null);
  }, [addCityName, addFranchiseId, coveredCities, franchiseMap]);

  /* ─── handlers ─── */
  const handleBulkAdd = async () => {
    if (!addFranchiseId || !addCityName.trim()) {
      toast.error('Preencha franquia e cidades.');
      return;
    }
    setSaving(true);
    const cityNames = addCityName.split('\n').map(c => c.trim()).filter(Boolean);
    const rows = cityNames.map(name => ({
      franchise_id: addFranchiseId,
      city_name: name,
      city_name_normalized: normalizeCityName(name),
      is_primary_city: addPrimary,
      notes: addNotes.trim() || null,
    }));

    const { error } = await supabase.from('franchise_covered_cities').upsert(rows, { onConflict: 'franchise_id,city_name_normalized' });
    if (error) {
      toast.error('Erro ao cadastrar cidades.');
    } else {
      toast.success(`${cityNames.length} cidade(s) cadastrada(s)!`);
      setAddCityName('');
      setAddNotes('');
      setAddPrimary(false);
      setShowAdd(false);
      loadData();
    }
    setSaving(false);
  };

  const handleEditSave = async () => {
    if (!editCity) return;
    setEditSaving(true);
    const { error } = await supabase.from('franchise_covered_cities').update({
      city_name: editCityName.trim(),
      city_name_normalized: normalizeCityName(editCityName),
      franchise_id: editFranchiseId,
      is_primary_city: editPrimary,
      notes: editNotes.trim() || null,
    }).eq('id', editCity.id);

    if (error) {
      toast.error('Erro ao atualizar cidade.');
    } else {
      toast.success('Cidade atualizada!');
      setEditCity(null);
      loadData();
    }
    setEditSaving(false);
  };

  const openEdit = (city: CoveredCity) => {
    setEditCity(city);
    setEditCityName(city.city_name);
    setEditFranchiseId(city.franchise_id);
    setEditPrimary(city.is_primary_city);
    setEditNotes(city.notes || '');
  };

  const handleDelete = async () => {
    if (!deleteCity) return;
    const { error } = await supabase.from('franchise_covered_cities').delete().eq('id', deleteCity.id);
    if (error) toast.error('Erro ao remover cidade.');
    else {
      toast.success('Cidade removida.');
      loadData();
    }
    setDeleteCity(null);
  };

  const handleAddUncovered = (cidade: string) => {
    setAddCityName(cidade);
    setShowAdd(true);
  };

  /* ─── KPIs ─── */
  const kpis = useMemo(() => ({
    totalFranchises: franchises.length,
    totalCities: new Set(coveredCities.map(c => c.city_name_normalized)).size,
    shared: duplicateCities.size,
    uncovered: uncoveredCities.length,
  }), [franchises, coveredCities, duplicateCities, uncoveredCities]);

  /* ─── filter tabs ─── */
  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: 'Todas', count: coveredCities.length },
    { key: 'primary', label: 'Principais', count: coveredCities.filter(c => c.is_primary_city).length },
    { key: 'shared', label: 'Compartilhadas', count: duplicateCities.size },
    { key: 'uncovered', label: 'Sem cobertura', count: uncoveredCities.length },
  ];

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-16">
          <div className="animate-spin w-7 h-7 border-3 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Gestão de Territórios
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Cidades atendidas por franquia</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Franquias', value: kpis.totalFranchises, icon: Building2, color: 'text-primary' },
          { label: 'Cidades cadastradas', value: kpis.totalCities, icon: MapPin, color: 'text-primary' },
          { label: 'Cobertura compartilhada', value: kpis.shared, icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Sem cobertura', value: kpis.uncovered, icon: ShieldAlert, color: 'text-destructive' },
        ].map(kpi => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className={`w-5 h-5 ${kpi.color} shrink-0`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Duplicates warning */}
      {duplicateCities.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Collapsible>
            <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        Cidades atendidas por múltiplas franquias ({duplicateCities.size})
                      </p>
                      <CollapsibleTrigger asChild>
                        <button className="text-xs text-amber-600 hover:text-amber-800 dark:hover:text-amber-300 flex items-center gap-1 transition-colors">
                          <ChevronsUpDown className="w-3.5 h-3.5" />
                          <span>Expandir</span>
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <div className="space-y-1">
                      {Array.from(duplicateCities.entries()).slice(0, 4).map(([cityNorm, fIds]) => {
                        const cityObj = coveredCities.find(c => c.city_name_normalized === cityNorm);
                        return (
                          <p key={cityNorm} className="text-xs text-amber-700 dark:text-amber-300">
                            <strong>{cityObj?.city_name || cityNorm}</strong>: {fIds.map(id => franchiseMap[id]?.nome_franquia || id).join(', ')}
                          </p>
                        );
                      })}
                    </div>
                    <CollapsibleContent>
                      <div className="space-y-1 mt-1">
                        {Array.from(duplicateCities.entries()).slice(4).map(([cityNorm, fIds]) => {
                          const cityObj = coveredCities.find(c => c.city_name_normalized === cityNorm);
                          return (
                            <p key={cityNorm} className="text-xs text-amber-700 dark:text-amber-300">
                              <strong>{cityObj?.city_name || cityNorm}</strong>: {fIds.map(id => franchiseMap[id]?.nome_franquia || id).join(', ')}
                            </p>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Collapsible>
        </motion.div>
      )}

      {/* Toolbar */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cidade, franquia ou cidade base..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Todas as franquias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as franquias</SelectItem>
                {franchises.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('table')}
                title="Visualizar em tabela"
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('cards')}
                title="Visualizar por franquia"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button onClick={() => setShowAdd(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar Cidade
              </Button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
              <Button
                key={tab.key}
                variant={filterTab === tab.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTab(tab.key)}
                className="gap-1.5 text-xs"
              >
                {tab.label}
                {tab.count !== undefined && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">
                    {tab.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Uncovered cities tab */}
      {filterTab === 'uncovered' ? (
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              Cidades sem cobertura detectadas ({uncoveredCities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uncoveredCities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                Todas as cidades dos leads possuem cobertura. 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {uncoveredCities.map(uc => (
                  <div
                    key={uc.cidade}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{uc.cidade}</p>
                      <p className="text-xs text-muted-foreground">{uc.lead_count} lead(s) sem cobertura</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleAddUncovered(uc.cidade)}>
                      Adicionar <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* ─── Card view by franchise ─── */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {Array.from(citiesByFranchise.entries()).map(([fId, cities]) => {
              const f = franchiseMap[fId];
              return (
                <motion.div key={fId} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <Card className="border-border/50 shadow-sm h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        {f?.nome_franquia || fId}
                      </CardTitle>
                      {f?.cidade_base && (
                        <p className="text-xs text-muted-foreground">Base: {f.cidade_base}</p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                      {cities.map(c => {
                        const isDup = duplicateCities.has(c.city_name_normalized);
                        return (
                          <div key={c.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span>{c.city_name}</span>
                              {c.is_primary_city && (
                                <Badge variant="secondary" className="text-xs py-0 px-1.5">Principal</Badge>
                              )}
                              {isDup && (
                                <Badge variant="outline" className="text-xs py-0 px-1.5 border-amber-500/40 text-amber-600">
                                  ⚠ Compartilhada
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteCity(c)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground pt-2 border-t border-border/30">
                        Total: {cities.length} cidade(s)
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {citiesByFranchise.size === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm col-span-full">Nenhuma cidade encontrada.</p>
          )}
        </div>
      ) : (
        /* ─── Table view ─── */
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Cidades Atendidas ({filteredCities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma cidade encontrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Cidade</th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Franquia</th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Cidade base</th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Cobertura</th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Criada em</th>
                      <th className="text-right py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredCities.map(city => {
                        const isDuplicate = duplicateCities.has(city.city_name_normalized);
                        const f = franchiseMap[city.franchise_id];
                        return (
                          <motion.tr
                            key={city.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-3 font-medium">{city.city_name}</td>
                            <td className="py-3 px-3 text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                {f?.nome_franquia || '—'}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">
                              {f?.cidade_base || '—'}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {city.is_primary_city ? (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Principal
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Adicional</Badge>
                                )}
                                {isDuplicate && (
                                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {duplicateCities.get(city.city_name_normalized)?.length} franquias
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground text-xs hidden lg:table-cell">
                              {formatDate(city.created_at)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(city)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteCity(city)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Add dialog ─── */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Cidades Atendidas</DialogTitle>
            <DialogDescription>Cadastre uma ou mais cidades para a franquia selecionada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Franquia</Label>
              <Select value={addFranchiseId} onValueChange={setAddFranchiseId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione a franquia" /></SelectTrigger>
                <SelectContent>
                  {franchises.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cidades (uma por linha)
              </Label>
              <Textarea
                value={addCityName}
                onChange={e => setAddCityName(e.target.value)}
                rows={5}
                placeholder={"Santa Rosa\nTuparendi\nHorizontina\nGiruá"}
                className="mt-1.5 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="add-primary" checked={addPrimary} onCheckedChange={setAddPrimary} />
              <Label htmlFor="add-primary" className="text-sm">Marcar como cidade principal</Label>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Observação (opcional)
              </Label>
              <Textarea
                value={addNotes}
                onChange={e => setAddNotes(e.target.value)}
                rows={2}
                placeholder="Informações adicionais sobre a cobertura..."
                className="mt-1.5 resize-none"
              />
            </div>

            {addDuplicateWarning && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-300 whitespace-pre-line">
                    {addDuplicateWarning}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleBulkAdd} disabled={saving} className="gap-2">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <Plus className="w-4 h-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit dialog ─── */}
      <Dialog open={!!editCity} onOpenChange={() => setEditCity(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Cidade</DialogTitle>
            <DialogDescription>Altere os dados de cobertura territorial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Franquia</Label>
              <Select value={editFranchiseId} onValueChange={setEditFranchiseId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {franchises.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</Label>
              <Input value={editCityName} onChange={e => setEditCityName(e.target.value)} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="edit-primary" checked={editPrimary} onCheckedChange={setEditPrimary} />
              <Label htmlFor="edit-primary" className="text-sm">Cidade principal</Label>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Observação (opcional)
              </Label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={2}
                placeholder="Informações adicionais..."
                className="mt-1.5 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCity(null)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={editSaving} className="gap-2">
              {editSaving ? <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <CheckCircle2 className="w-4 h-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete confirm ─── */}
      <AlertDialog open={!!deleteCity} onOpenChange={() => setDeleteCity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Tem certeza que deseja remover <strong>{deleteCity?.city_name}</strong> da cobertura
                da franquia <strong>{deleteCity ? franchiseMap[deleteCity.franchise_id]?.nome_franquia : ''}</strong>?
              </span>
              <span className="block text-xs text-amber-600 dark:text-amber-400">
                ⚠ Leads dessa cidade poderão ser redirecionados para outra franquia ou para a franquia de origem do acesso.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2">
              <Trash2 className="w-4 h-4" /> Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
