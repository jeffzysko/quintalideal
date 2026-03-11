import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { User, Phone, Mail, ArrowRight, AlertCircle } from 'lucide-react';

interface LeadFormProps {
  onSubmit: (data: { nome: string; telefone: string; email: string }) => void;
  onCheckDuplicate?: (telefone: string, email: string) => Promise<{ duplicate: boolean; field?: string; franchiseName?: string | null }>;
  loading?: boolean;
}

export function LeadForm({ onSubmit, onCheckDuplicate, loading }: LeadFormProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateMsg, setDuplicateMsg] = useState('');
  const [checking, setChecking] = useState(false);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicateMsg('');
    const newErrors: Record<string, string> = {};
    if (!nome.trim() || nome.trim().length < 2) newErrors.nome = 'Informe seu nome';
    const phoneDigits = telefone.replace(/\D/g, '');
    if (phoneDigits.length < 10) newErrors.telefone = 'Informe um telefone válido';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email inválido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Check for duplicates
    if (onCheckDuplicate) {
      setChecking(true);
      try {
        const result = await onCheckDuplicate(phoneDigits, email.trim());
        if (result.duplicate) {
          const franchise = result.franchiseName || 'Splash Piscinas';
          if (result.field === 'telefone') {
            setDuplicateMsg(
              `Olá! Identificamos que esse telefone já está cadastrado na franquia ${franchise}. A equipe da ${franchise} está pronta para te ajudar com o sonho da sua piscina! 🏊`
            );
          } else {
            setDuplicateMsg(
              `Olá! Identificamos que esse e-mail já está cadastrado na franquia ${franchise}. A equipe da ${franchise} está pronta para te ajudar com o sonho da sua piscina! 🏊`
            );
          }
          setChecking(false);
          return;
        }
      } catch {
        // If check fails, proceed with submission
      }
      setChecking(false);
    }

    onSubmit({ nome: nome.trim(), telefone: phoneDigits, email: email.trim() });
  };

  const isLoading = loading || checking;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
    >
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Montserrat' }}>
          Quase lá! 🎉
        </h2>
        <p className="text-muted-foreground mb-8">
          Preencha seus dados para receber sua recomendação personalizada.
        </p>

        {duplicateMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-secondary/10 border border-secondary/30 flex gap-3 items-start"
          >
            <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{duplicateMsg}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4" /> Nome
            </Label>
            <Input
              value={nome}
              onChange={e => { setNome(e.target.value); setErrors(p => ({ ...p, nome: '' })); setDuplicateMsg(''); }}
              placeholder="Seu nome completo"
              className="py-6 rounded-xl text-base"
              maxLength={100}
            />
            {errors.nome && <p className="text-sm text-destructive mt-1">{errors.nome}</p>}
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4" /> WhatsApp
            </Label>
            <Input
              value={telefone}
              onChange={e => { setTelefone(formatPhone(e.target.value)); setErrors(p => ({ ...p, telefone: '' })); setDuplicateMsg(''); }}
              placeholder="(51) 99999-9999"
              className="py-6 rounded-xl text-base"
              type="tel"
            />
            {errors.telefone && <p className="text-sm text-destructive mt-1">{errors.telefone}</p>}
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" /> Email <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); setDuplicateMsg(''); }}
              placeholder="seu@email.com"
              className="py-6 rounded-xl text-base"
              type="email"
              maxLength={255}
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-6 text-lg rounded-full font-bold mt-4"
          >
            {isLoading ? (checking ? 'Verificando...' : 'Salvando...') : 'Ver meu resultado'}
            {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
