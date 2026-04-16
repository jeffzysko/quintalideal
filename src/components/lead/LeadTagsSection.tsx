import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Tag, Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Roxo', hex: '#8B5CF6' },
  { name: 'Laranja', hex: '#F97316' },
  { name: 'Vermelho', hex: '#EF4444' },
];

interface LeadTag {
  id: string;
  name: string;
  color: string;
}

export function LeadTagsSection({ leadId, franchiseId }: { leadId: string; franchiseId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0].hex);
  const [creating, setCreating] = useState(false);

  const { data: franchiseTags = [] } = useQuery({
    queryKey: ['lead-tags', franchiseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_tags')
        .select('id, name, color')
        .eq('franchise_id', franchiseId)
        .order('name');
      return (data || []) as LeadTag[];
    },
    enabled: !!franchiseId,
  });

  const { data: assignedTagIds = [] } = useQuery({
    queryKey: ['lead-tag-assignments', leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_tag_assignments')
        .select('tag_id')
        .eq('lead_id', leadId);
      return (data || []).map((d: any) => d.tag_id as string);
    },
    enabled: !!leadId,
  });

  const assignedTags = franchiseTags.filter(t => assignedTagIds.includes(t.id));
  const unassignedTags = franchiseTags.filter(t => !assignedTagIds.includes(t.id));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['lead-tag-assignments', leadId] });
    queryClient.invalidateQueries({ queryKey: ['lead-tags', franchiseId] });
  };

  const assignTag = async (tagId: string) => {
    const { error } = await supabase.from('lead_tag_assignments').insert({ lead_id: leadId, tag_id: tagId });
    if (error) { toast.error('Erro ao aplicar etiqueta'); return; }
    invalidate();
  };

  const removeTag = async (tagId: string) => {
    const { error } = await supabase.from('lead_tag_assignments').delete().eq('lead_id', leadId).eq('tag_id', tagId);
    if (error) { toast.error('Erro ao remover etiqueta'); return; }
    invalidate();
  };

  const createTag = async () => {
    if (!newTagName.trim() || !franchiseId) return;
    setCreating(true);
    const { data, error } = await supabase.from('lead_tags').insert({
      franchise_id: franchiseId,
      name: newTagName.trim(),
      color: newTagColor,
    }).select('id').single();
    if (error) { toast.error('Erro ao criar etiqueta'); setCreating(false); return; }
    // Auto-assign the new tag
    await supabase.from('lead_tag_assignments').insert({ lead_id: leadId, tag_id: data.id });
    setNewTagName('');
    setCreating(false);
    invalidate();
    toast.success('Etiqueta criada e aplicada!');
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Etiquetas</h2>
          </div>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <p className="text-xs font-semibold text-foreground mb-2">Etiquetas da franquia</p>
              {unassignedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {unassignedTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => assignTag(tag.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md border border-border/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-border/40 pt-2 mt-1">
                <p className="text-[11px] text-muted-foreground mb-2">Criar nova etiqueta</p>
                <div className="flex gap-1.5 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.hex}
                      onClick={() => setNewTagColor(c.hex)}
                      className={cn(
                        "w-7 h-7 rounded-lg border-2 transition-all flex items-center justify-center",
                        newTagColor === c.hex ? "border-foreground scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {newTagColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nome da etiqueta"
                    className="h-8 text-xs"
                    maxLength={30}
                  />
                  <Button size="sm" className="h-8 text-xs shrink-0" disabled={!newTagName.trim() || creating} onClick={createTag}>
                    Criar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {assignedTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {assignedTags.map(tag => (
              <Badge
                key={tag.id}
                variant="outline"
                className="gap-1 text-xs font-medium pr-1 group cursor-default"
                style={{ borderColor: tag.color + '60', backgroundColor: tag.color + '15', color: tag.color }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                {tag.name}
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-0.5 p-0.5 rounded hover:bg-black/10 transition-colors opacity-50 group-hover:opacity-100"
                  title="Remover etiqueta"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma etiqueta aplicada a este lead.</p>
        )}
      </CardContent>
    </Card>
  );
}
