/**
 * Templates de mensagens WhatsApp para envio via Z-API.
 * Cada template recebe variáveis e retorna o texto final.
 */

export interface TemplateVars {
  leadName?: string;
  franchiseName?: string;
  sellerName?: string;
  modelName?: string;
  proposalTotal?: string;
  proposalLink?: string;
  city?: string;
  score?: number;
  [key: string]: string | number | undefined;
}

export interface WhatsAppTemplate {
  key: string;
  label: string;
  description: string;
  category: 'lead' | 'proposal' | 'followup' | 'general';
  build: (vars: TemplateVars) => string;
}

export const whatsappTemplates: WhatsAppTemplate[] = [
  {
    key: 'welcome_lead',
    label: 'Boas-vindas ao Lead',
    description: 'Primeiro contato após o lead preencher o quiz',
    category: 'lead',
    build: (v) =>
      `Olá${v.leadName ? `, ${v.leadName}` : ''}! 👋\n\nSou ${v.sellerName || 'consultor(a)'} da *${v.franchiseName || 'Quintal Ideal'}*.\n\nVi que você tem interesse em transformar seu quintal${v.city ? ` em ${v.city}` : ''}! ${v.modelName ? `O modelo *${v.modelName}* é uma ótima opção para o seu espaço.` : ''}\n\nPosso te ajudar com mais informações? 🏊`,
  },
  {
    key: 'followup_no_contact',
    label: 'Follow-up sem contato',
    description: 'Lead sem resposta após o primeiro contato',
    category: 'followup',
    build: (v) =>
      `Olá${v.leadName ? `, ${v.leadName}` : ''}! 😊\n\nEntrei em contato recentemente sobre sua piscina e gostaria de saber se ainda tem interesse.\n\nEstou à disposição para esclarecer qualquer dúvida sobre modelos, prazos e condições de pagamento!\n\n*${v.franchiseName || 'Quintal Ideal'}* 🏊`,
  },
  {
    key: 'followup_negotiation',
    label: 'Follow-up em negociação',
    description: 'Lead em negociação que não retornou',
    category: 'followup',
    build: (v) =>
      `Oi${v.leadName ? `, ${v.leadName}` : ''}! 👋\n\nPassando para saber se teve tempo de analisar nossa conversa sobre a piscina.\n\nLembro que temos condições especiais este mês! Posso preparar uma proposta personalizada para você? 📋\n\n*${v.franchiseName || 'Quintal Ideal'}*`,
  },
  {
    key: 'proposal_sent',
    label: 'Proposta enviada',
    description: 'Avisar o cliente que a proposta foi enviada',
    category: 'proposal',
    build: (v) =>
      `Olá${v.leadName ? `, ${v.leadName}` : ''}! 📋\n\nSua proposta${v.proposalTotal ? ` no valor de *${v.proposalTotal}*` : ''} foi enviada com sucesso!\n\n${v.proposalLink ? `Acesse aqui: ${v.proposalLink}\n\n` : ''}Qualquer dúvida, estou à disposição!\n\n*${v.franchiseName || 'Quintal Ideal'}* 🏊`,
  },
  {
    key: 'hot_lead',
    label: 'Lead quente',
    description: 'Contato prioritário para lead com alta pontuação',
    category: 'lead',
    build: (v) =>
      `Olá${v.leadName ? `, ${v.leadName}` : ''}! 🔥\n\nAnalisei seu perfil e vi que você tem um excelente quintal para uma piscina${v.modelName ? ` modelo *${v.modelName}*` : ''}!\n\n${v.score && v.score >= 85 ? 'Seu espaço recebeu uma das melhores avaliações! ' : ''}Gostaria de agendar uma visita técnica sem compromisso?\n\n*${v.franchiseName || 'Quintal Ideal'}* 🏊`,
  },
  {
    key: 'custom',
    label: 'Mensagem personalizada',
    description: 'Escreva sua própria mensagem',
    category: 'general',
    build: () => '',
  },
];

export function getTemplate(key: string): WhatsAppTemplate | undefined {
  return whatsappTemplates.find((t) => t.key === key);
}

export function buildMessage(key: string, vars: TemplateVars): string {
  const template = getTemplate(key);
  if (!template) return '';
  return template.build(vars);
}
