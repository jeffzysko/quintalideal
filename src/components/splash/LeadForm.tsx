import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { User, Phone, Mail, ArrowRight, AlertCircle, Shield } from 'lucide-react';

interface LeadFormProps {
  onSubmit: (data: { nome: string; telefone: string; email: string }) => void;
  onCheckDuplicate?: (telefone: string, email: string) => Promise<{ duplicate: boolean; field?: string; franchiseName?: string | null }>;
  loading?: boolean;
}

function sanitizeText(input: string): string {
  return input.replace(/[<>'"&]/g, '').trim();
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
    
    const cleanName = sanitizeText(nome);
    if (!cleanName || cleanName.length < 2) newErrors.nome = 'Informe seu nome';
    if (cleanName.length > 100) newErrors.nome = 'Nome muito longo';
    
    const phoneDigits = telefone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) newErrors.telefone = 'Informe um telefone válido';
    
    const cleanEmail = email.trim().slice(0, 255);
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) newErrors.email = 'Email inválido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (onCheckDuplicate) {
      setChecking(true);
      try {
        const result = await onCheckDuplicate(phoneDigits, cleanEmail);
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

    onSubmit({ nome: cleanName, telefone: phoneDigits, email: cleanEmail });
  };

  const isLoading = loading || checking;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen flex flex-col items-center justify-center px-5 sm:px-6 py-10 sm:py-12 gradient-hero"
    >
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl sm:text-2xl font-bold mb-2 tracking-tight text-foreground">
            Quase lá! 🎉
          </h2>
          <p className="text-muted-foreground mb-6 sm:mb-8 text-[13px] sm:text-sm">
            Preencha seus dados para receber sua recomendação personalizada.
          </p>
        </motion.div>

        {duplicateMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 sm:mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/15 flex gap-3 items-start"
            aria-live="polite"
          >
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-[13px] sm:text-sm text-foreground leading-relaxed">{duplicateMsg}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
              <User className="w-4 h-4 text-muted-foreground" /> Nome
            </Label>
            <Input
              value={nome}
              onChange={e => { setNome(e.target.value); setErrors(p => ({ ...p, nome: '' })); setDuplicateMsg(''); }}
              placeholder="Seu nome completo"
              className="py-6 rounded-2xl text-base bg-background border-border"
              maxLength={100}
              autoComplete="name"
            />
            {errors.nome && <p className="text-sm text-destructive mt-1.5">{errors.nome}</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
              <Phone className="w-4 h-4 text-muted-foreground" /> WhatsApp
            </Label>
            <Input
              value={telefone}
              onChange={e => { setTelefone(formatPhone(e.target.value)); setErrors(p => ({ ...p, telefone: '' })); setDuplicateMsg(''); }}
              placeholder="(51) 99999-9999"
              className="py-6 rounded-2xl text-base bg-background border-border"
              type="tel"
              autoComplete="tel"
            />
            {errors.telefone && <p className="text-sm text-destructive mt-1.5">{errors.telefone}</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Label className="flex items-center gap-2 mb-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-muted-foreground" /> Email <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); setDuplicateMsg(''); }}
              placeholder="seu@email.com"
              className="py-6 rounded-2xl text-base bg-background border-border"
              type="email"
              maxLength={255}
              autoComplete="email"
            />
            {errors.email && <p className="text-sm text-destructive mt-1.5">{errors.email}</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 text-base rounded-2xl font-semibold mt-2 gradient-blue hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {isLoading ? (checking ? 'Verificando...' : 'Salvando...') : 'Ver meu resultado'}
              {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </motion.div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Seus dados estão seguros e protegidos</span>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
