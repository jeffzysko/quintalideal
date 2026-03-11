import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, UserPlus, Bell, KeyRound, ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmailTemplate {
  id: string;
  name: string;
  trigger: string;
  recipient: string;
  subject: string;
  icon: React.ReactNode;
  category: 'convite' | 'notificacao' | 'autenticacao';
  html: string;
}

const templates: EmailTemplate[] = [
  {
    id: 'invite',
    name: 'Convite de Franqueado',
    trigger: 'Admin convida um novo franqueado pelo painel',
    recipient: 'E-mail do franqueado convidado',
    subject: 'Seu acesso ao Quintal Ideal - {nome_franquia}',
    icon: <UserPlus className="w-4 h-4" />,
    category: 'convite',
    html: `<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
<div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 24px;text-align:center">
<h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">Bem-vindo ao Quintal Ideal!</h1>
<p style="color:#e0f2fe;margin:8px 0 0;font-size:14px">Plataforma Splash Piscinas</p>
</div>
<div style="padding:32px 24px">
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 16px">Olá <strong>{nome}</strong>,</p>
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 16px">Você foi convidado(a) para acessar o painel da franquia <strong>{nome_franquia}</strong> na plataforma Quintal Ideal.</p>
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px">Para começar, clique no botão abaixo e defina sua senha de acesso:</p>
<div style="text-align:center;margin:32px 0">
<a href="#" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:16px">Definir minha senha →</a>
</div>
<p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:24px 0 0">Se o botão acima não funcionar, copie e cole o link no seu navegador.</p>
</div>
<div style="padding:20px 24px;background:#f8fafc;text-align:center;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:12px;margin:0">Quintal Ideal Splash • quintalideal.com.br</p>
</div>
</div>`,
  },
  {
    id: 'new-lead',
    name: 'Notificação de Novo Lead',
    trigger: 'Um novo lead completa o quiz via link da franquia',
    recipient: 'E-mail da franquia vinculada ao lead',
    subject: '🎯 Novo Lead: {nome_lead} - {cidade}',
    icon: <Bell className="w-4 h-4" />,
    category: 'notificacao',
    html: `<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
<div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 24px;text-align:center">
<h1 style="color:#ffffff;margin:0;font-size:24px">🎯 Novo Lead Recebido!</h1>
<p style="color:#e0f2fe;margin:8px 0 0;font-size:14px">{data_lead}</p>
</div>
<div style="padding:24px">
<table style="width:100%;border-collapse:collapse">
<tr><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px">👤 Nome</td><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:14px">{nome_lead}</td></tr>
<tr><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px">📱 Telefone</td><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:14px">{telefone}</td></tr>
<tr><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px">📍 Cidade</td><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:14px">{cidade}</td></tr>
<tr><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px">🏊 Modelo</td><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:14px">{modelo}</td></tr>
<tr><td style="padding:12px 8px;color:#64748b;font-size:14px">📊 Índice</td><td style="padding:12px 8px;font-weight:700;font-size:18px;color:#0ea5e9">{pontuacao}%</td></tr>
</table>
<div style="text-align:center;margin-top:32px">
<a href="https://quintalideal.com.br/franquia" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px">Ver detalhes na plataforma →</a>
</div>
<p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px">Quintal Ideal Splash • Notificação automática de novo lead</p>
</div>
</div>`,
  },
  {
    id: 'password-reset',
    name: 'Recuperação de Senha',
    trigger: 'Franqueado solicita redefinição de senha no login',
    recipient: 'E-mail do franqueado que solicitou',
    subject: 'Redefinir senha - Quintal Ideal',
    icon: <KeyRound className="w-4 h-4" />,
    category: 'autenticacao',
    html: `<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
<div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 24px;text-align:center">
<h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">Redefinir Senha</h1>
<p style="color:#e0f2fe;margin:8px 0 0;font-size:14px">Quintal Ideal Splash</p>
</div>
<div style="padding:32px 24px">
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 16px">Olá,</p>
<p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
<div style="text-align:center;margin:32px 0">
<a href="#" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:16px">Redefinir minha senha →</a>
</div>
<p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:24px 0 0">Se você não solicitou esta redefinição, ignore este e-mail. Sua senha permanecerá inalterada.</p>
</div>
<div style="padding:20px 24px;background:#f8fafc;text-align:center;border-top:1px solid #e2e8f0">
<p style="color:#94a3b8;font-size:12px;margin:0">Quintal Ideal Splash • quintalideal.com.br</p>
</div>
</div>`,
  },
];

const categoryConfig: Record<string, { label: string; color: string }> = {
  convite: { label: 'Convite', color: 'bg-primary/10 text-primary border-primary/20' },
  notificacao: { label: 'Notificação', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  autenticacao: { label: 'Autenticação', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

export function AdminEmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5 text-primary" />
        <span className="font-semibold text-foreground">E-mails da Plataforma</span>
        <Badge variant="outline" className="text-xs border-primary/30 text-primary">{templates.length} templates</Badge>
      </div>

      {/* Email Flow Diagram */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Fluxo de E-mails
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((t, i) => {
              const cat = categoryConfig[t.category];
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{t.name}</span>
                      <Badge className={`${cat.color} border text-[10px]`}>{cat.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.trigger}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  <div className="text-xs text-muted-foreground shrink-0 max-w-[180px] truncate">{t.recipient}</div>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              <strong>Remetente:</strong> Quintal Ideal Splash &lt;noreply@hallow.com.br&gt; • Todos enviados via Resend
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template Cards */}
      <div className="grid gap-4">
        {templates.map((t, i) => {
          const cat = categoryConfig[t.category];
          const isOpen = selectedTemplate === t.id;

          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <button
                    onClick={() => setSelectedTemplate(isOpen ? null : t.id)}
                    className="w-full text-left p-5 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{t.name}</span>
                        <Badge className={`${cat.color} border text-[10px]`}>{cat.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Assunto:</strong> {t.subject}
                      </p>
                    </div>
                    <span className={`text-xs text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  </button>

                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-border/50"
                    >
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground font-medium uppercase tracking-wider">Gatilho</span>
                            <p className="text-foreground mt-1">{t.trigger}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium uppercase tracking-wider">Destinatário</span>
                            <p className="text-foreground mt-1">{t.recipient}</p>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Preview do Template</span>
                          <div className="mt-2 border border-border/50 rounded-xl overflow-hidden bg-muted/30">
                            <iframe
                              srcDoc={t.html}
                              className="w-full border-0"
                              style={{ height: '400px' }}
                              title={`Preview: ${t.name}`}
                              sandbox=""
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
