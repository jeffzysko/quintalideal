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
  
  const cidade = props.cidade || 'sua região';
  const score = props.pontuacao || 0;

  return [
    // === NOVO — Primeiro contato (Técnica: Pattern Interrupt + Curiosidade) ===
    {
      id: 'primeiro_contato',
      label: 'Primeiro contato',
      emoji: '👋',
      stage: ['novo'],
      message: `Oi ${nome}! Aqui é [seu nome] da Splash Piscinas em ${cidade} 😊\n\nVi o resultado do seu Índice do Quintal — ${score > 70 ? 'seu espaço tem um potencial incrível!' : 'você tem um quintal com boas possibilidades!'}\n\nMe conta: o que te motivou a fazer o teste? É pra aproveitar mais com a família, valorizar o imóvel, ou tem outro plano? 🤔\n\nQuero entender pra te ajudar da melhor forma.`,
    },
    {
      id: 'primeiro_contato_curto',
      label: 'Contato rápido',
      emoji: '⚡',
      stage: ['novo'],
      message: `Oi ${nome}! Sou da Splash Piscinas 😊\n\nVi que você testou seu quintal — resultado ficou ótimo! Me conta: qual é o sonho pro seu espaço? Quero te ajudar a encontrar a melhor solução.`,
    },

    // === CONTATADO — Aprofundar relacionamento (Técnica: SPIN Selling - Situação/Problema) ===
    {
      id: 'aprofundar',
      label: 'Descobrir necessidade',
      emoji: '🎯',
      stage: ['contatado'],
      message: `Oi ${nome}! Tudo bem? 😊\n\nEstive pensando na nossa conversa e queria te fazer uma pergunta: como está a rotina de lazer aí em casa hoje?\n\nPergunto porque muitos clientes nossos em ${cidade} me dizem que antes gastavam com passeios, clubes e viagens curtas, e depois da piscina tudo mudou — os finais de semana ficaram mais leves.\n\nVocê sente que falta esse espaço de descanso em casa?`,
    },
    {
      id: 'prova_social',
      label: 'Caso de sucesso',
      emoji: '🌟',
      stage: ['contatado'],
      message: `${nome}, queria te contar algo legal! 😄\n\nUm cliente nosso aqui em ${cidade} tinha uma situação parecida com a sua — quintal ocioso e sem saber por onde começar.\n\nHoje ele me diz que foi o melhor investimento que fez: as crianças amam, os amigos vivem lá, e o imóvel valorizou bastante.\n\nQuer que eu te mostre como ficou o projeto dele? Posso te enviar umas fotos do antes e depois 📸`,
    },

    // === EM NEGOCIAÇÃO — Reduzir objeções (Técnica: Feel-Felt-Found + Escassez real) ===
    {
      id: 'objecao_preco',
      label: 'Contornar preço',
      emoji: '💎',
      stage: ['em_negociacao'],
      message: `${nome}, entendo perfeitamente sua preocupação com o investimento 🤝\n\nMuitos clientes sentiram o mesmo antes de fechar. Mas o que eles descobriram é que, quando dividem o valor no mês, custa menos que os passeios que faziam antes.\n\nAlém disso, a valorização do imóvel costuma cobrir boa parte do investimento.\n\nQue tal a gente simular juntos como ficaria no seu orçamento? Posso te mostrar em 5 minutos 📊`,
    },
    {
      id: 'objecao_timing',
      label: 'Contornar "agora não"',
      emoji: '⏰',
      stage: ['em_negociacao'],
      message: `${nome}, faz todo sentido planejar com calma! 👍\n\nSó queria te passar uma informação importante: o prazo de instalação hoje está em torno de [X semanas]. Quem fecha agora já garante a piscina pronta pro próximo calor ☀️\n\nSe deixar pra depois, a fila costuma aumentar e o prazo dobra.\n\nPodemos pelo menos garantir a visita técnica essa semana? Assim você tem o projeto em mãos sem compromisso.`,
    },
    {
      id: 'negociacao_avancar',
      label: 'Fechar negociação',
      emoji: '🤝',
      stage: ['em_negociacao'],
      message: `${nome}, boa notícia! Consegui uma condição diferenciada pra você 🎉\n\nMas preciso ser honesto: só consigo manter até [data]. Depois disso, volta ao valor normal.\n\nVou te mandar os detalhes agora. Se fizer sentido pra você, já reservamos a data de instalação. Combinado?`,
    },

    // === RESGATE — Reativação inteligente (Técnica: Loop aberto + Novidade) ===
    {
      id: 'resgate_suave',
      label: 'Resgate suave',
      emoji: '💬',
      stage: ['contatado', 'em_negociacao'],
      message: `Oi ${nome}! Tudo bem por aí? 😊\n\nLembrei de você porque tivemos uma novidade aqui na Splash que combina muito com o que conversamos.\n\nSem compromisso nenhum — posso te contar em 2 minutinhos?`,
    },
    {
      id: 'resgate_valor',
      label: 'Resgate com valor',
      emoji: '📈',
      stage: ['contatado', 'em_negociacao'],
      message: `${nome}, tudo bem? Aqui é [seu nome] da Splash 😊\n\nSaiu um estudo recente mostrando que imóveis com piscina em ${cidade} valorizaram em média 15-20% nos últimos anos.\n\nLembrei na hora do seu quintal! Quer que eu faça uma estimativa de valorização pro seu caso?`,
    },

    // === PÓS-VENDA — Indicação (Técnica: Reciprocidade + Facilidade) ===
    {
      id: 'pos_venda',
      label: 'Pedir indicação',
      emoji: '🎁',
      stage: ['vendido'],
      message: `${nome}, como está curtindo a piscina? 😍\n\nFicamos muito felizes com o resultado! E queria te fazer um convite: se você conhece alguém que também sonha com uma piscina, temos um programa de indicação com benefícios especiais pra você.\n\nÉ só me passar o contato que eu cuido de tudo com muito carinho, do mesmo jeito que fizemos com você 🤝`,
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
