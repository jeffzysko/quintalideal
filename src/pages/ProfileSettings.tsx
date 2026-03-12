import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Save, User, Mail, Phone, Building2, Lock, Eye, EyeOff } from 'lucide-react';
import { FranchiseUsersSection } from '@/components/franchise/FranchiseUsersSection';
import { FranchiseContactSettings } from '@/components/franchise/FranchiseContactSettings';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';

type FranchiseOption = {
  id: string;
  nome_franquia: string;
};

export default function ProfileSettings() {
  const { user, role, franchiseId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [franchiseName, setFranchiseName] = useState('');
  const [availableFranchises, setAvailableFranchises] = useState<FranchiseOption[]>([]);
  const [selectedIntegrationFranchiseId, setSelectedIntegrationFranchiseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scroll to hash anchor after loading
  useEffect(() => {
    if (!loading && location.hash) {
      const el = document.querySelector(location.hash);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, location.hash]);


  const isFranchise = role === 'franquia' && !!franchiseId;
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const integrationFranchiseId = isFranchise
    ? franchiseId
    : isAdmin
      ? selectedIntegrationFranchiseId || null
      : null;

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user, franchiseId, role]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Load profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, telefone')
        .eq('user_id', user!.id)
        .maybeSingle() as { data: { full_name: string | null; telefone: string | null } | null };

      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.telefone) setTelefone(profile.telefone);

      // Load franchise data if franchise user
      if (franchiseId) {
        const { data: franchise } = await supabase
          .from('franchises')
          .select('whatsapp, email, nome_franquia, responsavel')
          .eq('id', franchiseId)
          .maybeSingle();

        if (franchise) {
          setWhatsapp(franchise.whatsapp || '');
          setEmail(franchise.email || '');
          setFranchiseName(franchise.nome_franquia || '');
          if (franchise.responsavel && !profile?.full_name) {
            setFullName(franchise.responsavel);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null, telefone: telefone.trim() || null } as any)
        .eq('user_id', user!.id);

      if (profileError) throw profileError;

      // Update franchise contact info if franchise user
      if (franchiseId) {
        const { error: franchiseError } = await supabase
          .from('franchises')
          .update({
            whatsapp: whatsapp.trim() || null,
            email: email.trim() || null,
            responsavel: fullName.trim() || null,
          })
          .eq('id', franchiseId);

        if (franchiseError) throw franchiseError;
      }

      toast.success('Perfil atualizado com sucesso!');
    } catch (_err) {
      toast.error('Erro ao salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (fullName || user?.email || 'U').substring(0, 2).toUpperCase();

  const backPath = isAdmin ? '/admin' : isFranchise ? '/franquia' : '/painel';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-card/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-border/60" />
          <img src={logoSplash} alt="Splash" className="h-7 md:h-9 shrink-0" />
          <div className="h-5 w-px bg-border/60 hidden sm:block" />
          <span className="text-sm font-semibold text-foreground tracking-tight hidden sm:block">Configurações</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Avatar section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-5">
          <Avatar className="h-20 w-20 border-4 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold text-foreground">{fullName || user?.email}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {franchiseName && (
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {franchiseName}
              </p>
            )}
          </div>
        </motion.div>

        {/* Personal info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Informações Pessoais
              </CardTitle>
              <CardDescription className="text-xs">
                Esses dados são usados para identificar você no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personalPhone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefone pessoal
                </Label>
                <Input
                  id="personalPhone"
                  placeholder="(51) 99999-9999"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginEmail">E-mail de login</Label>
                <Input
                  id="loginEmail"
                  value={user?.email || ''}
                  disabled
                  className="opacity-60"
                />
                <p className="text-xs text-muted-foreground">O e-mail de login não pode ser alterado aqui.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Franchise contact info - visible for franchise users */}
        {isFranchise && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Dados da Franquia
                </CardTitle>
                <CardDescription className="text-xs">
                  Essas informações serão exibidas publicamente ao final do quiz e usadas para receber leads por e-mail.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="franchiseWhatsapp" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> WhatsApp
                  </Label>
                  <Input
                    id="franchiseWhatsapp"
                    placeholder="5551999999999"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                  />
                  <p className="text-xs text-muted-foreground">Número com DDD, apenas dígitos. Ex: 5551999999999</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="franchiseEmail" className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> E-mail para leads
                  </Label>
                  <Input
                    id="franchiseEmail"
                    type="email"
                    placeholder="franquia@splashpiscinas.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Os leads gerados pelo quiz serão enviados para este e-mail.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Admin info card */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Informações do Administrador
                </CardTitle>
                <CardDescription className="text-xs">
                  Você é administrador da fábrica. Use o painel admin para gerenciar franquias e seus dados de contato.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Painel da Fábrica</p>
                    <p className="text-xs text-muted-foreground">Gerencie franquias, leads e configurações de e-mail no painel admin.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Integrations: Meta Pixel + Webhook */}
        {isFranchise && franchiseId && (
          <motion.div id="integracoes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <FranchiseContactSettings franchiseId={franchiseId} />
          </motion.div>
        )}

        {/* Franchise users management */}
        {isFranchise && franchiseId && (
          <FranchiseUsersSection franchiseId={franchiseId} />
        )}

        {/* Password change */}
        <PasswordChangeCard />

        {/* Save button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function PasswordChangeCard() {
  const [_currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (_err) {
      setError('Erro ao alterar a senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Alterar Senha
          </CardTitle>
          <CardDescription className="text-xs">
            Atualize sua senha de acesso ao sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
          <Button onClick={handleChangePassword} disabled={saving || !newPassword} variant="outline" className="gap-2 rounded-xl">
            <Lock className="w-4 h-4" />
            {saving ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
