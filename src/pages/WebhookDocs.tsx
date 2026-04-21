import { Copy, CheckCircle2, Webhook, Shield, Zap, Code2, FileJson, Lock, Send, HelpCircle, AlertTriangle, List, MailOpen, MessageCircleQuestion } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const PAYLOAD_EXAMPLE = `{
  "evento": "novo_lead",
  "lead": {
    "nome": "João Silva",
    "telefone": "51999999999",
    "email": "joao@email.com",
    "cidade": "Porto Alegre",
    "pontuacao_quintal": 78,
    "modelo_recomendado": "Supreme",
    "created_at": "2026-03-12T16:00:00.000Z"
  },
  "franquia": {
    "nome": "Quintal Ideal Porto Alegre - Zona Sul",
    "slug": "porto-alegre-zona-sul"
  }
}`;

const TEST_PAYLOAD_EXAMPLE = `{
  "evento": "teste_webhook",
  "lead": {
    "nome": "Lead de Teste",
    "telefone": "51999999999",
    "email": "teste@exemplo.com",
    "cidade": "Cidade Teste",
    "pontuacao_quintal": 75,
    "modelo_recomendado": "Cancún",
    "created_at": "2026-03-12T16:00:00.000Z"
  },
  "franquia": {
    "nome": "Quintal Ideal Exemplo",
    "slug": "exemplo"
  }
}`;

const VALIDATION_EXAMPLE = `import hmac
import hashlib

def verify_signature(payload_body: bytes, secret: str, signature_header: str) -> bool:
    """Valida a assinatura HMAC-SHA256 do webhook."""
    expected = "sha256=" + hmac.new(
        secret.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)

# Uso no endpoint:
# signature = request.headers.get("X-Webhook-Signature")
# is_valid = verify_signature(request.body, "seu_secret", signature)`;

