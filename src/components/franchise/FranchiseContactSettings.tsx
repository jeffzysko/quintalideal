import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail, Save, Share2, BarChart3, Webhook, Eye, EyeOff, RefreshCw, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { SITE_URL } from '@/lib/constants';

interface Props {
  franchiseId: string;
}

export function FranchiseContactSettings({ franchiseId }: Props) {
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [metaPixelId, setMetaPixelId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [slug, setSlug] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('franchises')
        .select('whatsapp, email, slug_url, meta_pixel_id, webhook_url, webhook_secret')
        .eq('id', franchiseId)
        .maybeSingle();
      if (data) {
        setWhatsapp(data.whatsapp || '');
        setEmail(data.email || '');
        setSlug(data.slug_url || '');
        setMetaPixelId(data.meta_pixel_id || '');
        setWebhookUrl(data.webhook_url || '');
        setWebhookSecret(data.webhook_secret || '');
      }
      setLoading(false);
    }
    load();
  }, [franchiseId]);

  const handleSaveContact = async () => {
    setSavingContact(true);
    const { error } = await supabase
      .from('franchises')
      .update({ whatsapp, email })
      .eq('id', franchiseId);
    if (error) toast.error('Erro ao salvar. Tente novamente.');
    else toast.success('Dados de contato atualizados!');
    setSavingContact(false);
  };

  const handleSaveIntegrations = async () => {
    setSavingIntegrations(true);
    const { error } = await supabase
      .from('franchises')
      .update({
        meta_pixel_id: metaPixelId || null,
        webhook_url: webhookUrl || null,
        webhook_secret: webhookSecret || null,
      })
      .eq('id', franchiseId);
    if (error) toast.error('Erro ao salvar. Tente novamente.');
    else toast.success('Integrações atualizadas!');
    setSavingIntegrations(false);
  };

  const generateSecret = () => {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    const secret = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    setWebhookSecret(secret);
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast.error('Configure uma URL de webhook primeiro.');
      return;
    }
    setTestingWebhook(true);
    try {
      const { data, error } = await supabaseClient.functions.invoke('test-webhook', {
        body: { franchiseId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(data.message || 'Webhook enviado com sucesso!');
      } else {
        toast.error(data?.message || 'Falha ao enviar webhook de teste.');
      }
    } catch {
      toast.error('Erro ao testar webhook. Verifique a URL e tente novamente.');
    } finally {
      setTestingWebhook(false);
    }
  };

  const franchiseUrl = slug ? `${SITE_URL}/${slug}` : '';

  const handleCopyLink = () => {
    if (franchiseUrl) {
      navigator.clipboard.writeText(franchiseUrl);
      toast.success('Link copiado!');
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* Dados de Contato */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            Dados de Contato
          </CardTitle>
          <CardDescription className="text-xs">
            Esses dados serão usados automaticamente nos botões de WhatsApp e e-mail do quiz dos seus leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="contact-whatsapp" className="text-xs font-medium">
              WhatsApp (com código do país, ex: 5551999999999)
            </Label>
            <Input
              id="contact-whatsapp"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder="5551999999999"
              className="rounded-xl h-11 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact-email" className="text-xs font-medium">
              E-mail de contato
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="contato@suafranquia.com"
              className="rounded-xl h-11"
            />
          </div>

          <Button onClick={handleSaveContact} disabled={savingContact} className="w-full gap-2 rounded-xl h-11">
            <Save className="w-4 h-4" />
            {savingContact ? 'Salvando...' : 'Salvar dados de contato'}
          </Button>

          {franchiseUrl && (
            <div className="pt-3 border-t border-border/30">
              <Label className="text-xs font-medium text-muted-foreground">Seu link personalizado</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <code className="text-xs bg-muted px-3 py-2.5 rounded-xl flex-1 truncate font-mono">{franchiseUrl}</code>
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1.5 shrink-0 rounded-xl h-11">
                  <Share2 className="w-3.5 h-3.5" />
                  Copiar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrações */}
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            Integrações
          </CardTitle>
          <CardDescription className="text-xs">
            Configure rastreamento de anúncios e envio automático de leads para o seu CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Meta Pixel */}
          <div className="space-y-1.5">
            <Label htmlFor="meta_pixel_id" className="text-xs font-medium">
              Meta Pixel ID (Facebook/Instagram Ads)
            </Label>
            <Input
              id="meta_pixel_id"
              value={metaPixelId}
              onChange={e => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
              placeholder="123456789012345"
              className="rounded-xl h-11 font-mono text-sm"
              maxLength={20}
            />
            <p className="text-[11px] text-muted-foreground">
              Encontre no{' '}
              <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Meta Business Suite → Gerenciador de Eventos
              </a>
            </p>
          </div>

          {/* Webhook CRM */}
          <div className="pt-4 border-t border-border/30 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <Webhook className="w-3.5 h-3.5 text-primary" />
              </div>
              <Label className="text-xs font-semibold">Webhook para CRM</Label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Receba os dados dos leads automaticamente no seu CRM.{' '}
              <a href="/docs/webhook" target="_blank" className="text-primary underline">Ver documentação →</a>
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="webhook_url" className="text-xs font-medium">URL do Webhook</Label>
              <Input
                id="webhook_url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://seu-crm.com/api/webhook"
                className="rounded-xl h-11 font-mono text-sm"
                type="url"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhook_secret" className="text-xs font-medium">Secret (para validação HMAC)</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="webhook_secret"
                    value={webhookSecret}
                    onChange={e => setWebhookSecret(e.target.value)}
                    placeholder="Gere ou cole um secret"
                    className="rounded-xl h-11 font-mono text-sm pr-10"
                    type={showSecret ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={generateSecret} className="gap-1.5 shrink-0 rounded-xl h-11">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Use este secret para validar a autenticidade dos webhooks recebidos.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveIntegrations} disabled={savingIntegrations} className="flex-1 gap-2 rounded-xl h-11">
              <Save className="w-4 h-4" />
              {savingIntegrations ? 'Salvando...' : 'Salvar integrações'}
            </Button>
            {webhookUrl && (
              <Button
                variant="outline"
                onClick={handleTestWebhook}
                disabled={testingWebhook}
                className="gap-2 shrink-0 rounded-xl h-11"
              >
                {testingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {testingWebhook ? 'Enviando...' : 'Testar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
