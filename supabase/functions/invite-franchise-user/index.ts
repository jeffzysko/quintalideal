import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller's token to check role
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

    // Check admin role
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

    // Check franchise exists
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

    // Create user with invite (sends password reset email)
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

    // Assign franchise role
    await adminClient.from("user_roles").insert({
      user_id: userId,
      role: "franquia",
    });

    // Link profile to franchise
    await adminClient
      .from("profiles")
      .update({ franquia_id: franchise_id, full_name: full_name || franchise.nome_franquia })
      .eq("user_id", userId);

    // Send password reset email so user can set their password
    const { error: resetError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://quintalideal.com.br/login",
      },
    });

    if (resetError) {
      console.error("Error generating recovery link:", resetError);
    }

    // Also send via resetPasswordForEmail which actually sends the email
    await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: "https://quintalideal.com.br/login",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Convite enviado para ${email}. O usuário receberá um e-mail para definir sua senha.`,
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
