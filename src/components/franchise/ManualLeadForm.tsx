import { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Loader2, ChevronDown, AlertTriangle, Camera, Plus, X } from 'lucide-react';
import { isValidBRPhone, isValidEmail, formatPhoneBR, unformatPhone } from '@/lib/validation';
import { classifyLead, LeadTemperature } from '@/lib/leadScoring';
import { cn } from '@/lib/utils';

const POOL_MODELS_FALLBACK = [
  'Tradicional', 'Nassau', 'Tortuga', 'Bonaire', 'Cancún',
  'Atalaia', 'Farol da Barra', 'Tropical', 'Italiana', 'Navagio',
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

const SOURCE_CHIPS = [
  { value: 'presencial', label: 'Loja', emoji: '🏪' },
  { value: 'indicacao', label: 'Indicação', emoji: '🤝' },
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'ligacao', label: 'Ligação', emoji: '📞' },
  { value: 'facebook', label: 'Facebook', emoji: '📘' },
  { value: 'google', label: 'Google', emoji: '🔍' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'outro', label: 'Outro', emoji: '📌' },
];

const TEMP_CHIPS: { value: LeadTemperature | ''; label: string; emoji: string; desc: string }[] = [
  { value: '', label: 'Auto', emoji: '🤖', desc: 'Calculado' },
  { value: 'quente', label: 'Quente', emoji: '🔥', desc: 'Quer agora' },
  { value: 'morno', label: 'Morno', emoji: '☀️', desc: 'Interessado' },
  { value: 'frio', label: 'Frio', emoji: '❄️', desc: 'Pesquisando' },
];

