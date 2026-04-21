import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag, Plus, X, Check, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { name: 'Verde', hex: '#22C55E' },
  { name: 'Azul', hex: '#3B82F6' },
  { name: 'Roxo', hex: '#8B5CF6' },
  { name: 'Rosa', hex: '#EC4899' },
  { name: 'Laranja', hex: '#F97316' },
  { name: 'Amarelo', hex: '#EAB308' },
  { name: 'Vermelho', hex: '#EF4444' },
  { name: 'Cinza', hex: '#64748B' },
];

interface LeadTag {
  id: string;
  name: string;
  color: string;
}

interface LeadTagsSectionProps {
  leadId: string;
  franchiseId: string;
  /** Compact inline mode (sem card e sem título) — ideal para o hero */
  inline?: boolean;
}

export function LeadTagsSection({ leadId, franchiseId, inline = false }: LeadTagsSectionProps) {
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState('');
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

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return franchiseTags;
    return franchiseTags.filter(t => t.name.toLowerCase().includes(q));
  }, [franchiseTags, search]);

  const exactMatch = useMemo(
    () => franchiseTags.some(t => t.name.toLowerCase() === search.trim().toLowerCase()),
    [franchiseTags, search],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['lead-tag-assignments', leadId] });
    queryClient.invalidateQueries({ queryKey: ['lead-tags', franchiseId] });
  };

  const toggleTag = async (tagId: string) => {
    const isAssigned = assignedTagIds.includes(tagId);
    if (isAssigned) {
      const { error } = await supabase
        .from('lead_tag_assignments')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tagId);
      if (error) { toast.error('Erro ao remover etiqueta'); return; }
    } else {
      const { error } = await supabase
        .from('lead_tag_assignments')
        .insert({ lead_id: leadId, tag_id: tagId });
      if (error) { toast.error('Erro ao aplicar etiqueta'); return; }
    }
    invalidate();
  };

  const removeTag = async (tagId: string) => {
    const { error } = await supabase
      .from('lead_tag_assignments')
      .delete()
      .eq('lead_id', leadId)
      .eq('tag_id', tagId);
    if (error) { toast.error('Erro ao remover etiqueta'); return; }
    invalidate();
  };

  const createTag = async () => {
    const name = (newTagName || search).trim();
    if (!name || !franchiseId) return;
    setCreating(true);
    const { data, error } = await supabase.from('lead_tags').insert({
      franchise_id: franchiseId,
      name,
      color: newTagColor,
    }).select('id').single();
    if (error) { toast.error('Erro ao criar etiqueta'); setCreating(false); return; }
    await supabase.from('lead_tag_assignments').insert({ lead_id: leadId, tag_id: data.id });
    setNewTagName('');
    setSearch('');
    setCreating(false);
    invalidate();
    toast.success('Etiqueta criada e aplicada');
  };

  const AddButton = (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium border border-dashed border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/60 hover:bg-primary/5 transition-all"
        >
          <Plus className="w-3 h-3" />
          {assignedTags.length === 0 ? 'Adicionar etiqueta' : 'Etiqueta'}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden" align="start" sideOffset={6}>
        {/* Search */}
        <div className="p-2.5 border-b border-border/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ou criar etiqueta..."
              className="h-9 text-xs pl-8 border-0 bg-muted/40 focus-visible:ring-1"
              maxLength={30}
            />
          </div>
        </div>

        {/* Tag list */}
        <div className="max-h-56 overflow-y-auto p-1.5">
          {filteredTags.length === 0 && !search && (
            <p className="text-xs text-muted-foreground text-center py-4 px-2">
              Nenhuma etiqueta criada ainda. Digite acima para criar a primeira.
            </p>
          )}
          {filteredTags.map(tag => {
            const isAssigned = assignedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors group"
              >
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </span>
                <span className="ml-auto">
                  {isAssigned ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Create new */}
        {search.trim() && !exactMatch && (
          <div className="border-t border-border/40 p-2.5 bg-muted/20">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Criar nova
            </p>
            <div className="flex gap-1 mb-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  onClick={() => setNewTagColor(c.hex)}
                  className={cn(
                    'w-5 h-5 rounded-full transition-all flex items-center justify-center ring-offset-background',
                    newTagColor === c.hex
                      ? 'ring-2 ring-offset-1 ring-foreground scale-110'
                      : 'hover:scale-110',
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                  aria-label={c.name}
                />
              ))}
            </div>
            <Button
              size="sm"
              className="h-8 w-full text-xs"
              disabled={creating}
              onClick={() => { setNewTagName(search); createTag(); }}
            >
              <Plus className="w-3 h-3" /> Criar "{search.trim()}"
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  const tagChips = assignedTags.map(tag => (
    <span
      key={tag.id}
      className="group inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-full text-xs font-medium transition-all hover:shadow-sm"
      style={{
        backgroundColor: tag.color + '18',
        color: tag.color,
        boxShadow: `inset 0 0 0 1px ${tag.color}30`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.name}
      <button
        onClick={() => removeTag(tag.id)}
        className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-current/20 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all"
        title="Remover etiqueta"
        aria-label={`Remover ${tag.name}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  ));

  if (inline) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {tagChips}
        {AddButton}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 p-3">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Etiquetas
        </span>
        {assignedTags.length > 0 && (
          <span className="text-xs text-muted-foreground/60">· {assignedTags.length}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tagChips}
        {AddButton}
      </div>
    </div>
  );
}
