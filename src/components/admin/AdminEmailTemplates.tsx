import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, UserPlus, Bell, KeyRound, ArrowRight, Zap, Send, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmailTemplate {
  id: string;
  name: string;
  trigger: string;
  recipient: string;
  subject: string;
  icon: React.ReactNode;
  category: 'convite' | 'notificacao' | 'autenticacao' | 'transacional' | 'relatorio';
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
  {
    id: 'lead-result',
    name: 'Resultado do Quiz (Visitante)',
    trigger: 'Lead criado com e-mail válido após completar o quiz',
    recipient: 'E-mail do visitante que fez o teste',
    subject: '🏊 {nome} resultado do Quintal Ideal — {pontuacao}%',
    icon: <Send className="w-4 h-4" />,
    category: 'transacional',
    html: `<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
<div style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:40px 32px;text-align:center">
<div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px"><span style="font-size:28px">🏊</span></div>
<h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">Seu Resultado do Quintal Ideal!</h1>
<p style="color:#e0f2fe;margin:8px 0 0;font-size:14px">Olá, {nome}! Aqui está o resultado da análise do seu quintal.</p>
</div>
<div style="padding:32px;text-align:center">
<div style="display:inline-block;background:#e0f2fe;border-radius:16px;padding:24px 40px">
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600">Índice do Quintal</p>
<p style="margin:6px 0;font-size:48px;font-weight:800;color:#0369a1;letter-spacing:-2px">{pontuacao}%</p>
<p style="margin:0;font-size:14px;font-weight:700;color:#0369a1">🏆 Quintal Excelente</p>
</div>
</div>
<div style="padding:0 32px 24px">
<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
<div style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0">
<p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600">🏊 Piscina Recomendada</p>
</div>
<div style="padding:16px 20px">
<p style="margin:0;font-size:18px;font-weight:700;color:#0f172a">{modelo_recomendado}</p>
<p style="margin:8px 0 0;font-size:13px;color:#64748b">Descrição do modelo recomendado.</p>
</div>
</div>
</div>
<div style="padding:8px 32px 32px;text-align:center">
<a href="#" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">💬 Falar no WhatsApp</a>
</div>
<div style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
<p style="margin:0;color:#94a3b8;font-size:11px">Você recebeu este e-mail porque fez o teste do Quintal Ideal.<br/><a href="https://quintalideal.com.br" style="color:#0369a1;text-decoration:none;font-weight:500">quintalideal.com.br</a></p>
</div>
</div>`,
  },
  {
    id: 'monthly-report',
    name: 'Relatório Mensal da Franquia',
    trigger: 'Automático — 1º dia de cada mês às 09:00 (UTC)',
    recipient: 'E-mail de cada franquia ativa',
    subject: '📊 Relatório {mês} — {nome_franquia}',
    icon: <BarChart3 className="w-4 h-4" />,
    category: 'relatorio',
    html: `<div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">
<div style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:40px 32px;text-align:center">
<div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px"><span style="font-size:28px">📊</span></div>
<h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">Relatório Mensal</h1>
<p style="color:#e0f2fe;margin:8px 0 0;font-size:14px">{nome_franquia} • {mês_referência}</p>
</div>
<div style="padding:24px 32px">
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px">
<p style="margin:0;font-size:22px;font-weight:800;color:#166534">📈 +15% vs mês anterior</p>
</div>
<table style="width:100%;border-collapse:collapse">
<tr><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px">📥 Total de Leads</td><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-weight:700;font-size:18px;text-align:right">{total_leads}</td></tr>
<tr><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px">🆕 Novos</td><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-weight:600;text-align:right">{novos}</td></tr>
<tr><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px">📞 Contatados</td><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-weight:600;text-align:right">{contatados}</td></tr>
<tr><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px">✅ Vendidos</td><td style="padding:12px 8px;border-bottom:1px solid #f1f5f9;font-weight:600;text-align:right">{vendidos}</td></tr>
<tr><td style="padding:12px 8px;color:#64748b;font-size:14px">📊 Taxa de Conversão</td><td style="padding:12px 8px;font-weight:700;font-size:18px;color:#0ea5e9;text-align:right">{taxa_conversao}%</td></tr>
</table>
</div>
<div style="padding:0 32px 24px">
<p style="margin:0 0 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600">🏆 Top Cidades</p>
<p style="margin:0;font-size:14px;color:#334155">{top_cidades}</p>
</div>
<div style="padding:8px 32px 32px;text-align:center">
<a href="https://quintalideal.com.br/painel" style="display:inline-block;background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px">Ver Painel Completo →</a>
</div>
<div style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
<p style="margin:0;color:#94a3b8;font-size:11px">Relatório gerado automaticamente.<br/><a href="https://quintalideal.com.br" style="color:#0369a1;text-decoration:none;font-weight:500">quintalideal.com.br</a></p>
</div>
</div>`,
  },
];

const categoryConfig: Record<string, { label: string; color: string }> = {
  convite: { label: 'Convite', color: 'bg-primary/10 text-primary border-primary/20' },
  notificacao: { label: 'Notificação', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  autenticacao: { label: 'Autenticação', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  transacional: { label: 'Transacional', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  relatorio: { label: 'Relatório', color: 'bg-sky-50 text-sky-700 border-sky-200' },
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
                  transition={{ delay: Math.min(i * 0.08, 0.15) }}
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
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.15) }}>
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
