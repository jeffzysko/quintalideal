import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, User, Mail, Phone, Building2, Lock, Eye, EyeOff, Camera, MapPin, Shield, Puzzle } from 'lucide-react';
import { FranchiseUsersSection } from '@/components/franchise/FranchiseUsersSection';
import { FranchiseContactSettings } from '@/components/franchise/FranchiseContactSettings';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PanelHeader } from '@/components/PanelHeader';

import { formatPhoneBR, unformatPhone, isValidBRPhone, isValidEmail } from '@/lib/validation';

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
  const [cidadesAtendidas, setCidadesAtendidas] = useState('');
  const [availableFranchises, setAvailableFranchises] = useState<FranchiseOption[]>([]);
  const [selectedIntegrationFranchiseId, setSelectedIntegrationFranchiseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isFranchise = role === 'franquia' && !!franchiseId;
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const integrationFranchiseId = isFranchise
    ? franchiseId
    : isAdmin
      ? selectedIntegrationFranchiseId || null
      : null;

  // Determine default tab from hash
  const getDefaultTab = () => {
    if (location.hash === '#integracoes') return 'integracoes';
    if (location.hash === '#franquia') return 'franquia';
    return 'pessoal';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user, franchiseId, role]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, telefone, avatar_url')
        .eq('user_id', user!.id)
        .maybeSingle() as { data: { full_name: string | null; telefone: string | null; avatar_url: string | null } | null };

      if (profile?.full_name) setFullName(profile.full_name);
      if (profile?.telefone) setTelefone(profile.telefone);
      if ((profile as any)?.avatar_url) setAvatarUrl((profile as any).avatar_url);

      if (franchiseId) {
        const { data: franchise } = await supabase
          .from('franchises')
          .select('whatsapp, email, nome_franquia, responsavel, cidades_atendidas')
          .eq('id', franchiseId)
          .maybeSingle();

        if (franchise) {
          setWhatsapp(franchise.whatsapp || '');
          setEmail(franchise.email || '');
          setFranchiseName(franchise.nome_franquia || '');
          setCidadesAtendidas(((franchise as any).cidades_atendidas || []).join(', '));
          if (franchise.responsavel && !profile?.full_name) {
            setFullName(franchise.responsavel);
          }
        }
      }

      if (isAdmin) {
        const { data: adminFranchises } = await supabase
          .from('franchises')
          .select('id, nome_franquia')
          .order('nome_franquia', { ascending: true });

        const franchisesList = (adminFranchises ?? []) as FranchiseOption[];
        setAvailableFranchises(franchisesList);
        setSelectedIntegrationFranchiseId(current => current || franchisesList[0]?.id || '');
      } else {
        setAvailableFranchises([]);
        setSelectedIntegrationFranchiseId('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};

    if (telefone.trim() && !isValidBRPhone(telefone)) {
      errors.telefone = 'Telefone inválido. Use DDD + número (10 ou 11 dígitos).';
    }

    if (isFranchise) {
      if (whatsapp.trim() && !isValidBRPhone(whatsapp)) {
        errors.whatsapp = 'WhatsApp inválido. Use DDD + número (10 ou 11 dígitos).';
      }
      if (email.trim() && !isValidEmail(email)) {
        errors.email = 'E-mail inválido.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Corrija os campos destacados antes de salvar.');
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null, telefone: telefone.trim() || null } as any)
        .eq('user_id', user!.id);

      if (profileError) throw profileError;

      if (franchiseId) {
        const cidadesArr = cidadesAtendidas
          .split(',')
          .map(c => c.trim())
          .filter(Boolean);

        const { error: franchiseError } = await supabase
          .from('franchises')
          .update({
            whatsapp: whatsapp.trim() ? `55${whatsapp.trim()}` : null,
            email: email.trim() || null,
            responsavel: fullName.trim() || null,
            cidades_atendidas: cidadesArr,
          } as any)
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust } as any)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      toast.success('Foto atualizada com sucesso!');
    } catch (_err) {
      toast.error('Erro ao enviar a foto. Tente novamente.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials = (fullName || user?.email || 'U').substring(0, 2).toUpperCase();
  const backPath = isAdmin ? '/admin' : isFranchise ? '/franquia' : '/painel';

  const showFranchiseTab = isFranchise || isAdmin;
  const showIntegrationsTab = isFranchise || isAdmin;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <PanelHeader title="Configurações">
        <button
          onClick={() => navigate(backPath)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Voltar</span>
        </button>
      </PanelHeader>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <Breadcrumbs items={[
          { label: isAdmin ? 'Admin' : 'Painel', href: backPath },
          { label: 'Configurações' },
        ]} />

        {/* === HERO AVATAR SECTION === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border/40"
          style={{
            background: 'linear-gradient(160deg, #06101f 0%, #0b2a52 35%, #0d3468 60%, #081d38 100%)',
          }}
        >
          <div className="absolute top-[-30px] right-[-20px] w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-[-20px] left-[-15px] w-32 h-32 rounded-full bg-primary/5 blur-2xl" />

          <div className="relative z-10 px-5 py-6 sm:px-8 sm:py-8 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group shrink-0">
              <Avatar className="h-24 w-24 border-4 border-white/10 ring-4 ring-primary/20 shadow-xl shadow-primary/10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
              >
                {uploadingAvatar ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>

            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-white">{fullName || user?.email}</h2>
              <p className="text-sm text-white/50 mt-0.5">{user?.email}</p>
              {(franchiseName || role) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                  {franchiseName && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10">
                      <Building2 className="w-3 h-3" />
                      {franchiseName}
                    </span>
                  )}
                  {role && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/20">
                      <Shield className="w-3 h-3" />
                      {role === 'super_admin' ? 'Super Admin' : role === 'admin_fabrica' ? 'Admin' : 'Franquia'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* === TABS === */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-12 rounded-xl bg-muted/50 border border-border/40 p-1 gap-1">
              <TabsTrigger
                value="pessoal"
                className="flex-1 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted"
              >
                <User className="w-3.5 h-3.5" />
                Pessoal
              </TabsTrigger>
              {showFranchiseTab && (
                <TabsTrigger
                  value="franquia"
                  className="flex-1 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Franquia</span>
                  <span className="sm:hidden">Empresa</span>
                </TabsTrigger>
              )}
              {showIntegrationsTab && (
                <TabsTrigger
                  value="integracoes"
                  className="flex-1 gap-1.5 rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Puzzle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Integrações</span>
                  <span className="sm:hidden">Integr.</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* ──── TAB: PESSOAL ──── */}
            <TabsContent value="pessoal" className="mt-5 space-y-5">
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    Informações Pessoais
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Esses dados são usados para identificar você no sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-medium">Nome completo</Label>
                    <Input
                      id="fullName"
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="personalPhone" className="text-xs font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Telefone pessoal
                    </Label>
                    <Input
                      id="personalPhone"
                      placeholder="(51) 99999-9999"
                      value={formatPhoneBR(telefone)}
                      onChange={e => { setTelefone(unformatPhone(e.target.value)); setFormErrors(p => ({ ...p, telefone: '' })); }}
                      maxLength={16}
                      className="rounded-xl h-11"
                    />
                    {formErrors.telefone && <p className="text-xs text-destructive mt-1">{formErrors.telefone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loginEmail" className="text-xs font-medium">E-mail de login</Label>
                    <Input
                      id="loginEmail"
                      value={user?.email || ''}
                      disabled
                      className="opacity-60 rounded-xl h-11"
                    />
                    <p className="text-[11px] text-muted-foreground">O e-mail de login não pode ser alterado aqui.</p>
                  </div>
                </CardContent>
              </Card>

              <PasswordChangeCard />

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto gap-2 rounded-xl h-11 font-semibold gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.01] transition-all duration-300">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </TabsContent>

            {/* ──── TAB: FRANQUIA ──── */}
            {showFranchiseTab && (
              <TabsContent value="franquia" className="mt-5 space-y-5">
                {isFranchise && (
                  <>
                    <Card className="card-premium">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          Dados da Franquia
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Essas informações serão exibidas publicamente ao final do quiz e usadas para receber leads por e-mail.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="space-y-1.5">
                          <Label htmlFor="franchiseWhatsapp" className="text-xs font-medium flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" /> WhatsApp
                          </Label>
                          <Input
                            id="franchiseWhatsapp"
                            placeholder="(51) 99999-9999"
                            value={formatPhoneBR(whatsapp)}
                            onChange={e => { setWhatsapp(unformatPhone(e.target.value)); setFormErrors(p => ({ ...p, whatsapp: '' })); }}
                            maxLength={16}
                            className="rounded-xl h-11"
                          />
                          {formErrors.whatsapp && <p className="text-xs text-destructive mt-1">{formErrors.whatsapp}</p>}
                          <p className="text-[11px] text-muted-foreground">DDD + número. O código do Brasil (55) é adicionado automaticamente.</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="franchiseEmail" className="text-xs font-medium flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> E-mail para leads
                          </Label>
                          <Input
                            id="franchiseEmail"
                            type="email"
                            placeholder="franquia@splashpiscinas.com"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setFormErrors(p => ({ ...p, email: '' })); }}
                            className="rounded-xl h-11"
                          />
                          {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
                          <p className="text-[11px] text-muted-foreground">Os leads gerados pelo quiz serão enviados para este e-mail.</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cidadesAtendidas" className="text-xs font-medium flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" /> Cidades Atendidas
                          </Label>
                          <Input
                            id="cidadesAtendidas"
                            placeholder="Canoas, Gravataí, Cachoeirinha"
                            value={cidadesAtendidas}
                            onChange={e => setCidadesAtendidas(e.target.value)}
                            className="rounded-xl h-11"
                          />
                          <p className="text-[11px] text-muted-foreground">Separe as cidades por vírgula. A cidade base já é incluída automaticamente.</p>
                        </div>
                      </CardContent>
                    </Card>

                    {franchiseId && <FranchiseUsersSection franchiseId={franchiseId} />}

                    <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto gap-2 rounded-xl h-11 font-semibold gradient-blue glow-blue hover:glow-blue-strong hover:scale-[1.01] transition-all duration-300">
                      <Save className="w-4 h-4" />
                      {saving ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </>
                )}

                {isAdmin && (
                  <Card className="card-premium">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        Informações do Administrador
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Você é administrador da fábrica. Use o painel admin para gerenciar franquias e seus dados de contato.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Painel da Fábrica</p>
                          <p className="text-[11px] text-muted-foreground">Gerencie franquias, leads e configurações de e-mail no painel admin.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* ──── TAB: INTEGRAÇÕES ──── */}
            {showIntegrationsTab && (
              <TabsContent value="integracoes" className="mt-5 space-y-5" id="integracoes">
                {isAdmin && (
                  <Card className="card-premium">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        Integrações da Franquia
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Selecione a franquia para configurar Meta Pixel e Webhook CRM.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Label htmlFor="integration-franchise" className="text-xs font-medium">Franquia</Label>
                      <Select value={selectedIntegrationFranchiseId} onValueChange={setSelectedIntegrationFranchiseId}>
                        <SelectTrigger id="integration-franchise" className="rounded-xl h-11">
                          <SelectValue placeholder="Selecione uma franquia" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFranchises.map((franchise) => (
                            <SelectItem key={franchise.id} value={franchise.id}>
                              {franchise.nome_franquia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">A configuração será salva na franquia selecionada.</p>
                    </CardContent>
                  </Card>
                )}

                {integrationFranchiseId ? (
                  <FranchiseContactSettings franchiseId={integrationFranchiseId} />
                ) : (
                  isAdmin && (
                    <Card className="card-premium">
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">Nenhuma franquia disponível para configurar integrações.</p>
                      </CardContent>
                    </Card>
                  )
                )}
              </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>
    </div>
    </PageTransition>
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
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          Alterar Senha
        </CardTitle>
        <CardDescription className="text-xs">
          Atualize sua senha de acesso ao sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword" className="text-xs font-medium">Nova senha</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="rounded-xl h-11"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirmar nova senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="rounded-xl h-11"
          />
        </div>
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5">{error}</p>}
        <Button onClick={handleChangePassword} disabled={saving || !newPassword} variant="outline" className="gap-2 rounded-xl h-11">
          <Lock className="w-4 h-4" />
          {saving ? 'Alterando...' : 'Alterar senha'}
        </Button>
      </CardContent>
    </Card>
  );
}
