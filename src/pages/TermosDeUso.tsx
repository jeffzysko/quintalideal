import { motion } from 'framer-motion';
import { FileText, Scale, Users, Camera, Globe, ShieldCheck, AlertTriangle, Ban, RefreshCw, Gavel, Clock } from 'lucide-react';
import { BackButton } from '@/components/BackButton';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

interface SectionProps {
  number: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  index: number;
}

function Section({ number, icon: Icon, title, children, index }: SectionProps) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      custom={index}
      id={`section-${number}`}
      className="scroll-mt-24"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-base font-bold text-foreground">{number}. {title}</h2>
      </div>
      <div className="pl-12 space-y-2 text-sm text-muted-foreground leading-relaxed">
        {children}
      </div>
    </motion.section>
  );
}

const SECTIONS = [
  { number: '1', title: 'Aceitação dos Termos', icon: FileText },
  { number: '2', title: 'Sobre a Plataforma', icon: Globe },
  { number: '3', title: 'Uso Permitido', icon: ShieldCheck },
  { number: '4', title: 'Condutas Proibidas', icon: Ban },
  { number: '5', title: 'Cadastro e Conta', icon: Users },
  { number: '6', title: 'Envio de Fotos e Imagens', icon: Camera },
  { number: '7', title: 'Integrações com Terceiros', icon: RefreshCw },
  { number: '8', title: 'Propriedade Intelectual', icon: Scale },
  { number: '9', title: 'Limitação de Responsabilidade', icon: AlertTriangle },
  { number: '10', title: 'Vigência e Rescisão', icon: Clock },
  { number: '11', title: 'Alterações nos Termos', icon: RefreshCw },
  { number: '12', title: 'Foro e Legislação Aplicável', icon: Gavel },
];

