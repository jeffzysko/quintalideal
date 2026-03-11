import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const payload = await req.json();

    // Support both direct call and DB webhook trigger format
    const lead = payload.record || payload;

    if (!lead || !lead.id) {
      throw new Error("No lead data provided");
    }

    // Get franchise info to find the email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lead.franquia_id) {
      console.log("Lead without franchise, skipping notification");
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
      console.log("Franchise has no email configured, skipping");
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

    const platformUrl = "https://quintalideal.lovable.app/franquia";

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎯 Novo Lead Recebido!</h1>
          <p style="color: #e0f2fe; margin: 8px 0 0; font-size: 14px;">${leadDate}</p>
        </div>
        
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">👤 Nome</td>
              <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; font-size: 14px;">${lead.nome || "Não informado"}</td>
            </tr>
            <tr>
              <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">📱 Telefone</td>
              <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; font-size: 14px;">${lead.telefone || "Não informado"}</td>
            </tr>
            <tr>
              <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">📍 Cidade</td>
              <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; font-size: 14px;">${lead.cidade || "Não informada"}</td>
            </tr>
            <tr>
              <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 14px;">🏊 Modelo</td>
              <td style="padding: 12px 8px; border-bottom: 1px solid #f1f5f9; font-weight: 600; font-size: 14px;">${lead.modelo_recomendado || "—"}</td>
            </tr>
            <tr>
              <td style="padding: 12px 8px; color: #64748b; font-size: 14px;">📊 Índice do Quintal</td>
              <td style="padding: 12px 8px; font-weight: 700; font-size: 18px; color: #0ea5e9;">${lead.pontuacao_quintal || 0}%</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="${platformUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Ver detalhes na plataforma →
            </a>
          </div>
          
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Quintal Ideal • Notificação automática de novo lead
          </p>
        </div>
      </div>
    `;

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Quintal Ideal <noreply@hallow.com.br>",
        to: [franchise.email],
        subject: `🎯 Novo Lead: ${lead.nome || "Cliente"} - ${lead.cidade || ""}`,
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
