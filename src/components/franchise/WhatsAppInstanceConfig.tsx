import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { differenceInDays, format, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, EyeOff, Loader2, Wifi, WifiOff, Zap, ArrowLeft, Smartphone, Crown, QrCode, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface WhatsAppInstanceConfigProps {
  franchiseId: string;
}

interface FranchiseWAConfig {
  whatsapp_mode: string;
  zapi_instance_id: string | null;
  zapi_token: string | null;
  zapi_client_token: string | null;
  zapi_instance_active: boolean;
  whatsapp_plan_active: boolean;
  zapi_phone_number: string | null;
  whatsapp_plan_expires_at: string | null;
}

export function WhatsAppInstanceConfig({ franchiseId }: WhatsAppInstanceConfigProps) {
  const [config, setConfig] = useState<FranchiseWAConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  const [clientToken, setClientToken] = useState('');

  const [showInstance, setShowInstance] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showClient, setShowClient] = useState(false);

  // QR Code state
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadConfig();
    return () => stopPolling();
  }, [franchiseId]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPollingStatus(false);
  };

  const loadConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('franchises')
      .select('whatsapp_mode, zapi_instance_id, zapi_token, zapi_client_token, zapi_instance_active, whatsapp_plan_active, zapi_phone_number, whatsapp_plan_expires_at')
      .eq('id', franchiseId)
      .maybeSingle();

    if (data) {
      setConfig(data as FranchiseWAConfig);
      setInstanceId(data.zapi_instance_id || '');
      setToken(data.zapi_token || '');
      setClientToken(data.zapi_client_token || '');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!instanceId.trim() || !token.trim()) {
      toast.error('Instance ID e Token são obrigatórios.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('franchises')
      .update({
        zapi_instance_id: instanceId,
        zapi_token: token,
        zapi_client_token: clientToken || null,
      })
      .eq('id', franchiseId);

    if (error) {
      toast.error('Erro ao salvar credenciais.');
    } else {
      toast.success('Credenciais salvas com sucesso!');
      await loadConfig();
      // After saving, test connection and show QR if needed
      await handleTestAndShowQr();
    }
    setSaving(false);
  };

  const handleTestAndShowQr = async () => {
    if (!instanceId || !token) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('zapi-status', {
        body: {
          action: 'status',
          instance_id: instanceId,
          token: token,
          security_token: clientToken || null,
        },
      });

      if (error) throw error;

      const connected = data?.connected === true;
      if (connected) {
        await markConnected(data?.phone);
      } else {
        // Not connected — show QR code
        await fetchQrCode();
        startPolling();
      }
    } catch {
      toast.error('Erro ao verificar status. Verifique as credenciais.');
    } finally {
      setTesting(false);
    }
  };

  const markConnected = async (phone?: string) => {
    stopPolling();
    setShowQrCode(false);
    setQrCodeData(null);

    await supabase
      .from('franchises')
      .update({
        zapi_instance_active: true,
        whatsapp_mode: 'own',
        zapi_phone_number: phone || null,
      })
      .eq('id', franchiseId);

    toast.success('WhatsApp conectado com sucesso! ✅');
    await loadConfig();
  };

  const fetchQrCode = useCallback(async () => {
    if (!instanceId || !token) return;
    setLoadingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke('zapi-status', {
        body: {
          action: 'qr_code',
          instance_id: instanceId,
          token: token,
          security_token: clientToken || null,
        },
      });

      if (error) throw error;

      if (data?.value) {
        setQrCodeData(`data:image/png;base64,${data.value}`);
        setShowQrCode(true);
      } else if (data?.url) {
        setQrCodeData(data.url);
        setShowQrCode(true);
      } else {
        toast.error('QR Code não disponível. Tente novamente.');
      }
    } catch {
      toast.error('Erro ao buscar QR Code.');
    } finally {
      setLoadingQr(false);
    }
  }, [instanceId, token, clientToken]);

  const checkStatus = useCallback(async () => {
    if (!instanceId || !token) return;
    try {
      const { data, error } = await supabase.functions.invoke('zapi-status', {
        body: {
          action: 'status',
          instance_id: instanceId,
          token: token,
          security_token: clientToken || null,
        },
      });

      if (error) return;

      if (data?.connected === true) {
        await markConnected(data?.phone);
      }
    } catch {
      // silent
    }
  }, [instanceId, token, clientToken, franchiseId]);

  const startPolling = () => {
    stopPolling();
    setPollingStatus(true);
    pollingRef.current = setInterval(() => {
      checkStatus();
    }, 7000);
  };

  const handleManualCheckStatus = async () => {
    setTesting(true);
    await checkStatus();
    setTesting(false);
  };

  const handleActivateOwnMode = async () => {
    const { error } = await supabase
      .from('franchises')
      .update({ whatsapp_mode: 'own' })
      .eq('id', franchiseId);

    if (error) {
      toast.error('Erro ao ativar modo próprio.');
    } else {
      toast.success('Modo próprio ativado! Configure suas credenciais abaixo.');
      await loadConfig();
    }
  };

  const handleSwitchToPlatform = async () => {
    stopPolling();
    const { error } = await supabase
      .from('franchises')
      .update({ whatsapp_mode: 'platform', zapi_instance_active: false })
      .eq('id', franchiseId);

    if (error) {
      toast.error('Erro ao voltar para modo plataforma.');
    } else {
      toast.success('Voltando a usar o número da plataforma.');
      setShowQrCode(false);
      setQrCodeData(null);
      await loadConfig();
    }
  };

  const handleTestConnection = async () => {
    if (!instanceId || !token) {
      toast.error('Preencha Instance ID e Token antes de testar.');
      return;
    }
    await handleTestAndShowQr();
  };

  // Plan expiration alerts
  const expirationAlert = useMemo(() => {
    if (!config?.whatsapp_plan_active || !config?.whatsapp_plan_expires_at) return null;
    const now = new Date();
    const exp = new Date(config.whatsapp_plan_expires_at);
    if (isBefore(exp, now)) {
      return { type: 'expired' as const, message: 'Seu plano WhatsApp expirou. Suas mensagens estão sendo enviadas pelo número da plataforma.' };
    }
    const days = differenceInDays(exp, now);
    if (days <= 7) {
      return { type: 'expiring' as const, message: `Seu plano WhatsApp vence em ${days} dia${days !== 1 ? 's' : ''} (${format(exp, 'dd/MM/yyyy', { locale: ptBR })}). Entre em contato para renovar.` };
    }
    return null;
  }, [config]);

  if (loading) return null;
  if (!config) return null;

  // Estado A: Plano não ativo
  if (!config.whatsapp_plan_active) {
    return (
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-primary" />
            </div>
            Use seu próprio número WhatsApp
          </CardTitle>
          <CardDescription className="text-xs">
            Envie mensagens pelo seu próprio WhatsApp comercial para seus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Com este recurso, todas as mensagens automáticas e manuais serão enviadas pelo seu número, 
              mantendo a identidade da sua franquia. Entre em contato com o suporte para ativar este serviço.
            </p>
            <Badge variant="outline" className="text-xs gap-1.5 py-1 px-3">
              <Crown className="w-3 h-3" />
              Disponível como serviço adicional
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado B: Plano ativo, modo plataforma
  if (config.whatsapp_mode === 'platform') {
    return (
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-success" />
            </div>
            WhatsApp da Plataforma
          </CardTitle>
          <CardDescription className="text-xs">
            Suas mensagens estão sendo enviadas pelo número padrão da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-success/5 rounded-xl p-4 border border-success/20">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold text-success">Ativo — Número da Plataforma</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Mensagens automáticas e manuais são enviadas pelo número central da Quintal Ideal.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleActivateOwnMode}
            className="gap-2 rounded-xl h-11 w-full"
          >
            <Smartphone className="w-4 h-4" />
            Configurar meu próprio WhatsApp
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado C: Modo próprio ativo
  return (
    <div className="space-y-5">
      {/* Plan expiration banners */}
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
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            Credenciais Z-API — Número Próprio
          </CardTitle>
          <CardDescription className="text-xs">
            Configure sua instância Z-API para enviar mensagens pelo seu WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl ${
            config.zapi_instance_active
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-destructive/10 text-destructive border border-destructive/20'
          }`}>
            {config.zapi_instance_active ? (
              <>
                <Wifi className="w-4 h-4" /> Conectado
                {config.zapi_phone_number && (
                  <span className="text-xs font-normal ml-1">— {config.zapi_phone_number}</span>
                )}
              </>
            ) : (
              <><WifiOff className="w-4 h-4" /> Desconectado</>
            )}
          </div>

          {/* Instance ID */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Instance ID</Label>
            <div className="relative">
              <Input
                value={instanceId}
                onChange={e => setInstanceId(e.target.value)}
                placeholder="Ex: 3C7A..."
                type={showInstance ? 'text' : 'password'}
                className="rounded-xl h-11 font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowInstance(!showInstance)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showInstance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Token */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Token da Instância</Label>
            <div className="relative">
              <Input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Token fornecido pela Z-API"
                type={showToken ? 'text' : 'password'}
                className="rounded-xl h-11 font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Client Token */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Client Token (Security Token)</Label>
            <div className="relative">
              <Input
                value={clientToken}
                onChange={e => setClientToken(e.target.value)}
                placeholder="Token de segurança (opcional)"
                type={showClient ? 'text' : 'password'}
                className="rounded-xl h-11 font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowClient(!showClient)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showClient ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl h-11 flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Salvando...' : 'Salvar credenciais'}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !instanceId || !token}
              className="gap-2 rounded-xl h-11"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              Testar Conexão
            </Button>
          </div>

          <div className="pt-2 border-t border-border/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwitchToPlatform}
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar a usar o número da plataforma
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Card */}
      {showQrCode && !config.zapi_instance_active && (
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

            {pollingStatus && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Aguardando conexão...
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchQrCode}
                disabled={loadingQr}
                className="gap-2 rounded-xl"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar QR Code
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleManualCheckStatus}
                disabled={testing}
                className="gap-2 rounded-xl"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Já conectei — verificar status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
