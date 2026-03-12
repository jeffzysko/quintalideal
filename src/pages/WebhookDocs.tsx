import { Copy, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
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

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-border bg-muted/50">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function WebhookDocs() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 gap-1.5 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <div className="space-y-2 mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Documentação do Webhook</h1>
          <p className="text-muted-foreground">
            Integre o Quintal Ideal ao seu CRM para receber leads automaticamente.
          </p>
        </div>

        {/* Como funciona */}
        <section className="space-y-4 mb-10">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Como funciona</h2>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>Acesse o <strong className="text-foreground">Painel da Franquia → Perfil → Integrações</strong></li>
            <li>Cole a <strong className="text-foreground">URL do webhook</strong> do seu CRM</li>
            <li>Gere um <strong className="text-foreground">Secret</strong> para validação HMAC (recomendado)</li>
            <li>Clique em <strong className="text-foreground">Salvar integrações</strong></li>
            <li>A cada novo lead, enviaremos um <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">POST</code> para sua URL</li>
          </ol>
        </section>

        {/* Payload */}
        <section className="space-y-4 mb-10">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Payload (corpo da requisição)</h2>
          <p className="text-sm text-muted-foreground">
            O webhook envia um <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">POST</code> com
            Content-Type <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">application/json</code>:
          </p>
          <CodeBlock code={PAYLOAD_EXAMPLE} language="JSON" />
        </section>

        {/* Campos */}
        <section className="space-y-4 mb-10">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Campos do Lead</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-left">
                  <th className="px-4 py-2.5 font-medium text-foreground">Campo</th>
                  <th className="px-4 py-2.5 font-medium text-foreground">Tipo</th>
                  <th className="px-4 py-2.5 font-medium text-foreground">Descrição</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">nome</td><td className="px-4 py-2">string</td><td className="px-4 py-2">Nome completo do lead</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">telefone</td><td className="px-4 py-2">string</td><td className="px-4 py-2">Telefone com DDI+DDD (ex: 5551999999999)</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">email</td><td className="px-4 py-2">string | null</td><td className="px-4 py-2">E-mail (opcional)</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">cidade</td><td className="px-4 py-2">string | null</td><td className="px-4 py-2">Cidade informada no quiz</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">pontuacao_quintal</td><td className="px-4 py-2">number | null</td><td className="px-4 py-2">Score de 0 a 100 do Índice do Quintal</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">modelo_recomendado</td><td className="px-4 py-2">string | null</td><td className="px-4 py-2">Modelo de piscina recomendado</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">referred_by</td><td className="px-4 py-2">string | null</td><td className="px-4 py-2">Código de indicação (se veio de compartilhamento)</td></tr>
                <tr className="border-t border-border"><td className="px-4 py-2 font-mono text-xs">created_at</td><td className="px-4 py-2">string (ISO 8601)</td><td className="px-4 py-2">Data/hora de criação</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Segurança */}
        <section className="space-y-4 mb-10">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Validação de Assinatura (HMAC-SHA256)</h2>
          <p className="text-sm text-muted-foreground">
            Se você configurar um <strong className="text-foreground">Secret</strong>, cada webhook incluirá o header
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground mx-1">X-Webhook-Signature</code>
            com a assinatura <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">sha256=&lt;hex&gt;</code> do corpo da requisição.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Recomendamos fortemente</strong> validar esta assinatura para garantir que o webhook veio do Quintal Ideal.
          </p>

          <h3 className="text-sm font-semibold text-foreground mt-4">Python</h3>
          <CodeBlock code={VALIDATION_EXAMPLE} language="python" />

          <h3 className="text-sm font-semibold text-foreground mt-4">Node.js (Express)</h3>
          <CodeBlock code={NODE_EXAMPLE} language="javascript" />
        </section>

        {/* Respostas esperadas */}
        <section className="space-y-4 mb-10">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">Respostas esperadas</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Seu endpoint deve retornar um status <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">2xx</code> para confirmar o recebimento.</p>
            <p>Se o endpoint retornar erro ou não responder em <strong className="text-foreground">10 segundos</strong>, o webhook será considerado falho (sem retry automático nesta versão).</p>
          </div>
        </section>

        {/* Suporte */}
        <section className="space-y-3 rounded-xl border border-border bg-muted/30 p-6">
          <h2 className="text-sm font-semibold text-foreground">Precisa de ajuda?</h2>
          <p className="text-sm text-muted-foreground">
            Entre em contato com o suporte técnico da Hallow Comunicação para auxílio na integração do webhook com seu CRM.
          </p>
        </section>
      </div>
    </div>
  );
}
