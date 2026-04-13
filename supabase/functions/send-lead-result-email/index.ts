import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENDER = "Quintal Ideal Splash <noreply@hallow.com.br>";
const BRAND_PINK = "#e80685";
const BRAND_BLUE = "#08a1d6";
const BRAND_BLUE_LIGHT = "#d4eef9";
const BRAND_GRADIENT = "linear-gradient(135deg, #e80685, #08a1d6)";
const SITE_URL = "https://quintalideal.com.br";

function getScoreClassification(score: number): { label: string; emoji: string; color: string } {
  if (score >= 80) return { label: "Quintal Excelente", emoji: "🏆", color: "#16a34a" };
  if (score >= 60) return { label: "Bom Potencial", emoji: "✅", color: "#08a1d6" };
  if (score >= 40) return { label: "Potencial Moderado", emoji: "🔧", color: "#d97706" };
  return { label: "Precisa de Ajustes", emoji: "📋", color: "#dc2626" };
}

function buildResultEmailHTML(
  nome: string,
  score: number,
  poolName: string,
  poolDescription: string | null,
  cidade: string | null,
  franchiseName: string | null,
  franchiseWhatsapp: string | null,
  franchiseCidadeBase: string | null,
): string {
  const classification = getScoreClassification(score);
  const scoreColor = classification.color;

  const whatsappSection = franchiseWhatsapp ? `
    <tr><td style="padding:0 32px 24px;text-align:center;">
      <p style="margin:0 0 12px;font-size:14px;color:#475569;">Quer tirar dúvidas ou dar o próximo passo?</p>
      <a href="https://wa.me/55${franchiseWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Fiz o teste do Quintal Ideal e gostaria de saber mais sobre a piscina ${poolName}.`)}" 
         style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(22,163,74,0.3);">
        💬 Falar no WhatsApp
      </a>
      ${franchiseName ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">${franchiseName}${franchiseCidadeBase ? ` • ${franchiseCidadeBase}` : ''}</p>` : ''}
    </td></tr>` : '';

  return `<!DOCTYPE html>
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
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Seu Resultado do Quintal Ideal!</h1>
          <p style="color:${BRAND_BLUE_LIGHT};margin:8px 0 0;font-size:14px;font-weight:500;">Olá, ${nome}! Aqui está o resultado da análise do seu quintal.</p>
        </td></tr>

        <!-- Score -->
        <tr><td style="padding:32px 32px 16px;text-align:center;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <div style="display:inline-block;background:${BRAND_BLUE_LIGHT};border-radius:16px;padding:24px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Índice do Quintal</p>
                <p style="margin:6px 0;font-size:48px;font-weight:800;color:${scoreColor};letter-spacing:-2px;">${score}%</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:${scoreColor};">${classification.emoji} ${classification.label}</p>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Pool recommendation -->
        <tr><td style="padding:16px 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr><td style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">🏊 Piscina Recomendada</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">${poolName}</p>
              ${poolDescription ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b;line-height:1.5;">${poolDescription}</p>` : ''}
            </td></tr>
          </table>
        </td></tr>

        ${cidade ? `
        <tr><td style="padding:0 32px 24px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 20px;">
            <p style="margin:0;font-size:13px;color:#166534;">📍 <strong>Cidade:</strong> ${cidade}</p>
          </div>
        </td></tr>` : ''}

        <!-- WhatsApp CTA -->
        ${whatsappSection}

        <!-- Website CTA -->
        <tr><td style="padding:8px 32px 32px;text-align:center;">
          <a href="${SITE_URL}" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(232,6,133,0.3);">
            Explorar Modelos de Piscina →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
            Você recebeu este e-mail porque fez o teste do Quintal Ideal.<br/>
            <a href="${SITE_URL}" style="color:${BRAND_BLUE};text-decoration:none;font-weight:500;">quintalideal.com.br</a>
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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const payload = await req.json();
    const {
      nome,
      email,
      pontuacao_quintal,
      modelo_recomendado,
      cidade,
      franchise_name,
      franchise_whatsapp,
      franchise_cidade_base,
    } = payload;

    if (!email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch pool description
    let poolDescription: string | null = null;
    if (modelo_recomendado) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: pool } = await supabase
        .from("pool_models")
        .select("descricao")
        .eq("nome_modelo", modelo_recomendado)
        .maybeSingle();
      poolDescription = pool?.descricao || null;
    }

    const htmlContent = buildResultEmailHTML(
      nome || "Visitante",
      Number(pontuacao_quintal) || 0,
      modelo_recomendado || "Modelo personalizado",
      poolDescription,
      cidade || null,
      franchise_name || null,
      franchise_whatsapp || null,
      franchise_cidade_base || null,
    );

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER,
        to: [email],
        subject: `🏊 ${nome || "Seu"} resultado do Quintal Ideal — ${pontuacao_quintal || 0}%`,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(`Resend API error [${resendResponse.status}]: ${JSON.stringify(resendData)}`);
    }

    console.log("Lead result email sent to:", email, resendData);

    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-lead-result-email:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
