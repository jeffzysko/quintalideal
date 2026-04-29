import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QuizFlow } from '@/components/splash/QuizFlow';
import { MetaPixel } from '@/components/MetaPixel';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';
import { PublicFooter } from '@/components/Footer';

interface Franchise {
  id: string;
  nome_franquia: string;
  slug_url: string;
  whatsapp: string | null;
  ativa: boolean;
  meta_pixel_id: string | null;
  brand_id: string | null;
  brand_name: string | null;
  brand_logo_url: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_slogan: string | null;
  brand_score_label: string | null;
}

export default function FranchiseLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!slug) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_public_franchise_by_slug', {
        _slug: slug,
      });

      if (error) {
        console.error('Erro ao carregar franquia pública:', error.message);
        setFranchise(null);
        setLoading(false);
        return;
      }

      setFranchise((data?.[0] as Franchise) ?? null);
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!franchise || !franchise.ativa) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <h1 className="text-xl font-bold text-foreground">
            {franchise && !franchise.ativa ? 'Franquia indisponível' : 'Página não encontrada'}
          </h1>
          <p className="text-muted-foreground text-center max-w-md">
            {franchise && !franchise.ativa
              ? 'Esta franquia está temporariamente indisponível. Tente novamente mais tarde.'
              : 'Não encontramos a página que você procura. Verifique o link e tente novamente.'}
          </p>
          <p className="text-sm text-muted-foreground">Entre em contato para mais informações.</p>
          <Button onClick={() => navigate('/')} className="gap-2 mt-2">
            <Home className="w-4 h-4" /> Voltar ao início
          </Button>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="relative">
      {franchise.meta_pixel_id && <MetaPixel pixelId={franchise.meta_pixel_id} />}
      <QuizFlow
        franchiseSlug={franchise.slug_url}
        franchiseName={franchise.nome_franquia}
        franchiseId={franchise.id}
        franchiseWhatsapp={franchise.whatsapp || undefined}
        brandId={franchise.brand_id || undefined}
        brandName={franchise.brand_name || undefined}
        brandLogoUrl={franchise.brand_logo_url || undefined}
        brandPrimaryColor={franchise.brand_primary_color || '#16a34a'}
        brandSecondaryColor={franchise.brand_secondary_color || '#15803d'}
        brandSlogan={franchise.brand_slogan || undefined}
        brandScoreLabel={franchise.brand_score_label || undefined}
        isTestMode={false}
      />
    </div>
  );
}
