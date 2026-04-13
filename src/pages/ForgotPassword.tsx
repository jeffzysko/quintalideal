import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import logoQuintalIdeal from '@/assets/logo-quintal-ideal.png';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get('email');
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Informe um e-mail válido.');
      return;
    }

    setLoading(true);

    try {
      const { error: fnError } = await supabase.functions.invoke('send-recovery-email', {
        body: { email: trimmed, siteOrigin: window.location.origin },
      });

      if (fnError) {
        setError('Erro ao enviar e-mail. Tente novamente.');
      } else {
        setSent(true);
        setCooldown(60);
      }
    } catch {
      setError('Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(207 90% 42% / 0.3), transparent 70%)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <motion.div className="text-center mb-8">
          <img src={logoQuintalIdeal} alt="Quintal Ideal" className="mx-auto w-36 mb-3 drop-shadow-lg" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 sm:p-8"
        >
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-foreground mb-2">E-mail enviado!</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Verifique sua caixa de entrada (e o spam) para o link de recuperação.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSent(false);
                    setError('');
                  }}
                  disabled={cooldown > 0}
                  className="rounded-xl gap-2"
                >
                  {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar e-mail'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="rounded-xl gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Login
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl gradient-blue mb-3 glow-blue">
                  <Mail className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Recuperar senha</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Informe seu e-mail para receber o link de recuperação
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="seu@email.com"
                      className="pl-10 h-11 bg-background/60 border-border/60 focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 gradient-blue text-primary-foreground font-semibold rounded-xl glow-blue hover:opacity-90 transition-opacity group"
                  disabled={loading}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    />
                  ) : (
                    <>
                      Enviar link
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>

              <button
                onClick={() => navigate('/login')}
                className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao login
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
