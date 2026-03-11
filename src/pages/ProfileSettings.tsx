import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Save, User, Mail, Phone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logoSplash from '@/assets/logo-splash.png';

export default function ProfileSettings() {
  const { user, role, franchiseId } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [franchiseName, setFranchiseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isFranchise = role === 'franquia' && !!franchiseId;
  const isAdmin = role === 'admin_fabrica';

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user, franchiseId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Load profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (profile?.full_name) setFullName(profile.full_name);

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
        .update({ full_name: fullName.trim() || null })
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
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="rounded-xl gap-1.5" aria-label="Voltar">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={logoSplash} alt="Splash" className="w-12" />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Configurações do Perfil</h1>
            <p className="text-xs text-muted-foreground">Gerencie suas informações pessoais</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
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

        {/* Franchise contact info */}
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

        {/* Save button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
