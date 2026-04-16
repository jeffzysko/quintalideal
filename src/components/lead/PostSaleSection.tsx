import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Star, Save, Plus, Wrench, CheckCircle2, CalendarDays, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  agendado: { label: 'Agendado', emoji: '📅', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
  em_instalacao: { label: 'Em instalacao', emoji: '🔧', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  concluido: { label: 'Concluido', emoji: '✅', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
  pausado: { label: 'Pausado', emoji: '⏸', color: 'text-muted-foreground', bgColor: 'bg-muted border-border' },
};

interface PostSaleSectionProps {
  leadId: string;
  franchiseId: string;
}

export function PostSaleSection({ leadId, franchiseId }: PostSaleSectionProps) {
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['post-sale-project', leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from('post_sale_projects')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('post_sale_projects').insert({
        lead_id: leadId,
        franchise_id: franchiseId,
        status: 'agendado',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Acompanhamento pos-venda iniciado!');
      queryClient.invalidateQueries({ queryKey: ['post-sale-project', leadId] });
    },
    onError: () => toast.error('Erro ao iniciar acompanhamento.'),
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-5">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Venda concluida!</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-[280px]">
            Inicie o acompanhamento pos-venda para registrar a instalacao e coletar a avaliacao do cliente.
          </p>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-2">
            <Plus className="w-4 h-4" />
            Iniciar acompanhamento pos-venda
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <PostSaleForm project={project} />;
}

interface PostSaleProject {
  id: string;
  lead_id: string;
  franchise_id: string;
  status: string;
  installation_date: string | null;
  completion_date: string | null;
  responsible_name: string | null;
  satisfaction_rating: number | null;
  satisfaction_note: string | null;
  internal_notes: string | null;
}

function PostSaleForm({ project }: { project: PostSaleProject }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(project.status);
  const [installDate, setInstallDate] = useState<Date | undefined>(project.installation_date ? new Date(project.installation_date) : undefined);
  const [completionDate, setCompletionDate] = useState<Date | undefined>(project.completion_date ? new Date(project.completion_date) : undefined);
  const [responsible, setResponsible] = useState(project.responsible_name || '');
  const [rating, setRating] = useState(project.satisfaction_rating || 0);
  const [satisfactionNote, setSatisfactionNote] = useState(project.satisfaction_note || '');
  const [internalNotes, setInternalNotes] = useState(project.internal_notes || '');
  const [saving, setSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.agendado;

  const saveProject = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('post_sale_projects')
      .update({
        status,
        installation_date: installDate ? format(installDate, 'yyyy-MM-dd') : null,
        completion_date: status === 'concluido' && completionDate ? format(completionDate, 'yyyy-MM-dd') : null,
        responsible_name: responsible.trim() || null,
      })
      .eq('id', project.id);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar.'); return; }
    toast.success('Projeto atualizado!');
    queryClient.invalidateQueries({ queryKey: ['post-sale-project', project.lead_id] });
    queryClient.invalidateQueries({ queryKey: ['post-sale-overview'] });
  };

  const saveRating = async () => {
    if (rating === 0) { toast.error('Selecione uma avaliacao.'); return; }
    const { error } = await supabase
      .from('post_sale_projects')
      .update({ satisfaction_rating: rating, satisfaction_note: satisfactionNote.trim() || null })
      .eq('id', project.id);
    if (error) { toast.error('Erro ao salvar avaliacao.'); return; }
    toast.success('Avaliacao salva!');
    queryClient.invalidateQueries({ queryKey: ['post-sale-project', project.lead_id] });
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    const { error } = await supabase
      .from('post_sale_projects')
      .update({ internal_notes: internalNotes.trim() || null })
      .eq('id', project.id);
    setSavingNotes(false);
    if (error) { toast.error('Erro ao salvar notas.'); return; }
    toast.success('Notas salvas!');
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Status do Projeto</h3>
          </div>

          <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border text-xs`} variant="outline">
            {statusInfo.emoji} {statusInfo.label}
          </Badge>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <SelectItem key={val} value={val}>
                  <span className="flex items-center gap-2">
                    <span>{cfg.emoji}</span>
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Installation date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Data prevista de instalacao</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !installDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {installDate ? format(installDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={installDate} onSelect={setInstallDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Completion date */}
          {status === 'concluido' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Data de conclusao</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !completionDate && "text-muted-foreground")}>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {completionDate ? format(completionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={completionDate} onSelect={setCompletionDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Responsible */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Responsavel pela instalacao</label>
            <Input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nome do instalador" className="bg-muted/50" maxLength={200} />
          </div>

          <Button onClick={saveProject} disabled={saving} className="w-full gap-2">
            {saving ? <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar projeto'}
          </Button>
        </CardContent>
      </Card>

      {/* Satisfaction - only when concluido */}
      {status === 'concluido' && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Como foi a experiencia do cliente?</h3>
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 active:scale-95"
                  aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                >
                  <Star className={cn("w-8 h-8 transition-colors", star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                </button>
              ))}
              {rating > 0 && <span className="text-sm font-semibold text-foreground ml-2">{rating}/5</span>}
            </div>

            <Textarea
              value={satisfactionNote}
              onChange={e => setSatisfactionNote(e.target.value)}
              rows={3}
              placeholder="Observacoes sobre a avaliacao do cliente..."
              className="bg-muted/50 resize-none"
              maxLength={1000}
            />

            <Button onClick={saveRating} variant="outline" className="w-full gap-2">
              <Save className="w-4 h-4" />
              Salvar avaliacao
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Internal notes - always visible */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Notas internas</h3>
          </div>

          <Textarea
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            rows={3}
            placeholder="Anotacoes internas sobre a instalacao..."
            className="bg-muted/50 resize-none"
            maxLength={2000}
          />

          <Button onClick={saveNotes} disabled={savingNotes} variant="outline" className="w-full gap-2">
            {savingNotes ? <div className="animate-spin w-4 h-4 border-2 border-foreground border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
            {savingNotes ? 'Salvando...' : 'Salvar notas'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
