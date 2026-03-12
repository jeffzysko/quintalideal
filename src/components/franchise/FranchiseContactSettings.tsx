import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Mail, Save, Share2, BarChart3 } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('franchises')
      .update({ whatsapp, email })
      .eq('id', franchiseId);

    if (error) {
      toast.error('Erro ao salvar. Tente novamente.');
    } else {
      toast.success('Dados de contato atualizados!');
    }
    setSaving(false);
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

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar dados de contato'}
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
  );
}
