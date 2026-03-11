import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QuizFlow } from '@/components/splash/QuizFlow';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';

interface Franchise {
  id: string;
  nome_franquia: string;
  slug_url: string;
  whatsapp: string;
  ativa: boolean;
}

export default function FranchiseLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <h1 className="text-xl font-bold text-foreground">
          {franchise && !franchise.ativa ? 'Franquia indisponível' : 'Página não encontrada'}
        </h1>
        <p className="text-muted-foreground text-center max-w-md">
          {franchise && !franchise.ativa
            ? 'Esta franquia está temporariamente indisponível. Tente novamente mais tarde.'
            : 'Não encontramos a página que você procura. Verifique o link e tente novamente.'}
        </p>
        <p className="text-sm text-muted-foreground">Entre em contato com a Splash Piscinas para mais informações.</p>
        <Button onClick={() => navigate('/')} className="gap-2 mt-2">
          <Home className="w-4 h-4" /> Voltar ao início
        </Button>
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
