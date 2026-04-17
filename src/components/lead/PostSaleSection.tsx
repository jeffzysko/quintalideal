import { useState, useRef, useEffect } from 'react';
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
import {
  CalendarIcon, Star, Save, Plus, Wrench, CheckCircle2, CalendarDays, HelpCircle,
  ListChecks, Check, Image as ImageIcon, Camera, ShieldCheck, X, Loader2,
  Link2, Copy, Users, MessageCircle,
} from 'lucide-react';
import { toWhatsAppPhone } from '@/lib/phone-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  agendado: { label: 'Agendado', emoji: '📅', color: 'text-primary', bgColor: 'bg-primary/10 border-primary/20' },
  em_instalacao: { label: 'Em instalacao', emoji: '🔧', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  concluido: { label: 'Concluido', emoji: '✅', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
  pausado: { label: 'Pausado', emoji: '⏸', color: 'text-muted-foreground', bgColor: 'bg-muted border-border' },
};

const DEFAULT_CHECKLIST = [
  'Visita técnica realizada',
  'Material confirmado e separado',
  'Escavação / preparo do terreno',
  'Estrutura da piscina montada',
  'Instalação hidráulica e elétrica',
  'Acabamento e impermeabilização',
  'Enchimento e teste de água',
  'Entrega e orientação ao cliente',
];

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
      const { data: proj, error } = await supabase
        .from('post_sale_projects')
        .insert({ lead_id: leadId, franchise_id: franchiseId, status: 'agendado' })
        .select('id')
        .single();
      if (error) throw error;

      await supabase.from('post_sale_checklist').insert(
        DEFAULT_CHECKLIST.map((label, position) => ({
          project_id: proj.id,
          label,
          position,
        }))
      );
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

  return <PostSaleForm project={project as PostSaleProject} />;
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
  warranty_months: number | null;
  warranty_notes: string | null;
  final_photo_urls: string[] | null;
  final_value: number | null;
  review_token: string | null;
  would_recommend: boolean | null;
}

