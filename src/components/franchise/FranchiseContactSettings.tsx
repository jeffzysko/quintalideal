import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Dados de Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Esses dados serão usados automaticamente nos botões de WhatsApp e e-mail do quiz dos seus leads.
          </p>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-xs font-medium">
              WhatsApp (com código do país, ex: 5551999999999)
            </Label>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="5551999999999"
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium">
              E-mail de contato
            </Label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contato@suafranquia.com"
                className="text-sm"
              />
            </div>
          </div>

          <Button onClick={handleSaveContact} disabled={savingContact} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {savingContact ? 'Salvando...' : 'Salvar dados de contato'}
          </Button>

          {franchiseUrl && (
            <div className="pt-2 border-t border-border">
              <Label className="text-xs font-medium text-muted-foreground">Seu link personalizado</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 truncate">{franchiseUrl}</code>
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1 shrink-0">
                  <Share2 className="w-3.5 h-3.5" />
                  Copiar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrações */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Integrações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-xs text-muted-foreground">
            Configure rastreamento de anúncios e envio automático de leads para o seu CRM.
          </p>

          {/* Meta Pixel */}
          <div className="space-y-2">
            <Label htmlFor="meta_pixel_id" className="text-xs font-medium">
              Meta Pixel ID (Facebook/Instagram Ads)
            </Label>
            <Input
              id="meta_pixel_id"
              value={metaPixelId}
              onChange={e => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
              placeholder="123456789012345"
              className="text-sm font-mono"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Encontre no{' '}
              <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                Meta Business Suite → Gerenciador de Eventos
              </a>
            </p>
          </div>

          {/* Webhook CRM */}
          <div className="pt-3 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-primary" />
              <Label className="text-xs font-semibold">Webhook para CRM</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Receba os dados dos leads automaticamente no seu CRM.{' '}
              <a href="/docs/webhook" target="_blank" className="text-primary underline">Ver documentação →</a>
            </p>

            <div className="space-y-2">
              <Label htmlFor="webhook_url" className="text-xs font-medium">URL do Webhook</Label>
              <Input
                id="webhook_url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://seu-crm.com/api/webhook"
                className="text-sm font-mono"
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_secret" className="text-xs font-medium">Secret (para validação HMAC)</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="webhook_secret"
                    value={webhookSecret}
                    onChange={e => setWebhookSecret(e.target.value)}
                    placeholder="Gere ou cole um secret"
                    className="text-sm font-mono pr-10"
                    type={showSecret ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={generateSecret} className="gap-1 shrink-0">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use este secret para validar a autenticidade dos webhooks recebidos.
              </p>
            </div>
          </div>

          <Button onClick={handleSaveIntegrations} disabled={savingIntegrations} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {savingIntegrations ? 'Salvando...' : 'Salvar integrações'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
