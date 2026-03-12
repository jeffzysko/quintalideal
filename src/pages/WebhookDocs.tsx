import { Copy, CheckCircle2, ArrowLeft, Webhook, Shield, Zap, Code2, FileJson, Lock, Send, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PAYLOAD_EXAMPLE = `{
  "evento": "novo_lead",
  "lead": {
    "nome": "João Silva",
    "telefone": "5551999999999",
    "email": "joao@email.com",
    "cidade": "Porto Alegre",
    "pontuacao_quintal": 78,
    "modelo_recomendado": "Atalaia",
    "referred_by": null,
    "created_at": "2026-03-12T16:00:00.000Z"
  },
  "franquia": {
    "nome": "Splash Porto Alegre - Zona Sul",
    "slug": "porto-alegre-zona-sul"
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
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
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
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
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
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

const FIELDS = [
  { name: 'nome', type: 'string', desc: 'Nome completo do lead' },
  { name: 'telefone', type: 'string', desc: 'Telefone com DDI+DDD (ex: 5551999999999)' },
  { name: 'email', type: 'string | null', desc: 'E-mail (opcional)' },
  { name: 'cidade', type: 'string | null', desc: 'Cidade informada no quiz' },
  { name: 'pontuacao_quintal', type: 'number | null', desc: 'Score de 0 a 100 do Índice do Quintal' },
  { name: 'modelo_recomendado', type: 'string | null', desc: 'Modelo de piscina recomendado' },
  { name: 'referred_by', type: 'string | null', desc: 'Código de indicação (compartilhamento)' },
  { name: 'created_at', type: 'ISO 8601', desc: 'Data/hora de criação do lead' },
];

export default function WebhookDocs() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-10 md:py-16">
        {/* Back button */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-8 gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </motion.div>

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
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">API Docs</span>
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

        {/* Respostas */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={4}
          className="mb-12"
        >
          <SectionHeader icon={CheckCircle2} title="Respostas esperadas" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-emerald-700">Sucesso</span>
              </div>
              <p className="text-xs text-emerald-600">
                Retorne status <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">2xx</code> para confirmar recebimento
              </p>
            </div>
            <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-amber-700">Timeout</span>
              </div>
              <p className="text-xs text-amber-600">
                Limite de <strong>10 segundos</strong>. Sem retry automático nesta versão.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Suporte */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          custom={5}
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
