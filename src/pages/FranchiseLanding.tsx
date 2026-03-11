import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { QuizFlow } from '@/components/splash/QuizFlow';

interface Franchise {
  id: string;
  nome_franquia: string;
  slug_url: string;
  whatsapp: string;
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
        .select('id, nome_franquia, slug_url, whatsapp')
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

  if (!franchise) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-muted-foreground">Franquia não encontrada.</p>
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
