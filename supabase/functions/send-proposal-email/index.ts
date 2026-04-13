import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SENDER = "Quintal Ideal Splash <noreply@hallow.com.br>";
const BRAND_BLUE = "#0369a1";
const BRAND_GRADIENT = "linear-gradient(135deg, #0284c7, #0369a1)";
const SITE_URL = "https://quintalideal.com.br";

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão de Crédito",
  transferencia: "Transferência",
  cfm: "CFM",
  cred_window: "Cred Window",
  compra_programada: "Compra Programada",
  financiamento_banco: "Financiamento via Banco",
  outro: "Outro",
};

function buildProposalEmailHTML(
  type: "new" | "update",
  clientName: string,
  proposalTotal: number,
  publicToken: string,
  franchiseName: string | null,
  franchiseWhatsapp: string | null,
  items: { product_name: string; quantity: number; subtotal: number }[],
  paymentMethod: string | null,
  validityDate: string | null,
): string {
  const proposalUrl = `${SITE_URL}/proposta/${publicToken}`;
  const isUpdate = type === "update";
  const title = isUpdate ? "Proposta Atualizada!" : "Nova Proposta Comercial!";
  const subtitle = isUpdate
    ? "Uma proposta que você recebeu foi atualizada. Confira os novos detalhes."
    : "Você recebeu uma proposta comercial. Confira todos os detalhes abaixo.";
  const emoji = isUpdate ? "🔄" : "📋";

  const itemsRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155">${item.product_name}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:center">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#334155;text-align:right">${formatCurrency(item.subtotal)}</td>
    </tr>`
    )
    .join("");

  const paymentLabel = paymentMethod ? PAYMENT_LABELS[paymentMethod] || paymentMethod : null;

  const validitySection = validityDate
    ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b">⏰ Válida até: <strong>${new Date(validityDate).toLocaleDateString("pt-BR")}</strong></p>`
    : "";

  const paymentSection = paymentLabel
    ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b">💳 Forma de pagamento: <strong>${paymentLabel}</strong></p>`
    : "";

  const whatsappButton = franchiseWhatsapp
    ? `<a href="https://wa.me/55${franchiseWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Recebi uma proposta comercial e gostaria de tirar algumas dúvidas.")}" 
       style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-left:12px;">
       💬 WhatsApp
     </a>`
    : "";

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
            <span style="font-size:28px">${emoji}</span>
          </div>
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700">${title}</h1>
          <p style="color:#e0f2fe;margin:8px 0 0;font-size:14px">${subtitle}</p>
        </td></tr>
        
        <!-- Greeting -->
        <tr><td style="padding:32px 32px 16px;">
          <p style="margin:0;font-size:16px;color:#334155;line-height:1.6">Olá, <strong>${clientName}</strong>!</p>
          ${franchiseName ? `<p style="margin:8px 0 0;font-size:14px;color:#64748b">Enviada por: <strong>${franchiseName}</strong></p>` : ""}
        </td></tr>

        <!-- Total highlight -->
        <tr><td style="padding:0 32px 20px;text-align:center;">
          <div style="display:inline-block;background:#e0f2fe;border-radius:16px;padding:20px 40px;">
            <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600">Valor Total</p>
            <p style="margin:6px 0;font-size:36px;font-weight:800;color:${BRAND_BLUE};letter-spacing:-1px">${formatCurrency(proposalTotal)}</p>
          </div>
        </td></tr>

        <!-- Items table -->
        <tr><td style="padding:0 32px 20px;">
          <p style="margin:0 0 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600">📦 Itens da Proposta</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr style="background:#f8fafc;">
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Produto</th>
              <th style="padding:10px 8px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Qtd</th>
              <th style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Subtotal</th>
            </tr>
            ${itemsRows}
          </table>
        </td></tr>

        <!-- Payment & Validity -->
        <tr><td style="padding:0 32px 24px;">
          ${paymentSection}
          ${validitySection}
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${proposalUrl}" style="display:inline-block;background:${BRAND_GRADIENT};color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(3,105,161,0.3);">
            Ver Proposta Completa →
          </a>
          ${whatsappButton}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px">Você recebeu este e-mail porque uma proposta comercial foi enviada para você.<br/><a href="${SITE_URL}" style="color:${BRAND_BLUE};text-decoration:none;font-weight:500">quintalideal.com.br</a></p>
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
    const {
      proposal_id,
      type = "new", // "new" or "update"
    } = await req.json();

    if (!proposal_id) {
      return new Response(JSON.stringify({ error: "proposal_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch proposal with items and franchise
    const { data: proposal, error: propError } = await supabase
      .from("proposals")
      .select("*, proposal_items(*)")
      .eq("id", proposal_id)
      .single();

    if (propError || !proposal) {
      return new Response(JSON.stringify({ error: "Proposal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!proposal.client_email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_client_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch franchise info
    const { data: franchise } = await supabase
      .from("franchises")
      .select("nome_franquia, whatsapp")
      .eq("id", proposal.franchise_id)
      .single();

    const items = (proposal.proposal_items || []).map((item: any) => ({
      product_name: item.product_name,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));

    const htmlContent = buildProposalEmailHTML(
      type as "new" | "update",
      proposal.client_name,
      proposal.total,
      proposal.public_token,
      franchise?.nome_franquia || null,
      franchise?.whatsapp || null,
      items,
      proposal.payment_method,
      proposal.validity_date,
    );

    const subjectPrefix = type === "update" ? "🔄 Proposta Atualizada" : "📋 Nova Proposta Comercial";
    const subject = `${subjectPrefix} — ${franchise?.nome_franquia || "Quintal Ideal"}`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER,
        to: [proposal.client_email],
        subject,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      throw new Error(`Resend API error [${resendResponse.status}]: ${JSON.stringify(resendData)}`);
    }

    console.log(`Proposal email (${type}) sent to:`, proposal.client_email, resendData);

    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-proposal-email:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
