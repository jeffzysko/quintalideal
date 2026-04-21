import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, Eye, EyeOff, Loader2, Wifi, WifiOff, MessageSquare, Phone, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WhatsAppSettings() {
  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [franchiseId, setFranchiseId] = useState<string | null>(null);

  const [showInstance, setShowInstance] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle');
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadConfig();
    loadMessages();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from('whatsapp_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) {
      setConfigId(data.id);
      setFranchiseId(data.franchise_id);
      setInstanceId(data.instance_id || '');
      setToken(data.token || '');
      setSecurityToken(data.security_token || '');
      setIsActive(data.is_active);
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    setLoadingMessages(true);
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setMessages(data || []);
    setLoadingMessages(false);
  };

  const handleSave = async () => {
    if (!instanceId.trim() || !token.trim()) {
      toast.error('Instance ID e Token são obrigatórios.');
      return;
    }
    setSaving(true);

    // We need a franchise_id. Use the first franchise if none exists.
    let fId = franchiseId;
    if (!fId) {
      const { data: firstFranchise } = await supabase
        .from('franchises')
        .select('id')
        .limit(1)
        .maybeSingle();
      fId = firstFranchise?.id || null;
    }

    if (!fId) {
      toast.error('Nenhuma franquia encontrada para vincular.');
      setSaving(false);
      return;
    }

    if (configId) {
      const { error } = await supabase
        .from('whatsapp_config')
        .update({
          instance_id: instanceId,
          token,
          security_token: securityToken || null,
          is_active: isActive,
        })
        .eq('id', configId);
      if (error) toast.error('Erro ao salvar.');
      else toast.success('Credenciais salvas!');
    } else {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .insert({
          franchise_id: fId,
          instance_id: instanceId,
          token,
          security_token: securityToken || null,
          is_active: isActive,
        })
        .select()
        .single();
      if (error) toast.error('Erro ao salvar.');
      else {
        setConfigId(data.id);
        setFranchiseId(data.franchise_id);
        toast.success('Credenciais salvas!');
      }
    }
    setSaving(false);
  };

  const handleToggleActive = async (value: boolean) => {
    setIsActive(value);
    if (configId) {
      await supabase
        .from('whatsapp_config')
        .update({ is_active: value })
        .eq('id', configId);
      toast.success(value ? 'Envios ativados' : 'Envios desativados');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus('idle');
    try {
      const { data, error } = await supabase.functions.invoke('zapi-status');
      if (error) throw error;
      if (data?.connected) {
        setConnectionStatus('connected');
        toast.success('Conexão com Z-API verificada!');
      } else {
        setConnectionStatus('disconnected');
        toast.error('Não foi possível conectar. Verifique as credenciais.');
      }
    } catch {
      setConnectionStatus('disconnected');
      toast.error('Erro ao testar conexão.');
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-success/10 text-success border-success/20 text-xs">Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Falha</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Pendente</Badge>;
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-5">
      {/* Credentials Card */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            Credenciais Z-API
          </CardTitle>
          <CardDescription className="text-xs">
            Configure a conexão com a Z-API para enviar mensagens via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                value={securityToken}
                onChange={e => setSecurityToken(e.target.value)}
                placeholder="Token de segurança (opcional)"
                type={showSecurity ? 'text' : 'password'}
                className="rounded-xl h-11 font-mono text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecurity(!showSecurity)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSecurity ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Save + Test buttons */}
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
              ) : connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4 text-success" />
              ) : connectionStatus === 'disconnected' ? (
                <WifiOff className="w-4 h-4 text-destructive" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              Testar Conexão
            </Button>
          </div>

          {/* Connection result */}
          {connectionStatus !== 'idle' && (
            <div className={`text-sm font-medium px-3 py-2 rounded-xl ${
              connectionStatus === 'connected'
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}>
              {connectionStatus === 'connected'
                ? '✅ Conectado — Z-API respondeu com sucesso!'
                : '❌ Desconectado — verifique as credenciais.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toggle + Mode */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            Controle de Envios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Ativar envios de WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Quando desativado, nenhuma mensagem será enviada via Z-API.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={handleToggleActive} />
          </div>

          <div className="pt-2 border-t border-border/30">
            <Badge variant="outline" className="text-xs gap-1.5 py-1 px-3">
              🟢 Modo atual: Central (Fase 1)
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card className="card-premium">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              Histórico de Mensagens
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadMessages} disabled={loadingMessages} className="text-xs gap-1">
              {loadingMessages ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Atualizar
            </Button>
          </div>
          <CardDescription className="text-xs">Últimas 50 mensagens enviadas via Z-API.</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem enviada ainda.</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data/Hora</TableHead>
                    <TableHead className="text-xs">Destinatário</TableHead>
                    <TableHead className="text-xs">Mensagem</TableHead>
                    <TableHead className="text-xs">Evento</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map(msg => (
                    <TableRow key={msg.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{msg.phone}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{msg.message_text}</TableCell>
                      <TableCell className="text-xs">{msg.template_key || 'manual'}</TableCell>
                      <TableCell>{getStatusBadge(msg.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
