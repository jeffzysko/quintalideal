import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER = "Quintal Ideal Splash <noreply@quintalideal.com.br>";
const BRAND_BLUE = "#0369a1";
const BRAND_GRADIENT = "linear-gradient(135deg, #0284c7, #0369a1)";

function buildInviteEmailHTML(userName: string, roleName: string, recoveryLink: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:${BRAND_GRADIENT};padding:40px 32px;text-align:center;">
          <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:28px;">🏊</span>
          </div>
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Bem-vindo ao Quintal Ideal!</h1>
          <p style="color:#e0f2fe;margin:8px 0 0;font-size:13px;font-weight:500;">Acesso como ${roleName}</p>
        </td></tr>
        <tr><td style="padding:36px 32px;">
          <p style="color:#1e293b;font-size:16px;line-height:1.7;margin:0 0 16px;">
            Olá <strong>${userName}</strong>,
          </p>
          <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">
            Você foi convidado(a) para acessar a plataforma Quintal Ideal como <strong style="color:${BRAND_BLUE};">${roleName}</strong>. Clique no botão abaixo para definir sua senha:
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px;">
              <a href="${recoveryLink}" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(3,105,161,0.3);">
                Definir minha senha →
              </a>
            </td></tr>
          </table>
          <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
            Se o botão não funcionar, copie e cole:<br/>
            <a href="${recoveryLink}" style="color:${BRAND_BLUE};word-break:break-all;font-size:11px;">${recoveryLink}</a>
          </p>
        </td></tr>
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin_fabrica")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── LIST USERS ──
    if (action === "list") {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({ perPage: 500 });
      if (error) throw error;

      // Get all roles and profiles
      const { data: allRoles } = await adminClient.from("user_roles").select("user_id, role");
      const { data: allProfiles } = await adminClient.from("profiles").select("user_id, full_name, franquia_id, telefone");
      const { data: allFranchises } = await adminClient.from("franchises").select("id, nome_franquia");

      const franchiseMap: Record<string, string> = {};
      (allFranchises || []).forEach((f: any) => { franchiseMap[f.id] = f.nome_franquia; });

      const rolesMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r: any) => {
        if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
        rolesMap[r.user_id].push(r.role);
      });

      const profilesMap: Record<string, any> = {};
      (allProfiles || []).forEach((p: any) => { profilesMap[p.user_id] = p; });

      const result = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        roles: rolesMap[u.id] || [],
        full_name: profilesMap[u.id]?.full_name || u.user_metadata?.full_name || null,
        telefone: profilesMap[u.id]?.telefone || null,
        franquia_id: profilesMap[u.id]?.franquia_id || null,
        franchise_name: profilesMap[u.id]?.franquia_id ? franchiseMap[profilesMap[u.id].franquia_id] || null : null,
      }));

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CREATE USER ──
    if (action === "create") {
      const { email, full_name, role, franchise_id } = body;
      if (!email || !role) {
        return new Response(JSON.stringify({ error: "E-mail e papel são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (role === "franquia" && !franchise_id) {
        return new Response(JSON.stringify({ error: "Franquia é obrigatória para usuários do tipo franquia" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });

      if (createError) {
        const msg = createError.message.includes("already been registered")
          ? "Este e-mail já está cadastrado."
          : `Erro ao criar usuário: ${createError.message}`;
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = newUser.user.id;

      await adminClient.from("user_roles").insert({ user_id: userId, role });

      if (role === "franquia" && franchise_id) {
        await adminClient.from("profiles").update({ franquia_id: franchise_id, full_name: full_name || email }).eq("user_id", userId);
      } else {
        await adminClient.from("profiles").update({ full_name: full_name || email }).eq("user_id", userId);
      }

      // Send invite email
      const { data: linkData } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: "https://quintalideal.com.br/reset-password" },
      });

      const recoveryLink = linkData?.properties?.action_link || "https://quintalideal.com.br/login";
      const roleLabels: Record<string, string> = {
        admin_fabrica: "Administrador da Fábrica",
        franquia: "Franquia",
      };

      if (RESEND_API_KEY) {
        const html = buildInviteEmailHTML(full_name || email, roleLabels[role] || role, recoveryLink);
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: SENDER,
            to: [email],
            subject: `🏊 Seu acesso ao Quintal Ideal`,
            html,
          }),
        });
      }

      return new Response(JSON.stringify({ success: true, message: `Usuário criado e convite enviado para ${email}.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── UPDATE USER ──
    if (action === "update") {
      const { user_id, full_name, telefone, role, franchise_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent admin from removing their own admin role
      if (user_id === callerUser.id && role && role !== "admin_fabrica") {
        return new Response(JSON.stringify({ error: "Você não pode remover seu próprio papel de administrador." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile
      const profileUpdate: any = {};
      if (full_name !== undefined) profileUpdate.full_name = full_name;
      if (telefone !== undefined) profileUpdate.telefone = telefone;
      if (franchise_id !== undefined) profileUpdate.franquia_id = franchise_id || null;
      
      if (Object.keys(profileUpdate).length > 0) {
        await adminClient.from("profiles").update(profileUpdate).eq("user_id", user_id);
      }

      // Update role if changed
      if (role) {
        await adminClient.from("user_roles").delete().eq("user_id", user_id);
        await adminClient.from("user_roles").insert({ user_id, role });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE USER ──
    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user_id === callerUser.id) {
        return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete roles, profile will cascade from auth.users
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.from("profiles").delete().eq("user_id", user_id);
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      
      if (deleteError) {
        return new Response(JSON.stringify({ error: `Erro ao excluir: ${deleteError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-users error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
