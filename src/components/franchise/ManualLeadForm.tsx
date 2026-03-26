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

const TEMP_OPTIONS: { value: LeadTemperature | ''; label: string; emoji: string }[] = [
  { value: '', label: 'Automático', emoji: '🤖' },
  { value: 'quente', label: 'Quente', emoji: '🔥' },
  { value: 'morno', label: 'Morno', emoji: '☀️' },
  { value: 'frio', label: 'Frio', emoji: '❄️' },
];

interface ManualLeadFormProps {
  franchiseId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ManualLeadForm({ franchiseId, trigger, onSuccess }: ManualLeadFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showClassification, setShowClassification] = useState(false);
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
    setMoradia(''); setTempOverride(''); setShowClassification(false);
    setDuplicateWarning(null);
  }, []);

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

    try {
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
        respostas_questionario: Object.keys(respostas).length > 0 ? respostas : null,
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
