import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2, Save, Settings2, Bell, Workflow, MapPin,
  Globe, Users, CheckCircle2, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PanelHeader } from '@/components/PanelHeader';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';

interface FranchiseSettings {
  id: string;
  nome_franquia: string;
  cidade_base: string;
  whatsapp: string | null;
  email: string | null;
  responsavel: string | null;
  webhook_url: string | null;
  meta_pixel_id: string | null;
}

export default function OrganizationSettings() {
  const { user, role, franchiseId } = useAuth();
  const [franchise, setFranchise] = useState<FranchiseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification preferences (stored in localStorage per franchise)
  const storageKey = `notif_prefs_${franchiseId}`;
  const [notifPrefs, setNotifPrefs] = useState({
    new_lead: true,
    followup_reminder: true,
    lead_inactive: true,
    monthly_report: true,
  });

  // Automation settings (localStorage per franchise)
  const autoKey = `auto_prefs_${franchiseId}`;
  const [autoPrefs, setAutoPrefs] = useState({
    auto_contact_reminder: true,
    reminder_hours: 48,
    auto_lost_days: 30,
  });

  const isFranchise = role === 'franquia';
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const effectiveFranchiseId = franchiseId;

  useEffect(() => {
    if (!effectiveFranchiseId) {
      setLoading(false);
      return;
    }

    supabase
      .from('franchises')
      .select('id, nome_franquia, cidade_base, whatsapp, email, responsavel, webhook_url, meta_pixel_id')
      .eq('id', effectiveFranchiseId)
      .maybeSingle()
      .then(({ data }) => {
        setFranchise(data as FranchiseSettings | null);
        setLoading(false);
      });

    // Load saved preferences
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setNotifPrefs(JSON.parse(saved));
      const savedAuto = localStorage.getItem(autoKey);
      if (savedAuto) setAutoPrefs(JSON.parse(savedAuto));
    } catch {}
  }, [effectiveFranchiseId, storageKey, autoKey]);

  const handleSaveNotifPrefs = () => {
    localStorage.setItem(storageKey, JSON.stringify(notifPrefs));
    toast.success('Preferências de notificação salvas');
  };

  const handleSaveAutoPrefs = () => {
    localStorage.setItem(autoKey, JSON.stringify(autoPrefs));
    toast.success('Preferências de automação salvas');
  };

  const handleSaveFranchise = async () => {
    if (!franchise) return;
    setSaving(true);
    const { error } = await supabase
      .from('franchises')
      .update({
        whatsapp: franchise.whatsapp,
        email: franchise.email,
        responsavel: franchise.responsavel,
      })
      .eq('id', franchise.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar');
    } else {
      toast.success('Dados atualizados');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!effectiveFranchiseId || !franchise) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Franquia não encontrada</p>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Painel', href: isFranchise ? '/franquia' : '/admin' },
    { label: 'Configurações da Organização' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <PanelHeader title="Configurações">
          <NotificationBell />
          <UserAvatarMenu />
        </PanelHeader>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <Breadcrumbs items={breadcrumbs} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{franchise.nome_franquia}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{franchise.cidade_base}</span>
                  <Badge variant="success" className="text-[10px]">Ativa</Badge>
                </div>
              </div>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="bg-muted/40 rounded-xl p-1">
                <TabsTrigger value="general" className="rounded-lg text-xs gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Geral
                </TabsTrigger>
                <TabsTrigger value="notifications" className="rounded-lg text-xs gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  Notificações
                </TabsTrigger>
                <TabsTrigger value="automation" className="rounded-lg text-xs gap-1.5">
                  <Workflow className="w-3.5 h-3.5" />
                  Automações
                </TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general" className="space-y-4">
                <Card className="card-premium">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Dados da Organização
                    </CardTitle>
                    <CardDescription>Informações de contato e dados básicos da franquia</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Responsável</Label>
                        <Input
                          value={franchise.responsavel || ''}
                          onChange={e => setFranchise({ ...franchise, responsavel: e.target.value })}
                          placeholder="Nome do responsável"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">WhatsApp</Label>
                        <Input
                          value={franchise.whatsapp || ''}
                          onChange={e => setFranchise({ ...franchise, whatsapp: e.target.value })}
                          placeholder="(51) 99999-9999"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">E-mail</Label>
                        <Input
                          value={franchise.email || ''}
                          onChange={e => setFranchise({ ...franchise, email: e.target.value })}
                          placeholder="contato@franquia.com"
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <Separator className="my-2" />

                    <Button onClick={handleSaveFranchise} disabled={saving} className="gap-2 rounded-xl">
                      <Save className="w-4 h-4" />
                      {saving ? 'Salvando...' : 'Salvar dados'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Pipeline info */}
                <Card className="card-premium">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-primary" />
                      Pipeline de Vendas
                    </CardTitle>
                    <CardDescription>Etapas do pipeline utilizadas para gerenciar leads</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Novo', color: 'bg-primary/10 text-primary border-primary/20' },
                        { label: 'Contatado', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700' },
                        { label: 'Em Negociação', color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700' },
                        { label: 'Vendido', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' },
                        { label: 'Perdido', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700' },
                      ].map(stage => (
                        <div
                          key={stage.label}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${stage.color}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">{stage.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      As etapas do pipeline são padronizadas para toda a rede. Para alterações, entre em contato com a administração.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Preferences */}
              <TabsContent value="notifications" className="space-y-4">
                <Card className="card-premium">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Preferências de Notificação
                    </CardTitle>
                    <CardDescription>Escolha quais notificações deseja receber</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: 'new_lead' as const, label: 'Novo lead', desc: 'Receba alertas quando um novo lead for atribuído à sua franquia', icon: Users },
                      { key: 'followup_reminder' as const, label: 'Lembretes de follow-up', desc: 'Receba lembretes automáticos para leads que precisam de acompanhamento', icon: Clock },
                      { key: 'lead_inactive' as const, label: 'Leads inativos', desc: 'Alertas quando um lead ficar parado por muito tempo em uma etapa', icon: Bell },
                      { key: 'monthly_report' as const, label: 'Relatório mensal', desc: 'Receba um resumo mensal de KPIs e desempenho por e-mail', icon: Globe },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between gap-4 py-3 border-b border-border/20 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <item.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={notifPrefs[item.key]}
                          onCheckedChange={v => setNotifPrefs(prev => ({ ...prev, [item.key]: v }))}
                        />
                      </div>
                    ))}

                    <Button onClick={handleSaveNotifPrefs} className="gap-2 rounded-xl mt-2">
                      <Save className="w-4 h-4" />
                      Salvar preferências
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Automation Settings */}
              <TabsContent value="automation" className="space-y-4">
                <Card className="card-premium">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-primary" />
                      Regras de Automação
                    </CardTitle>
                    <CardDescription>Configure automações para sua operação</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Auto contact reminder */}
                    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/20">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Lembrete de primeiro contato</p>
                          <p className="text-xs text-muted-foreground">
                            Notifica quando um lead novo não for contatado em {autoPrefs.reminder_hours}h
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={autoPrefs.auto_contact_reminder}
                        onCheckedChange={v => setAutoPrefs(prev => ({ ...prev, auto_contact_reminder: v }))}
                      />
                    </div>

                    {autoPrefs.auto_contact_reminder && (
                      <div className="ml-12 space-y-2">
                        <Label className="text-xs font-semibold">Horas para lembrete</Label>
                        <Input
                          type="number"
                          min={12}
                          max={168}
                          value={autoPrefs.reminder_hours}
                          onChange={e => setAutoPrefs(prev => ({ ...prev, reminder_hours: parseInt(e.target.value) || 48 }))}
                          className="w-24 rounded-xl"
                        />
                      </div>
                    )}

                    {/* Auto lost */}
                    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/20">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Bell className="w-4 h-4 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Alerta de inatividade</p>
                          <p className="text-xs text-muted-foreground">
                            Alerta quando um lead ficar sem atividade por {autoPrefs.auto_lost_days} dias
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={7}
                          max={90}
                          value={autoPrefs.auto_lost_days}
                          onChange={e => setAutoPrefs(prev => ({ ...prev, auto_lost_days: parseInt(e.target.value) || 30 }))}
                          className="w-20 rounded-xl text-center"
                        />
                        <span className="text-xs text-muted-foreground">dias</span>
                      </div>
                    </div>

                    <Button onClick={handleSaveAutoPrefs} className="gap-2 rounded-xl mt-2">
                      <Save className="w-4 h-4" />
                      Salvar automações
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
