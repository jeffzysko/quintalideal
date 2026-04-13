import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER = "Quintal Ideal Splash <noreply@hallow.com.br>";
const BRAND_PINK = "#e80685";
const BRAND_BLUE = "#08a1d6";
const BRAND_GRADIENT = "linear-gradient(135deg, #e80685, #08a1d6)";

function buildRecoveryEmailHTML(recoveryLink: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        
        <!-- Header -->
        <tr><td style="background:${BRAND_GRADIENT};padding:40px 32px;text-align:center;">
          <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:28px;">🔑</span>
          </div>
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Recuperação de Senha</h1>
          <p style="color:#e0f2fe;margin:8px 0 0;font-size:13px;font-weight:500;">Plataforma Quintal Ideal</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px;">
          <p style="color:#1e293b;font-size:16px;line-height:1.7;margin:0 0 16px;">
            Olá,
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
            Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Quintal Ideal.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Clique no botão abaixo para definir uma nova senha:
          </p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px;">
              <a href="${recoveryLink}" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(232,6,133,0.3);">
                Redefinir minha senha →
              </a>
            </td></tr>
          </table>

          <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 16px;">
            Se o botão acima não funcionar, copie e cole este link no seu navegador:<br/>
            <a href="${recoveryLink}" style="color:${BRAND_BLUE};word-break:break-all;font-size:11px;">${recoveryLink}</a>
          </p>

          <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:16px;">
            <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
              ⚠️ Este link expira em <strong>24 horas</strong>. Se você não solicitou esta recuperação, pode ignorar este e-mail com segurança.
            </p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">
            Quintal Ideal Splash • <a href="https://quintalideal.com.br" style="color:${BRAND_BLUE};text-decoration:none;">quintalideal.com.br</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { email, siteOrigin } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Use the origin sent from the frontend, with fallbacks
    const origin = siteOrigin || req.headers.get("origin") || "https://quintalideal.com.br";
    const redirectUrl = `${origin.replace(/\/$/, "")}/reset-password`;
    
    console.log("Email:", email);
    console.log("Redirect URL:", redirectUrl);

    // Generate a recovery link using admin API
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a bot-resistant app link (avoid one-time token consumption by link scanners)
    const hashedToken = linkData.properties?.hashed_token;
    if (!hashedToken) {
      console.error("No hashed_token in response, linkData:", JSON.stringify(linkData));
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recoveryAppLink = `${origin.replace(/\/$/, "")}/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;
    console.log("Recovery app link:", recoveryAppLink);

    // Send branded email via Resend
    const html = buildRecoveryEmailHTML(recoveryAppLink);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER,
        to: [email],
        subject: "Recuperação de senha — Quintal Ideal",
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", resendRes.status, errBody);
      throw new Error(`Falha ao enviar e-mail: ${resendRes.status}`);
    }

    const resendData = await resendRes.json();
    console.log("Recovery email sent to:", email, "Resend ID:", resendData.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-recovery-email error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
