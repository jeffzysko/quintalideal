import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BackButton } from '@/components/BackButton';
import {
  LifeBuoy,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Smartphone,
  Share2,
  Eye,
  Bell,
  FileText,
  Zap,
  Target,
  TrendingUp,
  ExternalLink,
  Mail,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/PageTransition';

/* ─── Animation variants ─── */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

/* ─── Guide step data ─── */
interface GuideStep {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  details: string[];
  tip?: string;
}

const guideSteps: GuideStep[] = [
  {
    id: 'link',
    icon: Share2,
    title: 'Compartilhe seu link exclusivo',
    subtitle: 'Cada franquia possui um link personalizado para captação de leads.',
    details: [
      'Acesse seu painel de franquia e copie o link exibido no topo da página.',
      'Compartilhe esse link em redes sociais, anúncios, WhatsApp e materiais de divulgação.',
      'Todos os leads gerados por esse link serão automaticamente vinculados à sua franquia.',
    ],
    tip: 'Quanto mais você divulgar seu link, mais leads qualificados receberá!',
  },
  {
    id: 'leads',
    icon: Users,
    title: 'Acompanhe seus leads',
    subtitle: 'Veja em tempo real todos os leads captados pela sua franquia.',
    details: [
      'No painel, acesse a aba "Leads" para ver todos os contatos recebidos.',
      'Cada lead contém nome, telefone, e-mail e as respostas do questionário.',
      'Use os filtros para encontrar leads por status, modelo ou data.',
    ],
    tip: 'Leads novos aparecem com o status "Novo" — entre em contato o mais rápido possível!',
  },
  {
    id: 'status',
    icon: Target,
    title: 'Gerencie o status dos leads',
    subtitle: 'Atualize o progresso de cada lead no funil de vendas.',
    details: [
      'Clique em um lead para abrir seus detalhes completos.',
      'Altere o status conforme o andamento: Novo → Contatado → Em Negociação → Vendido.',
      'Adicione observações para registrar informações importantes sobre cada negociação.',
    ],
  },
  {
    id: 'score',
    icon: BarChart3,
    title: 'Entenda a pontuação do quintal',
    subtitle: 'Cada lead recebe uma pontuação que indica o potencial do quintal para piscina.',
    details: [
      'A pontuação é calculada com base nas respostas do questionário (espaço, terreno, uso, etc.).',
      'Leads com pontuação alta têm maior probabilidade de conversão.',
      'Use a pontuação para priorizar seus contatos e focar nos melhores leads.',
    ],
    tip: 'Leads com pontuação acima de 70% são considerados de alto potencial!',
  },
  {
    id: 'whatsapp',
    icon: Smartphone,
    title: 'Contato direto via WhatsApp',
    subtitle: 'Entre em contato instantaneamente com seus leads.',
    details: [
      'Na página de detalhes do lead, clique no botão do WhatsApp para iniciar a conversa.',
      'Uma mensagem personalizada é gerada automaticamente com o nome do lead.',
      'Configure seu número do WhatsApp nas configurações da franquia.',
    ],
  },
  {
    id: 'reports',
    icon: TrendingUp,
    title: 'Relatórios e desempenho',
    subtitle: 'Acompanhe métricas e resultados da sua franquia.',
    details: [
      'Acesse a aba "Relatórios" no seu painel para ver gráficos e estatísticas.',
      'Acompanhe a evolução de leads por mês, taxa de conversão e modelos mais procurados.',
      'Use os dados para ajustar sua estratégia de captação.',
    ],
  },
  {
    id: 'config',
    icon: Settings,
    title: 'Configurações da franquia',
    subtitle: 'Personalize suas informações de contato e integrações.',
    details: [
      'Acesse "Configurações" no menu do usuário para editar seus dados.',
      'Atualize WhatsApp, e-mail e informações do responsável.',
      'Configure webhooks para integrar com seu CRM (veja a documentação).',
    ],
  },
  {
    id: 'webhook',
    icon: Zap,
    title: 'Integração com CRM via Webhook',
    subtitle: 'Receba leads automaticamente no seu sistema.',
    details: [
      'Na aba de configurações, adicione a URL de webhook do seu CRM.',
      'Gere um segredo para validar a autenticidade dos envios.',
      'Consulte a documentação técnica em /docs/webhook para detalhes de implementação.',
    ],
    tip: 'Essa integração elimina a necessidade de verificar o painel manualmente!',
  },
];

/* ─── FAQ data ─── */
interface FAQ {
  q: string;
  a: string;
}

const faqs: FAQ[] = [
  { q: 'Como altero minha senha?', a: 'Acesse "Configurações" no menu do usuário, role até a seção "Alterar Senha" e insira sua nova senha.' },
  { q: 'Posso ter mais de um usuário na minha franquia?', a: 'Sim! Entre em contato com o suporte da Hallow Comunicação para solicitar a criação de usuários adicionais para sua franquia.' },
  { q: 'O que fazer quando um lead está duplicado?', a: 'A plataforma detecta automaticamente leads duplicados por telefone ou e-mail. Se o lead já existe, uma mensagem é exibida informando a franquia responsável.' },
  { q: 'Meus leads não estão aparecendo, o que fazer?', a: 'Verifique se seu link está correto e ativo. Se o problema persistir, entre em contato com o suporte técnico.' },
  { q: 'Como funciona a pontuação do quintal?', a: 'A pontuação é calculada automaticamente com base nas respostas do questionário do lead, considerando espaço disponível, tipo de terreno, uso pretendido e prazo de compra.' },
  { q: 'Posso personalizar a página de captação?', a: 'A página de captação é padronizada para garantir a melhor experiência. Porém, cada franquia pode configurar seu Pixel do Meta para rastreamento de anúncios.' },
];

/* ─── Sub-components ─── */
function StepCard({ step, index, expanded, onToggle }: { step: GuideStep; index: number; expanded: boolean; onToggle: () => void }) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-blue shrink-0">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary/60">PASSO {index + 1}</span>
          </div>
          <p className="font-semibold text-foreground text-sm">{step.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{step.subtitle}</p>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-3">
              {step.details.map((d, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{d}</p>
                </div>
              ))}
              {step.tip && (
                <div className="mt-3 flex gap-2.5 items-start p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <Bell className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground font-medium">{step.tip}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FAQItem({ faq, expanded, onToggle }: { faq: FAQ; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-border/40 last:border-0">
      <button onClick={onToggle} className="w-full flex items-center justify-between py-4 px-1 text-left group">
        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{faq.q}</span>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground pb-4 px-1 leading-relaxed">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main page ─── */
export default function Suporte() {
  const navigate = useNavigate();
  const [expandedStep, setExpandedStep] = useState<string | null>(guideSteps[0].id);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedStep(null);
      setAllExpanded(false);
    } else {
      setExpandedStep('__all__');
      setAllExpanded(true);
    }
  };

  return (
    <PageTransition>
    <div className="min-h-screen flex flex-col gradient-hero">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(207 90% 42% / 0.25), transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.12, 0.05] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, hsl(207 90% 42% / 0.2), transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <BackButton fallback="/franquia" label="Voltar" />
        </div>

        <motion.div {...fadeUp}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl gradient-blue glow-blue">
              <LifeBuoy className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Suporte & Guia</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base mb-8 ml-[52px]">
            Tudo o que você precisa saber para aproveitar ao máximo a plataforma.
          </p>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
        >
          {[
            { icon: BookOpen, label: 'Guia rápido', href: '#guia' },
            { icon: MessageSquare, label: 'FAQ', href: '#faq' },
            { icon: FileText, label: 'Webhook docs', href: '/docs/webhook' },
            { icon: Eye, label: 'Meu painel', href: '/painel' },
          ].map((link) => (
            <button
              key={link.label}
              onClick={() => {
                if (link.href.startsWith('#')) {
                  document.getElementById(link.href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate(link.href);
                }
              }}
              className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-muted/40 transition-colors group"
            >
              <link.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-foreground">{link.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Guide section */}
        <section id="guia" className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Guia passo a passo</h2>
            </div>
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
            >
              {allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
            </button>
          </div>

          <div className="space-y-3">
            {guideSteps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                expanded={allExpanded || expandedStep === step.id}
                onToggle={() => setExpandedStep(prev => prev === step.id ? null : step.id)}
              />
            ))}
          </div>
        </section>

        {/* FAQ section */}
        <section id="faq" className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Perguntas frequentes</h2>
          </div>
          <div className="glass-card rounded-2xl px-5 py-2">
            {faqs.map((faq) => (
              <FAQItem
                key={faq.q}
                faq={faq}
                expanded={expandedFaq === faq.q}
                onToggle={() => setExpandedFaq(prev => prev === faq.q ? null : faq.q)}
              />
            ))}
          </div>
        </section>

        {/* Data deletion section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card rounded-2xl p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Exclusão de dados pessoais</h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Em conformidade com a LGPD, você pode solicitar a exclusão dos seus dados pessoais (nome, telefone, e-mail e fotos). 
                O prazo de atendimento é de até 15 dias úteis.
              </p>
              <Button
                variant="outline"
                className="rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => window.open('mailto:contato@hallow.com.br?subject=Solicita%C3%A7%C3%A3o%20de%20Exclus%C3%A3o%20de%20Dados%20-%20LGPD&body=Ol%C3%A1%2C%0A%0ASolicito%20a%20exclus%C3%A3o%20dos%20meus%20dados%20pessoais%20da%20plataforma%20Quintal%20Ideal.%0A%0ANome%3A%20%0ATelefone%20cadastrado%3A%20%0AE-mail%20cadastrado%3A%20%0A%0AAtenciosamente.', '_blank')}
              >
                <Mail className="w-4 h-4" />
                Solicitar exclusão de dados
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Support contact */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 text-center mb-8"
        >
          <LifeBuoy className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-bold text-foreground mb-1">Precisa de mais ajuda?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Entre em contato com o suporte técnico da <span className="font-semibold text-foreground">Hallow Comunicação</span> para assistência personalizada.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => window.open('mailto:contato@hallow.com.br', '_blank')}
            >
              <Mail className="w-4 h-4" />
              contato@hallow.com.br
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => window.open('https://wa.me/5551981055425?text=Ol%C3%A1!%20Preciso%20de%20suporte%20com%20a%20plataforma.', '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              WhatsApp
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
    </PageTransition>
  );
}
