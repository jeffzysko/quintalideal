import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FranchiseReport {
  franchise_id: string;
  franchise_name: string;
  email: string;
  total_leads: number;
  new_leads: number;
  contacted: number;
  negotiating: number;
  sold: number;
  lost: number;
  avg_score: number;
  conversion_rate: number;
  prev_total: number;
  trend: number; // percentage change
  top_cities: { city: string; count: number }[];
  top_models: { model: string; count: number }[];
}

function getMonthRange(offset: number): { start: string; end: string; label: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = d.toISOString();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { start, end, label };
}

function buildEmailHTML(report: FranchiseReport, monthLabel: string): string {
  const trendIcon = report.trend > 0 ? "📈" : report.trend < 0 ? "📉" : "➡️";
  const trendText = report.trend > 0
    ? `+${report.trend}% vs mês anterior`
    : report.trend < 0
    ? `${report.trend}% vs mês anterior`
    : "Mesmo volume do mês anterior";
  const trendColor = report.trend > 0 ? "#16a34a" : report.trend < 0 ? "#dc2626" : "#6b7280";

  const topCitiesHTML = report.top_cities.length > 0
    ? report.top_cities.map((c, i) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${i + 1}. ${c.city}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;font-weight:600;">${c.count}</td></tr>`).join("")
    : '<tr><td colspan="2" style="padding:12px;color:#9ca3af;font-size:14px;">Sem dados</td></tr>';

  const topModelsHTML = report.top_models.length > 0
    ? report.top_models.map((m, i) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${i + 1}. ${m.model}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;font-weight:600;">${m.count}</td></tr>`).join("")
    : '<tr><td colspan="2" style="padding:12px;color:#9ca3af;font-size:14px;">Sem dados</td></tr>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#e80685,#08a1d6);padding:32px 40px;">
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">📊 Relatório Mensal</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${monthLabel} · ${report.franchise_name}</p>
</td></tr>

<!-- Trend banner -->
<tr><td style="padding:20px 40px 0;">
  <div style="background-color:#f8fafc;border-radius:12px;padding:16px 20px;border-left:4px solid ${trendColor};">
    <span style="font-size:20px;">${trendIcon}</span>
    <span style="font-size:15px;font-weight:600;color:${trendColor};margin-left:8px;">${trendText}</span>
  </div>
</td></tr>

<!-- KPIs -->
<tr><td style="padding:24px 40px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="33%" style="text-align:center;padding:12px;">
        <div style="font-size:28px;font-weight:800;color:#08a1d6;">${report.total_leads}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Total de Leads</div>
      </td>
      <td width="33%" style="text-align:center;padding:12px;">
        <div style="font-size:28px;font-weight:800;color:#16a34a;">${report.sold}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Vendidos</div>
      </td>
      <td width="33%" style="text-align:center;padding:12px;">
        <div style="font-size:28px;font-weight:800;color:#7c3aed;">${report.conversion_rate}%</div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Conversão</div>
      </td>
    </tr>
  </table>
</td></tr>

<!-- Funnel -->
<tr><td style="padding:0 40px 24px;">
  <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;">Funil do Mês</h3>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;background:#f8fafc;">
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#475569;">🆕 Novos</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;">${report.new_leads}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#475569;background:#fff;">📞 Contatados</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;background:#fff;">${report.contacted}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#475569;">🤝 Em Negociação</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;">${report.negotiating}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#475569;background:#fff;">✅ Vendidos</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;color:#16a34a;background:#fff;">${report.sold}</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#475569;">❌ Perdidos</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;text-align:right;color:#dc2626;">${report.lost}</td>
    </tr>
  </table>
</td></tr>

<!-- Score -->
<tr><td style="padding:0 40px 24px;">
  <div style="background:#fce4f0;border-radius:12px;padding:16px 20px;text-align:center;">
    <div style="font-size:12px;color:#e80685;font-weight:600;text-transform:uppercase;">Potencial Médio dos Quintais</div>
    <div style="font-size:32px;font-weight:800;color:#08a1d6;margin-top:4px;">${report.avg_score}%</div>
  </div>
</td></tr>

<!-- Top Cities -->
<tr><td style="padding:0 40px 24px;">
  <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;">🏙️ Top Cidades</h3>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;background:#f8fafc;">${topCitiesHTML}</table>
</td></tr>

<!-- Top Models -->
<tr><td style="padding:0 40px 24px;">
  <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 12px;">🏊 Top Modelos</h3>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;background:#f8fafc;">${topModelsHTML}</table>
</td></tr>

<!-- CTA -->
<tr><td style="padding:0 40px 32px;text-align:center;">
  <a href="https://quintalideal.lovable.app/painel" style="display:inline-block;background:linear-gradient(135deg,#0369a1,#0ea5e9);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700;">Acessar Painel Completo →</a>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">Quintal Ideal · Relatório gerado automaticamente</p>
  <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">Este e-mail é enviado no 1º dia útil de cada mês</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const currentMonth = getMonthRange(0);
    const prevMonth = getMonthRange(-1);

    // Use previous month for the report (runs on 1st of new month)
    const reportMonth = prevMonth;
    const comparisonMonth = getMonthRange(-2);

    // Get active franchises with email
    const { data: franchises, error: fErr } = await supabase
      .from("franchises")
      .select("id, nome_franquia, email")
      .eq("ativa", true)
      .not("email", "is", null);

    if (fErr) throw fErr;
    if (!franchises || franchises.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No active franchises with email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const franchise of franchises) {
      try {
        // Current month leads
        const { data: monthLeads } = await supabase
          .from("leads")
          .select("status_lead, pontuacao_quintal, cidade, modelo_recomendado")
          .eq("franquia_id", franchise.id)
          .gte("created_at", reportMonth.start)
          .lt("created_at", reportMonth.end);

        // Previous month leads for comparison
        const { data: prevLeads } = await supabase
          .from("leads")
          .select("id")
          .eq("franquia_id", franchise.id)
          .gte("created_at", comparisonMonth.start)
          .lt("created_at", comparisonMonth.end);

        const leads = monthLeads || [];
        const prevTotal = prevLeads?.length || 0;
        const total = leads.length;

        if (total === 0 && prevTotal === 0) continue; // Skip if no activity

        const statusCounts = { novo: 0, contatado: 0, em_negociacao: 0, vendido: 0, perdido: 0 };
        let scoreSum = 0;
        let scoreCount = 0;
        const cityCounts: Record<string, number> = {};
        const modelCounts: Record<string, number> = {};

        for (const lead of leads) {
          const s = lead.status_lead as keyof typeof statusCounts;
          if (s in statusCounts) statusCounts[s]++;
          if (lead.pontuacao_quintal) { scoreSum += lead.pontuacao_quintal; scoreCount++; }
          if (lead.cidade) cityCounts[lead.cidade] = (cityCounts[lead.cidade] || 0) + 1;
          if (lead.modelo_recomendado) modelCounts[lead.modelo_recomendado] = (modelCounts[lead.modelo_recomendado] || 0) + 1;
        }

        const trend = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : total > 0 ? 100 : 0;

        const report: FranchiseReport = {
          franchise_id: franchise.id,
          franchise_name: franchise.nome_franquia,
          email: franchise.email!,
          total_leads: total,
          new_leads: statusCounts.novo,
          contacted: statusCounts.contatado,
          negotiating: statusCounts.em_negociacao,
          sold: statusCounts.vendido,
          lost: statusCounts.perdido,
          avg_score: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
          conversion_rate: total > 0 ? Math.round((statusCounts.vendido / total) * 100) : 0,
          prev_total: prevTotal,
          trend,
          top_cities: Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({ city, count })),
          top_models: Object.entries(modelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([model, count]) => ({ model, count })),
        };

        const html = buildEmailHTML(report, reportMonth.label);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Quintal Ideal <relatorios@hallow.com.br>",
            to: [report.email],
            subject: `📊 Relatório Mensal – ${reportMonth.label} | ${report.franchise_name}`,
            html,
          }),
        });

        if (res.ok) {
          sentCount++;
        } else {
          const errBody = await res.text();
          errors.push(`${franchise.nome_franquia}: ${res.status} ${errBody}`);
        }
      } catch (err) {
        errors.push(`${franchise.nome_franquia}: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }

    console.log(`Monthly report: sent ${sentCount}/${franchises.length}, errors: ${errors.length}`);
    if (errors.length) console.error("Errors:", errors);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: franchises.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Monthly report failed:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
