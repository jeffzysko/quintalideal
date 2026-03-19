import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatsAppTemplatesProps {
  leadName: string | null;
  leadPhone: string | null;
  modeloRecomendado: string | null;
  cidade: string | null;
  pontuacao: number | null;
  statusLead: string;
}

interface Template {
  id: string;
  label: string;
  emoji: string;
  message: string;
  stage: string[];
}

function buildTemplates(props: WhatsAppTemplatesProps): Template[] {
  const nome = props.leadName?.split(' ')[0] || 'Cliente';
  const modelo = props.modeloRecomendado || 'a piscina ideal';
  const cidade = props.cidade || 'sua cidade';

  return [
    {
      id: 'primeiro_contato',
      label: 'Primeiro contato',
      emoji: '👋',
      stage: ['novo'],
      message: `Olá ${nome}, tudo bem? 😊\n\nSou da Splash Piscinas e vi que você fez o teste do Índice do Quintal!\n\nSeu quintal tem um ótimo potencial para receber uma piscina. Podemos conversar sobre as opções?`,
    },
    {
      id: 'modelo_recomendado',
      label: 'Apresentar modelo',
      emoji: '💧',
      stage: ['novo', 'contatado'],
      message: `Oi ${nome}! 👋\n\nBaseado no seu perfil, o modelo ${modelo} é perfeito para o seu quintal em ${cidade}.\n\nPosso te enviar mais detalhes e fotos desse modelo? 📸`,
    },
    {
      id: 'followup',
      label: 'Follow-up',
      emoji: '🔄',
      stage: ['contatado', 'em_negociacao'],
      message: `Oi ${nome}, tudo bem? 😊\n\nPassando para saber se conseguiu analisar a proposta que conversamos. Ficou alguma dúvida?\n\nEstou à disposição para ajudar!`,
    },
    {
      id: 'visita',
      label: 'Agendar visita',
      emoji: '📅',
      stage: ['contatado', 'em_negociacao'],
      message: `Oi ${nome}! 🏡\n\nQue tal agendarmos uma visita técnica no seu quintal? Assim podemos tirar as medidas exatas e apresentar a melhor solução.\n\nQual o melhor dia e horário para você?`,
    },
    {
      id: 'urgencia',
      label: 'Criar urgência',
      emoji: '⏰',
      stage: ['em_negociacao'],
      message: `${nome}, boas notícias! 🎉\n\nTemos uma condição especial válida por tempo limitado. É a oportunidade perfeita para garantir sua piscina ${modelo} antes do verão!\n\nPosso te explicar os detalhes?`,
    },
    {
      id: 'resgate',
      label: 'Resgate de lead',
      emoji: '💬',
      stage: ['contatado', 'em_negociacao'],
      message: `Oi ${nome}, tudo bem? 😊\n\nFaz um tempo que conversamos sobre sua piscina. Sei que às vezes o timing não é o ideal, mas queria te avisar que temos novidades!\n\nAinda está nos planos ter uma piscina?`,
    },
  ];
}

export function WhatsAppTemplates(props: WhatsAppTemplatesProps) {
  const [expanded, setExpanded] = useState(false);
  const templates = buildTemplates(props);

  // Filter relevant templates based on current status
  const relevant = templates.filter(t => t.stage.includes(props.statusLead));
  const others = templates.filter(t => !t.stage.includes(props.statusLead));
  const displayedTemplates = expanded ? [...relevant, ...others] : relevant.slice(0, 2);

  if (!props.leadPhone) return null;

  const phone = props.leadPhone.replace(/\D/g, '');
  const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;

  const sendWhatsApp = (message: string) => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank');
  };

  const copyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast.success('Mensagem copiada!');
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-success" />
            <h2 className="text-sm font-semibold text-foreground">Mensagens Rápidas</h2>
          </div>
          <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-medium">
            WhatsApp
          </span>
        </div>

        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {displayedTemplates.map((tpl, i) => (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                className="overflow-hidden"
              >
                <div className="bg-muted/30 rounded-xl p-3 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {tpl.emoji} {tpl.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyMessage(tpl.message)}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                        title="Copiar"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 whitespace-pre-wrap mb-2">
                    {tpl.message}
                  </p>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs bg-success hover:bg-success/90 text-success-foreground gap-1.5"
                    onClick={() => sendWhatsApp(tpl.message)}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Enviar via WhatsApp
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {(relevant.length > 2 || others.length > 0) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ver menos' : `Ver todas (${templates.length})`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
