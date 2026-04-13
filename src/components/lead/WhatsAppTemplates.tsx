import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Copy, Send, ChevronDown, ChevronUp, Check, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { toWhatsAppPhone } from '@/lib/phone-utils';
import { useWhatsAppSend } from '@/hooks/useWhatsAppSend';

interface WhatsAppTemplatesProps {
  leadName: string | null;
  leadPhone: string | null;
  modeloRecomendado: string | null;
  cidade: string | null;
  pontuacao: number | null;
  statusLead: string;
  leadId?: string;
  franchiseId?: string | null;
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
  
  const cidade = props.cidade || 'sua região';
  const score = props.pontuacao || 0;

  return [
    {
      id: 'primeiro_contato',
      label: 'Primeiro contato',
      emoji: '👋',
      stage: ['novo'],
      message: `Oi ${nome}! Aqui é [seu nome] da Splash Piscinas em ${cidade} 😊\n\nVi o resultado do seu Quintal Ideal${score > 70 ? ', seu espaço tem um potencial incrível!' : '!'}\n\nMe conta: o que te motivou a fazer o teste? Quero entender pra te ajudar da melhor forma 🤔`,
    },
    {
      id: 'primeiro_contato_curto',
      label: 'Contato rápido',
      emoji: '⚡',
      stage: ['novo'],
      message: `Oi ${nome}! Sou da Splash Piscinas 😊\n\nVi que você testou seu quintal e o resultado ficou ótimo! Qual é o sonho pro seu espaço?`,
    },
    {
      id: 'aprofundar',
      label: 'Descobrir necessidade',
      emoji: '🎯',
      stage: ['contatado'],
      message: `Oi ${nome}! Tudo bem? 😊\n\nEstive pensando na nossa conversa. Como está a rotina de lazer aí na sua casa hoje?\n\nMuitos clientes nossos em ${cidade} dizem que depois da piscina os finais de semana mudaram completamente.\n\nVocê sente que falta esse espaço de descanso em casa?`,
    },
    {
      id: 'prova_social',
      label: 'Caso de sucesso',
      emoji: '🌟',
      stage: ['contatado'],
      message: `${nome}, queria te contar algo legal! 😄\n\nUm cliente nosso aqui em ${cidade} tinha uma situação parecida com a sua. Hoje ele diz que foi o melhor investimento que fez.\n\nQuer ver umas fotos do antes e depois? 📸`,
    },
    {
      id: 'objecao_preco',
      label: 'Contornar preço',
      emoji: '💎',
      stage: ['em_negociacao'],
      message: `${nome}, entendo sua preocupação com o investimento 🤝\n\nMuitos clientes sentiram o mesmo. Mas quando dividem o valor no mês, percebem que custa menos que os passeios que faziam antes. Fora a valorização do imóvel!\n\nQue tal simularmos juntos como ficaria no seu orçamento? Leva 5 minutinhos 📊`,
    },
    {
      id: 'objecao_timing',
      label: 'Contornar "agora não"',
      emoji: '⏰',
      stage: ['em_negociacao'],
      message: `${nome}, faz todo sentido planejar com calma! 👍\n\nSó uma info importante: o prazo de instalação hoje está em [X semanas]. Quem fecha agora garante a piscina pronta pro próximo calor ☀️\n\nPodemos pelo menos agendar a visita técnica essa semana? Assim você tem o projeto em mãos, sem compromisso.`,
    },
    {
      id: 'negociacao_avancar',
      label: 'Fechar negociação',
      emoji: '🤝',
      stage: ['em_negociacao'],
      message: `${nome}, boa notícia! Consegui uma condição especial pra você 🎉\n\nSó consigo manter até [data]. Vou te mandar os detalhes agora. Se fizer sentido, já reservamos a data de instalação. Combinado?`,
    },
    {
      id: 'resgate_suave',
      label: 'Resgate suave',
      emoji: '💬',
      stage: ['contatado', 'em_negociacao'],
      message: `Oi ${nome}! Tudo bem por aí? 😊\n\nLembrei de você porque tivemos uma novidade aqui na Splash que combina com o que conversamos.\n\nPosso te contar em 2 minutinhos? Sem compromisso!`,
    },
    {
      id: 'resgate_valor',
      label: 'Resgate com valor',
      emoji: '📈',
      stage: ['contatado', 'em_negociacao'],
      message: `${nome}, tudo bem? Aqui é [seu nome] da Splash 😊\n\nSaiu um estudo mostrando que imóveis com piscina em ${cidade} valorizaram 15-20% nos últimos anos. Lembrei na hora do seu quintal!\n\nQuer que eu faça uma estimativa pro seu caso?`,
    },
    {
      id: 'pos_venda',
      label: 'Pedir indicação',
      emoji: '🎁',
      stage: ['vendido'],
      message: `${nome}, como está sendo curtir a piscina? 😍\n\nSe você conhece alguém que também sonha com uma piscina, temos um programa de indicação com benefícios especiais pra você.\n\nÉ só me passar o contato que cuido de tudo com o mesmo carinho 🤝`,
    },
  ];
}

export function WhatsAppTemplates(props: WhatsAppTemplatesProps) {
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { sendViaZapi, sending } = useWhatsAppSend();
  const templates = buildTemplates(props);

  const relevant = templates.filter(t => t.stage.includes(props.statusLead));
  const others = templates.filter(t => !t.stage.includes(props.statusLead));
  const displayedTemplates = expanded ? [...relevant, ...others] : relevant.slice(0, 2);

  if (!props.leadPhone) return null;

  const fullPhone = toWhatsAppPhone(props.leadPhone);

  const sendWhatsApp = (message: string) => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${fullPhone}?text=${encoded}`, '_blank');
  };

  const sendViaApi = async (tplId: string, message: string) => {
    if (!props.franchiseId || !props.leadPhone) return;
    setSendingId(tplId);
    await sendViaZapi({
      phone: props.leadPhone,
      message,
      template_key: tplId,
      lead_id: props.leadId,
      franchise_id: props.franchiseId,
    });
    setSendingId(null);
  };

  const copyMessage = (id: string, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedId(id);
    toast.success('Mensagem copiada!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canSendViaApi = !!props.franchiseId;

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

        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {displayedTemplates.map((tpl, i) => (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.15) }}
                className="overflow-hidden"
              >
                <div className="bg-muted/30 rounded-xl p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {tpl.emoji} {tpl.label}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap mb-3">
                    {tpl.message}
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <Button
                      variant="outline"
                      className="h-9 flex-1 text-xs gap-1.5 active:scale-[0.97] transition-transform"
                      onClick={() => copyMessage(tpl.id, tpl.message)}
                    >
                      {copiedId === tpl.id ? (
                        <><Check className="w-3.5 h-3.5 text-success" /> Copiada!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copiar</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 flex-1 text-xs gap-1.5 active:scale-[0.97] transition-transform"
                      onClick={() => sendWhatsApp(tpl.message)}
                    >
                      <Send className="w-3.5 h-3.5" />
                      wa.me
                    </Button>
                    {canSendViaApi && (
                      <Button
                        className="h-9 flex-1 text-xs bg-success hover:bg-success/90 text-success-foreground gap-1.5 active:scale-[0.97] transition-transform"
                        onClick={() => sendViaApi(tpl.id, tpl.message)}
                        disabled={sending && sendingId === tpl.id}
                      >
                        {sending && sendingId === tpl.id ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                        ) : (
                          <><Zap className="w-3.5 h-3.5" /> Enviar Z-API</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {(relevant.length > 2 || others.length > 0) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 active:scale-95"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ver menos' : `Ver todas (${templates.length})`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
