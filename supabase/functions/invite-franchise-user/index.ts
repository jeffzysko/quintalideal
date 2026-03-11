import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://quintalideal.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SENDER = "Quintal Ideal Splash <noreply@hallow.com.br>";
const BRAND_BLUE = "#0369a1";
const BRAND_GRADIENT = "linear-gradient(135deg, #0284c7, #0369a1)";

function buildInviteEmailHTML(userName: string, franchiseName: string, resetPageLink: string): string {
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
            <span style="font-size:28px;">🏊</span>
          </div>
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Bem-vindo ao Quintal Ideal!</h1>
          <p style="color:#e0f2fe;margin:8px 0 0;font-size:13px;font-weight:500;">Plataforma Splash Piscinas</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px;">
          <p style="color:#1e293b;font-size:16px;line-height:1.7;margin:0 0 16px;">
            Olá <strong>${userName}</strong>,
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px;">
            Você foi convidado(a) para acessar o painel da franquia <strong style="color:${BRAND_BLUE};">${franchiseName}</strong> na plataforma Quintal Ideal.
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Para começar, clique no botão abaixo e solicite a definição da sua senha de acesso:
          </p>
          
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px;">
              <a href="${resetPageLink}" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(3,105,161,0.3);">
                Definir minha senha →
              </a>
            </td></tr>
          </table>
          
          <!-- What you'll find -->
          <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.5px;">No seu painel você poderá:</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;font-size:14px;color:#475569;">✅ Acompanhar leads gerados pelo quiz</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#475569;">✅ Gerenciar contatos e negociações</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#475569;">✅ Visualizar relatórios de desempenho</td></tr>
              <tr><td style="padding:4px 0;font-size:14px;color:#475569;">✅ Compartilhar seu link personalizado</td></tr>
            </table>
          </div>

          <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
            Se o botão acima não funcionar, copie e cole este link no seu navegador:<br/>
            <a href="${resetPageLink}" style="color:${BRAND_BLUE};word-break:break-all;font-size:11px;">${resetPageLink}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
            Quintal Ideal Splash • Convite de acesso<br/>
            <a href="https://quintalideal.com.br" style="color:${BRAND_BLUE};text-decoration:none;font-weight:500;">quintalideal.com.br</a>
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser } } = await callerClient.auth.getUser();
    if (!callerUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin_fabrica")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem convidar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, franchise_id, full_name } = await req.json();

    if (!email || !franchise_id) {
      return new Response(JSON.stringify({ error: "E-mail e franquia são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: franchise } = await adminClient
      .from("franchises")
      .select("id, nome_franquia")
      .eq("id", franchise_id)
      .maybeSingle();

    if (!franchise) {
      return new Response(JSON.stringify({ error: "Franquia não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: full_name || franchise.nome_franquia },
    });

    if (createError) {
      const msg = createError.message.includes("already been registered")
        ? "Este e-mail já está cadastrado no sistema."
        : `Erro ao criar usuário: ${createError.message}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Assign role and link profile
    await adminClient.from("user_roles").insert({ user_id: userId, role: "franquia" });
    await adminClient
      .from("profiles")
      .update({ franquia_id: franchise_id, full_name: full_name || franchise.nome_franquia })
      .eq("user_id", userId);

    // Generate recovery link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://quintalideal.com.br/reset-password",
      },
    });

    if (linkError) {
      console.error("Error generating recovery link:", linkError);
      return new Response(JSON.stringify({ error: "Usuário criado mas houve erro ao gerar link de acesso." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recoveryLink = linkData?.properties?.action_link || "https://quintalideal.com.br/login";
    const userName = full_name || franchise.nome_franquia;

    const htmlContent = buildInviteEmailHTML(userName, franchise.nome_franquia, recoveryLink);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER,
        to: [email],
        subject: `🏊 Seu acesso ao Quintal Ideal — ${franchise.nome_franquia}`,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);
      return new Response(JSON.stringify({ 
        error: "Usuário criado, mas houve erro ao enviar o e-mail. O admin pode reenviar o convite." 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Invite email sent:", resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Convite enviado para ${email}. O franqueado receberá um e-mail para definir sua senha.`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Invite error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
