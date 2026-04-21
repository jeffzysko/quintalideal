import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Star, CheckCircle2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PublicFooter } from '@/components/Footer';

interface FranchiseInfo {
  nome_franquia: string;
  slug_url: string;
  logo_url: string | null;
}

export default function PublicReview() {
  const { token } = useParams<{ token: string }>();
  const [franchise, setFranchise] = useState<FranchiseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data: review } = await supabase
        .from('post_sale_reviews')
        .select('submitted_at, project_id')
        .eq('token', token)
        .maybeSingle();

      if (!review) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (review.submitted_at) {
        setAlreadySubmitted(true);
      }

      const { data: project } = await supabase
        .from('post_sale_projects')
        .select('franchise_id')
        .eq('id', review.project_id)
        .maybeSingle();

      if (project?.franchise_id) {
        const { data: f } = await supabase
          .from('franchises')
          .select('nome_franquia, slug_url, logo_url')
          .eq('id', project.franchise_id)
          .maybeSingle();
        if (f) setFranchise(f as FranchiseInfo);
      }

      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error('Selecione uma avaliação');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('submit_post_sale_review', {
      _token: token!,
      _rating: rating,
      _note: comment.trim() || null,
      _recommend: wouldRecommend,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Erro ao enviar avaliação.');
      return;
    }
    setSubmitted(true);
  };

  const ratingLabels: Record<number, string> = {
    1: 'Muito insatisfeito',
    2: 'Insatisfeito',
    3: 'Neutro',
    4: 'Satisfeito',
    5: 'Muito satisfeito!',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-xl font-semibold text-foreground mb-2">Link não encontrado</h2>
          <p className="text-muted-foreground text-sm">Este link de avaliação não é válido ou expirou.</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted && !submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Avaliação já enviada</h2>
          <p className="text-muted-foreground text-sm">Você já avaliou esta instalação. Obrigado pelo feedback!</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-5">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Obrigado pelo feedback!</h2>
            <p className="text-muted-foreground text-sm">Sua avaliação foi enviada com sucesso.</p>
          </div>
          {rating >= 4 && franchise?.slug_url && (
            <div className="bg-success/10 border border-success/20 rounded-2xl p-4 text-left space-y-3">
              <p className="text-sm font-medium text-foreground">
                🌟 Que ótimo! Você adorou o resultado. Tem alguém que também merece uma piscina?
              </p>
              <p className="text-xs text-muted-foreground">
                Indique um amigo ou familiar e ajude quem você gosta a ter o resultado dos sonhos.
              </p>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  const msg = encodeURIComponent(
                    `Oi! Acabei de instalar minha piscina com a ${franchise.nome_franquia} e amei o resultado. Você também pode ter a sua! Acesse: ${window.location.origin}/${franchise.slug_url}`
                  );
                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                }}
              >
                <MessageCircle className="h-4 w-4" />
                Indicar pelo WhatsApp
              </Button>
            </div>
          )}
          <img src="/lettering-quintal-ideal.svg" alt="Quintal Ideal" className="h-7 mx-auto opacity-50 mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/5 to-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          {franchise?.logo_url ? (
            <img src={franchise.logo_url} alt={franchise.nome_franquia} className="h-10 mx-auto object-contain mb-1" />
          ) : (
            <img src="/lettering-quintal-ideal.svg" alt="Quintal Ideal" className="h-8 mx-auto" />
          )}
          <h1 className="text-2xl font-bold text-foreground">Como foi sua experiência?</h1>
          <p className="text-muted-foreground text-sm">
            {franchise?.nome_franquia ? `Avalie sua instalação com a ${franchise.nome_franquia}.` : 'Avalie sua instalação.'}{' '}
            Leva menos de 1 minuto.
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-4">
          <p className="text-sm font-medium text-foreground text-center">Qual nota você dá para a instalação?</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110 active:scale-95"
                aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>
          {(hoverRating || rating) > 0 && (
            <p className="text-center text-sm text-foreground font-medium">
              {ratingLabels[hoverRating || rating]}
            </p>
          )}
        </div>

        {rating > 0 && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-3">
            <p className="text-sm font-medium text-foreground">Você indicaria para amigos ou familiares?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setWouldRecommend(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  wouldRecommend === true
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary/40'
                }`}
              >
                Sim, com certeza!
              </button>
              <button
                onClick={() => setWouldRecommend(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  wouldRecommend === false
                    ? 'bg-muted text-foreground border-muted-foreground/40'
                    : 'bg-background text-foreground border-border hover:border-muted-foreground/40'
                }`}
              >
                Não agora
              </button>
            </div>
          </div>
        )}

        {rating > 0 && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Quer deixar algum comentário?{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </p>
            <Textarea
              placeholder="Conte o que achou do serviço, atendimento, resultado..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none text-sm rounded-xl"
            />
          </div>
        )}

        <Button
          className="w-full h-12 text-base font-semibold rounded-2xl"
          disabled={!rating || submitting}
          onClick={handleSubmit}
          size="lg"
        >
          {submitting ? 'Enviando...' : 'Enviar avaliação'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Sua resposta ajuda a melhorar nosso serviço.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
