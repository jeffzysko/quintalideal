import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, EyeOff, Loader2, Wifi, WifiOff, Zap, ArrowLeft, Smartphone, Crown } from 'lucide-react';
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

  useEffect(() => {
    loadConfig();
  }, [franchiseId]);

  const loadConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('franchises')
      .select('whatsapp_mode, zapi_instance_id, zapi_token, zapi_client_token, zapi_instance_active, whatsapp_plan_active')
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
    }
    setSaving(false);
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
    const { error } = await supabase
      .from('franchises')
      .update({ whatsapp_mode: 'platform', zapi_instance_active: false })
      .eq('id', franchiseId);

    if (error) {
      toast.error('Erro ao voltar para modo plataforma.');
    } else {
      toast.success('Voltando a usar o número da plataforma.');
      await loadConfig();
    }
  };

  const handleTestConnection = async () => {
    if (!instanceId || !token) {
      toast.error('Preencha Instance ID e Token antes de testar.');
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('zapi-status', {
        body: {
          instance_id: instanceId,
          token: token,
          security_token: clientToken || null,
        },
      });

      if (error) throw error;

      const connected = data?.connected === true;
      await supabase
        .from('franchises')
        .update({ zapi_instance_active: connected })
        .eq('id', franchiseId);

      if (connected) {
        toast.success('Conexão verificada com sucesso! ✅');
      } else {
        toast.error('Não foi possível conectar. Verifique as credenciais.');
      }
      await loadConfig();
    } catch {
      toast.error('Erro ao testar conexão.');
    } finally {
      setTesting(false);
    }
  };

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
              <><Wifi className="w-4 h-4" /> Conectado</>
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
    </div>
  );
}
