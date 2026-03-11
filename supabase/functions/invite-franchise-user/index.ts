import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://quintalideal.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SENDER = "Quintal Ideal Splash <noreply@hallow.com.br>";

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

    // Send invite email via Resend
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Bem-vindo ao Quintal Ideal!</h1>
          <p style="color: #e0f2fe; margin: 8px 0 0; font-size: 14px;">Plataforma Splash Piscinas</p>
        </div>
        
        <div style="padding: 32px 24px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            Olá <strong>${userName}</strong>,
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
            Você foi convidado(a) para acessar o painel da franquia <strong>${franchise.nome_franquia}</strong> na plataforma Quintal Ideal.
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
            Para começar, clique no botão abaixo e defina sua senha de acesso:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${recoveryLink}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Definir minha senha →
            </a>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 24px 0 0;">
            Se o botão acima não funcionar, copie e cole este link no seu navegador:<br/>
            <a href="${recoveryLink}" style="color: #0ea5e9; word-break: break-all;">${recoveryLink}</a>
          </p>
        </div>
        
        <div style="padding: 20px 24px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Quintal Ideal Splash • <a href="https://quintalideal.com.br" style="color: #0ea5e9; text-decoration: none;">quintalideal.com.br</a>
          </p>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER,
        to: [email],
        subject: `Seu acesso ao Quintal Ideal - ${franchise.nome_franquia}`,
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
