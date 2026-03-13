import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, ArrowLeft, Check, CheckCheck, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PageTransition } from '@/components/PageTransition';
import { UserAvatarMenu } from '@/components/UserAvatarMenu';
import { NotificationBell } from '@/components/NotificationBell';
import logoSplash from '@/assets/logo-splash.png';
import { motion } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  created_at: string;
  franchise_id: string;
}

const PAGE_SIZE = 25;

export default function NotificacoesPage() {
  const { user, franchiseId, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'admin_fabrica' || role === 'super_admin';

  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [filterType, setFilterType] = useState<'all' | 'new_lead'>('all');
  const [page, setPage] = useState(1);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [filterRead, filterType]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications-history', franchiseId, filterRead, filterType, page],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (!isAdmin && franchiseId) {
        query = query.eq('franchise_id', franchiseId);
      }

      if (filterRead === 'unread') query = query.eq('read', false);
      if (filterRead === 'read') query = query.eq('read', true);
      if (filterType !== 'all') query = query.eq('type', filterType);

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { notifications: (data || []) as Notification[], total: count || 0 };
    },
    enabled: !!user,
  });

  const notifications = data?.notifications || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    refetch();
  };

  const markAllAsRead = async () => {
    let query = supabase.from('notifications').update({ read: true }).eq('read', false);
    if (!isAdmin && franchiseId) {
      query = query.eq('franchise_id', franchiseId);
    }
    await query;
    refetch();
  };

  const backPath = isAdmin ? '/admin' : '/painel';

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b border-border/40 bg-card/80 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img src={logoSplash} alt="Splash" className="h-7 md:h-9 shrink-0" />
              <div className="h-5 w-px bg-border/60 hidden sm:block" />
              <span className="text-sm font-semibold text-foreground tracking-tight truncate hidden sm:block">Notificações</span>
            </div>
            <nav className="flex items-center gap-1">
              <NotificationBell />
              <UserAvatarMenu />
            </nav>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <Breadcrumbs items={[
            { label: isAdmin ? 'Admin' : 'Painel', href: backPath },
            { label: 'Notificações' },
          ]} />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(backPath)} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterRead} onValueChange={(v) => setFilterRead(v as typeof filterRead)}>
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unread">Não lidas</SelectItem>
                  <SelectItem value="read">Lidas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="new_lead">Novo lead</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5 text-xs rounded-xl">
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas como lidas
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary" className="text-xs">
              {total} notificação{total !== 1 ? 'ões' : ''}
            </Badge>
            {filterRead === 'all' && (
              <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                {notifications.filter(n => !n.read).length} não lida{notifications.filter(n => !n.read).length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Notifications list */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card className="p-12 text-center">
              <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma notificação encontrada</p>
              {filterRead !== 'all' || filterType !== 'all' ? (
                <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => { setFilterRead('all'); setFilterType('all'); }}>
                  Limpar filtros
                </Button>
              ) : null}
            </Card>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif, i) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={`p-4 cursor-pointer hover:bg-muted/30 transition-colors flex items-start gap-3 ${
                      !notif.read ? 'border-primary/20 bg-primary/[0.03]' : ''
                    }`}
                    onClick={() => markAsRead(notif.id)}
                  >
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                      !notif.read ? 'bg-primary' : 'bg-border'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!notif.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap shrink-0">
                          {format(new Date(notif.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {notif.type === 'new_lead' ? '🎯 Novo Lead' : notif.type}
                        </Badge>
                        {!notif.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                            className="text-[10px] text-primary hover:underline flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="text-xs rounded-xl"
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="text-xs rounded-xl"
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
