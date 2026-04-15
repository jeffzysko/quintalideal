import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { differenceInDays, format, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Wifi, WifiOff, Smartphone, Crown, QrCode, RefreshCw, CheckCircle, Loader2, Unplug, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface WhatsAppInstanceConfigProps {
  franchiseId: string;
}

interface FranchiseWAState {
  whatsapp_plan_active: boolean;
  zapi_instance_active: boolean;
  zapi_phone_number: string | null;
  whatsapp_plan_expires_at: string | null;
}

type ViewState = 'inactive' | 'pending' | 'connected' | 'disconnected';

export function WhatsAppInstanceConfig({ franchiseId }: WhatsAppInstanceConfigProps) {
  const [state, setState] = useState<FranchiseWAState | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // QR Code
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle checkout status from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      toast.success('Pagamento confirmado! Conecte seu WhatsApp agora.');
      loadState();
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    } else if (status === 'canceled') {
      toast('Contratação cancelada.');
      const url = new URL(window.location.href);
      url.searchParams.delete('status');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    loadState();
    return () => stopPolling();
  }, [franchiseId]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPollingActive(false);
  };

  const loadState = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('franchises')
      .select('whatsapp_plan_active, zapi_instance_active, zapi_phone_number, whatsapp_plan_expires_at')
      .eq('id', franchiseId)
      .maybeSingle();

    if (data) setState(data as FranchiseWAState);
    setLoading(false);
  };

  const viewState = useMemo((): ViewState => {
    if (!state) return 'inactive';
    if (!state.whatsapp_plan_active) return 'inactive';
    if (state.zapi_instance_active) return 'connected';
    // Plan active but not connected — check if it was previously connected (has phone)
    return state.zapi_phone_number ? 'disconnected' : 'pending';
  }, [state]);

  const expirationAlert = useMemo(() => {
    if (!state?.whatsapp_plan_active || !state?.whatsapp_plan_expires_at) return null;
    const now = new Date();
    const exp = new Date(state.whatsapp_plan_expires_at);
    if (isBefore(exp, now)) {
      return { type: 'expired' as const, message: 'Seu plano WhatsApp expirou. Suas mensagens estão sendo enviadas pelo número da plataforma.' };
    }
    const days = differenceInDays(exp, now);
    if (days <= 7) {
      return { type: 'expiring' as const, message: `Seu plano WhatsApp vence em ${days} dia${days !== 1 ? 's' : ''} (${format(exp, 'dd/MM/yyyy', { locale: ptBR })}). Entre em contato para renovar.` };
    }
    return null;
  }, [state]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { franchiseId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('Erro ao iniciar checkout.');
      }
    } catch {
      toast.error('Erro ao iniciar checkout. Tente novamente.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const invokeInstance = useCallback(async (action: string) => {
    const { data, error } = await supabase.functions.invoke('zapi-instance', {
      body: { action, franchiseId },
    });
    if (error) throw error;
    return data;
  }, [franchiseId]);

  const handleConnect = async () => {
    setLoadingQr(true);
    try {
      const data = await invokeInstance('qr_code');
      if (data?.value) {
        setQrCodeData(`data:image/png;base64,${data.value}`);
        setShowQr(true);
        startPolling();
      } else if (data?.url) {
        setQrCodeData(data.url);
        setShowQr(true);
        startPolling();
      } else if (data?.message) {
        toast.error(data.message);
      } else {
        toast.error('QR Code não disponível. Tente novamente.');
      }
    } catch {
      toast.error('Erro ao gerar QR Code. Tente novamente.');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    try {
      const data = await invokeInstance('status');
      if (data?.connected) {
        stopPolling();
        setShowQr(false);
        setQrCodeData(null);
        toast.success('WhatsApp conectado com sucesso! ✅');
        await loadState();
      } else {
        toast.info('Ainda não conectado. Escaneie o QR Code com seu WhatsApp.');
      }
    } catch {
      toast.error('Erro ao verificar status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await invokeInstance('disconnect');
      toast.success('WhatsApp desconectado.');
      await loadState();
    } catch {
      toast.error('Erro ao desconectar.');
    } finally {
      setDisconnecting(false);
    }
  };

  const startPolling = () => {
    stopPolling();
    setPollingActive(true);
    pollingRef.current = setInterval(async () => {
      try {
        const data = await invokeInstance('status');
        if (data?.connected) {
          stopPolling();
          setShowQr(false);
          setQrCodeData(null);
          toast.success('WhatsApp conectado com sucesso! ✅');
          await loadState();
        }
      } catch {
        // silent
      }
    }, 7000);
  };

  if (loading || !state) return null;

  return (
    <div className="space-y-4">
      {/* Expiration alerts */}
      {expirationAlert?.type === 'expired' && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive font-medium">{expirationAlert.message}</p>
        </div>
      )}
      {expirationAlert?.type === 'expiring' && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3">
          <AlertTriangle className="w-4 h-4 text-warning-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-warning-foreground font-medium">{expirationAlert.message}</p>
        </div>
      )}

      {/* Estado 1 — Plano inativo */}
      {viewState === 'inactive' && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
              </div>
              Envio pelo número da plataforma
            </CardTitle>
            <CardDescription className="text-xs">
              Suas mensagens são enviadas pelo número central da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/40 rounded-xl p-4 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Contrate o plano WhatsApp para enviar mensagens pelo seu próprio número comercial,
                mantendo a identidade da sua franquia.
              </p>
              <Badge variant="outline" className="text-xs gap-1.5 py-1 px-3">
                <Crown className="w-3 h-3" />
                Disponível como serviço adicional
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado 2 — Aguardando conexão */}
      {viewState === 'pending' && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-warning-foreground" />
              </div>
              WhatsApp — Número Próprio
            </CardTitle>
            <CardDescription className="text-xs">
              Seu plano está ativo. Conecte seu WhatsApp para começar a enviar mensagens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="warning" className="text-xs gap-1.5 py-1 px-3">
              Aguardando conexão
            </Badge>

            {!showQr && (
              <Button
                onClick={handleConnect}
                disabled={loadingQr}
                className="gap-2 rounded-xl h-11 w-full"
              >
                {loadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Conectar WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estado 3 — Conectado */}
      {viewState === 'connected' && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-success" />
              </div>
              WhatsApp Conectado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl bg-success/10 text-success border border-success/20">
              <Wifi className="w-4 h-4" />
              Conectado
              {state.zapi_phone_number && (
                <span className="text-xs font-normal ml-1">— {state.zapi_phone_number}</span>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Suas mensagens automáticas e manuais estão sendo enviadas pelo seu número.
            </p>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="gap-2 text-xs text-muted-foreground hover:text-destructive"
            >
              {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
              Desconectar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Estado 4 — Desconectado */}
      {viewState === 'disconnected' && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-destructive" />
              </div>
              WhatsApp Desconectado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <WifiOff className="w-4 h-4" />
              Desconectado
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Seu WhatsApp foi desconectado. As mensagens estão sendo enviadas pelo número da plataforma até você reconectar.
            </p>

            {!showQr && (
              <Button
                onClick={handleConnect}
                disabled={loadingQr}
                className="gap-2 rounded-xl h-11 w-full"
              >
                {loadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Reconectar WhatsApp
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Code Card — shown for pending/disconnected states */}
      {showQr && (viewState === 'pending' || viewState === 'disconnected') && (
        <Card className="card-premium">
          <CardHeader className="text-center">
            <CardTitle className="text-sm font-semibold flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4 text-primary" />
              Escaneie com seu WhatsApp
            </CardTitle>
            <CardDescription className="text-xs">
              Abra o WhatsApp → Dispositivos Vinculados → Vincular um dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {loadingQr ? (
                <div className="w-[220px] h-[220px] flex items-center justify-center bg-muted/30 rounded-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : qrCodeData ? (
                <img
                  src={qrCodeData}
                  alt="QR Code WhatsApp"
                  className="max-w-[220px] max-h-[220px] rounded-lg border border-border"
                />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center bg-muted/30 rounded-xl text-xs text-muted-foreground">
                  QR Code indisponível
                </div>
              )}
            </div>

            {pollingActive && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Aguardando conexão...
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnect}
                disabled={loadingQr}
                className="gap-2 rounded-xl"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar QR Code
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="gap-2 rounded-xl"
              >
                {checkingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Já conectei — verificar status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
