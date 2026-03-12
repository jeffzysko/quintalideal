import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { HeroSection } from './HeroSection';
import { calculateScore, recommendPool, recommendSize, type QuizAnswers } from '@/lib/scoring';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { trackMetaEvent } from '@/components/MetaPixel';
import { type Lang, getQuizQuestions, t } from '@/lib/i18n';

const PhotoUpload = lazy(() => import('./PhotoUpload').then(m => ({ default: m.PhotoUpload })));
const PhotoAnalysis = lazy(() => import('./PhotoAnalysis').then(m => ({ default: m.PhotoAnalysis })));
const PreDiagnosis = lazy(() => import('./PreDiagnosis').then(m => ({ default: m.PreDiagnosis })));
const QuizStep = lazy(() => import('./QuizStep').then(m => ({ default: m.QuizStep })));
const ProcessingScreen = lazy(() => import('./ProcessingScreen').then(m => ({ default: m.ProcessingScreen })));
const ResultScreen = lazy(() => import('./ResultScreen').then(m => ({ default: m.ResultScreen })));
const LeadForm = lazy(() => import('./LeadForm').then(m => ({ default: m.LeadForm })));
const ActionButtons = lazy(() => import('./ActionButtons').then(m => ({ default: m.ActionButtons })));

type Step = 'hero' | 'photos' | 'photo-analysis' | 'pre-diagnosis' | 'quiz' | 'processing' | 'result' | 'lead-form' | 'actions';

interface QuizFlowProps {
  franchiseSlug?: string;
  franchiseName?: string;
  franchiseId?: string;
  franchiseWhatsapp?: string;
}

function StepFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero">
      <div className="animate-spin w-7 h-7 border-3 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export function QuizFlow({ franchiseSlug, franchiseName, franchiseId, franchiseWhatsapp }: QuizFlowProps) {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get('ref') || '';

  const [lang, setLang] = useState<Lang>('pt');
  const [step, setStep] = useState<Step>('hero');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [score, setScore] = useState(0);
  const [poolName, setPoolName] = useState('');
  const [poolDesc, setPoolDesc] = useState('');
  const [poolSpecs, setPoolSpecs] = useState<{ tamanho?: string; profundidade?: number; possui_prainha?: boolean; possui_spa?: boolean } | null>(null);
  const [recommendedSize, setRecommendedSize] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadRefCode, setLeadRefCode] = useState('');
  const [saving, setSaving] = useState(false);

  const isSubmittingRef = useRef(false);
  const analyticsCtx = { franchiseId };

  const quizQuestions = getQuizQuestions(lang);

  useEffect(() => {
    trackEvent('landing_page_viewed', analyticsCtx);
  }, []);

  const answerKeys: (keyof QuizAnswers)[] = ['espaco', 'moradia', 'uso', 'intencao', 'preferencia', 'orcamento', 'cidade'];

  const handleQuizAnswer = useCallback((value: string) => {
    const key = answerKeys[quizStep];
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);

    trackEvent('quiz_question_answered', {
      ...analyticsCtx,
      metadata: { question_number: quizStep + 1, answer: value },
    });

    if (quizStep < quizQuestions.length) {
      setQuizStep(prev => prev + 1);
    }

    if (quizStep === 6) {
      const fullAnswers = newAnswers as QuizAnswers;
      const s = calculateScore(fullAnswers);
      const pool = recommendPool(fullAnswers);
      const size = recommendSize(fullAnswers.espaco, pool);
      setScore(s);
      setPoolName(pool);
      setRecommendedSize(size);
      fetchPoolDescription(pool);

      trackEvent('quiz_completed', {
        ...analyticsCtx,
        city: fullAnswers.cidade,
        metadata: { score: s, modelo_recomendado: pool },
      });

      trackMetaEvent('CompleteRegistration', {
        content_name: pool,
        value: s,
        currency: 'BRL',
      });

      setStep('processing');
    }
  }, [quizStep, answers, lang]);

  const fetchPoolDescription = async (name: string) => {
    try {
      const { data } = await supabase
        .from('pool_models')
        .select('descricao, tamanho, profundidade, possui_prainha, possui_spa')
        .eq('nome_modelo', name)
        .single();
      if (data) {
        setPoolDesc(data.descricao || '');
        setPoolSpecs({
          tamanho: data.tamanho || undefined,
          profundidade: data.profundidade || undefined,
          possui_prainha: data.possui_prainha || false,
          possui_spa: data.possui_spa || false,
        });
      }
    } catch {
      // Non-critical
    }
  };

  const checkDuplicate = async (telefone: string, email: string) => {
    const { data, error } = await supabase.functions.invoke('check-duplicate-lead', {
      body: { telefone, email: email || null },
    });
    if (error) throw error;
    return data as { duplicate: boolean; field?: string; franchiseName?: string | null };
  };

  const handleLeadSubmit = async (data: { nome: string; telefone: string; email: string }) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setSaving(true);
    setLeadName(data.nome);
    try {
      const { data: createLeadData, error } = await supabase.functions.invoke<{ success: boolean; refCode?: string }>('create-lead', {
        body: {
          nome: data.nome,
          telefone: data.telefone,
          email: data.email || null,
          cidade: answers.cidade || null,
          franquia_id: franchiseId || null,
          pontuacao_quintal: score,
          modelo_recomendado: poolName,
          respostas_questionario: answers,
          foto1: photoUrls[0] || null,
          foto2: photoUrls[1] || null,
          foto3: photoUrls[2] || null,
          foto4: photoUrls[3] || null,
          referred_by: referredBy || null,
        },
      });

      if (error) throw error;

      setLeadRefCode(createLeadData?.refCode || '');

      trackEvent('lead_created', {
        ...analyticsCtx,
        city: answers.cidade,
        metadata: { modelo_recomendado: poolName, score },
      });

      trackMetaEvent('Lead', {
        content_name: poolName,
        content_category: answers.cidade || '',
        value: score,
        currency: 'BRL',
      });

      if (franchiseId) {
        supabase.functions.invoke('notify-new-lead', {
          body: {
            nome: data.nome,
            telefone: data.telefone,
            email: data.email || null,
            cidade: answers.cidade || null,
            franquia_id: franchiseId,
            pontuacao_quintal: score,
            modelo_recomendado: poolName,
            referred_by: referredBy || null,
            created_at: new Date().toISOString(),
          },
        }).catch(() => { /* non-critical */ });
      }

      setStep('actions');
    } catch (err: unknown) {
      console.error('Lead submit error:', err);
      toast.error(t('lead_error_submit', lang));
      isSubmittingRef.current = false;
    } finally {
      setSaving(false);
    }
  };

  const handleStartQuiz = () => {
    trackEvent('quiz_started', analyticsCtx);
    setStep('photos');
  };

  const handlePhotosNext = (urls: string[]) => {
    setPhotoUrls(urls);
    trackEvent('photo_uploaded', {
      ...analyticsCtx,
      metadata: { quantidade_de_fotos: urls.length },
    });
    setStep(urls.length > 0 ? 'photo-analysis' : 'quiz');
  };

  const handleResultContinue = () => {
    trackEvent('result_viewed', {
      ...analyticsCtx,
      city: answers.cidade,
      metadata: { modelo_recomendado: poolName, indice_quintal: score },
    });
    setStep('lead-form');
  };

  const currentQuizQuestion = quizStep < quizQuestions.length ? quizQuestions[quizStep] : null;

  return (
    <AnimatePresence mode="wait">
      {step === 'hero' && (
        <HeroSection
          key="hero"
          onStart={handleStartQuiz}
          franchiseName={franchiseName}
          franchiseSlug={franchiseSlug}
          lang={lang}
          onLangChange={setLang}
        />
      )}
      <Suspense fallback={<StepFallback />}>
        {step === 'photos' && (
          <PhotoUpload key="photos" onNext={handlePhotosNext} onBack={() => setStep('hero')} lang={lang} />
        )}
        {step === 'photo-analysis' && (
          <PhotoAnalysis key="photo-analysis" onDone={() => setStep('pre-diagnosis')} lang={lang} />
        )}
        {step === 'pre-diagnosis' && (
          <PreDiagnosis key="pre-diagnosis" onContinue={() => setStep('quiz')} lang={lang} />
        )}
        {step === 'quiz' && currentQuizQuestion && (
          <QuizStep
            key={`quiz-${quizStep}`}
            step={quizStep + 1}
            totalSteps={7}
            question={currentQuizQuestion.question}
            options={currentQuizQuestion.options}
            onAnswer={handleQuizAnswer}
            explorerStep={quizStep + 1}
            onBack={() => {
              if (quizStep === 0) setStep('photos');
              else setQuizStep(prev => prev - 1);
            }}
            lang={lang}
          />
        )}
        {step === 'quiz' && quizStep === 6 && (
          <QuizStep
            key="quiz-city"
            step={7}
            totalSteps={7}
            question={t('quiz_city', lang)}
            type="city"
            onAnswer={handleQuizAnswer}
            explorerStep={7}
            onBack={() => setQuizStep(5)}
            franchiseSlug={franchiseSlug}
            lang={lang}
          />
        )}
        {step === 'processing' && (
          <ProcessingScreen key="processing" onDone={() => setStep('result')} lang={lang} />
        )}
        {step === 'result' && (
          <ResultScreen key="result" score={score} poolName={poolName} poolDescription={poolDesc} onContinue={handleResultContinue} lang={lang} />
        )}
        {step === 'lead-form' && (
          <LeadForm key="lead-form" onSubmit={handleLeadSubmit} onCheckDuplicate={checkDuplicate} loading={saving} lang={lang} />
        )}
        {step === 'actions' && (
          <ActionButtons
            key="actions"
            score={score}
            poolName={poolName}
            poolDescription={poolDesc}
            poolSpecs={poolSpecs}
            recommendedSize={recommendedSize}
            whatsappNumber={franchiseWhatsapp}
            leadName={leadName}
            refCode={leadRefCode}
            franchiseId={franchiseId}
            lang={lang}
          />
        )}
      </Suspense>
    </AnimatePresence>
  );
}
