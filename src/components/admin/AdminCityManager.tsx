import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, AlertTriangle, Search, Building2, CheckCircle2 } from 'lucide-react';

interface CoveredCity {
  id: string;
  franchise_id: string;
  city_name: string;
  city_name_normalized: string;
  is_primary_city: boolean;
}

interface Franchise {
  id: string;
  nome_franquia: string;
  cidade_base: string;
}

function normalizeCityName(city: string): string {
  const accents = "ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ";
  const plain  = "AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn";
  let result = city;
  for (let i = 0; i < accents.length; i++) {
    result = result.replaceAll(accents[i], plain[i]);
  }
  return result.toLowerCase().replace(/\s+/g, " ").trim();
}

export function AdminCityManager() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [coveredCities, setCoveredCities] = useState<CoveredCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFranchise, setSelectedFranchise] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addFranchiseId, setAddFranchiseId] = useState('');
  const [addCityName, setAddCityName] = useState('');
  const [addPrimary, setAddPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [franchisesRes, citiesRes] = await Promise.all([
      supabase.from('franchises').select('id, nome_franquia, cidade_base').order('nome_franquia'),
      supabase.from('franchise_covered_cities').select('*').order('city_name'),
    ]);
    setFranchises(franchisesRes.data || []);
    setCoveredCities(citiesRes.data || []);
    setLoading(false);
  };

  // Duplicate detection
  const duplicateCities = useMemo(() => {
    const cityMap = new Map<string, string[]>();
    coveredCities.forEach(c => {
      const existing = cityMap.get(c.city_name_normalized) || [];
      existing.push(c.franchise_id);
      cityMap.set(c.city_name_normalized, existing);
    });
    const dups = new Map<string, string[]>();
    cityMap.forEach((franchiseIds, cityNorm) => {
      if (franchiseIds.length > 1) dups.set(cityNorm, franchiseIds);
    });
    return dups;
  }, [coveredCities]);

  // Cities without coverage
  const franchiseMap = useMemo(() => {
    const map: Record<string, string> = {};
    franchises.forEach(f => { map[f.id] = f.nome_franquia; });
    return map;
  }, [franchises]);

  const filteredCities = useMemo(() => {
    let cities = coveredCities;
    if (selectedFranchise !== 'all') {
      cities = cities.filter(c => c.franchise_id === selectedFranchise);
    }
    if (searchQuery) {
      const q = normalizeCityName(searchQuery);
      cities = cities.filter(c => c.city_name_normalized.includes(q));
    }
    return cities;
  }, [coveredCities, selectedFranchise, searchQuery]);

  const handleAdd = async () => {
    if (!addFranchiseId || !addCityName.trim()) {
      toast.error('Selecione uma franquia e informe o nome da cidade.');
      return;
    }
    setSaving(true);
    const normalized = normalizeCityName(addCityName.trim());

    const { error } = await supabase.from('franchise_covered_cities').insert({
      franchise_id: addFranchiseId,
      city_name: addCityName.trim(),
      city_name_normalized: normalized,
      is_primary_city: addPrimary,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Esta cidade já está cadastrada para esta franquia.');
      } else {
        toast.error('Erro ao cadastrar cidade.');
      }
    } else {
      toast.success('Cidade cadastrada!');
      setAddCityName('');
      setAddPrimary(false);
      loadData();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('franchise_covered_cities').delete().eq('id', deleteId);
    if (error) toast.error('Erro ao remover cidade.');
    else {
      toast.success('Cidade removida.');
      loadData();
    }
    setDeleteId(null);
  };

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
      is_primary_city: false,
    }));

    const { error } = await supabase.from('franchise_covered_cities').upsert(rows, { onConflict: 'franchise_id,city_name_normalized' });
    if (error) {
      toast.error('Erro ao cadastrar cidades.');
    } else {
      toast.success(`${cityNames.length} cidades cadastradas!`);
      setAddCityName('');
      setShowAdd(false);
      loadData();
    }
    setSaving(false);
  };

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
      {/* Duplicates warning */}
      {duplicateCities.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    Cidades atendidas por múltiplas franquias ({duplicateCities.size})
                  </p>
                  <div className="space-y-1">
                    {Array.from(duplicateCities.entries()).slice(0, 10).map(([cityNorm, fIds]) => {
                      const cityObj = coveredCities.find(c => c.city_name_normalized === cityNorm);
                      return (
                        <p key={cityNorm} className="text-xs text-amber-700 dark:text-amber-300">
                          <strong>{cityObj?.city_name || cityNorm}</strong>: {fIds.map(id => franchiseMap[id] || id).join(', ')}
                        </p>
                      );
                    })}
                    {duplicateCities.size > 10 && (
                      <p className="text-xs text-amber-600">...e mais {duplicateCities.size - 10}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Toolbar */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cidade..."
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
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{coveredCities.length}</p>
            <p className="text-xs text-muted-foreground">Total de registros</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{new Set(coveredCities.map(c => c.city_name_normalized)).size}</p>
            <p className="text-xs text-muted-foreground">Cidades únicas</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{new Set(coveredCities.map(c => c.franchise_id)).size}</p>
            <p className="text-xs text-muted-foreground">Franquias com cobertura</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{duplicateCities.size}</p>
            <p className="text-xs text-muted-foreground">Cidades compartilhadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Cities table */}
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
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Principal</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Duplicada</th>
                    <th className="text-right py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredCities.map(city => {
                      const isDuplicate = duplicateCities.has(city.city_name_normalized);
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
                              <Building2 className="w-3.5 h-3.5" />
                              {franchiseMap[city.franchise_id] || '—'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {city.is_primary_city && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Principal
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isDuplicate && (
                              <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {duplicateCities.get(city.city_name_normalized)?.length} franquias
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteId(city.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Cidades Atendidas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Franquia</label>
              <Select value={addFranchiseId} onValueChange={setAddFranchiseId}>
                <SelectTrigger><SelectValue placeholder="Selecione a franquia" /></SelectTrigger>
                <SelectContent>
                  {franchises.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_franquia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Cidades (uma por linha)
              </label>
              <textarea
                value={addCityName}
                onChange={e => setAddCityName(e.target.value)}
                rows={6}
                placeholder={"Santa Rosa\nTuparendi\nHorizontina\nGiruá"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleBulkAdd} disabled={saving} className="gap-2">
              {saving ? <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Remoção</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Deseja remover esta cidade da cobertura da franquia?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
