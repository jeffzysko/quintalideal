import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, User, Mail, Phone, Building2, Lock, Eye, EyeOff, Camera, MapPin, Shield, Puzzle, Bell, Workflow, Users, Clock, Globe, MessageSquare, Package } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { FranchiseUsersSection } from '@/components/franchise/FranchiseUsersSection';
import { FranchiseContactSettings } from '@/components/franchise/FranchiseContactSettings';
import { PushPermissionCard } from '@/components/notifications/PushPermissionCard';
import { toast } from 'sonner';
import { WhatsAppSettings } from '@/components/admin/WhatsAppSettings';
import { AdminWhatsAppPlans } from '@/components/admin/AdminWhatsAppPlans';
import { WhatsAppInstanceConfig } from '@/components/franchise/WhatsAppInstanceConfig';
import { FranchiseCatalog } from '@/components/franchise/FranchiseCatalog';

import { motion } from 'framer-motion';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PanelHeader } from '@/components/PanelHeader';

import { formatPhoneBR, unformatPhone, isValidBRPhone, isValidEmail } from '@/lib/validation';

type FranchiseOption = {
  id: string;
  nome_franquia: string;
  cidade_base?: string;
};

export default function ProfileSettings() {
  const { user, role, franchiseId } = useAuth();
  
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [franchiseName, setFranchiseName] = useState('');
  const [cidadesAtendidas, setCidadesAtendidas] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [availableFranchises, setAvailableFranchises] = useState<FranchiseOption[]>([]);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isFranchise = role === 'franquia' && !!franchiseId;
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  
  // For admins, use selected franchise; for franchise users, use their own
  const effectiveFranchiseId = isAdmin ? selectedFranchiseId : franchiseId;
  const integrationFranchiseId = effectiveFranchiseId || null;

  // Notification preferences (localStorage per franchise)
  const notifStorageKey = `notif_prefs_${effectiveFranchiseId}`;
  const [notifPrefs, setNotifPrefs] = useState({
    new_lead: true,
    followup_reminder: true,
    lead_inactive: true,
    monthly_report: true,
  });

  // Automation settings (localStorage per franchise)
  const autoStorageKey = `auto_prefs_${effectiveFranchiseId}`;
  const [autoPrefs, setAutoPrefs] = useState({
    auto_contact_reminder: true,
    reminder_hours: 48,
    auto_lost_days: 30,
  });

  // Determine default tab from hash
  const getDefaultTab = () => {
    if (location.hash === '#integracoes') return 'integracoes';
    if (location.hash === '#franquia') return 'franquia';
    if (location.hash === '#notificacoes') return 'notificacoes';
    if (location.hash === '#automacoes') return 'automacoes';
    if (location.hash === '#whatsapp') return 'whatsapp';
    return 'pessoal';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user, franchiseId, role]);

  // Load franchise data when admin switches franchise
  useEffect(() => {
    if (!isAdmin || !selectedFranchiseId) return;
    loadFranchiseData(selectedFranchiseId);
    // Load saved prefs
    try {
      const saved = localStorage.getItem(notifStorageKey);
      if (saved) setNotifPrefs(JSON.parse(saved));
      const savedAuto = localStorage.getItem(autoStorageKey);
      if (savedAuto) setAutoPrefs(JSON.parse(savedAuto));
    } catch {}
  }, [selectedFranchiseId]);

  const loadFranchiseData = async (fId: string) => {
    const { data: franchise } = await supabase
      .from('franchises')
      .select('whatsapp, email, nome_franquia, responsavel, cidades_atendidas')
      .eq('id', fId)
      .maybeSingle();

    if (franchise) {
      setWhatsapp(franchise.whatsapp || '');
      setEmail(franchise.email || '');
      setFranchiseName(franchise.nome_franquia || '');
      setResponsavel(franchise.responsavel || '');
      setCidadesAtendidas(((franchise as any).cidades_atendidas || []).join(', '));
    }
  };

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
        await loadFranchiseData(franchiseId);
        if (!profile?.full_name) {
          // fallback to responsavel
          const { data: f } = await supabase.from('franchises').select('responsavel').eq('id', franchiseId).maybeSingle();
          if (f?.responsavel) setFullName(f.responsavel);
        }
        // Load saved prefs
        try {
          const saved = localStorage.getItem(notifStorageKey);
          if (saved) setNotifPrefs(JSON.parse(saved));
          const savedAuto = localStorage.getItem(autoStorageKey);
          if (savedAuto) setAutoPrefs(JSON.parse(savedAuto));
        } catch {}
      }

      if (isAdmin) {
        const { data: adminFranchises } = await supabase
          .from('franchises')
          .select('id, nome_franquia, cidade_base')
          .eq('ativa', true)
          .order('nome_franquia', { ascending: true });

        const franchisesList = (adminFranchises ?? []) as FranchiseOption[];
        setAvailableFranchises(franchisesList);
        setSelectedFranchiseId(current => current || franchisesList[0]?.id || '');
      } else {
        setAvailableFranchises([]);
        setSelectedFranchiseId('');
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

  const handleSaveFranchiseAdmin = async () => {
    if (!effectiveFranchiseId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('franchises')
        .update({
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
          responsavel: responsavel.trim() || null,
        })
        .eq('id', effectiveFranchiseId);
      if (error) throw error;
      toast.success('Dados atualizados!');
    } catch {
      toast.error('Erro ao salvar.');
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

  const handleSaveNotifPrefs = () => {
    localStorage.setItem(notifStorageKey, JSON.stringify(notifPrefs));
    toast.success('Preferências de notificação salvas');
  };

  const handleSaveAutoPrefs = () => {
    localStorage.setItem(autoStorageKey, JSON.stringify(autoPrefs));
    toast.success('Preferências de automação salvas');
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

  // Admin franchise selector component (reused across tabs)
  const AdminFranchiseSelector = () => isAdmin ? (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          Selecione a Franquia
        </CardTitle>
        <CardDescription className="text-xs">
          Escolha a franquia para visualizar e editar suas configurações.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedFranchiseId} onValueChange={setSelectedFranchiseId}>
          <SelectTrigger className="rounded-xl h-11">
            <SelectValue placeholder="Escolha uma franquia" />
          </SelectTrigger>
          <SelectContent>
            {availableFranchises.map(f => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome_franquia}{f.cidade_base ? ` — ${f.cidade_base}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  ) : null;

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-bottomnav">
      <PanelHeader title="Configurações">
        <BackButton fallback={backPath} />
        <div className="h-5 w-px bg-border/40 mx-1 hidden sm:block" />
        <NotificationBell />
        <UserAvatarMenu />
      </PanelHeader>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6">
        <Breadcrumbs className="md:hidden" items={[
          { label: isAdmin ? 'Admin' : 'Painel', href: backPath },
          { label: 'Configurações' },
        ]} />

        {/* === HERO AVATAR SECTION === */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border/40"
          style={{
            background: 'linear-gradient(160deg, hsl(var(--primary) / 0.9) 0%, hsl(var(--primary) / 0.6) 35%, hsl(var(--primary) / 0.4) 60%, hsl(var(--primary) / 0.8) 100%)',
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
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/20 text-primary-foreground border border-primary/20">
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
            <TabsList className="w-full h-auto rounded-xl bg-muted/50 border border-border/40 p-1 gap-0.5 overflow-x-auto scrollbar-hide flex flex-nowrap justify-start">
              <TabsTrigger
                value="pessoal"
                className="shrink-0 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted px-3 py-2.5 whitespace-nowrap active:scale-95"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Pessoal</span>
                <span className="sm:hidden">Perfil</span>
              </TabsTrigger>
              {showFranchiseTab && (
                <TabsTrigger
                  value="franquia"
                  className="shrink-0 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted px-3 py-2.5 whitespace-nowrap active:scale-95"
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Franquia</span>
                  <span className="sm:hidden">Empresa</span>
                </TabsTrigger>
              )}
              {showIntegrationsTab && (
                <TabsTrigger
                  value="integracoes"
                  className="shrink-0 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted px-3 py-2.5 whitespace-nowrap active:scale-95"
                >
                  <Puzzle className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Integrações</span>
                  <span className="sm:hidden">Integr.</span>
                </TabsTrigger>
              )}
              <TabsTrigger
                value="notificacoes"
                className="shrink-0 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted px-3 py-2.5 whitespace-nowrap active:scale-95"
              >
                <Bell className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Notificações</span>
                <span className="sm:hidden">Notif.</span>
              </TabsTrigger>
              <TabsTrigger
                value="automacoes"
                className="shrink-0 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted px-3 py-2.5 whitespace-nowrap active:scale-95"
              >
                <Workflow className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Automações</span>
                <span className="sm:hidden">Auto.</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger
                  value="whatsapp"
                  className="shrink-0 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted px-3 py-2.5 whitespace-nowrap active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">WhatsApp</span>
                  <span className="sm:hidden">Whats</span>
                </TabsTrigger>
              )}
              {isFranchise && (
                <TabsTrigger
                  value="whatsapp"
                  className="shrink-0 gap-1.5 rounded-lg text-xs font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm [@media(hover:hover)]:hover:bg-muted px-3 py-2.5 whitespace-nowrap active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">WhatsApp</span>
                  <span className="sm:hidden">Whats</span>
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
                      className="rounded-xl h-11 text-base sm:text-sm"
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
                      className="rounded-xl h-11 text-base sm:text-sm"
                    />
                    {formErrors.telefone && <p className="text-xs text-destructive mt-1">{formErrors.telefone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loginEmail" className="text-xs font-medium">E-mail de login</Label>
                    <Input
                      id="loginEmail"
                      value={user?.email || ''}
                      disabled
                      className="opacity-60 rounded-xl h-11 text-base sm:text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">O e-mail de login não pode ser alterado aqui.</p>
                  </div>
                </CardContent>
              </Card>

              <PasswordChangeCard />

              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto gap-2 rounded-xl h-11 font-semibold">
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </TabsContent>

            {/* ──── TAB: FRANQUIA ──── */}
            {showFranchiseTab && (
              <TabsContent value="franquia" className="mt-5 space-y-5">
                {isAdmin && <AdminFranchiseSelector />}

                {effectiveFranchiseId ? (
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
                        {isAdmin && (
                          <div className="space-y-1.5">
                            <Label htmlFor="responsavel" className="text-xs font-medium">Responsável</Label>
                            <Input
                              id="responsavel"
                              value={responsavel}
                              onChange={e => setResponsavel(e.target.value)}
                              placeholder="Nome do responsável"
                              className="rounded-xl h-11 text-base sm:text-sm"
                            />
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label htmlFor="franchiseWhatsapp" className="text-xs font-medium flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" /> WhatsApp
                          </Label>
                          <Input
                            id="franchiseWhatsapp"
                            placeholder="(51) 99999-9999"
                            value={isFranchise ? formatPhoneBR(whatsapp) : whatsapp}
                            onChange={e => {
                              if (isFranchise) {
                                setWhatsapp(unformatPhone(e.target.value));
                              } else {
                                setWhatsapp(e.target.value);
                              }
                              setFormErrors(p => ({ ...p, whatsapp: '' }));
                            }}
                            maxLength={isFranchise ? 16 : 20}
                            className="rounded-xl h-11 text-base sm:text-sm"
                          />
                          {formErrors.whatsapp && <p className="text-xs text-destructive mt-1">{formErrors.whatsapp}</p>}
                          <p className="text-[11px] text-muted-foreground">
                            {isFranchise ? 'DDD + número. O código do Brasil (55) é adicionado automaticamente.' : 'Com código do país, ex: 5551999999999'}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="franchiseEmail" className="text-xs font-medium flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> E-mail para leads
                          </Label>
                          <Input
                            id="franchiseEmail"
                            type="email"
                            placeholder="contato@quintalideal.com.br"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setFormErrors(p => ({ ...p, email: '' })); }}
                            className="rounded-xl h-11 text-base sm:text-sm"
                          />
                          {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
                          <p className="text-[11px] text-muted-foreground">Os leads gerados pelo quiz serão enviados para este e-mail.</p>
                        </div>
                        {isFranchise && (
                          <div className="space-y-1.5">
                            <Label htmlFor="cidadesAtendidas" className="text-xs font-medium flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" /> Cidades Atendidas
                            </Label>
                            <Input
                              id="cidadesAtendidas"
                              placeholder="Canoas, Gravataí, Cachoeirinha"
                              value={cidadesAtendidas}
                              onChange={e => setCidadesAtendidas(e.target.value)}
                              className="rounded-xl h-11 text-base sm:text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">Separe as cidades por vírgula. A cidade base já é incluída automaticamente.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {isFranchise && franchiseId && <FranchiseUsersSection franchiseId={franchiseId} />}

                    <Button
                      onClick={isAdmin ? handleSaveFranchiseAdmin : handleSave}
                      disabled={saving}
                      className="w-full sm:w-auto gap-2 rounded-xl h-11 font-semibold"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </>
                ) : (
                  <Card className="card-premium">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Selecione uma franquia acima para configurar.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* ──── TAB: INTEGRAÇÕES ──── */}
            {showIntegrationsTab && (
              <TabsContent value="integracoes" className="mt-5 space-y-5" id="integracoes">
                {isAdmin && <AdminFranchiseSelector />}

                {integrationFranchiseId ? (
                  <FranchiseContactSettings franchiseId={integrationFranchiseId} />
                ) : (
                  <Card className="card-premium">
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">
                        {isAdmin ? 'Selecione uma franquia acima para configurar integrações.' : 'Nenhuma franquia disponível.'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* ──── TAB: NOTIFICAÇÕES ──── */}
            <TabsContent value="notificacoes" className="mt-5 space-y-5">
              <PushPermissionCard />

              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    Preferências de Notificação
                  </CardTitle>
                  <CardDescription className="text-xs">Controle quais notificações você deseja receber</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'new_lead' as const, label: 'Novo lead', desc: 'Alertas quando um novo lead for atribuído', icon: Users },
                    { key: 'followup_reminder' as const, label: 'Lembretes de follow-up', desc: 'Lembretes para leads que precisam de contato', icon: Clock },
                    { key: 'lead_inactive' as const, label: 'Leads inativos', desc: 'Alertas quando um lead ficar parado', icon: Bell },
                    { key: 'monthly_report' as const, label: 'Relatório mensal', desc: 'Resumo mensal de desempenho', icon: Globe },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between gap-3 py-3.5 border-b border-border/20 last:border-0">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                      <div className="shrink-0 p-1">
                        <Switch
                          checked={notifPrefs[item.key]}
                          onCheckedChange={v => setNotifPrefs(prev => ({ ...prev, [item.key]: v }))}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={handleSaveNotifPrefs} className="gap-2 rounded-xl">
                      <Save className="w-4 h-4" />
                      Salvar
                    </Button>
                    <a
                      href="/notificacoes/preferencias"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Configurações avançadas →
                    </a>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ──── TAB: AUTOMAÇÕES ──── */}
            <TabsContent value="automacoes" className="mt-5 space-y-5">
              <Card className="card-premium">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Workflow className="w-4 h-4 text-primary" />
                    </div>
                    Regras de Automação
                  </CardTitle>
                  <CardDescription className="text-xs">Configure automações para sua operação</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Auto contact reminder */}
                  <div className="flex items-center justify-between gap-3 py-3.5 border-b border-border/20">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Lembrete de primeiro contato</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Notifica quando um lead novo não for contatado em {autoPrefs.reminder_hours}h
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 p-1">
                      <Switch
                        checked={autoPrefs.auto_contact_reminder}
                        onCheckedChange={v => setAutoPrefs(prev => ({ ...prev, auto_contact_reminder: v }))}
                      />
                    </div>
                  </div>

                  {autoPrefs.auto_contact_reminder && (
                    <div className="pl-4 sm:pl-12 space-y-2">
                      <Label className="text-xs font-semibold">Tempo limite (horas)</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          max={168}
                          value={autoPrefs.reminder_hours}
                          onChange={e => setAutoPrefs(prev => ({ ...prev, reminder_hours: Number(e.target.value) || 48 }))}
                          className="w-24 rounded-xl h-11 text-base sm:text-sm"
                        />
                        <span className="text-xs text-muted-foreground">horas sem contato</span>
                      </div>
                    </div>
                  )}

                  {/* Auto lost */}
                  <div className="flex items-center justify-between gap-3 py-3.5 border-b border-border/20">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Workflow className="w-4 h-4 text-destructive" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Marcar como perdido</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Leads sem movimentação por {autoPrefs.auto_lost_days} dias serão marcados como perdidos
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pl-4 sm:pl-12 space-y-2">
                    <Label className="text-xs font-semibold">Dias sem movimentação</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={7}
                        max={180}
                        value={autoPrefs.auto_lost_days}
                        onChange={e => setAutoPrefs(prev => ({ ...prev, auto_lost_days: Number(e.target.value) || 30 }))}
                        className="w-24 rounded-xl h-11 text-base sm:text-sm"
                      />
                      <span className="text-xs text-muted-foreground">dias</span>
                    </div>
                  </div>

                  <Button onClick={handleSaveAutoPrefs} className="gap-2 rounded-xl">
                    <Save className="w-4 h-4" />
                    Salvar automações
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ──── TAB: WHATSAPP ──── */}
            {isAdmin && (
              <TabsContent value="whatsapp" className="mt-5 space-y-5">
                <WhatsAppSettings />
                <AdminWhatsAppPlans />
              </TabsContent>
            )}
            {isFranchise && franchiseId && (
              <TabsContent value="whatsapp" className="mt-5 space-y-5">
                <WhatsAppInstanceConfig franchiseId={franchiseId} />
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
              className="rounded-xl h-11 text-base sm:text-sm"
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
             className="rounded-xl h-11 text-base sm:text-sm"
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
