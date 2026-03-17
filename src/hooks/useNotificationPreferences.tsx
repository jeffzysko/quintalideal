import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ─── Notification preference schema ───
export interface NotificationChannel {
  push: boolean;
  email: boolean;     // future-ready
  whatsapp: boolean;  // future-ready
}

export interface NotificationItem {
  key: string;
  label: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  channels: NotificationChannel;
}

export interface NotificationSection {
  id: string;
  title: string;
  icon: string;
  items: NotificationItem[];
}

// ─── Default preferences by role ───
const DEFAULT_CHANNEL: NotificationChannel = { push: true, email: false, whatsapp: false };
const OFF_CHANNEL: NotificationChannel = { push: false, email: false, whatsapp: false };

function buildDefaults(role: string | null): NotificationSection[] {
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';

  return [
    {
      id: 'leads',
      title: 'Leads',
      icon: '🎯',
      items: [
        { key: 'new_lead_assigned', label: 'Lead atribuído à minha franquia', description: 'Quando um novo lead é direcionado para você.', priority: 'high', channels: { ...DEFAULT_CHANNEL } },
        { key: 'new_lead_received', label: 'Novo lead recebido na rede', description: 'Quando um lead entra na plataforma.', priority: 'medium', channels: isAdmin ? { ...DEFAULT_CHANNEL } : { ...OFF_CHANNEL } },
        { key: 'lead_no_first_contact', label: 'Lead sem primeiro contato', description: 'Alerta quando um lead ainda não foi contatado.', priority: 'high', channels: { ...DEFAULT_CHANNEL } },
        { key: 'lead_replied', label: 'Resposta de lead', description: 'Quando um lead interage novamente.', priority: 'medium', channels: { ...DEFAULT_CHANNEL } },
      ],
    },
    {
      id: 'followups',
      title: 'Tarefas e Follow-ups',
      icon: '📋',
      items: [
        { key: 'followup_overdue', label: 'Follow-up atrasado', description: 'Quando um follow-up passa do prazo.', priority: 'high', channels: { ...DEFAULT_CHANNEL } },
        { key: 'task_due_today', label: 'Tarefa para hoje', description: 'Lembrete das tarefas do dia.', priority: 'medium', channels: { ...DEFAULT_CHANNEL } },
        { key: 'task_overdue', label: 'Tarefa atrasada', description: 'Quando uma tarefa não foi concluída no prazo.', priority: 'high', channels: { ...DEFAULT_CHANNEL } },
        { key: 'followup_reminder', label: 'Lembrete de follow-up', description: 'Lembrete antes do horário agendado.', priority: 'medium', channels: { ...DEFAULT_CHANNEL } },
      ],
    },
    {
      id: 'pipeline',
      title: 'Pipeline e Vendas',
      icon: '📊',
      items: [
        { key: 'stage_changed', label: 'Mudança de etapa', description: 'Quando um lead muda de status no pipeline.', priority: 'low', channels: { ...OFF_CHANNEL } },
        { key: 'lead_won', label: 'Lead convertido (venda)', description: 'Quando um lead é marcado como vendido.', priority: 'high', channels: { ...DEFAULT_CHANNEL } },
        { key: 'lead_lost', label: 'Lead perdido', description: 'Quando um lead é marcado como perdido.', priority: 'medium', channels: { ...DEFAULT_CHANNEL } },
      ],
    },
    {
      id: 'management',
      title: 'Gestão e Alertas',
      icon: '🏢',
      items: [
        { key: 'inactive_lead_alert', label: 'Alerta de lead inativo', description: 'Quando um lead fica parado por muito tempo.', priority: 'high', channels: { ...DEFAULT_CHANNEL } },
        { key: 'monthly_report', label: 'Relatório mensal', description: 'Resumo mensal de desempenho.', priority: 'low', channels: { push: false, email: true, whatsapp: false } },
        ...(isAdmin ? [
          { key: 'franchise_inactive', label: 'Franquia inativa', description: 'Quando uma franquia não acessa o sistema.', priority: 'high' as const, channels: { ...DEFAULT_CHANNEL } },
          { key: 'sla_breach', label: 'Velocidade de resposta lenta', description: 'Quando o tempo de resposta excede o esperado.', priority: 'high' as const, channels: { ...DEFAULT_CHANNEL } },
        ] : []),
      ],
    },
    {
      id: 'system',
      title: 'Sistema',
      icon: '⚙️',
      items: [
        { key: 'system_update', label: 'Atualização do sistema', description: 'Novidades e melhorias na plataforma.', priority: 'low', channels: { ...OFF_CHANNEL } },
        { key: 'announcement', label: 'Comunicados', description: 'Mensagens importantes da administração.', priority: 'medium', channels: { ...DEFAULT_CHANNEL } },
      ],
    },
  ];
}

// ─── Merge saved prefs into defaults ───
function mergePrefs(
  defaults: NotificationSection[],
  saved: Record<string, NotificationChannel> | null
): NotificationSection[] {
  if (!saved) return defaults;
  return defaults.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      channels: saved[item.key] ?? item.channels,
    })),
  }));
}

// ─── Hook ───
export function useNotificationPreferences() {
  const { user, role } = useAuth();
  const [sections, setSections] = useState<NotificationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load
  useEffect(() => {
    if (!user) return;
    const defaults = buildDefaults(role);

    (async () => {
      try {
        const { data } = await supabase
          .from('notification_preferences' as any)
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        const saved = data?.preferences as Record<string, NotificationChannel> | null;
        setSections(mergePrefs(defaults, saved));
      } catch {
        setSections(defaults);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, role]);

  // Toggle a channel for a specific item
  const toggleChannel = useCallback((itemKey: string, channel: keyof NotificationChannel) => {
    setSections(prev =>
      prev.map(section => ({
        ...section,
        items: section.items.map(item =>
          item.key === itemKey
            ? { ...item, channels: { ...item.channels, [channel]: !item.channels[channel] } }
            : item
        ),
      }))
    );
    setDirty(true);
  }, []);

  // Toggle all items in a section
  const toggleSection = useCallback((sectionId: string, enabled: boolean) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item => ({
                ...item,
                channels: { ...item.channels, push: enabled },
              })),
            }
          : section
      )
    );
    setDirty(true);
  }, []);

  // Global controls
  const enableAll = useCallback(() => {
    setSections(prev =>
      prev.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          channels: { ...item.channels, push: true },
        })),
      }))
    );
    setDirty(true);
  }, []);

  const disableAll = useCallback(() => {
    setSections(prev =>
      prev.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          channels: { ...item.channels, push: false },
        })),
      }))
    );
    setDirty(true);
  }, []);

  const enableImportantOnly = useCallback(() => {
    setSections(prev =>
      prev.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          channels: {
            ...item.channels,
            push: item.priority === 'high',
          },
        })),
      }))
    );
    setDirty(true);
  }, []);

  // Save
  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);

    const prefs: Record<string, NotificationChannel> = {};
    sections.forEach(s => s.items.forEach(i => { prefs[i.key] = i.channels; }));

    try {
      const { error } = await supabase
        .from('notification_preferences' as any)
        .upsert(
          { user_id: user.id, preferences: prefs },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      setDirty(false);
      toast.success('Preferências salvas');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar preferências');
    } finally {
      setSaving(false);
    }
  }, [user, sections]);

  return {
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
  };
}