interface ChecklistItem {
  id: string;
  project_id: string;
  label: string;
  completed: boolean;
  completed_at: string | null;
  position: number;
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
  const [warrantyMonths, setWarrantyMonths] = useState<number | null>(project.warranty_months ?? null);
  const [warrantyNotes, setWarrantyNotes] = useState(project.warranty_notes || '');
  const [finalValue, setFinalValue] = useState<number | null>(project.final_value ?? null);
  const [finalPhotos, setFinalPhotos] = useState<string[]>(project.final_photo_urls || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [reviewToken, setReviewToken] = useState<string | null>(project.review_token);
  const [sendingReview, setSendingReview] = useState(false);
  const finalPhotoRef = useRef<HTMLInputElement>(null);

  // Fetch lead + franchise info for WhatsApp messages
  const { data: leadInfo } = useQuery({
    queryKey: ['post-sale-lead-info', project.lead_id, project.franchise_id],
    queryFn: async () => {
      const [leadRes, franRes] = await Promise.all([
        supabase.from('leads').select('nome, telefone').eq('id', project.lead_id).maybeSingle(),
        supabase.from('franchises').select('slug_url').eq('id', project.franchise_id).maybeSingle(),
      ]);
      return {
        nome: leadRes.data?.nome || 'cliente',
        telefone: leadRes.data?.telefone || '',
        slug: franRes.data?.slug_url || '',
      };
    },
  });

  useEffect(() => {
    setFinalPhotos(project.final_photo_urls || []);
  }, [project.final_photo_urls]);

  useEffect(() => {
    setReviewToken(project.review_token);
  }, [project.review_token]);

  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.agendado;

  const { data: checklist = [] } = useQuery({
    queryKey: ['post-sale-checklist', project.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('post_sale_checklist')
        .select('*')
        .eq('project_id', project.id)
        .order('position');
      return (data || []) as ChecklistItem[];
    },
  });

  const completedCount = checklist.filter(c => c.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  const toggleChecklistItem = async (item: ChecklistItem) => {
    const newVal = !item.completed;
    const { error } = await supabase
      .from('post_sale_checklist')
      .update({
        completed: newVal,
        completed_at: newVal ? new Date().toISOString() : null,
      })
      .eq('id', item.id);
    if (error) { toast.error('Erro ao atualizar etapa.'); return; }
    queryClient.invalidateQueries({ queryKey: ['post-sale-checklist', project.id] });
    const allDone = checklist.every(c => c.id === item.id ? newVal : c.completed);
    if (allDone && newVal) toast.success('Todas etapas concluídas! Lembre de atualizar o status para Concluído.');
  };

  const saveProject = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('post_sale_projects')
      .update({
        status,
        installation_date: installDate ? format(installDate, 'yyyy-MM-dd') : null,
        completion_date: status === 'concluido' && completionDate ? format(completionDate, 'yyyy-MM-dd') : null,
        responsible_name: responsible.trim() || null,
        warranty_months: warrantyMonths ?? null,
        warranty_notes: warrantyNotes.trim() || null,
        final_value: finalValue ?? null,
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

  const handleFinalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = 6 - finalPhotos.length;
    const toUpload = files.slice(0, remaining);
    setUploadingPhoto(true);
    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: máx 10MB`);
          continue;
        }
        const ext = file.name.split('.').pop();
        const path = `postsale/${project.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('quintal-photos').upload(path, file);
        if (upErr) { toast.error('Erro ao enviar foto'); continue; }
        const { data: pub } = supabase.storage.from('quintal-photos').getPublicUrl(path);
        uploaded.push(pub.publicUrl);
      }
      if (uploaded.length > 0) {
        const newList = [...finalPhotos, ...uploaded];
        const { error } = await supabase
          .from('post_sale_projects')
          .update({ final_photo_urls: newList })
          .eq('id', project.id);
        if (error) { toast.error('Erro ao salvar fotos'); }
        else {
          setFinalPhotos(newList);
          toast.success(`${uploaded.length} foto(s) adicionada(s)`);
          queryClient.invalidateQueries({ queryKey: ['post-sale-project', project.lead_id] });
        }
      }
    } finally {
      setUploadingPhoto(false);
      if (finalPhotoRef.current) finalPhotoRef.current.value = '';
    }
  };

  const removeFinalPhoto = async (url: string) => {
    const newList = finalPhotos.filter(u => u !== url);
    const { error } = await supabase
      .from('post_sale_projects')
      .update({ final_photo_urls: newList })
      .eq('id', project.id);
    if (error) { toast.error('Erro ao remover'); return; }
    setFinalPhotos(newList);
    queryClient.invalidateQueries({ queryKey: ['post-sale-project', project.lead_id] });
  };

  const warrantyExpiry = warrantyMonths && completionDate ? addMonths(completionDate, warrantyMonths) : null;

  return (
    <div className="space-y-4">
      {/* Status */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Status do Projeto</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[220px]">Acompanhe a instalacao apos o fechamento da venda</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

          {/* Final value */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Valor final da venda</label>
            <Input
              type="number"
              value={finalValue ?? ''}
              onChange={e => setFinalValue(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="R$ 0,00"
              className="h-10 rounded-xl bg-muted/50"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Para comparar com o orçamento inicial</p>
          </div>

          <Button onClick={saveProject} disabled={saving} className="w-full gap-2">
            {saving ? <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar projeto'}
          </Button>
        </CardContent>
      </Card>

      {/* Warranty */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Garantia</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prazo de garantia</label>
              <Select value={warrantyMonths?.toString() || ''} onValueChange={v => setWarrantyMonths(Number(v))}>
                <SelectTrigger className="h-10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">1 ano</SelectItem>
                  <SelectItem value="24">2 anos</SelectItem>
                  <SelectItem value="36">3 anos</SelectItem>
                  <SelectItem value="60">5 anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              {warrantyExpiry && (
                <div className="flex flex-col justify-center h-full pt-5">
                  <p className="text-xs text-muted-foreground">Vence em</p>
                  <p className="text-sm font-semibold text-foreground">
                    {format(warrantyExpiry, "MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">O que cobre</label>
            <Textarea
              value={warrantyNotes}
              onChange={e => setWarrantyNotes(e.target.value)}
              placeholder="Ex: Estrutura da piscina, bomba e filtro..."
              rows={2}
              className="resize-none rounded-xl text-sm bg-muted/50"
              maxLength={1000}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">Salve junto com o projeto acima.</p>
        </CardContent>
      </Card>

      {/* Installation Checklist */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">Etapas da Instalação</h3>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {completedCount}/{checklist.length}
            </span>
          </div>

          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-2">
            {checklist.map(item => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer",
                  item.completed
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-muted/30 border-border/40 hover:bg-muted/50"
                )}
                onClick={() => toggleChecklistItem(item)}
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
            {checklist.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhuma etapa configurada.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Final result photos */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Fotos do Resultado</h3>
            <span className="text-xs text-muted-foreground ml-auto">({finalPhotos.length}/6)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Registre a piscina instalada — essas fotos podem ser usadas como portfólio e prova social.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {finalPhotos.map((url, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square border border-border/40 group">
                <img src={url} alt={`Resultado ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFinalPhoto(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 border border-border opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Remover foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {finalPhotos.length < 6 && (
              <button
                onClick={() => finalPhotoRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 aspect-square text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                <span className="text-[10px]">{uploadingPhoto ? 'Enviando' : 'Foto'}</span>
              </button>
            )}
          </div>
          <input
            ref={finalPhotoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFinalPhotoUpload}
          />
        </CardContent>
      </Card>

      {/* Satisfaction via WhatsApp - only when concluido */}
      {status === 'concluido' && (
        <Card className="glass-card border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Pesquisa de Satisfação</h3>
            </div>

            {project.satisfaction_rating ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn("w-5 h-5", s <= (project.satisfaction_rating || 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                  ))}
                  <span className="text-sm font-bold ml-1 text-foreground">{project.satisfaction_rating}/5</span>
                </div>
                {project.satisfaction_note && (
                  <p className="text-sm text-muted-foreground italic">"{project.satisfaction_note}"</p>
                )}
                {project.would_recommend !== null && (
                  <Badge variant="outline" className="text-xs">
                    {project.would_recommend ? '👍 Recomendaria' : '👎 Não recomendaria'}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Envie um link por WhatsApp para o cliente avaliar a experiência em 30 segundos.
                </p>

                {reviewToken && (
                  <div className="flex items-center gap-2 p-2.5 bg-background rounded-xl border border-border/40">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      quintalideal.com.br/avaliar/{reviewToken}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/avaliar/${reviewToken}`);
                        toast.success('Link copiado!');
                      }}
                      aria-label="Copiar link"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                )}

                <Button
                  className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={async () => {
                    if (!leadInfo?.telefone) { toast.error('Lead sem telefone cadastrado.'); return; }
                    setSendingReview(true);
                    let token = reviewToken;
                    if (!token) {
                      const { data, error } = await supabase
                        .from('post_sale_reviews')
                        .insert({ project_id: project.id })
                        .select('token')
                        .single();
                      if (error || !data) { setSendingReview(false); toast.error('Erro ao gerar link.'); return; }
                      token = data.token;
                      setReviewToken(token);
                      await supabase.from('post_sale_projects').update({ review_token: token }).eq('id', project.id);
                    }
                    const link = `${window.location.origin}/avaliar/${token}`;
                    const msg = encodeURIComponent(
                      `Olá ${leadInfo.nome}! 🌊\n\nA piscina ficou pronta! Adoraríamos saber sua opinião sobre a experiência.\n\nLeva menos de 1 minuto:\n👉 ${link}\n\nObrigado pela confiança! 🙏`
                    );
                    window.open(`https://wa.me/${toWhatsAppPhone(leadInfo.telefone)}?text=${msg}`, '_blank');
                    setSendingReview(false);
                    toast.success('Mensagem aberta no WhatsApp!');
                  }}
                  disabled={sendingReview || !leadInfo?.telefone}
                >
                  <MessageCircle className="w-4 h-4" />
                  {sendingReview ? 'Gerando link...' : 'Enviar pesquisa por WhatsApp'}
                </Button>

                {!leadInfo?.telefone && (
                  <p className="text-xs text-destructive text-center">Lead sem telefone cadastrado.</p>
                )}

                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Registrar avaliação manualmente</summary>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 transition-transform hover:scale-110 active:scale-95"
                          aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                        >
                          <Star className={cn("w-7 h-7 transition-colors", star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={satisfactionNote}
                      onChange={e => setSatisfactionNote(e.target.value)}
                      rows={2}
                      placeholder="Observações..."
                      className="bg-muted/50 resize-none text-sm"
                      maxLength={1000}
                    />
                    <Button onClick={saveRating} variant="outline" size="sm" className="w-full gap-2">
                      <Save className="w-3.5 h-3.5" />
                      Salvar avaliação
                    </Button>
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referral program - when satisfied */}
      {status === 'concluido' && (project.satisfaction_rating || 0) >= 4 && (
        <Card className="glass-card border-emerald-200/50 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Cliente satisfeito → Peça indicações!
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {leadInfo?.nome || 'O cliente'} deu {project.satisfaction_rating}⭐ — um ótimo momento para pedir indicações de amigos e familiares.
            </p>
            <Button
              variant="outline"
              className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              disabled={!leadInfo?.telefone}
              onClick={() => {
                if (!leadInfo?.telefone) return;
                const link = leadInfo.slug
                  ? `${window.location.origin}/${leadInfo.slug}`
                  : window.location.origin;
                const msg = encodeURIComponent(
                  `Olá ${leadInfo.nome}! 😊\n\nFicamos muito felizes com sua avaliação!\n\nVocê conhece alguém que também sonha com uma piscina? Adoraríamos ajudar!\n\nSe puder indicar, é só compartilhar nosso link:\n👉 ${link}\n\nObrigado! 🏊`
                );
                window.open(`https://wa.me/${toWhatsAppPhone(leadInfo.telefone)}?text=${msg}`, '_blank');
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Pedir indicação por WhatsApp
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Internal notes */}
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
