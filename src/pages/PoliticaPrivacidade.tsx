import { motion } from 'framer-motion';
import { Shield, Database, Share2, Lock, UserCheck, Cookie, Camera, Globe, Mail, Clock, Gavel } from 'lucide-react';
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
  { number: '1', title: 'Coleta de Dados', icon: Database },
  { number: '2', title: 'Base Legal do Tratamento', icon: Gavel },
  { number: '3', title: 'Finalidade do Uso dos Dados', icon: Shield },
  { number: '4', title: 'Fotos e Imagens do Quintal', icon: Camera },
  { number: '5', title: 'Compartilhamento de Dados', icon: Share2 },
  { number: '6', title: 'Integrações e Transferência a Terceiros', icon: Globe },
  { number: '7', title: 'Armazenamento e Segurança', icon: Lock },
  { number: '8', title: 'Prazo de Retenção', icon: Clock },
  { number: '9', title: 'Direitos do Titular (LGPD)', icon: UserCheck },
  { number: '10', title: 'Cookies e Tecnologias de Rastreamento', icon: Cookie },
  { number: '11', title: 'Transferência Internacional', icon: Globe },
  { number: '12', title: 'Encarregado de Dados (DPO)', icon: Mail },
  { number: '13', title: 'Alterações nesta Política', icon: Shield },
  { number: '14', title: 'Foro e Legislação Aplicável', icon: Gavel },
];

