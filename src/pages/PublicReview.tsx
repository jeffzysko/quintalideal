import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function PublicReview() {
  const { token } = useParams<{ token: string }>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data } = await supabase
        .from('post_sale_reviews')
        .select('submitted_at')
        .eq('token', token)
        .maybeSingle();
      if (data?.submitted_at) setAlreadyDone(true);
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!rating) { toast.error('Selecione uma avaliação'); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc('submit_post_sale_review', {
      _token: token!,
      _rating: rating,
      _note: comment.trim() || null,
      _recommend: wouldRecommend,
    });
    setSubmitting(false);
    if (error) { toast.error('Erro ao enviar avaliação.'); return; }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (alreadyDone || submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="text-6xl mb-4">{submitted ? '🎉' : '✅'}</div>
        <h1 className="text-xl font-bold mb-2 text-foreground">
          {submitted ? 'Obrigado pela avaliação!' : 'Avaliação já enviada'}
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          {submitted
            ? 'Sua opinião é muito importante para continuarmos melhorando.'
            : 'Esta avaliação já foi respondida. Obrigado!'}
        </p>
        {submitted && wouldRecommend && (
          <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 max-w-xs">
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              Conhece alguém que também gostaria de ter uma piscina? 🏊
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Compartilhe e ajude a realizar mais sonhos!
            </p>
          </div>
        )}
        <img src="/lettering-quintal-ideal.svg" alt="Quintal Ideal" className="h-8 mt-8 opacity-50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary/5 border-b border-primary/10 px-6 py-4 flex items-center gap-3">
        <img src="/lettering-quintal-ideal.svg" alt="Quintal Ideal" className="h-7" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full space-y-8">
        <div className="text-center">
          <div className="text-5xl mb-3">🌊</div>
          <h1 className="text-xl font-bold text-foreground">Como foi a sua experiência?</h1>
          <p className="text-sm text-muted-foreground mt-1">Sua opinião nos ajuda a melhorar</p>
        </div>

        <div>
          <p className="text-sm font-medium text-center mb-4 text-foreground">Toque para avaliar:</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110 active:scale-95" aria-label={`${s} estrela${s > 1 ? 's' : ''}`}>
                <Star className={cn("w-12 h-12 transition-colors", s <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm font-semibold mt-2 text-foreground">
              {['', 'Ruim 😞', 'Regular 😐', 'Bom 🙂', 'Ótimo 😊', 'Excelente! 🤩'][rating]}
            </p>
          )}
        </div>

        {rating >= 4 && (
          <div>
            <p className="text-sm font-medium text-center mb-3 text-foreground">Você recomendaria para amigos?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setWouldRecommend(true)}
                className={cn("flex-1 py-3 rounded-xl border text-sm font-medium transition-all", wouldRecommend === true ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300" : "border-border text-muted-foreground hover:border-emerald-300")}
              >
                👍 Sim, com certeza!
              </button>
              <button
                onClick={() => setWouldRecommend(false)}
                className={cn("flex-1 py-3 rounded-xl border text-sm font-medium transition-all", wouldRecommend === false ? "border-destructive/40 bg-destructive/5 text-destructive" : "border-border text-muted-foreground")}
              >
                👎 Talvez não
              </button>
            </div>
          </div>
        )}

        {rating > 0 && (
          <div>
            <label className="text-sm font-medium block mb-2 text-foreground">
              Quer deixar um comentário? <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Conte como foi sua experiência..."
              rows={3}
              className="resize-none rounded-xl"
              maxLength={500}
            />
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          size="lg"
          className="w-full h-12 rounded-xl text-base font-semibold"
        >
          {submitting ? 'Enviando...' : 'Enviar avaliação'}
        </Button>
      </div>
    </div>
  );
}
