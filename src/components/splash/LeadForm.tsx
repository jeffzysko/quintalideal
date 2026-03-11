import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { User, Phone, Mail, ArrowRight } from 'lucide-react';

interface LeadFormProps {
  onSubmit: (data: { nome: string; telefone: string; email: string }) => void;
  loading?: boolean;
}

export function LeadForm({ onSubmit, loading }: LeadFormProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!nome.trim() || nome.trim().length < 2) newErrors.nome = 'Informe seu nome';
    const phoneDigits = telefone.replace(/\D/g, '');
    if (phoneDigits.length < 10) newErrors.telefone = 'Informe um telefone válido';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email inválido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ nome: nome.trim(), telefone: phoneDigits, email: email.trim() });
  };

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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4" /> Nome
            </Label>
            <Input
              value={nome}
              onChange={e => { setNome(e.target.value); setErrors(p => ({ ...p, nome: '' })); }}
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
              onChange={e => { setTelefone(formatPhone(e.target.value)); setErrors(p => ({ ...p, telefone: '' })); }}
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
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              placeholder="seu@email.com"
              className="py-6 rounded-xl text-base"
              type="email"
              maxLength={255}
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 text-lg rounded-full font-bold mt-4"
          >
            {loading ? 'Salvando...' : 'Ver meu resultado'}
            {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
