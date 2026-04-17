import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Truck, Compass, Zap, Camera, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Plus, X, ClipboardCheck, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  leadId: string;
  franchiseId: string;
}

type Visit = {
  id?: string;
  lead_id: string;
  franchise_id: string;
  visited_at: string | null;
  visited_by: string | null;
  status: 'pendente' | 'concluida';
  feasibility: 'viavel' | 'viavel_com_ressalvas' | 'inviavel';
  feasibility_notes: string | null;
  general_notes: string | null;
  terrain_type: string | null;
  access_width_cm: number | null;
  access_height_cm: number | null;
  needs_crane: boolean;
  needs_winch: boolean;
  access_notes: string | null;
  pool_position: string | null;
  solar_orientation: string | null;
  distance_from_wall_cm: number | null;
  distance_from_trees_cm: number | null;
  has_slope: boolean;
  slope_notes: string | null;
  position_notes: string | null;
  has_electrical_point: boolean;
  electrical_distance_m: number | null;
  has_water_point: boolean;
  water_distance_m: number | null;
  has_drain: boolean;
  ground_level: string | null;
  infrastructure_notes: string | null;
  visit_photo_urls: string[];
};

const emptyVisit = (leadId: string, franchiseId: string): Visit => ({
  lead_id: leadId,
  franchise_id: franchiseId,
  visited_at: null,
  visited_by: null,
  status: 'pendente',
  feasibility: 'viavel',
  feasibility_notes: null,
  general_notes: null,
  terrain_type: null,
  access_width_cm: null,
  access_height_cm: null,
  needs_crane: false,
  needs_winch: false,
  access_notes: null,
  pool_position: null,
  solar_orientation: null,
  distance_from_wall_cm: null,
  distance_from_trees_cm: null,
  has_slope: false,
  slope_notes: null,
  position_notes: null,
  has_electrical_point: false,
  electrical_distance_m: null,
  has_water_point: false,
  water_distance_m: null,
  has_drain: false,
  ground_level: null,
  infrastructure_notes: null,
  visit_photo_urls: [],
});

const MAX_PHOTOS = 8;

