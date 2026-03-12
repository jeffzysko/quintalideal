import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';


export default function TermosDeUso() {
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
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Termos de Uso</h1>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">1. Aceitação dos Termos</h2>
              <p>Ao acessar e utilizar esta plataforma, você concorda com os presentes Termos de Uso. Caso não concorde com algum dos termos aqui descritos, recomendamos que não utilize a plataforma.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">2. Sobre a Plataforma</h2>
              <p>Esta plataforma é desenvolvida e mantida pela Hallow Comunicação como uma iniciativa independente de tecnologia. A plataforma não possui vínculo oficial com nenhuma marca de piscinas ou fabricantes, atuando exclusivamente como ferramenta tecnológica de captação e gestão de leads.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">3. Uso da Plataforma</h2>
              <p>O usuário compromete-se a utilizar a plataforma apenas para fins legítimos, não sendo permitido o uso para atividades ilícitas, fraudulentas ou que violem a legislação vigente. A Hallow Comunicação reserva-se o direito de suspender ou cancelar o acesso de usuários que violem estes termos.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">4. Dados e Informações</h2>
              <p>As informações fornecidas pelos usuários serão tratadas conforme a Política de Privacidade. A Hallow Comunicação não se responsabiliza por informações incorretas ou incompletas fornecidas pelos usuários.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">5. Propriedade Intelectual</h2>
              <p>Todo o conteúdo da plataforma, incluindo design, código-fonte, textos e elementos visuais, é de propriedade da Hallow Comunicação, sendo proibida a reprodução sem autorização prévia.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">6. Limitação de Responsabilidade</h2>
              <p>A Hallow Comunicação não se responsabiliza por danos diretos ou indiretos decorrentes do uso da plataforma, incluindo perda de dados, interrupções no serviço ou incompatibilidades técnicas.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-foreground mb-2">7. Alterações nos Termos</h2>
              <p>A Hallow Comunicação reserva-se o direito de modificar estes Termos de Uso a qualquer momento, sendo a versão atualizada publicada nesta página. O uso contínuo da plataforma após alterações constitui aceitação dos novos termos.</p>
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
