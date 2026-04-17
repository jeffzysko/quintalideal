import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  ListChecks, Check, Plus, Pencil, Trash2, GripVertical, BookmarkPlus,
  LayoutTemplate, Star, Save, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  project_id: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  position: number;
}

interface Template {
  id: string;
  name: string;
  items: string[];
  is_default: boolean;
}

interface Props {
  projectId: string;
  franchiseId: string;
  checklist: ChecklistItem[];
}

export function PostSaleChecklistManager({ projectId, franchiseId, checklist }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>(checklist);
  const [newLabel, setNewLabel] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState('');

  // Sync local state when query refreshes
  if (!editing && items !== checklist && items.length !== checklist.length) {
    setItems(checklist);
  }

  const { data: templates = [] } = useQuery({
    queryKey: ['post-sale-checklist-templates', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('post_sale_checklist_templates')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('is_default', { ascending: false })
        .order('name');
      return (data || []) as unknown as Template[];
    },
  });

  const completedCount = checklist.filter(c => c.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['post-sale-checklist', projectId] });
  };

  const toggleItem = async (item: ChecklistItem) => {
    if (editing) return;
    const newVal = !item.completed;
    const { error } = await supabase
      .from('post_sale_checklist')
      .update({
        completed: newVal,
        completed_at: newVal ? new Date().toISOString() : null,
      })
      .eq('id', item.id);
    if (error) { toast.error('Erro ao atualizar etapa.'); return; }
    refresh();
  };

  const startEdit = () => {
    setItems(checklist);
    setEditing(true);
  };

  const cancelEdit = () => {
    setItems(checklist);
    setNewLabel('');
    setEditing(false);
  };

  const updateLabel = (id: string, label: string) => {
    setItems(items.map(i => i.id === id ? { ...i, label } : i));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;
    setItems([
      ...items,
      { id: `new-${Date.now()}-${Math.random()}`, project_id: projectId, label, completed: false, completed_at: null, position: items.length },
    ]);
    setNewLabel('');
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    setItems(next);
  };

  const saveEdits = async () => {
    const cleaned = items.filter(i => i.label.trim().length > 0);
    if (cleaned.length === 0) { toast.error('Adicione pelo menos uma etapa.'); return; }

    // Delete removed items
    const keptIds = cleaned.filter(i => !i.id.startsWith('new-')).map(i => i.id);
    const removed = checklist.filter(c => !keptIds.includes(c.id));
    if (removed.length > 0) {
      await supabase.from('post_sale_checklist').delete().in('id', removed.map(r => r.id));
    }

    // Update existing + insert new
    const updates = cleaned.map(async (item, position) => {
      if (item.id.startsWith('new-')) {
        return supabase.from('post_sale_checklist').insert({
          project_id: projectId,
          label: item.label.trim(),
          position,
        });
      }
      return supabase.from('post_sale_checklist')
        .update({ label: item.label.trim(), position })
        .eq('id', item.id);
    });
    await Promise.all(updates);

    toast.success('Etapas atualizadas!');
    setEditing(false);
    refresh();
  };

  const applyTemplate = async (tpl: Template) => {
    if (!confirm(`Substituir as etapas atuais pelas do modelo "${tpl.name}"? As marcações de conclusão serão perdidas.`)) return;
    await supabase.from('post_sale_checklist').delete().eq('project_id', projectId);
    await supabase.from('post_sale_checklist').insert(
      tpl.items.map((label, position) => ({ project_id: projectId, label, position }))
    );
    toast.success(`Modelo "${tpl.name}" aplicado!`);
    setTemplatesOpen(false);
    refresh();
  };

  const saveAsTemplate = async () => {
    const name = tplName.trim();
    if (!name) { toast.error('Informe um nome para o modelo.'); return; }
    const labels = (editing ? items : checklist).map(i => i.label.trim()).filter(Boolean);
    if (labels.length === 0) { toast.error('Sem etapas para salvar.'); return; }
    const { error } = await supabase.from('post_sale_checklist_templates').insert({
      franchise_id: franchiseId,
      name,
      items: labels,
    });
    if (error) { toast.error('Erro ao salvar modelo.'); return; }
    toast.success('Modelo salvo!');
    setSaveTplOpen(false);
    setTplName('');
    queryClient.invalidateQueries({ queryKey: ['post-sale-checklist-templates', franchiseId] });
  };

  const setAsDefault = async (tpl: Template) => {
    // Clear current default first
    await supabase.from('post_sale_checklist_templates')
      .update({ is_default: false })
      .eq('franchise_id', franchiseId)
      .eq('is_default', true);
    const { error } = await supabase.from('post_sale_checklist_templates')
      .update({ is_default: true })
      .eq('id', tpl.id);
    if (error) { toast.error('Erro ao definir padrão.'); return; }
    toast.success(`"${tpl.name}" definido como padrão.`);
    queryClient.invalidateQueries({ queryKey: ['post-sale-checklist-templates', franchiseId] });
  };

  const deleteTemplate = async (tpl: Template) => {
    if (!confirm(`Excluir o modelo "${tpl.name}"?`)) return;
    await supabase.from('post_sale_checklist_templates').delete().eq('id', tpl.id);
    toast.success('Modelo excluído.');
    queryClient.invalidateQueries({ queryKey: ['post-sale-checklist-templates', franchiseId] });
  };

  const displayItems = editing ? items : checklist;

  return (
    <Card className="glass-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Etapas da Instalação</h3>
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <>
                <span className="text-xs font-semibold text-muted-foreground mr-1">
                  {completedCount}/{checklist.length}
                </span>
                <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1">
                      <LayoutTemplate className="w-3.5 h-3.5" />
                      Modelos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Modelos de checklist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {templates.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Nenhum modelo salvo ainda. Personalize as etapas e use "Salvar modelo" para reutilizar depois.
                        </p>
                      )}
                      {templates.map(tpl => (
                        <div key={tpl.id} className="border rounded-xl p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold truncate">{tpl.name}</p>
                                {tpl.is_default && (
                                  <Badge variant="secondary" className="text-[10px] gap-1">
                                    <Star className="w-3 h-3 fill-current" /> Padrão
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{tpl.items.length} etapa(s)</p>
                            </div>
                            <div className="flex gap-1">
                              {!tpl.is_default && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setAsDefault(tpl)} title="Definir como padrão">
                                  <Star className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteTemplate(tpl)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          <Button size="sm" className="w-full h-8 text-xs" onClick={() => applyTemplate(tpl)}>
                            Aplicar este modelo
                          </Button>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
              </>
            )}
            {editing && (
              <>
                <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1">
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      Salvar modelo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Salvar como modelo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <label className="text-xs font-medium">Nome do modelo</label>
                      <Input
                        value={tplName}
                        onChange={e => setTplName(e.target.value)}
                        placeholder="Ex: Piscina pequena padrão"
                        maxLength={80}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        {(editing ? items : checklist).filter(i => i.label.trim()).length} etapa(s) serão salvas.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveTplOpen(false)}>Cancelar</Button>
                      <Button onClick={saveAsTemplate}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancelEdit}>
                  Cancelar
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs gap-1" onClick={saveEdits}>
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </Button>
              </>
            )}
          </div>
        </div>

        {!editing && (
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="space-y-2">
          {displayItems.map((item, idx) => editing ? (
            <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl border bg-muted/20">
              <div className="flex flex-col">
                <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none text-xs">▲</button>
                <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none text-xs">▼</button>
              </div>
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <Input
                value={item.label}
                onChange={e => updateLabel(item.id, e.target.value)}
                className="h-8 text-sm flex-1"
                maxLength={120}
              />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => removeItem(item.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer",
                item.completed
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                  : "bg-muted/30 border-border/40 hover:bg-muted/50"
              )}
              onClick={() => toggleItem(item)}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                item.completed ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"
              )}>
                {item.completed && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={cn(
                "text-sm flex-1",
                item.completed ? "line-through text-muted-foreground" : "text-foreground"
              )}>
                {item.label}
              </span>
              {item.completed && item.completed_at && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(item.completed_at), "dd/MM", { locale: ptBR })}
                </span>
              )}
            </div>
          ))}

          {editing && (
            <div className="flex gap-2 pt-1">
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                placeholder="Adicionar nova etapa..."
                className="h-9 text-sm"
                maxLength={120}
              />
              <Button size="sm" onClick={addItem} disabled={!newLabel.trim()} className="gap-1 shrink-0">
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </Button>
            </div>
          )}

          {displayItems.length === 0 && !editing && (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhuma etapa configurada.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
