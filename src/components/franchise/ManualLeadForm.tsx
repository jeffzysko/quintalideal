import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import { isValidBRPhone, isValidEmail, formatPhoneBR, unformatPhone } from '@/lib/validation';
import { cn } from '@/lib/utils';

const POOL_MODELS = [
  'Tradicional', 'Nassau', 'Tortuga', 'Bonaire', 'Cancún',
  'Atalaia', 'Farol da Barra', 'Tropical', 'Italiana', 'Navagio',
];

interface ManualLeadFormProps {
  franchiseId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ManualLeadForm({ franchiseId, trigger, onSuccess }: ManualLeadFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [modelo, setModelo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = useCallback(() => {
    setNome('');
    setTelefone('');
    setEmail('');
    setCidade('');
    setModelo('');
    setObservacoes('');
    setErrors({});
  }, []);

  const handlePhoneChange = (val: string) => {
    setTelefone(formatPhoneBR(val));
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = nome.replace(/[<>'"&]/g, '').trim();
    if (!trimmedName || trimmedName.length < 2) newErrors.nome = 'Nome é obrigatório (mínimo 2 caracteres)';

    const digits = unformatPhone(telefone);
    if (!isValidBRPhone(digits)) newErrors.telefone = 'Telefone inválido (DDD + número)';

    const trimmedEmail = email.trim();
    if (trimmedEmail && !isValidEmail(trimmedEmail)) newErrors.email = 'E-mail inválido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});

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
      });

      if (error) throw error;

      // Log activity
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
            Adicione um lead que veio de fora da plataforma ao seu funil de vendas.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-nome">Nome *</Label>
            <Input
              id="ml-nome"
              placeholder="Nome do cliente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={cn(errors.nome && 'border-destructive')}
            />
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
              className={cn(errors.telefone && 'border-destructive')}
            />
            {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-email">E-mail</Label>
            <Input
              id="ml-email"
              type="email"
              placeholder="cliente@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(errors.email && 'border-destructive')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Cidade */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-cidade">Cidade</Label>
            <Input
              id="ml-cidade"
              placeholder="Cidade do cliente"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
          </div>

          {/* Modelo */}
          <div className="space-y-1.5">
            <Label>Modelo de interesse</Label>
            <Select value={modelo} onValueChange={setModelo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {POOL_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="ml-obs">Observações</Label>
            <Textarea
              id="ml-obs"
              placeholder="De onde veio o lead, contexto, etc."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
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