const NODE_EXAMPLE = `const crypto = require('crypto');

function verifySignature(body, secret, signatureHeader) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}

// Express.js exemplo:
app.post('/webhook/quintal-ideal', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifySignature(
    JSON.stringify(req.body), 'seu_secret', signature
  );
  if (!isValid) return res.status(401).send('Invalid signature');

  const { lead, franquia } = req.body;
  console.log('Novo lead:', lead.nome, '- Franquia:', franquia.nome);
  // Processar no seu CRM...

  res.status(200).json({ ok: true });
});`;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.08, 0.15), duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-2xl overflow-hidden border border-border/50 bg-[hsl(var(--muted)/0.3)] backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between px-5 py-2.5 bg-muted/60 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded-lg hover:bg-muted"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto text-xs leading-relaxed text-foreground/80">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StepCard({ number, icon: Icon, title, description }: { number: number; icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start group">
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">
          {number}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-0.5">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {badge && (
          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

const FIELDS = [
  { name: 'nome', type: 'string', desc: 'Nome completo do lead' },
  { name: 'telefone', type: 'string', desc: 'Telefone com DDD (10 ou 11 dígitos, ex: 51999999999)' },
  { name: 'email', type: 'string | null', desc: 'E-mail (opcional)' },
  { name: 'cidade', type: 'string | null', desc: 'Cidade informada no quiz' },
  { name: 'pontuacao_quintal', type: 'number | null', desc: 'Score de 0 a 100 do Índice do Quintal' },
  { name: 'modelo_recomendado', type: 'string | null', desc: 'Modelo de piscina recomendado' },
  
  { name: 'created_at', type: 'ISO 8601', desc: 'Data/hora de criação do lead' },
];

export default function WebhookDocs() {

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12 relative overflow-hidden">
      <PageHeader
        title="Webhook Docs"
        subtitle="Documentação técnica de integração via webhook"
        fallbackPath="/admin"
      />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-6 md:py-10">
        <Breadcrumbs className="md:hidden" items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Webhook Docs' },
        ]} />

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Webhook className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">API Docs</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">Webhook de Leads</h1>
            </div>
          </div>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg leading-relaxed">
            Integre o <strong className="text-foreground">Quintal Ideal</strong> ao seu CRM e receba cada novo lead automaticamente via HTTP POST.
          </p>
        </motion.div>

        {/* Como funciona */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={0}
          className="mb-12 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 md:p-8 shadow-sm"
        >
          <SectionHeader icon={Zap} title="Como funciona" />
          <div className="space-y-5">
            <StepCard number={1} icon={Code2} title="Configure no painel" description="Acesse Perfil → Integrações e cole a URL do webhook do seu CRM." />
            <StepCard number={2} icon={Lock} title="Adicione um Secret" description="Gere um secret para validação HMAC-SHA256 (recomendado para segurança)." />
            <StepCard number={3} icon={Send} title="Receba leads" description="A cada novo lead, enviaremos um POST com todos os dados para sua URL." />
          </div>
        </motion.section>

        {/* Payload */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={1}
          className="mb-12"
        >
          <SectionHeader icon={FileJson} title="Payload" badge="POST" />
          <p className="text-sm text-muted-foreground mb-4">
            Corpo da requisição enviado com <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">Content-Type: application/json</code>
          </p>
          <CodeBlock code={PAYLOAD_EXAMPLE} language="JSON" />

          <div className="mt-6 rounded-2xl border border-amber-200/50 bg-amber-50/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Send className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-foreground">Evento de teste</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Ao clicar em <strong className="text-foreground">"Testar"</strong> nas configurações de integrações, enviamos um payload com 
              <code className="bg-background/80 px-1.5 py-0.5 rounded text-xs font-mono mx-1">"evento": "teste_webhook"</code> 
              em vez de <code className="bg-background/80 px-1.5 py-0.5 rounded text-xs font-mono mx-1">"novo_lead"</code>. 
              Use este campo para ignorar dados de teste no seu CRM.
            </p>
            <CodeBlock code={TEST_PAYLOAD_EXAMPLE} language="JSON — Teste" />
          </div>
        </motion.section>

        {/* Campos */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={2}
          className="mb-12"
        >
          <SectionHeader icon={FileJson} title="Campos do Lead" />
          <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Campo</th>
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Tipo</th>
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {FIELDS.map((f, i) => (
                  <tr key={f.name} className={`border-t border-border/40 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-primary/5 transition-colors`}>
                    <td className="px-5 py-2.5 font-mono text-xs text-primary font-medium">{f.name}</td>
                    <td className="px-5 py-2.5 text-xs text-muted-foreground">{f.type}</td>
                    <td className="px-5 py-2.5 text-xs text-muted-foreground">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Segurança */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={3}
          className="mb-12"
        >
          <SectionHeader icon={Shield} title="Validação de Assinatura" badge="HMAC-SHA256" />
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-5">
            <p className="text-sm text-foreground">
              <strong>Recomendado:</strong> Valide o header <code className="bg-background/80 px-1.5 py-0.5 rounded text-xs font-mono">X-Webhook-Signature</code> para garantir a autenticidade.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Python</span>
              </div>
              <CodeBlock code={VALIDATION_EXAMPLE} language="python" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Node.js</span>
              </div>
              <CodeBlock code={NODE_EXAMPLE} language="javascript" />
            </div>
          </div>
        </motion.section>

        {/* Eventos */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={4}
          className="mb-12"
        >
          <SectionHeader icon={List} title="Tipos de Evento" />
          <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Evento</th>
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Quando é disparado</th>
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Ação recomendada</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/40 bg-background hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-xs text-primary font-medium">novo_lead</td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">Quando um visitante preenche o formulário de contato após o quiz</td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">Criar registro no CRM e iniciar fluxo de atendimento</td>
                </tr>
                <tr className="border-t border-border/40 bg-muted/20 hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-xs text-primary font-medium">teste_webhook</td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">Quando o franqueado clica em "Testar" nas configurações de integrações</td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">Ignorar ou registrar como teste — não criar lead real</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Headers */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={5}
          className="mb-12"
        >
          <SectionHeader icon={MailOpen} title="Headers da Requisição" />
          <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Header</th>
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Valor</th>
                  <th className="px-5 py-3 text-left font-semibold text-foreground text-xs uppercase tracking-wider">Obrigatório</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/40 bg-background hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-xs text-primary font-medium">Content-Type</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">application/json</td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">Sempre presente</td>
                </tr>
                <tr className="border-t border-border/40 bg-muted/20 hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-2.5 font-mono text-xs text-primary font-medium">X-Webhook-Signature</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">sha256=&lt;hex&gt;</td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">Somente se um secret estiver configurado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Respostas & Troubleshooting */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={6}
          className="mb-12"
        >
          <SectionHeader icon={AlertTriangle} title="Respostas & Troubleshooting" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-700">Sucesso (2xx)</span>
              </div>
              <p className="text-xs text-emerald-600">
                Retorne status <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">2xx</code> para confirmar recebimento. O lead será marcado como entregue.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-700">Timeout (10s)</span>
              </div>
              <p className="text-xs text-amber-600">
                Se o servidor não responder em <strong>10 segundos</strong>, a requisição será cancelada.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-red-200/50 bg-red-50/50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-red-700">Erro (5xx / Timeout)</span>
              </div>
              <p className="text-xs text-red-600">
                O sistema faz até <strong>3 tentativas</strong> com backoff exponencial (0s, 2s, 5s). Se todas falharem, o erro é registrado nos logs mas <strong>o lead é salvo normalmente</strong>.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span className="text-xs font-bold text-foreground">Erro 4xx (cliente)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Erros de cliente (exceto 408/429) <strong>não são reenviados</strong>. Verifique a URL e as configurações do seu CRM.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-foreground">
              <strong>📋 Histórico de entregas:</strong> Todas as tentativas de envio ficam registradas em <strong>Perfil → Integrações → Histórico de Entregas</strong>, com status, código HTTP e detalhes de cada tentativa.
            </p>
          </div>
          <div className="mt-3 rounded-xl border border-amber-200/50 bg-amber-50/30 p-4">
            <p className="text-xs text-foreground">
              <strong>📧 Alerta por e-mail:</strong> Se todas as 3 tentativas falharem, o franqueado recebe um <strong>e-mail de alerta automático</strong> informando a falha e orientando a verificar as configurações do webhook.
            </p>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={7}
          className="mb-12"
        >
          <SectionHeader icon={MessageCircleQuestion} title="Perguntas Frequentes" badge="FAQ" />
          <div className="space-y-3">
            {[
              {
                q: 'Posso configurar mais de uma URL de webhook?',
                a: 'Atualmente cada franquia suporta uma URL. Se precisar enviar para múltiplos destinos, use um serviço intermediário como Zapier, Make ou n8n para distribuir.',
              },
              {
                q: 'O que acontece se meu servidor estiver fora do ar?',
                a: 'O lead é salvo normalmente no painel do Quintal Ideal. O sistema faz até 3 tentativas automáticas com backoff (0s, 2s, 5s). Se todas falharem, o franqueado recebe um e-mail de alerta automático. Recomendamos monitorar a disponibilidade do seu endpoint.',
              },
              {
                q: 'Como testar sem um CRM?',
                a: 'Use serviços gratuitos como webhook.site ou requestbin.com para gerar uma URL temporária. Cole nas configurações e clique em "Testar" para ver o payload recebido.',
              },
              {
                q: 'Preciso validar a assinatura HMAC?',
                a: 'É altamente recomendado para segurança, mas não obrigatório. Sem validação, qualquer pessoa que conheça sua URL poderia enviar dados falsos.',
              },
              {
                q: 'Qual o formato da data/hora?',
                a: 'ISO 8601 em UTC (ex: 2026-03-12T16:00:00.000Z). Converta para o fuso horário local no seu CRM.',
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card/60 p-4 hover:bg-card/80 transition-colors">
                <h3 className="text-sm font-semibold text-foreground mb-1.5">{item.q}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Suporte */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={8}
          className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground mb-1">Precisa de ajuda?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Entre em contato com o suporte técnico da <strong className="text-foreground">Hallow Comunicação</strong> para auxílio na integração do webhook com seu CRM.
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