interface ManualLeadFormProps {
  franchiseId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ManualLeadForm({ franchiseId, trigger, onSuccess }: ManualLeadFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [modelo, setModelo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [orcamento, setOrcamento] = useState('');
  const [intencao, setIntencao] = useState('');
  const [espaco, setEspaco] = useState('');
  const [moradia, setMoradia] = useState('');
  const [tempOverride, setTempOverride] = useState<LeadTemperature | ''>('');
  const [leadSource, setLeadSource] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<{ file: File; preview: string }[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: poolModels = POOL_MODELS_FALLBACK } = useQuery({
    queryKey: ['pool-models'],
    queryFn: async () => {
      const { data } = await supabase.from('pool_models').select('nome_modelo').order('nome_modelo');
      const list = data?.map((m) => m.nome_modelo) || [];
      return list.length > 0 ? list : POOL_MODELS_FALLBACK;
    },
    staleTime: 10 * 60 * 1000,
  });

  const preview = useMemo(() => {
    const respostas: Record<string, string> = {};
    if (orcamento) respostas.orcamento = orcamento;
    if (intencao) respostas.intencao = intencao;
    if (espaco) respostas.espaco = espaco;
    if (moradia) respostas.moradia = moradia;
    if (tempOverride) respostas.temperatura_manual = tempOverride;
    return classifyLead(Object.keys(respostas).length > 0 ? respostas : null, null);
  }, [orcamento, intencao, espaco, moradia, tempOverride]);

  const detailsFilledCount = [
    modelo, orcamento, intencao, espaco, moradia, observacoes,
    photoFiles.length > 0 ? 'photos' : '',
  ].filter(Boolean).length;

  const reset = useCallback(() => {
    setNome(''); setTelefone(''); setEmail(''); setCidade('');
    setModelo(''); setObservacoes(''); setErrors({});
    setOrcamento(''); setIntencao(''); setEspaco('');
    setMoradia(''); setTempOverride(''); setLeadSource('');
    setShowDetails(false); setDuplicateWarning(null);
    photoFiles.forEach((f) => URL.revokeObjectURL(f.preview));
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
    setPhotoFiles((prev) => [...prev, ...valid]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoFiles[index].preview);
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
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
        .select('id, nome')
        .eq('telefone', digits)
        .limit(1)
        .maybeSingle();
      if (data) {
        setDuplicateWarning(`Já existe um lead com este telefone${data.nome ? ` (${data.nome})` : ''}.`);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // ignore
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

    const respostas: Record<string, string> = {};
    if (orcamento) respostas.orcamento = orcamento;
    if (intencao) respostas.intencao = intencao;
    if (espaco) respostas.espaco = espaco;
    if (moradia) respostas.moradia = moradia;
    if (tempOverride) respostas.temperatura_manual = tempOverride;

    let pontuacao: number | null = null;
    if (orcamento || intencao || espaco || moradia) {
      let score = 0;
      const maxScore = 10;
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

      const { data: newLead, error } = await supabase.from('leads').insert({
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
      }).select('id').single();

      if (error) throw error;
      const newLeadId = newLead?.id;

      if (user && newLeadId) {
        await supabase.from('lead_activities').insert({
          lead_id: newLeadId,
          activity_type: 'note',
          content: 'Lead cadastrado manualmente pela franquia',
          user_id: user.id,
        });
      }

      toast.success('Lead cadastrado!', {
        description: `${trimmedName} adicionado ao seu funil.`,
        action: newLeadId
          ? { label: 'Ver lead', onClick: () => navigate(`/painel/lead/${newLeadId}`) }
          : undefined,
        duration: 6000,
      });

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
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <SheetTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2 rounded-xl">
            <UserPlus className="w-4 h-4" />
            Novo Lead
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[92dvh] rounded-t-2xl overflow-y-auto p-0 flex flex-col sm:side-right sm:!inset-y-0 sm:!right-0 sm:!left-auto sm:!top-0 sm:!bottom-0 sm:h-full sm:!max-w-[480px] sm:rounded-none sm:!w-[480px]"
      >
        <SheetHeader className="px-5 pt-4 pb-3 border-b border-border/30 space-y-0">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between gap-3">
            <div className="text-left">
              <SheetTitle className="text-lg font-bold">Novo Lead</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cadastre um cliente da loja, ligação ou indicação
              </p>
            </div>
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0', preview.bgColor, preview.color)}>
              <span>{preview.emoji}</span>
              <span>{preview.label}</span>
            </div>
          </div>
        </SheetHeader>

        {/* MODO RÁPIDO */}
        <div className="px-5 py-4 space-y-4 flex-1">
          {/* NOME */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-nome" className="text-sm font-semibold">
              Nome do cliente <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ml-nome"
              placeholder="Ex: Maria Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={cn('h-12 text-base rounded-xl', errors.nome && 'border-destructive')}
              autoFocus
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>

          {/* TELEFONE */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-telefone" className="text-sm font-semibold">
              WhatsApp / Telefone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ml-telefone"
              placeholder="(51) 99999-9999"
              value={telefone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={checkDuplicate}
              inputMode="tel"
              className={cn('h-12 text-base rounded-xl', (errors.telefone || duplicateWarning) && 'border-destructive')}
            />
            {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
            {duplicateWarning && !errors.telefone && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">{duplicateWarning} Você pode continuar.</p>
              </div>
            )}
          </div>

          {/* EMAIL + CIDADE */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ml-email" className="text-sm font-semibold">E-mail</Label>
              <Input
                id="ml-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn('h-12 text-base rounded-xl', errors.email && 'border-destructive')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ml-cidade" className="text-sm font-semibold">Cidade</Label>
              <Input
                id="ml-cidade"
                placeholder="Cidade"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="h-12 text-base rounded-xl"
              />
            </div>
          </div>


          <div className="space-y-2">
            <Label className="text-sm font-semibold">De onde veio este lead?</Label>
            <div className="flex flex-wrap gap-2">
              {SOURCE_CHIPS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setLeadSource(leadSource === o.value ? '' : o.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all',
                    leadSource === o.value
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <span>{o.emoji}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* TEMPERATURA */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Temperatura
              <span className="text-xs font-normal text-muted-foreground ml-2">Como você avalia este lead?</span>
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {TEMP_CHIPS.map((t) => (
                <button
                  key={t.value || 'auto'}
                  type="button"
                  onClick={() => setTempOverride(t.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all',
                    tempOverride === t.value
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <span className="font-semibold">{t.label}</span>
                  <span className="text-[10px] opacity-70">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TOGGLE DETALHES */}
        <div className="px-5">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between py-3 border-t border-border/30 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <ChevronDown className={cn('w-4 h-4 transition-transform', showDetails && 'rotate-180')} />
              {showDetails ? 'Ocultar detalhes' : 'Adicionar detalhes (qualificação, fotos, observações)'}
            </span>
            {detailsFilledCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {detailsFilledCount} preenchido{detailsFilledCount > 1 ? 's' : ''}
              </Badge>
            )}
          </button>
        </div>

        {/* DETALHES */}
        {showDetails && (
          <div className="px-5 pb-4 space-y-4 border-t border-border/30 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Modelo de interesse</Label>
              <Select value={modelo} onValueChange={setModelo}>
                <SelectTrigger className="rounded-xl h-10 text-sm">
                  <SelectValue placeholder="Qual piscina o cliente quer?" />
                </SelectTrigger>
                <SelectContent>
                  {poolModels.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Qualificação do lead
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Orçamento</Label>
                  <Select value={orcamento} onValueChange={setOrcamento}>
                    <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Valor estimado" /></SelectTrigger>
                    <SelectContent>
                      {ORCAMENTO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo</Label>
                  <Select value={intencao} onValueChange={setIntencao}>
                    <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Quando comprar" /></SelectTrigger>
                    <SelectContent>
                      {INTENCAO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Espaço disponível</Label>
                  <Select value={espaco} onValueChange={setEspaco}>
                    <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Tamanho" /></SelectTrigger>
                    <SelectContent>
                      {ESPACO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Situação da casa</Label>
                  <Select value={moradia} onValueChange={setMoradia}>
                    <SelectTrigger className="h-9 text-xs rounded-xl"><SelectValue placeholder="Moradia" /></SelectTrigger>
                    <SelectContent>
                      {MORADIA_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> Fotos do Quintal
                <span className="text-muted-foreground">({photoFiles.length}/4)</span>
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {photoFiles.map((f, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden border aspect-square">
                    <img src={f.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photoFiles.length < 4 && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 aspect-square text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px]">Foto</span>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Observações</Label>
              <Textarea
                placeholder="Contexto da conversa, o que o cliente disse, próximos passos..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                className="rounded-xl resize-none text-sm"
              />
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-background border-t border-border/30 px-5 py-4 mt-auto">
          <Button
            onClick={handleSubmit}
            disabled={saving || !nome.trim() || !telefone.trim()}
            className="w-full h-12 rounded-xl text-base font-semibold gap-2"
            size="lg"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Cadastrar Lead</>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Nome e telefone são obrigatórios. O restante pode ser preenchido depois.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
