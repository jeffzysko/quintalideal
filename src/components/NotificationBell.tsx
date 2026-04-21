import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNotificationType } from '@/lib/notification-types';
import { useNotificationFilter } from '@/hooks/useNotificationFilter';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  created_at: string;
  franchise_id: string;
  metadata: Record<string, unknown> | null;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // First tone — bright ping (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second tone — resolution (D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.15);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.18, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);

    // Third tone — sparkle (E6)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1318.51, now + 0.28);
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.setValueAtTime(0.12, now + 0.28);
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc3.start(now + 0.28);
    osc3.stop(now + 0.6);

    osc3.onended = () => ctx.close();
  } catch {
    // Audio not available
  }
}

export function NotificationBell() {
  const { user, franchiseId, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const initialLoadDone = useRef(false);

  const isAdmin = role === 'super_admin';
  const { shouldShow } = useNotificationFilter();

  // Filter notifications based on user preferences
  const visibleNotifications = notifications.filter(n => shouldShow(n.type));
  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!isAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId);
    }
    const { data } = await query;
    if (data) {
      setNotifications(data as Notification[]);
      initialLoadDone.current = true;
    }
  }, [user, franchiseId, isAdmin]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          ...((!isAdmin && franchiseId) ? { filter: `franchise_id=eq.${franchiseId}` } : {}),
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev].slice(0, 20));
          // Only play sound if notification type is enabled in preferences
          if (initialLoadDone.current && shouldShow(newNotif.type)) playNotificationSound();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, franchiseId, isAdmin]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    const basePath = isAdmin ? '/admin' : '/painel';
    const leadId = (notif.metadata as Record<string, unknown>)?.lead_id as string | undefined;
    if (leadId && (notif.type === 'new_lead' || notif.type === 'followup')) {
      navigate(`${basePath}/lead/${leadId}`);
    } else {
      navigate(basePath);
    }
    setOpen(false);
  };

  return (
    <Tooltip open={open ? false : undefined}>
      <Popover open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
            >
              <Bell className="h-4 w-4" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notificações</TooltipContent>
      <PopoverContent align="end" sideOffset={8} className="w-80 sm:w-96 p-0 rounded-xl shadow-lg border-border/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary/80 h-auto py-1 px-2"
              >
                Marcar todas como lidas
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setOpen(false); navigate('/notificacoes'); }}
              className="text-xs text-muted-foreground hover:text-foreground h-auto py-1 px-2"
            >
              <History className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {visibleNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {visibleNotifications.map((notif) => {
                const cfg = getNotificationType(notif.type);
                const Icon = cfg.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex gap-3 items-start ${
                      !notif.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Category icon */}
                    <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.dotColor}/15`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!notif.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {visibleNotifications.length > 0 && (
          <div className="border-t border-border/30 px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setOpen(false); navigate('/notificacoes'); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
    </Tooltip>
  );
}
