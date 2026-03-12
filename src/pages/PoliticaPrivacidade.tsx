import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/Footer';

export default function PoliticaPrivacidade() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl gradient-blue">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Política de Privacidade</h1>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">1. Coleta de Dados</h2>
              <p>Coletamos informações pessoais como nome, telefone e e-mail fornecidos voluntariamente pelo usuário durante o uso da plataforma. Também podemos coletar dados de navegação, como endereço IP, tipo de dispositivo e cookies.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">2. Uso dos Dados</h2>
              <p>Os dados coletados são utilizados para: viabilizar o funcionamento da plataforma; encaminhar leads para as franquias correspondentes; realizar análises internas de desempenho; e melhorar a experiência do usuário.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">3. Compartilhamento de Dados</h2>
              <p>Os dados dos leads podem ser compartilhados com as franquias cadastradas na plataforma para fins de atendimento comercial. Não comercializamos dados pessoais com terceiros para fins de marketing.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">4. Armazenamento e Segurança</h2>
              <p>Os dados são armazenados em servidores seguros com criptografia e medidas de proteção adequadas. Implementamos práticas de segurança como RLS (Row Level Security), autenticação segura e controle de acesso baseado em perfis.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">5. Direitos do Titular</h2>
              <p>Em conformidade com a LGPD (Lei nº 13.709/2018), o titular dos dados tem direito a: acessar seus dados; solicitar correção de dados incompletos ou inexatos; solicitar a exclusão de seus dados; e revogar o consentimento a qualquer momento.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">6. Cookies</h2>
              <p>A plataforma utiliza cookies para melhorar a experiência de navegação, registrar preferências e coletar dados analíticos. O usuário pode gerenciar as configurações de cookies em seu navegador.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">7. Contato</h2>
              <p>Para dúvidas ou solicitações relacionadas à privacidade de dados, entre em contato com a Hallow Comunicação através dos canais disponíveis na plataforma.</p>
            </section>

            <p className="text-xs text-muted-foreground/60 pt-4 border-t border-border/40">
              Última atualização: Março de 2026
            </p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
