import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { HeroSection } from './HeroSection';
import { PhotoUpload } from './PhotoUpload';
import { QuizStep } from './QuizStep';
import { ResultScreen } from './ResultScreen';
import { LeadForm } from './LeadForm';
import { ActionButtons } from './ActionButtons';
import { calculateScore, recommendPool, type QuizAnswers } from '@/lib/scoring';
import { supabase } from '@/lib/supabase';

const quizQuestions = [
  {
    question: 'Qual o espaço aproximado disponível para a piscina?',
    options: [
      { value: 'ate-3', label: 'Até 3 metros', emoji: '📏' },
      { value: '3-5', label: 'Entre 3 e 5 metros', emoji: '📐' },
      { value: '5-7', label: 'Entre 5 e 7 metros', emoji: '🏡' },
      { value: 'mais-7', label: 'Mais de 7 metros', emoji: '🏠' },
    ],
  },
  {
    question: 'Você já mora nessa casa?',
    options: [
      { value: 'minha', label: 'Sim, já é minha casa', emoji: '🏠' },
      { value: 'construindo', label: 'Estou construindo', emoji: '🏗️' },
      { value: 'planejando', label: 'Ainda estou planejando', emoji: '📋' },
    ],
  },
  {
    question: 'Como você imagina aproveitar sua piscina?',
    options: [
      { value: 'casal', label: 'Casal', emoji: '💑' },
      { value: 'familia-pequena', label: 'Família pequena', emoji: '👨‍👩‍👧' },
      { value: 'familia-grande', label: 'Família grande', emoji: '👨‍👩‍👧‍👦' },
      { value: 'amigos', label: 'Amigos e festas', emoji: '🎉' },
    ],
  },
  {
    question: 'Quando você gostaria de ter sua piscina?',
    options: [
      { value: '2026', label: 'Ainda em 2026', emoji: '🔥' },
      { value: '2026-2027', label: 'Talvez em 2026 ou 2027', emoji: '🤔' },
      { value: 'pesquisando', label: 'Só estou pesquisando', emoji: '🔍' },
    ],
  },
  {
    question: 'O que você gostaria na piscina?',
    options: [
      { value: 'prainha', label: 'Prainha', emoji: '🏖️' },
      { value: 'spa', label: 'Spa ou Hidromassagem', emoji: '🧖' },
      { value: 'simples', label: 'Piscina simples', emoji: '💧' },
      { value: 'nao-sei', label: 'Ainda não sei', emoji: '🤷' },
    ],
  },
];

type Step = 'hero' | 'photos' | 'quiz' | 'result' | 'lead-form' | 'actions';

interface QuizFlowProps {
  franchiseSlug?: string;
  franchiseName?: string;
  franchiseId?: string;
  franchiseWhatsapp?: string;
}

export function QuizFlow({ franchiseSlug, franchiseName, franchiseId, franchiseWhatsapp }: QuizFlowProps) {
  const [searchParams] = useSearchParams();
  const referredBy = searchParams.get('ref') || '';

  const [step, setStep] = useState<Step>('hero');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  const [score, setScore] = useState(0);
  const [poolName, setPoolName] = useState('');
  const [poolDesc, setPoolDesc] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadRefCode, setLeadRefCode] = useState('');
  const [saving, setSaving] = useState(false);

  const answerKeys: (keyof QuizAnswers)[] = ['espaco', 'moradia', 'uso', 'intencao', 'preferencia', 'cidade'];

  const handleQuizAnswer = useCallback((value: string) => {
    const key = answerKeys[quizStep];
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);

    if (quizStep < quizQuestions.length) {
      setQuizStep(prev => prev + 1);
    }

    if (quizStep === 5) {
      const fullAnswers = newAnswers as QuizAnswers;
      const s = calculateScore(fullAnswers);
      const pool = recommendPool(fullAnswers);
      setScore(s);
      setPoolName(pool);
      fetchPoolDescription(pool);
      setStep('result');
    }
  }, [quizStep, answers]);

  const fetchPoolDescription = async (name: string) => {
    const { data } = await supabase
      .from('pool_models')
      .select('descricao')
      .eq('nome_modelo', name)
      .single();
    if (data) setPoolDesc(data.descricao || '');
  };

  const checkDuplicate = async (telefone: string, email: string) => {
    const { data, error } = await supabase.functions.invoke('check-duplicate-lead', {
      body: { telefone, email: email || null },
    });
    if (error) throw error;
    return data as { duplicate: boolean; field?: string; franchiseName?: string | null };
  };

  const handleLeadSubmit = async (data: { nome: string; telefone: string; email: string }) => {
    setSaving(true);
    setLeadName(data.nome);
    try {
      const { data: inserted } = await supabase.from('leads').insert({
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
      }).select('ref_code').single();

      if (inserted?.ref_code) {
        setLeadRefCode(inserted.ref_code);
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    }
    setSaving(false);
    setStep('actions');
  };

  const currentQuizQuestion = quizStep < quizQuestions.length ? quizQuestions[quizStep] : null;

  return (
    <AnimatePresence mode="wait">
      {step === 'hero' && (
        <HeroSection key="hero" onStart={() => setStep('photos')} franchiseName={franchiseName} />
      )}
      {step === 'photos' && (
        <PhotoUpload key="photos" onNext={(urls) => { setPhotoUrls(urls); setStep('quiz'); }} onBack={() => setStep('hero')} />
      )}
      {step === 'quiz' && currentQuizQuestion && (
        <QuizStep
          key={`quiz-${quizStep}`}
          step={quizStep + 1}
          totalSteps={6}
          question={currentQuizQuestion.question}
          options={currentQuizQuestion.options}
          onAnswer={handleQuizAnswer}
          explorerStep={quizStep + 1}
          onBack={() => {
            if (quizStep === 0) setStep('photos');
            else setQuizStep(prev => prev - 1);
          }}
        />
      )}
      {step === 'quiz' && quizStep === 5 && (
        <QuizStep
          key="quiz-city"
          step={6}
          totalSteps={6}
          question="Cidade onde você mora"
          type="city"
          onAnswer={handleQuizAnswer}
          explorerStep={6}
          onBack={() => setQuizStep(4)}
        />
      )}
      {step === 'result' && (
        <ResultScreen key="result" score={score} poolName={poolName} poolDescription={poolDesc} onContinue={() => setStep('lead-form')} />
      )}
      {step === 'lead-form' && (
        <LeadForm key="lead-form" onSubmit={handleLeadSubmit} onCheckDuplicate={checkDuplicate} loading={saving} />
      )}
      {step === 'actions' && (
        <ActionButtons
          key="actions"
          score={score}
          poolName={poolName}
          poolDescription={poolDesc}
          whatsappNumber={franchiseWhatsapp}
          leadName={leadName}
          refCode={leadRefCode}
        />
      )}
    </AnimatePresence>
  );
}
