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
import { TestPushButton } from '@/components/notifications/TestPushButton';
import { NotificationSectionCard } from '@/components/notifications/NotificationSectionCard';
import { GlobalNotificationControls } from '@/components/notifications/GlobalNotificationControls';

export default function NotificationPreferences() {
  const { role } = useAuth();
  const isAdmin = role === 'super_admin';
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

        <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-6 md:py-8">
          <Breadcrumbs className="md:hidden" items={[
            { label: isAdmin ? 'Admin' : 'Painel', href: backPath },
            { label: 'Notificações' },
          ]} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Central de Notificações
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Escolha quais alertas você quer receber e como.
            </p>
          </motion.div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <PushPermissionCard />
              <TestPushButton />

              <GlobalNotificationControls
                onEnableAll={enableAll}
                onDisableAll={disableAll}
                onImportantOnly={enableImportantOnly}
              />

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

              {dirty && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-20 z-30"
                >
                  <div className="bg-card border border-border/60 rounded-xl shadow-lg p-2.5 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground font-medium">
                      Alterações não salvas
                    </p>
                    <Button
                      onClick={save}
                      disabled={saving}
                      size="sm"
                      className="gap-1.5 rounded-xl min-h-[40px] text-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
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
