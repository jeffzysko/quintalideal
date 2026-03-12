import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail, Save, Share2, BarChart3, Webhook, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { SITE_URL } from '@/lib/constants';

interface Props {
  franchiseId: string;
}

export function FranchiseContactSettings({ franchiseId }: Props) {
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [metaPixelId, setMetaPixelId] = useState('');
  const [slug, setSlug] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [savingPixel, setSavingPixel] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('franchises')
        .select('whatsapp, email, slug_url, meta_pixel_id')
        .eq('id', franchiseId)
        .maybeSingle();
      if (data) {
        setWhatsapp(data.whatsapp || '');
        setEmail(data.email || '');
        setSlug(data.slug_url || '');
        setMetaPixelId(data.meta_pixel_id || '');
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

  const handleSavePixel = async () => {
    setSavingPixel(true);
    const { error } = await supabase
      .from('franchises')
      .update({ meta_pixel_id: metaPixelId || null })
      .eq('id', franchiseId);
    if (error) toast.error('Erro ao salvar. Tente novamente.');
    else toast.success('Meta Pixel atualizado!');
    setSavingPixel(false);
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

      {/* Integrações / Meta Pixel */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Integrações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Configure o rastreamento de anúncios para medir conversões no seu link de divulgação.
          </p>

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

          <Button onClick={handleSavePixel} disabled={savingPixel} className="w-full gap-2">
            <Save className="w-4 h-4" />
            {savingPixel ? 'Salvando...' : 'Salvar integração'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