export function TechnicalVisitSection({ leadId, franchiseId }: Props) {
  const qc = useQueryClient();
  const [visit, setVisit] = useState<Visit>(() => emptyVisit(leadId, franchiseId));
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoSaveRef = useRef(true);

  const { data, isLoading } = useQuery({
    queryKey: ['technical-visit', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technical_visits' as any)
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data) {
      setVisit({ ...emptyVisit(leadId, franchiseId), ...data });
    } else {
      setVisit(emptyVisit(leadId, franchiseId));
    }
    skipAutoSaveRef.current = true;
  }, [data, leadId, franchiseId]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Visit) => {
      const { id, ...rest } = payload;
      const upsertPayload = id ? payload : rest;
      const { data, error } = await supabase
        .from('technical_visits' as any)
        .upsert(upsertPayload as any, { onConflict: 'lead_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (saved: any) => {
      qc.setQueryData(['technical-visit', leadId], saved);
      setVisit((v) => ({ ...v, id: saved.id }));
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar visita técnica', { description: err.message });
    },
  });

  // Auto-save on change (debounced)
  const update = <K extends keyof Visit>(key: K, value: Visit[K]) => {
    skipAutoSaveRef.current = false;
    setVisit((v) => ({ ...v, [key]: value }));
  };

  useEffect(() => {
    if (skipAutoSaveRef.current || isLoading) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveMutation.mutate(visit);
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - visit.visit_photo_urls.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      toast.error(`Limite de ${MAX_PHOTOS} fotos atingido.`);
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue;
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `visita-tecnica/${leadId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('quintal-photos').upload(path, file, {
          cacheControl: '31536000',
          upsert: false,
        });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('quintal-photos').getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
      update('visit_photo_urls', [...visit.visit_photo_urls, ...urls]);
      toast.success(`${urls.length} foto(s) enviada(s).`);
    } catch (err: any) {
      toast.error('Erro ao enviar fotos', { description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (url: string) => {
    update('visit_photo_urls', visit.visit_photo_urls.filter((u) => u !== url));
  };

  const canMarkConcluded = useMemo(() => {
    return Boolean(
      visit.terrain_type &&
      visit.pool_position &&
      visit.ground_level &&
      visit.visited_at,
    );
  }, [visit]);

  const toggleStatus = () => {
    update('status', visit.status === 'concluida' ? 'pendente' : 'concluida');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const needsSpecialEquipment = visit.needs_crane || visit.needs_winch;

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5',
              visit.status === 'concluida'
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-warning/10 text-warning border-warning/30',
            )}
          >
            <ClipboardCheck className="w-3 h-3" />
            {visit.status === 'concluida' ? 'Concluída' : 'Pendente'}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5',
              visit.feasibility === 'viavel' && 'bg-success/10 text-success border-success/30',
              visit.feasibility === 'viavel_com_ressalvas' && 'bg-warning/10 text-warning border-warning/30',
              visit.feasibility === 'inviavel' && 'bg-destructive/10 text-destructive border-destructive/30',
            )}
          >
            {visit.feasibility === 'viavel' && <CheckCircle2 className="w-3 h-3" />}
            {visit.feasibility === 'viavel_com_ressalvas' && <AlertTriangle className="w-3 h-3" />}
            {visit.feasibility === 'inviavel' && <XCircle className="w-3 h-3" />}
            {visit.feasibility === 'viavel' && 'Viável'}
            {visit.feasibility === 'viavel_com_ressalvas' && 'Viável com ressalvas'}
            {visit.feasibility === 'inviavel' && 'Inviável'}
          </Badge>
          {saveMutation.isPending && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Salvando…
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="visited_by" className="text-xs text-muted-foreground">Responsável pela visita</Label>
            <Input
              id="visited_by"
              value={visit.visited_by ?? ''}
              onChange={(e) => update('visited_by', e.target.value || null)}
              placeholder="Nome do técnico"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="visited_at" className="text-xs text-muted-foreground">Data da visita</Label>
            <Input
              id="visited_at"
              type="date"
              value={visit.visited_at ? visit.visited_at.slice(0, 10) : ''}
              onChange={(e) => update('visited_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>
        </div>

        <Button
          onClick={toggleStatus}
          disabled={visit.status === 'pendente' && !canMarkConcluded}
          variant={visit.status === 'concluida' ? 'outline' : 'default'}
          className="w-full sm:w-auto"
        >
          <CheckCircle2 className="w-4 h-4" />
          {visit.status === 'concluida' ? 'Reabrir visita' : 'Marcar como concluída'}
        </Button>
      </div>

      {/* Bloco 1 - Acesso e Terreno */}
      <Section icon={Truck} title="Acesso e Terreno">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo de terreno</Label>
          <Select value={visit.terrain_type ?? ''} onValueChange={(v) => update('terrain_type', v || null)}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="areia">Areia</SelectItem>
              <SelectItem value="terra">Terra</SelectItem>
              <SelectItem value="argila">Argila</SelectItem>
              <SelectItem value="pedra">Pedra / rocha</SelectItem>
              <SelectItem value="concreto">Concreto</SelectItem>
              <SelectItem value="misto">Misto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumField label="Largura do acesso" suffix="cm" value={visit.access_width_cm}
            onChange={(v) => update('access_width_cm', v)} />
          <NumField label="Altura livre" suffix="cm" value={visit.access_height_cm}
            onChange={(v) => update('access_height_cm', v)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow label="Precisa de guincho" checked={visit.needs_winch}
            onChange={(v) => update('needs_winch', v)} />
          <ToggleRow label="Precisa de guindaste" checked={visit.needs_crane}
            onChange={(v) => update('needs_crane', v)} />
        </div>

        {needsSpecialEquipment && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-warning mt-0.5" />
            <span>Esta instalação requer equipamento especial. Confirme disponibilidade antes de fechar o pedido.</span>
          </div>
        )}

        <NotesField label="Observações do acesso" value={visit.access_notes}
          onChange={(v) => update('access_notes', v)} />
      </Section>

      {/* Bloco 2 - Posição da Piscina */}
      <Section icon={Compass} title="Posição da Piscina">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Localização no terreno</Label>
            <Select value={visit.pool_position ?? ''} onValueChange={(v) => update('pool_position', v || null)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="frente">Frente da casa</SelectItem>
                <SelectItem value="fundos">Fundos</SelectItem>
                <SelectItem value="lateral">Lateral</SelectItem>
                <SelectItem value="centro_jardim">Centro do jardim</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Orientação solar</Label>
            <Select value={visit.solar_orientation ?? ''} onValueChange={(v) => update('solar_orientation', v || null)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="norte">Norte</SelectItem>
                <SelectItem value="sul">Sul</SelectItem>
                <SelectItem value="leste">Leste</SelectItem>
                <SelectItem value="oeste">Oeste</SelectItem>
                <SelectItem value="nordeste">Nordeste</SelectItem>
                <SelectItem value="noroeste">Noroeste</SelectItem>
                <SelectItem value="sudeste">Sudeste</SelectItem>
                <SelectItem value="sudoeste">Sudoeste</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumField label="Distância da parede" suffix="cm" value={visit.distance_from_wall_cm}
            onChange={(v) => update('distance_from_wall_cm', v)} />
          <NumField label="Distância de árvores" suffix="cm" value={visit.distance_from_trees_cm}
            onChange={(v) => update('distance_from_trees_cm', v)} />
        </div>

        <ToggleRow label="Possui desnível no local?" checked={visit.has_slope}
          onChange={(v) => update('has_slope', v)} />

        {visit.has_slope && (
          <NotesField label="Descrição do desnível" value={visit.slope_notes}
            onChange={(v) => update('slope_notes', v)} />
        )}

        <NotesField label="Observações de posição" value={visit.position_notes}
          onChange={(v) => update('position_notes', v)} />
      </Section>

      {/* Bloco 3 - Infraestrutura */}
      <Section icon={Zap} title="Infraestrutura">
        <div className="space-y-3">
          <ToggleRow label="Tem ponto elétrico próximo" checked={visit.has_electrical_point}
            onChange={(v) => update('has_electrical_point', v)} />
          {visit.has_electrical_point && (
            <NumField label="Distância" suffix="m" value={visit.electrical_distance_m}
              onChange={(v) => update('electrical_distance_m', v)} />
          )}

          <ToggleRow label="Tem ponto de água próximo" checked={visit.has_water_point}
            onChange={(v) => update('has_water_point', v)} />
          {visit.has_water_point && (
            <NumField label="Distância" suffix="m" value={visit.water_distance_m}
              onChange={(v) => update('water_distance_m', v)} />
          )}

          <ToggleRow label="Tem escoamento / ralo" checked={visit.has_drain}
            onChange={(v) => update('has_drain', v)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nível do solo</Label>
          <Select value={visit.ground_level ?? ''} onValueChange={(v) => update('ground_level', v || null)}>
            <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nivelado">Nivelado</SelectItem>
              <SelectItem value="pequeno_desnivel">Pequeno desnível (até 20cm)</SelectItem>
              <SelectItem value="grande_desnivel">Grande desnível (acima de 20cm)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <NotesField label="Observações de infraestrutura" value={visit.infrastructure_notes}
          onChange={(v) => update('infrastructure_notes', v)} />
      </Section>

      {/* Bloco 4 - Fotos */}
      <Section icon={Camera} title={`Fotos da Visita (${visit.visit_photo_urls.length}/${MAX_PHOTOS})`}>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {visit.visit_photo_urls.map((url) => (
            <div key={url} className="relative rounded-xl overflow-hidden border border-border/50 aspect-square">
              <img src={url} alt="Visita técnica" className="w-full h-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-md hover:bg-destructive/90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {visit.visit_photo_urls.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary aspect-square transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
              <span className="text-xs font-medium">{uploading ? 'Enviando…' : 'Adicionar'}</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </Section>

      {/* Rodapé - Viabilidade */}
      <Section icon={ClipboardCheck} title="Parecer Técnico">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FeasibilityCard
            active={visit.feasibility === 'viavel'}
            icon={CheckCircle2}
            tone="success"
            title="Viável"
            description="Instalação pode ser feita normalmente"
            onClick={() => update('feasibility', 'viavel')}
          />
          <FeasibilityCard
            active={visit.feasibility === 'viavel_com_ressalvas'}
            icon={AlertTriangle}
            tone="warning"
            title="Viável com ressalvas"
            description="Instalação possível, mas com condições especiais"
            onClick={() => update('feasibility', 'viavel_com_ressalvas')}
          />
          <FeasibilityCard
            active={visit.feasibility === 'inviavel'}
            icon={XCircle}
            tone="destructive"
            title="Inviável"
            description="Local não permite a instalação neste momento"
            onClick={() => update('feasibility', 'inviavel')}
          />
        </div>

        {(visit.feasibility === 'viavel_com_ressalvas' || visit.feasibility === 'inviavel') && (
          <NotesField
            label="Descreva as condições / motivo"
            value={visit.feasibility_notes}
            onChange={(v) => update('feasibility_notes', v)}
          />
        )}

        <NotesField label="Observações gerais" value={visit.general_notes}
          onChange={(v) => update('general_notes', v)} />
      </Section>

      {/* Sticky save button */}
      <div className="fixed bottom-0 inset-x-0 sm:relative sm:bottom-auto sm:inset-x-auto bg-background/95 backdrop-blur border-t border-border/50 sm:border-0 px-4 pt-3 pb-4 pb-safe sm:p-0 z-20">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => saveMutation.mutate(visit)}
            disabled={saveMutation.isPending}
            className="w-full"
            size="lg"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar visita técnica
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 pb-6 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function NumField({
  label, suffix, value, onChange,
}: { label: string; suffix: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : parseInt(e.target.value, 10) || null)}
          className="pr-10"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function ToggleRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function NotesField({
  label, value, onChange,
}: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        rows={3}
        className="resize-none"
      />
    </div>
  );
}

function FeasibilityCard({
  active, icon: Icon, tone, title, description, onClick,
}: {
  active: boolean;
  icon: any;
  tone: 'success' | 'warning' | 'destructive';
  title: string;
  description: string;
  onClick: () => void;
}) {
  const toneClasses = {
    success: active ? 'border-success bg-success/10' : 'border-border/50 hover:border-success/40',
    warning: active ? 'border-warning bg-warning/10' : 'border-border/50 hover:border-warning/40',
    destructive: active ? 'border-destructive bg-destructive/10' : 'border-border/50 hover:border-destructive/40',
  }[tone];
  const iconColor = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all',
        toneClasses,
      )}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', iconColor)} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </button>
  );
}

export default TechnicalVisitSection;
