import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { HeroSection } from './HeroSection';
import { calculateScore, recommendPool, recommendSize, type QuizAnswers, type PoolPriceInfo } from '@/lib/scoring';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { trackMetaEvent } from '@/components/MetaPixel';
import { type Lang, getQuizQuestions, t } from '@/lib/i18n';
import { getPoolImage } from '@/lib/poolImages';

// Pool images for preference step
import tortugaImg from '@/assets/pools/tortuga.webp';
import navagioImg from '@/assets/pools/navagio.webp';
import tradicionalImg from '@/assets/pools/tradicional.webp';

const PhotoUpload = lazy(() => import('./PhotoUpload').then(m => ({ default: m.PhotoUpload })));
const PhotoAnalysis = lazy(() => import('./PhotoAnalysis').then(m => ({ default: m.PhotoAnalysis })));
const PreDiagnosis = lazy(() => import('./PreDiagnosis').then(m => ({ default: m.PreDiagnosis })));
const QuizStep = lazy(() => import('./QuizStep').then(m => ({ default: m.QuizStep })));
const ProcessingScreen = lazy(() => import('./ProcessingScreen').then(m => ({ default: m.ProcessingScreen })));
const ResultScreen = lazy(() => import('./ResultScreen').then(m => ({ default: m.ResultScreen })));
const LeadForm = lazy(() => import('./LeadForm').then(m => ({ default: m.LeadForm })));
const ActionButtons = lazy(() => import('./ActionButtons').then(m => ({ default: m.ActionButtons })));

type Step = 'hero' | 'photos' | 'photo-analysis' | 'pre-diagnosis' | 'quiz' | 'processing' | 'result' | 'lead-form' | 'actions';

// Preference step images
const PREF_IMAGES: Record<string, string> = {
  prainha: tortugaImg,
  spa: navagioImg,
  simples: tradicionalImg,
};

interface QuizFlowProps {
  franchiseSlug?: string;
  franchiseName?: string;
  franchiseId?: string;
  franchiseWhatsapp?: string;
  isTestMode?: boolean;
}

interface PoolAlternative {
  nome_modelo: string;
  descricao: string | null;
  tamanho: string | null;
  preco_min: number | null;
  preco_max: number | null;
  possui_prainha: boolean | null;
  possui_spa: boolean | null;
  profundidade: number | null;
}

function StepFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero">
      <div className="animate-spin w-7 h-7 border-3 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

