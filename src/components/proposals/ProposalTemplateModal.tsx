import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FileText, Trash2, Loader2 } from 'lucide-react';
import type { ProposalFormData, ProposalItem } from '@/pages/NewProposal';

interface Template {
  id: string;
  name: string;
  items: ProposalItem[];
  payment_method: string | null;
  payment_conditions: string | null;
  delivery_deadline: string | null;
  notes: string | null;
  created_at: string;
}

// --- Save Template Modal ---
export function SaveTemplateModal({
  open,
  onOpenChange,
  form,
  franchiseId,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: ProposalFormData;
  franchiseId: string;
  userId: string;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('proposal_templates' as any).insert({
      name: name.trim(),
      franchise_id: franchiseId,
      created_by: userId,
      items: form.items as any,
      payment_method: form.payment_method || null,
      payment_conditions: form.payment_conditions || null,
      delivery_deadline: form.delivery_deadline || null,
      notes: form.observations || null,
    });
    setSaving(false);
    if (error) { toast.error('Erro ao salvar template'); return; }
    toast.success('Template salvo com sucesso!');
    onOpenChange(false);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>Dê um nome ao template para reutilizá-lo em futuras propostas.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Ex: Piscina Premium + Instalação" value={name} onChange={(e) => setName(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Salvar Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Load Template Modal ---
export function LoadTemplateModal({
  open,
  onOpenChange,
  franchiseId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  franchiseId: string;
  onSelect: (template: Template) => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('proposal_templates' as any)
        .select('*')
        .order('created_at', { ascending: false });
      setTemplates((data || []) as any);
      setLoading(false);
    };
    load();
  }, [open, franchiseId]);

  const deleteTemplate = async (id: string) => {
    await supabase.from('proposal_templates' as any).delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template excluído');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Carregar Template</DialogTitle>
          <DialogDescription>Selecione um template para preencher a proposta automaticamente.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum template salvo ainda.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.map((t) => (
              <Card key={t.id} className="shadow-sm border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { onSelect(t); onOpenChange(false); }}>
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{(t.items as any[])?.length || 0} itens</p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
