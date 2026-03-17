import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { translateAuthError } from '@/lib/auth-errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Check, X, Eye, EyeOff } from 'lucide-react';
import logoSplash from '@/assets/logo-splash.png';

/* ── Password validation rules ── */
const PASSWORD_RULES = [
  { key: 'length', label: 'Pelo menos 6 caracteres', test: (p: string) => p.length >= 6 },
  { key: 'upper', label: 'Uma letra maiúscula', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Uma letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'Um número', test: (p: string) => /\d/.test(p) },
] as const;

function usePasswordStrength(password: string) {
  return useMemo(() => {
    const results = PASSWORD_RULES.map(r => ({ ...r, pass: r.test(password) }));
    const passed = results.filter(r => r.pass).length;
    const allPass = passed === results.length;
    const ratio = passed / results.length;
    const level = ratio === 1 ? 'strong' : ratio >= 0.5 ? 'medium' : 'weak';
    return { results, allPass, level, ratio };
  }, [password]);
}

function PasswordChecklist({ password }: { password: string }) {
  const { results, level, ratio } = usePasswordStrength(password);
  if (!password) return null;

  const barColor = level === 'strong' ? 'bg-emerald-500' : level === 'medium' ? 'bg-amber-500' : 'bg-destructive';
  const levelLabel = level === 'strong' ? 'Forte' : level === 'medium' ? 'Média' : 'Fraca';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2 overflow-hidden"
    >
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className={`text-[11px] font-semibold ${barColor.replace('bg-', 'text-')}`}>
          {levelLabel}
        </span>
      </div>

      {/* Rules checklist */}
      <ul className="space-y-1">
        {results.map(r => (
          <li key={r.key} className="flex items-center gap-1.5 text-xs">
            {r.pass ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            )}
            <span className={r.pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const strength = usePasswordStrength(password);

  const isPreview = searchParams.get('preview') === 'true';

  useEffect(() => {
    if (isPreview) {
      setIsRecovery(true);
      setChecking(false);
      return;
    }

    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    const verifyRecoveryToken = async () => {
      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          type: 'recovery',
          token_hash: tokenHash,
        });

        if (error) {
          setIsRecovery(false);
          setChecking(false);
          return;
        }

        window.history.replaceState({}, '', '/reset-password');
        setIsRecovery(true);
        setChecking(false);
        return;
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
          setChecking(false);
        } else if (event === 'SIGNED_IN' && session && window.location.hash.includes('type=recovery')) {
          setIsRecovery(true);
          setChecking(false);
        }
      });

      const hash = window.location.hash;
      if (hash && hash.includes('type=recovery')) {
        setIsRecovery(true);
        setChecking(false);
      }

      const timeout = setTimeout(() => {
        setChecking(false);
      }, 5000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    const cleanupPromise = verifyRecoveryToken();

    return () => {
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!strength.allPass) {
      setError('A senha não atende a todos os requisitos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(translateAuthError(error.message));
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
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 pr-10 h-11 bg-background/60 border-border/60 focus:border-primary/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    <PasswordChecklist password={password} />
                  </AnimatePresence>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmar senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      placeholder="Repita a senha"
                      className="pl-10 pr-10 h-11 bg-background/60 border-border/60 focus:border-primary/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 ${password === confirmPassword ? 'text-emerald-500' : 'text-destructive'}`}>
                      {password === confirmPassword ? (
                        <><Check className="w-3.5 h-3.5" /> Senhas coincidem</>
                      ) : (
                        <><X className="w-3.5 h-3.5" /> Senhas não coincidem</>
                      )}
                    </p>
                  )}
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