export function QuizFlow({ franchiseSlug, franchiseName, franchiseId, franchiseWhatsapp, isTestMode }: QuizFlowProps) {
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
  const [poolPrices, setPoolPrices] = useState<PoolPriceInfo[]>([]);
  const [poolAlternatives, setPoolAlternatives] = useState<PoolAlternative[]>([]);
  const [assignedWhatsapp, setAssignedWhatsapp] = useState<string | undefined>(undefined);
  const [assignedFranchiseName, setAssignedFranchiseName] = useState<string | undefined>(undefined);
  const [assignedCidadeBase, setAssignedCidadeBase] = useState<string | undefined>(undefined);

  const isSubmittingRef = useRef(false);
  const analyticsCtx = { franchiseId };

  const quizQuestions = getQuizQuestions(lang);

  useEffect(() => {
    trackEvent('landing_page_viewed', analyticsCtx);
    supabase.from('pool_models').select('nome_modelo, preco_min, preco_max').then(({ data }) => {
      if (data) setPoolPrices(data.map(d => ({ nome_modelo: d.nome_modelo, preco_min: d.preco_min, preco_max: d.preco_max })));
    });
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
      const pool = recommendPool(fullAnswers, poolPrices);
      const size = recommendSize(fullAnswers.espaco, pool);
      setScore(s);
      setPoolName(pool);
      setRecommendedSize(size);
      fetchPoolDescription(pool);
      fetchAlternatives(pool, fullAnswers);

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

  const fetchAlternatives = async (recommended: string, fullAnswers: QuizAnswers) => {
    try {
      // Map budget answer to max price filter
      const budgetMax: Record<string, number> = {
        'ate-18': 18000,
        '18-30': 30000,
        '30-50': 50000,
        '50-80': 80000,
        'mais-80': 999999,
      };
      const maxBudget = budgetMax[fullAnswers.orcamento] || 999999;

      // Map space answer to compatible size categories
      const spaceSizes: Record<string, ('pequena' | 'media' | 'grande')[]> = {
        'ate-3': ['pequena'],
        '3-5': ['pequena', 'media'],
        '5-7': ['media', 'grande'],
        'mais-7': ['media', 'grande'],
      };
      const allowedSizes = spaceSizes[fullAnswers.espaco] || (['pequena', 'media', 'grande'] as const);

      const { data } = await supabase
        .from('pool_models')
        .select('nome_modelo, descricao, tamanho, preco_min, preco_max, possui_prainha, possui_spa, profundidade, categoria_tamanho')
        .neq('nome_modelo', recommended)
        .neq('nome_modelo', 'Nassau')
        .in('categoria_tamanho', allowedSizes)
        .lte('preco_min', maxBudget)
        .limit(10);

      if (data) {
        const pref = fullAnswers.preferencia;
        let alts = data as (PoolAlternative & { categoria_tamanho?: string })[];
        // Prioritize alternatives that match preference
        const prefMatch = alts.filter(a => {
          if (pref === 'prainha') return a.possui_prainha;
          if (pref === 'spa') return a.possui_spa;
          return true;
        });
        const nonMatch = alts.filter(a => !prefMatch.includes(a));
        const sorted = [...prefMatch, ...nonMatch];
        setPoolAlternatives(sorted.slice(0, 2));
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

    // Test mode: skip lead creation, emails, and notifications
    if (isTestMode) {
      toast.success('Modo teste: lead simulado com sucesso (nada foi salvo)');
      setStep('actions');
      setSaving(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const { data: createLeadData, error } = await supabase.functions.invoke<{
        success: boolean;
        refCode?: string;
        assignedFranchiseId?: string;
        assignedWhatsapp?: string;
        assignedFranchiseName?: string;
        assignedCidadeBase?: string;
        territoryMatchStatus?: string;
      }>('create-lead', {
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
      setAssignedWhatsapp(createLeadData?.assignedWhatsapp || undefined);
      setAssignedFranchiseName(createLeadData?.assignedFranchiseName || undefined);
      setAssignedCidadeBase(createLeadData?.assignedCidadeBase || undefined);

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

      const notifyFranchiseId = createLeadData?.assignedFranchiseId || franchiseId;
      if (notifyFranchiseId) {
        supabase.functions.invoke('notify-new-lead', {
          body: {
            nome: data.nome,
            telefone: data.telefone,
            email: data.email || null,
            cidade: answers.cidade || null,
            franquia_id: notifyFranchiseId,
            origin_franchise_id: franchiseId || null,
            territory_match_status: createLeadData?.territoryMatchStatus || null,
            pontuacao_quintal: score,
            modelo_recomendado: poolName,
            referred_by: referredBy || null,
            created_at: new Date().toISOString(),
          },
        }).catch(() => {});
      }

      if (data.email) {
        supabase.functions.invoke('send-lead-result-email', {
          body: {
            nome: data.nome,
            email: data.email,
            pontuacao_quintal: score,
            modelo_recomendado: poolName,
            cidade: answers.cidade || null,
            franchise_name: createLeadData?.assignedFranchiseName || franchiseName || null,
            franchise_whatsapp: createLeadData?.assignedWhatsapp || franchiseWhatsapp || null,
            franchise_cidade_base: createLeadData?.assignedCidadeBase || null,
          },
        }).catch(() => {});
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

    trackMetaEvent('ViewContent', {
      content_name: poolName,
      content_category: answers.cidade || '',
      value: score,
      currency: 'BRL',
    });

    setStep('lead-form');
  };

  const currentQuizQuestion = quizStep < quizQuestions.length ? quizQuestions[quizStep] : null;

  // Inject images into preference step (step index 4 = preferencia)
  const enrichedQuestion = currentQuizQuestion && quizStep === 4 ? {
    ...currentQuizQuestion,
    options: currentQuizQuestion.options.map(opt => ({
      ...opt,
      image: PREF_IMAGES[opt.value],
    })),
  } : currentQuizQuestion;

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
        {step === 'quiz' && enrichedQuestion && quizStep < 6 && (
          <QuizStep
            key={`quiz-${quizStep}`}
            step={quizStep + 1}
            totalSteps={7}
            question={enrichedQuestion.question}
            options={enrichedQuestion.options}
            onAnswer={handleQuizAnswer}
            explorerStep={quizStep + 1}
            useImageLayout={quizStep === 4}
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
          <ResultScreen
            key="result"
            score={score}
            poolName={poolName}
            poolDescription={poolDesc}
            recommendedSize={recommendedSize}
            alternatives={poolAlternatives.map(a => ({
              name: a.nome_modelo,
              image: getPoolImage(a.nome_modelo),
              description: a.descricao || undefined,
              specs: {
                tamanho: recommendSize(answers.espaco || '', a.nome_modelo) || a.tamanho || undefined,
                profundidade: a.profundidade || undefined,
                possui_prainha: a.possui_prainha || false,
                possui_spa: a.possui_spa || false,
              },
            }))}
            cidade={answers.cidade}
            onContinue={handleResultContinue}
            lang={lang}
          />
        )}
        {step === 'lead-form' && (
          <LeadForm key="lead-form" onSubmit={handleLeadSubmit} onCheckDuplicate={isTestMode ? undefined : checkDuplicate} loading={saving} lang={lang} />
        )}
        {step === 'actions' && (
          <ActionButtons
            key="actions"
            score={score}
            poolName={poolName}
            poolDescription={poolDesc}
            poolSpecs={poolSpecs}
            recommendedSize={recommendedSize}
            whatsappNumber={assignedWhatsapp || franchiseWhatsapp}
            assignedFranchiseName={assignedFranchiseName}
            assignedCidadeBase={assignedCidadeBase}
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