export default function TermosDeUso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="relative flex-1 max-w-3xl mx-auto px-4 py-10 md:py-16 w-full">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <BackButton fallback="/" label="Voltar" />
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Legal</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">Termos de Uso</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
            Leia atentamente os termos que regem o uso da plataforma <strong className="text-foreground">Quintal Ideal</strong>, desenvolvida pela Hallow Comunicação.
          </p>
        </motion.div>

        {/* Quick nav */}
        <motion.nav
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-10 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 shadow-sm"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Navegação rápida</p>
          <div className="flex flex-wrap gap-1.5">
            {SECTIONS.map(s => (
              <a
                key={s.number}
                href={`#section-${s.number}`}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
              >
                {s.number}. {s.title}
              </a>
            ))}
          </div>
        </motion.nav>

        {/* Content */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 md:p-8 shadow-sm space-y-8">
          <Section number="1" icon={FileText} title="Aceitação dos Termos" index={0}>
            <p>Ao acessar, navegar ou utilizar a plataforma Quintal Ideal, você declara que leu, compreendeu e concorda integralmente com estes Termos de Uso.</p>
            <p>Caso não concorde com qualquer disposição aqui prevista, solicitamos que interrompa imediatamente o uso da plataforma.</p>
            <p>O uso continuado da plataforma após eventuais atualizações destes Termos constitui aceitação tácita das modificações realizadas.</p>
          </Section>

          <Section number="2" icon={Globe} title="Sobre a Plataforma" index={1}>
            <p>A plataforma <strong className="text-foreground">Quintal Ideal</strong> é desenvolvida, mantida e operada pela <strong className="text-foreground">Hallow Comunicação</strong>, atuando como ferramenta tecnológica independente para captação, qualificação e gestão de leads no segmento de piscinas.</p>
            <p>A plataforma não possui vínculo societário, contratual ou de representação oficial com fabricantes, distribuidores ou marcas de piscinas, salvo quando expressamente indicado.</p>
            <p>As franquias cadastradas na plataforma são unidades comerciais independentes, responsáveis pelo atendimento e relacionamento direto com os leads recebidos.</p>
          </Section>

          <Section number="3" icon={ShieldCheck} title="Uso Permitido" index={2}>
            <p>O usuário compromete-se a utilizar a plataforma exclusivamente para fins legítimos, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Realizar o quiz de avaliação do quintal e receber recomendações de piscinas;</li>
              <li>Fornecer dados de contato para ser atendido por uma franquia local;</li>
              <li>Acessar seu painel de gestão (quando franqueado) para gerenciar leads e configurações.</li>
            </ul>
          </Section>

          <Section number="4" icon={Ban} title="Condutas Proibidas" index={3}>
            <p>É expressamente vedado ao usuário:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Utilizar a plataforma para atividades ilícitas, fraudulentas ou que violem a legislação vigente;</li>
              <li>Enviar informações falsas, enganosas ou que induzam a erro;</li>
              <li>Tentar acessar áreas restritas, explorar vulnerabilidades ou comprometer a segurança da plataforma;</li>
              <li>Coletar, armazenar ou compartilhar dados de outros usuários sem autorização;</li>
              <li>Reproduzir, copiar ou distribuir o conteúdo da plataforma sem autorização prévia.</li>
            </ul>
            <p>A Hallow Comunicação reserva-se o direito de suspender ou cancelar imediatamente o acesso de usuários que violem estas disposições.</p>
          </Section>

          <Section number="5" icon={Users} title="Cadastro e Conta" index={4}>
            <p>O acesso ao painel administrativo requer cadastro prévio mediante convite da administração. O usuário é responsável pela veracidade das informações fornecidas e pela segurança de suas credenciais de acesso.</p>
            <p>Cada conta é pessoal e intransferível. O compartilhamento de credenciais é expressamente proibido e pode resultar em suspensão do acesso.</p>
            <p>Visitantes do quiz público não necessitam de cadastro, porém ao informar seus dados de contato, concordam com o tratamento conforme descrito na Política de Privacidade.</p>
          </Section>

          <Section number="6" icon={Camera} title="Envio de Fotos e Imagens" index={5}>
            <p>A plataforma permite o envio voluntário de fotos do quintal durante o quiz para fins de análise e recomendação personalizada.</p>
            <p>Ao enviar fotos, o usuário:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Declara ser o titular ou possuir autorização para uso das imagens;</li>
              <li>Concede à plataforma licença não exclusiva para armazenar e processar as imagens para fins de recomendação;</li>
              <li>Reconhece que as imagens serão armazenadas em servidores seguros com acesso restrito.</li>
            </ul>
            <p>As fotos são utilizadas exclusivamente para a geração do relatório e compartilhamento com a franquia responsável pelo atendimento. Não são utilizadas para fins publicitários sem consentimento expresso.</p>
            <p>O usuário pode solicitar a exclusão de suas imagens a qualquer momento, conforme previsto na Política de Privacidade.</p>
          </Section>

          <Section number="7" icon={RefreshCw} title="Integrações com Terceiros" index={6}>
            <p>A plataforma oferece integrações técnicas opcionais, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Webhooks para CRM:</strong> envio automático de dados de leads para sistemas de gestão externos configurados pela franquia;</li>
              <li><strong className="text-foreground">Meta Pixel:</strong> rastreamento de conversões para campanhas de marketing digital;</li>
              <li><strong className="text-foreground">Serviços de e-mail:</strong> envio de notificações transacionais.</li>
            </ul>
            <p>A configuração e utilização dessas integrações é de responsabilidade exclusiva de cada franquia. A Hallow Comunicação não se responsabiliza pelo tratamento de dados realizado por sistemas de terceiros após o envio via webhook.</p>
          </Section>

          <Section number="8" icon={Scale} title="Propriedade Intelectual" index={7}>
            <p>Todo o conteúdo da plataforma — incluindo design, código-fonte, algoritmos de pontuação, textos, logotipos e elementos visuais — é de propriedade exclusiva da Hallow Comunicação, protegido pela legislação brasileira de direitos autorais e propriedade intelectual.</p>
            <p>É proibida a reprodução, modificação, distribuição ou uso comercial de qualquer conteúdo sem autorização prévia e expressa por escrito.</p>
          </Section>

          <Section number="9" icon={AlertTriangle} title="Limitação de Responsabilidade" index={8}>
            <p>A Hallow Comunicação não se responsabiliza por:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Danos diretos, indiretos ou consequenciais decorrentes do uso da plataforma;</li>
              <li>Perda de dados, interrupções no serviço ou incompatibilidades técnicas;</li>
              <li>Atos ou omissões das franquias cadastradas no atendimento aos leads;</li>
              <li>Informações incorretas ou incompletas fornecidas pelos usuários;</li>
              <li>Falhas em integrações com sistemas de terceiros (CRMs, Meta Pixel, etc.).</li>
            </ul>
            <p>A plataforma é fornecida "como está" (<em>as is</em>), sem garantias explícitas ou implícitas de resultado.</p>
          </Section>

          <Section number="10" icon={Clock} title="Vigência e Rescisão" index={9}>
            <p>Estes Termos entram em vigor na data de seu primeiro acesso à plataforma e permanecem válidos enquanto o usuário utilizar os serviços.</p>
            <p>O acesso de franqueados pode ser suspenso ou encerrado pela administração da plataforma a qualquer momento, mediante notificação prévia, especialmente em caso de violação destes Termos.</p>
            <p>Leads e visitantes podem solicitar a exclusão de seus dados conforme previsto na Política de Privacidade.</p>
          </Section>

          <Section number="11" icon={RefreshCw} title="Alterações nos Termos" index={10}>
            <p>A Hallow Comunicação reserva-se o direito de modificar estes Termos de Uso a qualquer momento. A versão atualizada será sempre publicada nesta página com a data de última atualização.</p>
            <p>Recomendamos a leitura periódica desta página. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.</p>
          </Section>

          <Section number="12" icon={Gavel} title="Foro e Legislação Aplicável" index={11}>
            <p>Estes Termos são regidos pela legislação da República Federativa do Brasil.</p>
            <p>Fica eleito o foro da comarca da sede da Hallow Comunicação para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
          </Section>

          <div className="pt-6 border-t border-border/40 flex items-center justify-between">
            <p className="text-xs text-muted-foreground/60">Última atualização: Março de 2026</p>
            <p className="text-xs text-muted-foreground/60">Hallow Comunicação</p>
          </div>
        </div>
      </div>
    </div>
  );
}
