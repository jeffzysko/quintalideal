import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QuizFlow } from '@/components/splash/QuizFlow';

interface Franchise {
  id: string;
  nome_franquia: string;
  slug_url: string;
  whatsapp: string;
  ativa: boolean;
}

export default function FranchiseLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const { data } = await supabase
        .from('franchises')
        .select('id, nome_franquia, slug_url, whatsapp, ativa')
        .eq('slug_url', slug)
        .maybeSingle();
      setFranchise(data);
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
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-2">
            {franchise && !franchise.ativa ? 'Esta franquia está temporariamente indisponível.' : 'Franquia não encontrada.'}
          </p>
          <p className="text-sm text-muted-foreground">Entre em contato com a Splash Piscinas para mais informações.</p>
        </div>
      </div>
    );
  }

  return (
    <QuizFlow
      franchiseSlug={franchise.slug_url}
      franchiseName={franchise.nome_franquia}
      franchiseId={franchise.id}
      franchiseWhatsapp={franchise.whatsapp}
    />
  );
}
