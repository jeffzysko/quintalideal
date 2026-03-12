import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[ResetPassword] Auth event:', event);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setChecking(false);
      } else if (event === 'SIGNED_IN' && session) {
        // Sometimes Supabase fires SIGNED_IN instead of PASSWORD_RECOVERY
        // Check if URL has recovery indicators
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) {
          setIsRecovery(true);
          setChecking(false);
        }
      }
    });

    // Also check URL hash for recovery token (Supabase appends it)
    const hash = window.location.hash;
    console.log('[ResetPassword] URL hash:', hash);
    if (hash && hash.includes('type=recovery')) {
      setIsRecovery(true);
      setChecking(false);
    }

    // Also check query params (some flows use query params)
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'recovery') {
      setIsRecovery(true);
      setChecking(false);
    }

    // Fallback: if after 5s no recovery event, show error
    const timeout = setTimeout(() => {
      setChecking(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/painel'), 2500);
    }
  };

  if (checking) {
    return (
      <div className="h-[100dvh] flex items-center justify-center gradient-hero">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="h-[100dvh] relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 gradient-hero" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm mx-4 text-center"
        >
          <img src={logoSplash} alt="Splash Piscinas" className="mx-auto w-28 mb-6 drop-shadow-lg" />
          <div className="glass-card rounded-2xl p-6">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h1 className="text-lg font-bold text-foreground mb-2">Link inválido ou expirado</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Este link de recuperação não é mais válido. Solicite um novo link na tela de login.
            </p>
            <Button onClick={() => navigate('/login')} className="gradient-blue text-primary-foreground rounded-xl">
              Ir para o Login
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <img src={logoSplash} alt="Splash Piscinas" className="mx-auto w-36 mb-3 drop-shadow-lg" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '4rem' }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="h-0.5 mx-auto rounded-full gradient-blue"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 sm:p-8"
        >
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-foreground mb-2">Senha definida!</h1>
              <p className="text-sm text-muted-foreground">
                Redirecionando para o painel...
              </p>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl gradient-blue mb-3 glow-blue">
                  <Lock className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Defina sua senha</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie uma senha segura para acessar o painel
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 h-11 bg-background/60 border-border/60 focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Repita a senha"
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
                      Salvar senha
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
