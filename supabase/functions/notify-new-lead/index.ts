import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://quintalideal.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SENDER = "Quintal Ideal Splash <noreply@quintalideal.com.br>";
const BRAND_BLUE = "#0369a1";
const BRAND_BLUE_LIGHT = "#e0f2fe";
const BRAND_GRADIENT = "linear-gradient(135deg, #0284c7, #0369a1)";

function buildLeadEmailHTML(lead: Record<string, unknown>, franchiseName: string, leadDate: string): string {
  const score = Number(lead.pontuacao_quintal || 0);
  const scoreColor = score >= 70 ? "#16a34a" : score >= 40 ? "#d97706" : "#dc2626";

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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:28px;">🎯</span>
              </div>
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Novo Lead Recebido!</h1>
              <p style="color:${BRAND_BLUE_LIGHT};margin:8px 0 0;font-size:13px;font-weight:500;">${franchiseName} • ${leadDate}</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Score Badge -->
        <tr><td style="padding:32px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <div style="display:inline-block;background:${BRAND_BLUE_LIGHT};border-radius:12px;padding:16px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Índice do Quintal</p>
                <p style="margin:4px 0 0;font-size:36px;font-weight:800;color:${scoreColor};letter-spacing:-1px;">${score}%</p>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Lead Details -->
        <tr><td style="padding:24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            ${buildRow("👤", "Nome", String(lead.nome || "Não informado"), true)}
            ${buildRow("📱", "Telefone", String(lead.telefone || "Não informado"), false)}
            ${buildRow("✉️", "E-mail", String(lead.email || "Não informado"), false)}
            ${buildRow("📍", "Cidade", String(lead.cidade || "Não informada"), false)}
            ${buildRow("🏊", "Modelo Recomendado", String(lead.modelo_recomendado || "—"), false)}
            ${lead.referred_by ? buildRow("🔗", "Indicado por", String(lead.referred_by), false) : ""}
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:8px 32px 32px;text-align:center;">
          <a href="https://quintalideal.com.br/franquia" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(3,105,161,0.3);">
            Ver detalhes na plataforma →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
            Quintal Ideal Splash • Notificação automática<br/>
            <a href="https://quintalideal.com.br" style="color:${BRAND_BLUE};text-decoration:none;font-weight:500;">quintalideal.com.br</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildRow(emoji: string, label: string, value: string, isFirst: boolean): string {
  const borderTop = isFirst ? "" : "border-top:1px solid #f1f5f9;";
  return `
    <tr>
      <td style="padding:14px 16px;${borderTop}width:140px;vertical-align:top;">
        <span style="font-size:13px;color:#64748b;white-space:nowrap;">${emoji} ${label}</span>
      </td>
      <td style="padding:14px 16px;${borderTop}font-weight:600;font-size:14px;color:#1e293b;">
        ${value}
      </td>
    </tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const payload = await req.json();
    const lead = payload.record || payload;

    if (!lead || !lead.id) {
      throw new Error("No lead data provided");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lead.franquia_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_franchise" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: franchise, error: franchiseError } = await supabase
      .from("franchises")
      .select("nome_franquia, email, whatsapp")
      .eq("id", lead.franquia_id)
      .single();

    if (franchiseError || !franchise) {
      throw new Error(`Franchise not found: ${franchiseError?.message}`);
    }

    if (!franchise.email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_franchise_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leadDate = new Date(lead.created_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const htmlContent = buildLeadEmailHTML(lead, franchise.nome_franquia, leadDate);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER,
        to: [franchise.email],
        subject: `🎯 Novo Lead: ${lead.nome || "Cliente"} — ${lead.cidade || "Quintal Ideal"}`,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(`Resend API error [${resendResponse.status}]: ${JSON.stringify(resendData)}`);
    }

    console.log("Email sent successfully:", resendData);

    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notify-new-lead:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
