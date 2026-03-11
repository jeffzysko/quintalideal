import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDER = "Quintal Ideal Splash <noreply@hallow.com.br>";
const BRAND_BLUE = "#0369a1";
const BRAND_GRADIENT = "linear-gradient(135deg, #0284c7, #0369a1)";

function buildInviteEmailHTML(userName: string, franchiseName: string, recoveryLink: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
<tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="background:${BRAND_GRADIENT};padding:40px 32px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">🏊 Bem-vindo ao Quintal Ideal!</h1>
<p style="color:#e0f2fe;margin:8px 0 0;font-size:13px;">Plataforma Splash Piscinas</p></td></tr>
<tr><td style="padding:36px 32px;">
<p style="color:#1e293b;font-size:16px;margin:0 0 16px;">Olá <strong>${userName}</strong>,</p>
<p style="color:#475569;font-size:15px;margin:0 0 16px;">Você foi convidado(a) para acessar o painel da franquia <strong style="color:${BRAND_BLUE};">${franchiseName}</strong>.</p>
<p style="color:#475569;font-size:15px;margin:0 0 28px;">Clique no botão abaixo e defina sua senha:</p>
<table role="presentation" width="100%"><tr><td align="center" style="padding:8px 0 32px;">
<a href="${recoveryLink}" style="display:inline-block;background:${BRAND_GRADIENT};color:#fff;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:16px;">Definir minha senha →</a>
</td></tr></table>
<p style="color:#94a3b8;font-size:12px;margin:0;">Link: <a href="${recoveryLink}" style="color:${BRAND_BLUE};word-break:break-all;font-size:11px;">${recoveryLink}</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const newEmail = "xangri-la@splashpiscinas.com";
    const oldEmail = "xangri-la@aplashpiscinas.com";
    const franchiseName = "Splash Xangri-lá";

    // Update user email
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const existingUser = users?.find((u) => u.email === oldEmail);

    if (existingUser) {
      await adminClient.auth.admin.updateUserById(existingUser.id, { email: newEmail, email_confirm: true });
    }

    const userId = existingUser?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate recovery link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: newEmail,
      options: { redirectTo: "https://quintalideal.com.br/reset-password" },
    });

    if (linkError) throw linkError;
    const recoveryLink = linkData?.properties?.action_link || "https://quintalideal.com.br/login";

    // Send email
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SENDER,
        to: [newEmail],
        subject: `🏊 Seu acesso ao Quintal Ideal — ${franchiseName}`,
        html: buildInviteEmailHTML(franchiseName, franchiseName, recoveryLink),
      }),
    });

    const resendData = await resendRes.json();

    return new Response(JSON.stringify({ success: resendRes.ok, resendData }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
