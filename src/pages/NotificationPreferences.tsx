import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { PanelHeader } from '@/components/PanelHeader';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import { PushPermissionCard } from '@/components/notifications/PushPermissionCard';
import { NotificationSectionCard } from '@/components/notifications/NotificationSectionCard';
import { GlobalNotificationControls } from '@/components/notifications/GlobalNotificationControls';

export default function NotificationPreferences() {
  const { role } = useAuth();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';
  const backPath = isAdmin ? '/admin' : '/painel';

  const {
    sections,
    loading,
    saving,
    dirty,
    toggleChannel,
    toggleSection,
    enableAll,
    disableAll,
    enableImportantOnly,
    save,
  } = useNotificationPreferences();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-bottomnav">
        <PanelHeader title="Preferências">
          <NotificationBell />
          <UserAvatarMenu />
        </PanelHeader>

        <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          <Breadcrumbs items={[
            { label: isAdmin ? 'Admin' : 'Painel', href: backPath },
            { label: 'Configurações', href: '/organizacao/configuracoes' },
            { label: 'Preferências de Notificação' },
          ]} />

          {/* Hero description */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            <h1 className="text-lg font-bold tracking-tight">
              Central de Notificações
            </h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-md">
              Escolha exatamente quais alertas você quer receber e como. 
              Você tem controle total.
            </p>
          </motion.div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              {/* Push permission card */}
              <PushPermissionCard />

              {/* Global controls */}
              <GlobalNotificationControls
                onEnableAll={enableAll}
                onDisableAll={disableAll}
                onImportantOnly={enableImportantOnly}
              />

              {/* Sections */}
              {sections.map((section, i) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * (i + 1) }}
                >
                  <NotificationSectionCard
                    section={section}
                    onToggleChannel={(itemKey, channel) => toggleChannel(itemKey, channel)}
                    onToggleSection={(enabled) => toggleSection(section.id, enabled)}
                  />
                </motion.div>
              ))}

              {/* Save bar */}
              {dirty && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-20 z-30"
                >
                  <div className="bg-card border border-border/60 rounded-2xl shadow-lg p-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      Alterações não salvas
                    </p>
                    <Button
                      onClick={save}
                      disabled={saving}
                      className="gap-2 rounded-xl min-h-[44px]"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Salvando…' : 'Salvar'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
