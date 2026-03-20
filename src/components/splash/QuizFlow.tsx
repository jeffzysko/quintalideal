import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { HeroSection } from './HeroSection';
import { normalizeQuizToV2, recommendPoolsV2, type PoolModelData, type RecommendationResultV2 } from '@/lib/scoring-v2';
// Legacy scoring kept for backward compat reference
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

const LeadForm = lazy(() => import('./LeadForm').then(m => ({ default: m.LeadForm })));
const ActionButtons = lazy(() => import('./ActionButtons').then(m => ({ default: m.ActionButtons })));

type Step = 'hero' | 'photos' | 'photo-analysis' | 'pre-diagnosis' | 'quiz' | 'processing' | 'lead-form' | 'actions';

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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<RecommendationResultV2 | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadRefCode, setLeadRefCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [allModels, setAllModels] = useState<PoolModelData[]>([]);
  const [assignedWhatsapp, setAssignedWhatsapp] = useState<string | undefined>(undefined);
  const [assignedFranchiseName, setAssignedFranchiseName] = useState<string | undefined>(undefined);
  const [assignedCidadeBase, setAssignedCidadeBase] = useState<string | undefined>(undefined);

  const isSubmittingRef = useRef(false);
  const analyticsCtx = { franchiseId };

  const quizQuestions = getQuizQuestions(lang);
  // Total quiz option steps (not counting city)
  const QUIZ_OPTION_STEPS = quizQuestions.length; // 6 (espaco, moradia, uso, intencao, preferencia, orcamento)
  const CITY_STEP = QUIZ_OPTION_STEPS; // step index 6 = city
  const TOTAL_STEPS = QUIZ_OPTION_STEPS + 1; // 7 total

  useEffect(() => {
    trackEvent('landing_page_viewed', analyticsCtx);
    supabase
      .from('pool_models')
      .select('nome_modelo, categoria_tamanho, tamanho, preco_min, preco_max, possui_prainha, possui_spa, profundidade, comprimento, largura, descricao')
      .then(({ data }) => {
        if (data) setAllModels(data as PoolModelData[]);
      });
  }, []);

  const answerKeys = ['espaco', 'moradia', 'uso', 'intencao', 'preferencia', 'orcamento', 'cidade'];

  const handleQuizAnswer = useCallback((value: string) => {
    const key = answerKeys[quizStep];
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);

    trackEvent('quiz_question_answered', {
      ...analyticsCtx,
      metadata: { question_number: quizStep + 1, answer: value },
    });

    // If not last step, advance
    if (quizStep < TOTAL_STEPS - 1) {
      setQuizStep(prev => prev + 1);
      return;
    }

    // Last step (city) — run recommendation engine
    const v2Input = normalizeQuizToV2(newAnswers);
    const result = recommendPoolsV2(v2Input, allModels);
    setRecommendation(result);

    trackEvent('quiz_completed', {
      ...analyticsCtx,
      city: newAnswers.cidade,
      metadata: {
        score: result.legacy_score,
        modelo_recomendado: result.primary_model.nome_modelo,
        match_score: result.primary_score,
        fit_level: result.fit_level,
        customer_profile: result.customer_profile,
      },
    });

    trackMetaEvent('CompleteRegistration', {
      content_name: result.primary_model.nome_modelo,
      value: result.legacy_score,
      currency: 'BRL',
    });

    setStep('lead-form');
  }, [quizStep, answers, allModels, lang]);

  const checkDuplicate = async (telefone: string, email: string) => {
    const { data, error } = await supabase.functions.invoke('check-duplicate-lead', {
      body: { telefone, email: email || null },
    });
    if (error) throw error;
    return data as { duplicate: boolean; field?: string; franchiseName?: string | null };
  };

  const handleLeadSubmit = async (data: { nome: string; telefone: string; email: string }) => {
    if (isSubmittingRef.current || !recommendation) return;
    isSubmittingRef.current = true;

    const score = recommendation.legacy_score;
    const poolName = recommendation.primary_model.nome_modelo;

    setSaving(true);
    setLeadName(data.nome);

    if (isTestMode) {
      toast.success('Modo teste: lead simulado com sucesso (nada foi salvo)');
      setStep('processing');
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
          respostas_questionario: {
            ...answers,
            customer_profile: recommendation.customer_profile,
            objective_main: recommendation.reasoning ? answers.uso : undefined,
            match_score: recommendation.primary_score,
            fit_level: recommendation.fit_level,
            reasoning: recommendation.reasoning,
            alternatives: recommendation.alternatives.map(a => a.model.nome_modelo),
            upgrade_shown: !!recommendation.upgrade_option,
            is_hot_lead: recommendation.is_hot_lead,
            sales_script: recommendation.sales_script,
          },
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

      setStep('processing');
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

  const handleProcessingDone = () => {
    if (!recommendation) return;
    trackEvent('result_viewed', {
      ...analyticsCtx,
      city: answers.cidade,
      metadata: {
        modelo_recomendado: recommendation.primary_model.nome_modelo,
        indice_quintal: recommendation.legacy_score,
        match_score: recommendation.primary_score,
        fit_level: recommendation.fit_level,
      },
    });

    trackMetaEvent('ViewContent', {
      content_name: recommendation.primary_model.nome_modelo,
      content_category: answers.cidade || '',
      value: recommendation.legacy_score,
      currency: 'BRL',
    });

    setStep('actions');
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
        {step === 'quiz' && enrichedQuestion && quizStep < QUIZ_OPTION_STEPS && (
          <QuizStep
            key={`quiz-${quizStep}`}
            step={quizStep + 1}
            totalSteps={TOTAL_STEPS}
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
        {step === 'quiz' && quizStep === CITY_STEP && (
          <QuizStep
            key="quiz-city"
            step={TOTAL_STEPS}
            totalSteps={TOTAL_STEPS}
            question={t('quiz_city', lang)}
            type="city"
            onAnswer={handleQuizAnswer}
            explorerStep={TOTAL_STEPS}
            onBack={() => setQuizStep(QUIZ_OPTION_STEPS - 1)}
            franchiseSlug={franchiseSlug}
            lang={lang}
          />
        )}
        {step === 'lead-form' && (
          <LeadForm key="lead-form" onSubmit={handleLeadSubmit} onCheckDuplicate={isTestMode ? undefined : checkDuplicate} loading={saving} lang={lang} />
        )}
        {step === 'processing' && (
          <ProcessingScreen key="processing" onDone={handleProcessingDone} lang={lang} />
        )}
        {step === 'actions' && recommendation && (
          <ActionButtons
            key="actions"
            score={recommendation.legacy_score}
            poolName={recommendation.primary_model.nome_modelo}
            poolDescription={recommendation.primary_model.descricao || ''}
            poolSpecs={{
              tamanho: recommendation.primary_model.tamanho || undefined,
              profundidade: recommendation.primary_model.profundidade || undefined,
              possui_prainha: recommendation.primary_model.possui_prainha || false,
              possui_spa: recommendation.primary_model.possui_spa || false,
            }}
            recommendedSize={recommendation.recommended_size.label}
            whatsappNumber={assignedWhatsapp || franchiseWhatsapp}
            assignedFranchiseName={assignedFranchiseName}
            assignedCidadeBase={assignedCidadeBase}
            leadName={leadName}
            refCode={leadRefCode}
            franchiseId={franchiseId}
            fitLevel={recommendation.fit_level}
            matchScore={recommendation.primary_score}
            reasoning={recommendation.reasoning}
            closingPhrase={recommendation.closing_phrase}
            isWeakRecommendation={recommendation.is_weak_recommendation}
            customerProfile={recommendation.customer_profile}
            upgradeOption={recommendation.upgrade_option ? {
              name: recommendation.upgrade_option.model.nome_modelo,
              image: getPoolImage(recommendation.upgrade_option.model.nome_modelo),
              description: recommendation.upgrade_option.model.descricao || undefined,
              fitLevel: recommendation.upgrade_option.fitLevel,
              matchScore: recommendation.upgrade_option.score,
              recommendedSize: recommendation.upgrade_option.recommendedSize.label,
            } : undefined}
            alternatives={recommendation.alternatives.map(a => ({
              name: a.model.nome_modelo,
              image: getPoolImage(a.model.nome_modelo),
              description: a.model.descricao || undefined,
              fitLevel: a.fitLevel,
              matchScore: a.score,
              specs: {
                tamanho: a.recommendedSize.label || a.model.tamanho || undefined,
                profundidade: a.model.profundidade || undefined,
                possui_prainha: a.model.possui_prainha || false,
                possui_spa: a.model.possui_spa || false,
              },
            }))}
            lang={lang}
          />
        )}
      </Suspense>
    </AnimatePresence>
  );
}
