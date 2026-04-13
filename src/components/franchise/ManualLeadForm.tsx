import { useState, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Loader2, ChevronDown, ChevronUp, AlertTriangle, Camera, Plus, X } from 'lucide-react';
import { isValidBRPhone, isValidEmail, formatPhoneBR, unformatPhone } from '@/lib/validation';
import { classifyLead, LeadTemperature } from '@/lib/leadScoring';
import { cn } from '@/lib/utils';

const POOL_MODELS = [
  'Retangular', 'Borda Infinita', 'Prainha', 'Elegance', 'Retangular Plus',
  'Supreme', 'Versátil', 'Confort', 'Family', 'Compacta Premium',
];

const ORCAMENTO_OPTIONS = [
  { value: 'ate-18', label: 'Até R$ 18 mil' },
  { value: '18-30', label: 'R$ 18–30 mil' },
  { value: '30-50', label: 'R$ 30–50 mil' },
];

const INTENCAO_OPTIONS = [
  { value: '2026', label: 'Este ano (2026)' },
  { value: '2026-2027', label: '2026–2027' },
  { value: 'pesquisando', label: 'Apenas pesquisando' },
];

const ESPACO_OPTIONS = [
  { value: 'ate-3', label: 'Até 3m' },
  { value: '3-5', label: '3–5m' },
  { value: '5-7', label: '5–7m' },
  { value: 'mais-7', label: 'Mais de 7m' },
];

const MORADIA_OPTIONS = [
  { value: 'minha', label: 'Casa própria' },
  { value: 'construindo', label: 'Construindo' },
  { value: 'planejando', label: 'Planejando construir' },
];

const TEMP_OPTIONS: { value: LeadTemperature | ''; label: string; emoji: string }[] = [
  { value: '', label: 'Automático', emoji: '🤖' },
  { value: 'quente', label: 'Quente', emoji: '🔥' },
  { value: 'morno', label: 'Morno', emoji: '☀️' },
  { value: 'frio', label: 'Frio', emoji: '❄️' },
];

const LEAD_SOURCE_OPTIONS = [
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'facebook', label: '📘 Facebook' },
  { value: 'google', label: '🔍 Google Ads' },
  { value: 'indicacao', label: '🤝 Indicação' },
  { value: 'organico', label: '🌱 Orgânico' },
  { value: 'tiktok', label: '🎵 TikTok' },
  { value: 'outro', label: '📌 Outro' },
];

