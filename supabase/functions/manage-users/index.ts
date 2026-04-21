import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER = "Quintal Ideal <noreply@hallow.com.br>";
const BRAND_BLUE = "#0369a1";
const BRAND_GRADIENT = "linear-gradient(135deg, #0284c7, #0369a1)";

function buildInviteEmailHTML(userName: string, roleName: string, resetPageLink: string): string {
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
               <a href="${resetPageLink}" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:10px;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(3,105,161,0.3);">
                 Definir minha senha →
               </a>
             </td></tr>
           </table>
           <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
             Se o botão não funcionar, copie e cole:<br/>
             <a href="${resetPageLink}" style="color:${BRAND_BLUE};word-break:break-all;font-size:11px;">${resetPageLink}</a>
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">
            Quintal Ideal • <a href="https://quintalideal.com.br" style="color:${BRAND_BLUE};text-decoration:none;">quintalideal.com.br</a>
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

    const body = await req.json();
    const { action } = body;

    // Franchise-level actions (accessible by franchise users)
    const franchiseActions = ["list_franchise_users", "create_franchise_user", "delete_franchise_user"];

    if (franchiseActions.includes(action)) {
      // Verify caller is franchise or admin
      const { data: callerRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUser.id)
        .in("role", ["franquia", "super_admin"])
        .maybeSingle();

      if (!callerRole) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify caller belongs to this franchise (unless admin)
      if (callerRole.role === "franquia") {
        const { data: callerProfile } = await adminClient
          .from("profiles")
          .select("franquia_id")
          .eq("user_id", callerUser.id)
          .maybeSingle();

        if (callerProfile?.franquia_id !== body.franchise_id) {
          return new Response(JSON.stringify({ error: "Acesso negado a esta franquia" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // ── LIST FRANCHISE USERS ──
      if (action === "list_franchise_users") {
        const { franchise_id } = body;
        if (!franchise_id) {
          return new Response(JSON.stringify({ error: "franchise_id é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, full_name, telefone, created_at")
          .eq("franquia_id", franchise_id);

        if (!profiles || profiles.length === 0) {
          return new Response(JSON.stringify({ users: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get emails from auth
        const userIds = profiles.map((p: any) => p.user_id);
        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 500 });

        // Determine who is the "owner" (earliest created_at)
        const sorted = [...profiles].sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const ownerId = sorted[0]?.user_id;

        const result = profiles.map((p: any) => {
          const authUser = authUsers.find((u: any) => u.id === p.user_id);
          return {
            id: p.user_id,
            email: authUser?.email || '',
            full_name: p.full_name,
            telefone: p.telefone,
            is_owner: p.user_id === ownerId,
            created_at: p.created_at,
          };
        });

        return new Response(JSON.stringify({ users: result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── CREATE FRANCHISE USER ──
      if (action === "create_franchise_user") {
        const { franchise_id, email, full_name, telefone } = body;

        // Check limit: max 2 additional users
        const { data: existingProfiles } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("franquia_id", franchise_id);

        if ((existingProfiles?.length || 0) >= 3) {
          return new Response(JSON.stringify({ error: "Limite de 3 usuários por franquia atingido (1 principal + 2 adicionais)." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create user
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

        // Assign role and franchise
        await adminClient.from("user_roles").insert({ user_id: userId, role: "franquia" });
        await adminClient.from("profiles").update({
          franquia_id: franchise_id,
          full_name: full_name || email,
          telefone: telefone || null,
        }).eq("user_id", userId);

        // Send invite email
        // Generate direct recovery link so user goes straight to /reset-password (1 email, not 2)
        let resetPageLink: string;
        const { data: linkData1, error: linkError1 } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `https://quintalideal.com.br/reset-password` },
        });
        if (linkError1 || !linkData1?.properties?.hashed_token) {
          console.warn("Direct recovery link failed, falling back:", linkError1?.message);
          resetPageLink = `https://quintalideal.com.br/forgot-password?email=${encodeURIComponent(email)}`;
        } else {
          resetPageLink = `https://quintalideal.com.br/reset-password?token_hash=${encodeURIComponent(linkData1.properties.hashed_token)}&type=recovery`;
        }
        if (RESEND_API_KEY) {
          const html = buildInviteEmailHTML(full_name || email, "Franquia", resetPageLink);
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

      // ── DELETE FRANCHISE USER ──
      if (action === "delete_franchise_user") {
        const { user_id, franchise_id } = body;

        // Verify user belongs to this franchise
        const { data: targetProfile } = await adminClient
          .from("profiles")
          .select("user_id, franquia_id, created_at")
          .eq("user_id", user_id)
          .maybeSingle();

        if (!targetProfile || targetProfile.franquia_id !== franchise_id) {
          return new Response(JSON.stringify({ error: "Usuário não encontrado nesta franquia." }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check if target is the owner (earliest user)
        const { data: allFranchiseProfiles } = await adminClient
          .from("profiles")
          .select("user_id, created_at")
          .eq("franquia_id", franchise_id)
          .order("created_at", { ascending: true });

        if (allFranchiseProfiles && allFranchiseProfiles[0]?.user_id === user_id) {
          return new Response(JSON.stringify({ error: "O usuário principal da franquia não pode ser removido." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Cannot delete yourself
        if (user_id === callerUser.id) {
          return new Response(JSON.stringify({ error: "Você não pode remover a si mesmo." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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
    }

    // Admin-only actions below
    const { data: roleChecks } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .in("role", ["super_admin"]);

    if (!roleChecks || roleChecks.length === 0) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


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
      const { email, full_name, telefone, role, franchise_id } = body;
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
        await adminClient.from("profiles").update({ franquia_id: franchise_id, full_name: full_name || email, telefone: telefone || null }).eq("user_id", userId);
      } else {
        await adminClient.from("profiles").update({ full_name: full_name || email, telefone: telefone || null }).eq("user_id", userId);
      }

      // Build link to forgot-password page (no expiring token)
      // Generate direct recovery link
      let resetPageLink: string;
      const { data: linkData2, error: linkError2 } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `https://quintalideal.com.br/reset-password` },
      });
      if (linkError2 || !linkData2?.properties?.hashed_token) {
        console.warn("Direct recovery link failed, falling back:", linkError2?.message);
        resetPageLink = `https://quintalideal.com.br/forgot-password?email=${encodeURIComponent(email)}`;
      } else {
        resetPageLink = `https://quintalideal.com.br/reset-password?token_hash=${encodeURIComponent(linkData2.properties.hashed_token)}&type=recovery`;
      }
      const roleLabels: Record<string, string> = {
        super_admin: "Super Administrador",
        franquia: "Franquia",
      };

      if (RESEND_API_KEY) {
        const html = buildInviteEmailHTML(full_name || email, roleLabels[role] || role, resetPageLink);
        console.log("Sending invite email to:", email, "from:", SENDER);
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: SENDER,
            to: [email],
            subject: `🏊 Seu acesso ao Quintal Ideal`,
            html,
          }),
        });
        const resendData = await resendRes.json();
        if (!resendRes.ok) {
          console.error("Resend error:", JSON.stringify(resendData));
        } else {
          console.log("Invite email sent successfully:", JSON.stringify(resendData));
        }
      } else {
        console.warn("RESEND_API_KEY not configured, skipping email send");
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
      if (user_id === callerUser.id && role && role !== "super_admin") {
        return new Response(JSON.stringify({ error: "Você não pode remover seu próprio papel de administrador." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update password if provided
      const { password } = body;
      if (password) {
        const { error: pwError } = await adminClient.auth.admin.updateUserById(user_id, { password });
        if (pwError) {
          return new Response(JSON.stringify({ error: `Erro ao atualizar senha: ${pwError.message}` }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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

    // ── RESEND INVITE ──
    if (action === "resend_invite") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user info
      const { data: targetUser, error: userError } = await adminClient.auth.admin.getUserById(user_id);
      if (userError || !targetUser?.user) {
        return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const email = targetUser.user.email!;
      const { data: profileData } = await adminClient.from("profiles").select("full_name, franquia_id").eq("user_id", user_id).maybeSingle();
      const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user_id).maybeSingle();

      const roleLabels: Record<string, string> = {
        super_admin: "Super Administrador",
        franquia: "Franquia",
      };
      const roleName = roleLabels[roleData?.role || ""] || roleData?.role || "Usuário";
      const userName = profileData?.full_name || email;

      // Generate direct recovery link for resend
      let resetPageLink: string;
      const { data: linkData3, error: linkError3 } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `https://quintalideal.com.br/reset-password` },
      });
      if (linkError3 || !linkData3?.properties?.hashed_token) {
        console.warn("Direct recovery link failed, falling back:", linkError3?.message);
        resetPageLink = `https://quintalideal.com.br/forgot-password?email=${encodeURIComponent(email)}`;
      } else {
        resetPageLink = `https://quintalideal.com.br/reset-password?token_hash=${encodeURIComponent(linkData3.properties.hashed_token)}&type=recovery`;
      }

      if (!RESEND_API_KEY) {
        return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const html = buildInviteEmailHTML(userName, roleName, resetPageLink);
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: SENDER,
          to: [email],
          subject: `🏊 Seu acesso ao Quintal Ideal`,
          html,
        }),
      });

      if (!resendRes.ok) {
        const errData = await resendRes.text();
        console.error("Resend error:", errData);
        return new Response(JSON.stringify({ error: "Falha ao enviar e-mail" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Invite re-sent to:", email);
      return new Response(JSON.stringify({ success: true, message: `Convite reenviado para ${email}.` }), {
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