export default function PoliticaPrivacidade() {
  

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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">LGPD</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">Política de Privacidade</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
            Saiba como a <strong className="text-foreground">Hallow Comunicação</strong> coleta, utiliza e protege seus dados pessoais na plataforma <strong className="text-foreground">Quintal Ideal</strong>, em conformidade com a Lei Geral de Proteção de Dados (LGPD).
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

        {/* LGPD badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3"
        >
          <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Em conformidade com a LGPD</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Esta política atende aos requisitos da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais) e garante transparência sobre o tratamento de dados pessoais na plataforma.
            </p>
          </div>
        </motion.div>

        {/* Content */}
        <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 md:p-8 shadow-sm space-y-8">
          <Section number="1" icon={Database} title="Coleta de Dados" index={0}>
            <p>Coletamos os seguintes dados pessoais, fornecidos voluntariamente pelo usuário:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Dados de identificação:</strong> nome completo, telefone e e-mail;</li>
              <li><strong className="text-foreground">Dados de localização:</strong> cidade informada durante o quiz;</li>
              <li><strong className="text-foreground">Dados de preferência:</strong> respostas ao questionário de avaliação do quintal, perfil de uso detectado e modelo recomendado;</li>
              <li><strong className="text-foreground">Dados visuais:</strong> fotos do quintal enviadas voluntariamente;</li>
              <li><strong className="text-foreground">Dados de navegação:</strong> endereço IP, tipo de dispositivo, sistema operacional e parâmetros de campanha (UTM);</li>
              <li><strong className="text-foreground">Dados de notificações push:</strong> endpoint do navegador e chaves de criptografia para envio de notificações, quando autorizadas pelo usuário.</li>
            </ul>
          </Section>

          <Section number="2" icon={Gavel} title="Base Legal do Tratamento" index={1}>
            <p>O tratamento de dados pessoais na plataforma é fundamentado nas seguintes bases legais previstas na LGPD (Art. 7º):</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Consentimento (Art. 7º, I):</strong> ao preencher o formulário de contato e enviar fotos, o usuário consente com o tratamento;</li>
              <li><strong className="text-foreground">Execução de contrato (Art. 7º, V):</strong> para viabilizar a prestação do serviço de recomendação e encaminhamento à franquia;</li>
              <li><strong className="text-foreground">Legítimo interesse (Art. 7º, IX):</strong> para análises internas de desempenho e melhoria da plataforma.</li>
            </ul>
          </Section>

          <Section number="3" icon={Shield} title="Finalidade do Uso dos Dados" index={2}>
            <p>Os dados pessoais coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gerar a recomendação personalizada de piscina através do quiz;</li>
              <li>Encaminhar o lead à franquia responsável pela região informada;</li>
              <li>Enviar notificações transacionais relacionadas ao atendimento;</li>
              <li>Realizar análises de desempenho e métricas de conversão;</li>
              <li>Melhorar a experiência do usuário e a qualidade da plataforma.</li>
            </ul>
            <p><strong className="text-foreground">Não utilizamos dados pessoais para envio de marketing direto</strong> sem consentimento explícito.</p>
          </Section>

          <Section number="4" icon={Camera} title="Fotos e Imagens do Quintal" index={3}>
            <p>A plataforma permite o envio voluntário de até 4 fotos do quintal durante o quiz. Sobre o tratamento dessas imagens:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Finalidade:</strong> as fotos são utilizadas exclusivamente para enriquecer o relatório de recomendação e auxiliar a franquia no atendimento;</li>
              <li><strong className="text-foreground">Armazenamento:</strong> as imagens são armazenadas em buckets seguros com acesso público controlado, acessíveis apenas pela franquia responsável e administradores;</li>
              <li><strong className="text-foreground">Retenção:</strong> as imagens são mantidas enquanto o registro do lead estiver ativo na plataforma;</li>
              <li><strong className="text-foreground">Uso publicitário:</strong> as fotos <strong>não são utilizadas</strong> para fins publicitários, de marketing ou exibição pública sem consentimento expresso do titular;</li>
              <li><strong className="text-foreground">Exclusão:</strong> o titular pode solicitar a exclusão de suas imagens a qualquer momento.</li>
            </ul>
          </Section>

          <Section number="5" icon={Share2} title="Compartilhamento de Dados" index={4}>
            <p>Os dados dos leads são compartilhados com:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Franquias cadastradas:</strong> cada franquia recebe apenas os leads de sua área de atuação, para fins de atendimento comercial;</li>
              <li><strong className="text-foreground">Administração da plataforma:</strong> para gestão operacional e suporte técnico.</li>
            </ul>
            <p><strong className="text-foreground">Não comercializamos, vendemos ou alugamos dados pessoais</strong> a terceiros para fins de marketing, publicidade ou qualquer outra finalidade não prevista nesta política.</p>
          </Section>

          <Section number="6" icon={Globe} title="Integrações e Transferência a Terceiros" index={5}>
            <p>A plataforma oferece integrações opcionais configuradas por cada franquia:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Webhooks para CRM:</strong> dados de leads podem ser enviados automaticamente para sistemas de gestão externos. A segurança da transmissão é garantida por assinatura HMAC-SHA256;</li>
              <li><strong className="text-foreground">Meta Pixel (Facebook/Instagram):</strong> dados de conversão anônimos podem ser compartilhados com a Meta para fins de rastreamento de campanhas.</li>
            </ul>
            <p>A responsabilidade pelo tratamento de dados em sistemas de terceiros é exclusivamente da franquia que configurou a integração. Recomendamos que cada franquia verifique a conformidade de seus parceiros com a LGPD.</p>
          </Section>

          <Section number="7" icon={Lock} title="Armazenamento e Segurança" index={6}>
            <p>Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Criptografia:</strong> dados em trânsito protegidos por TLS/SSL;</li>
              <li><strong className="text-foreground">Row Level Security (RLS):</strong> isolamento de dados entre franquias a nível de banco de dados;</li>
              <li><strong className="text-foreground">Autenticação segura:</strong> controle de acesso por perfis com proteção contra senhas vazadas;</li>
              <li><strong className="text-foreground">Controle de acesso:</strong> permissões baseadas em papéis (RBAC) para administradores, franqueados e visualizadores;</li>
              <li><strong className="text-foreground">Monitoramento:</strong> registro de eventos e logs de acesso para auditoria.</li>
            </ul>
          </Section>

          <Section number="8" icon={Clock} title="Prazo de Retenção" index={7}>
            <p>Os dados pessoais são retidos pelo tempo necessário para cumprir as finalidades descritas nesta política:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Dados de leads:</strong> mantidos enquanto houver interesse comercial legítimo ou por período determinado pela franquia;</li>
              <li><strong className="text-foreground">Fotos do quintal:</strong> mantidas enquanto o registro do lead estiver ativo;</li>
              <li><strong className="text-foreground">Dados de navegação:</strong> retidos por até 12 meses para fins analíticos;</li>
              <li><strong className="text-foreground">Dados de conta (franqueados):</strong> mantidos enquanto a conta estiver ativa.</li>
            </ul>
            <p>Após o término do período de retenção, os dados serão anonimizados ou excluídos.</p>
          </Section>

          <Section number="9" icon={UserCheck} title="Direitos do Titular (LGPD)" index={8}>
            <p>Em conformidade com os artigos 17 a 22 da LGPD, você tem os seguintes direitos:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {[
                { right: 'Confirmação', desc: 'Confirmar a existência de tratamento de dados' },
                { right: 'Acesso', desc: 'Acessar seus dados pessoais tratados' },
                { right: 'Correção', desc: 'Corrigir dados incompletos ou inexatos' },
                { right: 'Anonimização', desc: 'Solicitar anonimização de dados desnecessários' },
                { right: 'Portabilidade', desc: 'Transferir dados a outro fornecedor' },
                { right: 'Eliminação', desc: 'Solicitar a exclusão de dados pessoais' },
                { right: 'Informação', desc: 'Saber com quem seus dados são compartilhados' },
                { right: 'Revogação', desc: 'Revogar o consentimento a qualquer momento' },
              ].map(item => (
                <div key={item.right} className="rounded-lg bg-muted/40 px-3 py-2 border border-border/30">
                  <p className="text-xs font-semibold text-foreground">{item.right}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-3">Para exercer qualquer destes direitos, entre em contato com nosso Encarregado de Dados conforme indicado na seção 12.</p>
          </Section>

          <Section number="10" icon={Cookie} title="Cookies e Tecnologias de Rastreamento" index={9}>
            <p>A plataforma utiliza as seguintes tecnologias:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Cookies de sessão:</strong> para manter o estado da navegação durante o quiz;</li>
              <li><strong className="text-foreground">Armazenamento local (sessionStorage/localStorage):</strong> para identificar sessões anônimas de analytics e armazenar preferências de notificação;</li>
              <li><strong className="text-foreground">Service Worker:</strong> para funcionalidades offline (PWA) e recebimento de notificações push em segundo plano;</li>
              <li><strong className="text-foreground">Meta Pixel (opcional):</strong> quando configurado pela franquia, coleta dados anônimos de conversão para campanhas de marketing digital;</li>
              <li><strong className="text-foreground">Parâmetros UTM:</strong> para rastrear a origem de tráfego de campanhas.</li>
            </ul>
            <p>O usuário pode gerenciar as configurações de cookies em seu navegador. A desativação de cookies pode afetar funcionalidades da plataforma.</p>
          </Section>

          <Section number="11" icon={Globe} title="Transferência Internacional" index={10}>
            <p>A plataforma atende franquias com atuação em cidades do <strong className="text-foreground">Uruguai</strong> (Rivera, Artigas, Melo). Nesses casos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Os dados de leads uruguaios são armazenados nos mesmos servidores da plataforma;</li>
              <li>O tratamento segue as mesmas medidas de segurança aplicadas a dados brasileiros;</li>
              <li>O Uruguai é reconhecido pela ANPD como país com nível adequado de proteção de dados.</li>
            </ul>
          </Section>

          <Section number="12" icon={Mail} title="Encarregado de Dados (DPO)" index={11}>
            <p>O encarregado pelo tratamento de dados pessoais (DPO) pode ser contatado para dúvidas, solicitações ou exercício de direitos:</p>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 mt-2">
              <p className="text-sm font-semibold text-foreground">Hallow Comunicação</p>
              <p className="text-xs text-muted-foreground mt-1">Encarregado de Proteção de Dados</p>
              <a
                href="mailto:contato@hallow.com.br"
                className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1 mt-1"
              >
                <Mail className="w-3 h-3" />
                contato@hallow.com.br
              </a>
              <p className="text-xs text-muted-foreground mt-2">Prazo de resposta: até 15 dias úteis, conforme Art. 18, §5º da LGPD</p>
            </div>
            <p className="mt-3">Para solicitar a <strong className="text-foreground">exclusão de seus dados pessoais</strong>, envie um e-mail para o endereço acima informando seu nome e telefone cadastrado. A exclusão será processada em até 15 dias úteis.</p>
          </Section>

          <Section number="13" icon={Shield} title="Alterações nesta Política" index={12}>
            <p>A Hallow Comunicação reserva-se o direito de atualizar esta Política de Privacidade a qualquer momento. A versão vigente será sempre publicada nesta página com a data de última atualização.</p>
            <p>Alterações significativas serão comunicadas por meio de aviso na plataforma. O uso continuado após modificações constitui aceitação da política atualizada.</p>
          </Section>

          <Section number="14" icon={Gavel} title="Foro e Legislação Aplicável" index={13}>
            <p>Esta Política de Privacidade é regida pela legislação brasileira, em especial pela Lei nº 13.709/2018 (LGPD) e pelo Marco Civil da Internet (Lei nº 12.965/2014).</p>
            <p>Fica eleito o foro da comarca da sede da Hallow Comunicação para dirimir quaisquer controvérsias, com renúncia expressa a qualquer outro.</p>
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