interface ManualLeadFormProps {
  franchiseId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ManualLeadForm({ franchiseId, trigger, onSuccess }: ManualLeadFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showClassification, setShowClassification] = useState(true);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [modelo, setModelo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mini-quiz fields
  const [orcamento, setOrcamento] = useState('');
  const [intencao, setIntencao] = useState('');
  const [espaco, setEspaco] = useState('');
  const [moradia, setMoradia] = useState('');
  const [tempOverride, setTempOverride] = useState<LeadTemperature | ''>('');
  const [leadSource, setLeadSource] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<{ file: File; preview: string }[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => {
    const respostas: Record<string, string> = {};
    if (orcamento) respostas.orcamento = orcamento;
    if (intencao) respostas.intencao = intencao;
    if (espaco) respostas.espaco = espaco;
    if (moradia) respostas.moradia = moradia;
    if (tempOverride) respostas.temperatura_manual = tempOverride;
    return classifyLead(Object.keys(respostas).length > 0 ? respostas : null, null);
  }, [orcamento, intencao, espaco, moradia, tempOverride]);

  const reset = useCallback(() => {
    setNome(''); setTelefone(''); setEmail(''); setCidade('');
    setModelo(''); setObservacoes(''); setErrors({});
    setOrcamento(''); setIntencao(''); setEspaco('');
    setMoradia(''); setTempOverride(''); setLeadSource(''); setShowClassification(false);
    setDuplicateWarning(null);
    photoFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setPhotoFiles([]);
  }, [photoFiles]);

  const handlePhotoFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 4 - photoFiles.length;
    const selected = Array.from(files).slice(0, remaining);
    const valid: { file: File; preview: string }[] = [];
    for (const file of selected) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name}: formato não suportado.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: máximo 10MB.`);
        continue;
      }
      valid.push({ file, preview: URL.createObjectURL(file) });
    }
    setPhotoFiles(prev => [...prev, ...valid]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoFiles[index].preview);
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhoneChange = (val: string) => {
    setTelefone(formatPhoneBR(val));
    setDuplicateWarning(null);
  };

  const checkDuplicate = useCallback(async () => {
    const digits = unformatPhone(telefone);
    if (!isValidBRPhone(digits)) return;
    try {
      const { data } = await supabase
        .from('leads')
        .select('id, nome, franquia_id')
        .eq('telefone', digits)
        .limit(1)
        .maybeSingle();
      if (data) {
        setDuplicateWarning(`Já existe um lead com este telefone${data.nome ? ` (${data.nome})` : ''}.`);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // ignore check errors
    }
  }, [telefone]);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = nome.replace(/[<>'"&]/g, '').trim();
    if (!trimmedName || trimmedName.length < 2) newErrors.nome = 'Nome é obrigatório (mínimo 2 caracteres)';

    const digits = unformatPhone(telefone);
    if (!isValidBRPhone(digits)) newErrors.telefone = 'Telefone inválido (DDD + número)';

    const trimmedEmail = email.trim();
    if (trimmedEmail && !isValidEmail(trimmedEmail)) newErrors.email = 'E-mail inválido';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSaving(true);
    setErrors({});

    // Build respostas_questionario from mini-quiz
    const respostas: Record<string, string> = {};
    if (orcamento) respostas.orcamento = orcamento;
    if (intencao) respostas.intencao = intencao;
    if (espaco) respostas.espaco = espaco;
    if (moradia) respostas.moradia = moradia;
    if (tempOverride) respostas.temperatura_manual = tempOverride;

    // Calculate pontuacao_quintal from mini-quiz (0-100 scale)
    let pontuacao: number | null = null;
    if (orcamento || intencao || espaco || moradia) {
      let score = 0;
      const maxScore = 10; // max possible: 3+3+2+1+1 = 10
      if (orcamento === '30-50') score += 3;
      else if (orcamento === '18-30') score += 1;
      if (intencao === '2026') score += 3;
      else if (intencao === '2026-2027') score += 1;
      if (espaco === 'mais-7') score += 2;
      else if (espaco === '5-7') score += 1;
      if (moradia === 'minha') score += 1;
      pontuacao = Math.round((score / maxScore) * 100);
    }

    try {
      // Upload photos first if any
      const photoUrls: string[] = [];
      if (photoFiles.length > 0) {
        for (const { file } of photoFiles) {
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${franchiseId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from('quintal-photos').upload(path, file, {
            cacheControl: '31536000',
            upsert: false,
          });
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage.from('quintal-photos').getPublicUrl(path);
          photoUrls.push(urlData.publicUrl);
        }
      }

      const photoFields: Record<string, string | null> = {
        foto1: photoUrls[0] || null,
        foto2: photoUrls[1] || null,
        foto3: photoUrls[2] || null,
        foto4: photoUrls[3] || null,
      };

      const { error } = await supabase.from('leads').insert({
        nome: trimmedName,
        telefone: digits,
        email: trimmedEmail || null,
        cidade: cidade.trim() || null,
        modelo_recomendado: modelo || null,
        observacoes: observacoes.trim() || null,
        franquia_id: franchiseId,
        origin_franchise_id: franchiseId,
        lead_origin: 'manual',
        status_lead: 'novo',
        pontuacao_quintal: pontuacao,
        respostas_questionario: Object.keys(respostas).length > 0 ? respostas : null,
        utm_source: leadSource || null,
        utm_medium: leadSource ? 'manual_entry' : null,
        ...photoFields,
      });

      if (error) throw error;

      if (user) {
        await supabase.from('lead_activities').insert({
          lead_id: (await supabase.from('leads').select('id').eq('telefone', digits).eq('franquia_id', franchiseId).order('created_at', { ascending: false }).limit(1).single()).data?.id || '',
          activity_type: 'note',
          content: 'Lead cadastrado manualmente pela franquia',
          user_id: user.id,
        }).then(() => {});
      }

      toast.success('Lead cadastrado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['franchise-leads-all', franchiseId] });
      queryClient.invalidateQueries({ queryKey: ['franchise-leads-table', franchiseId] });
      reset();
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error creating manual lead:', err);
      toast.error('Erro ao cadastrar lead. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <UserPlus className="w-4 h-4" />
            Novo Lead
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-primary" />
            Cadastrar Lead Manual
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adicione um lead externo ao seu funil de vendas.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-nome">Nome *</Label>
            <Input id="ml-nome" placeholder="Nome do cliente" value={nome} onChange={(e) => setNome(e.target.value)} className={cn(errors.nome && 'border-destructive')} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-telefone">Telefone *</Label>
            <Input
              id="ml-telefone"
              placeholder="(51) 99999-9999"
              value={telefone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={checkDuplicate}
              className={cn((errors.telefone || duplicateWarning) && 'border-destructive')}
            />
            {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
            {duplicateWarning && !errors.telefone && (
              <Alert variant="destructive" className="py-2 px-3">
                <AlertTriangle className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">
                  {duplicateWarning} Você pode continuar, mas o lead pode ser duplicado.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-email">E-mail</Label>
            <Input id="ml-email" type="email" placeholder="cliente@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={cn(errors.email && 'border-destructive')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Cidade */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-cidade">Cidade</Label>
            <Input id="ml-cidade" placeholder="Cidade do cliente" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>

          {/* Modelo */}
          <div className="space-y-1.5">
            <Label>Modelo de interesse</Label>
            <Select value={modelo} onValueChange={setModelo}>
              <SelectTrigger><SelectValue placeholder="Selecione um modelo (opcional)" /></SelectTrigger>
              <SelectContent>
                {POOL_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Origem do Lead */}
          <div className="space-y-1.5">
            <Label>Origem do Lead</Label>
            <Select value={leadSource || undefined} onValueChange={setLeadSource}>
              <SelectTrigger><SelectValue placeholder="De onde veio este lead?" /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fotos */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Fotos do Quintal
              <span className="text-xs text-muted-foreground">({photoFiles.length}/4)</span>
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {photoFiles.map((f, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-primary/30 aspect-square">
                  <img src={f.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-md"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photoFiles.length < 4 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary aspect-square transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Foto</span>
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-obs">Observações</Label>
            <Textarea id="ml-obs" placeholder="De onde veio o lead, contexto, etc." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
          </div>

          {/* Classification section */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowClassification(!showClassification)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>Temperatura do Lead</span>
                <Badge variant="outline" className={cn('text-xs border', preview.bgColor, preview.color)}>
                  {preview.emoji} {preview.label}
                </Badge>
              </div>
              {showClassification ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {showClassification && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Preencha os campos para calcular a temperatura automaticamente, ou defina manualmente.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Orçamento</Label>
                    <Select value={orcamento} onValueChange={setOrcamento}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {ORCAMENTO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prazo</Label>
                    <Select value={intencao} onValueChange={setIntencao}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {INTENCAO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Espaço disponível</Label>
                    <Select value={espaco} onValueChange={setEspaco}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {ESPACO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Moradia</Label>
                    <Select value={moradia} onValueChange={setMoradia}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {MORADIA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Manual override */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Sobrescrever temperatura</Label>
                  <div className="flex gap-2">
                    {TEMP_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTempOverride(t.value)}
                        className={cn(
                          'flex-1 text-xs py-2 px-1 rounded-lg border transition-colors font-medium',
                          tempOverride === t.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted/50'
                        )}
                      >
                        {t.emoji} {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full rounded-xl" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {saving ? 'Cadastrando...' : 'Cadastrar Lead'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
