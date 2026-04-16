import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const BRAND = [34, 197, 94] as [number, number, number]; // #22c55e

export interface RelatorioPdfData {
  partnerName: string;
  periodLabel: string;
  summary: {
    totalLeads: number;
    conversionRate: string;
    avgFunnelDays: number;
    avgTicket: string;
  };
  funnel: { name: string; value: number; pct: string }[];
  lossReasons: { reason: string; count: number; pct: string }[];
  performance?: { name: string; active: number; closed: number; rate: string }[];
}

export function exportRelatorioCRMPdf(data: RelatorioPdfData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const now = new Date();
  let y = 15;

  // Header
  pdf.setFontSize(20);
  pdf.setTextColor(...BRAND);
  pdf.text('Quintal Ideal', 14, y);
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`Gerado em ${format(now, 'dd/MM/yyyy HH:mm')}`, pageW - 14, y, { align: 'right' });
  y += 8;

  pdf.setFontSize(14);
  pdf.setTextColor(20);
  pdf.text('Relatorio de Conversao', 14, y);
  y += 6;
  pdf.setFontSize(10);
  pdf.setTextColor(80);
  pdf.text(`Parceiro: ${data.partnerName}`, 14, y);
  y += 5;
  pdf.text(`Periodo: ${data.periodLabel}`, 14, y);
  y += 8;

  // Summary cards (4 columns)
  const cards = [
    { label: 'Total de leads', value: String(data.summary.totalLeads) },
    { label: 'Taxa de conversao', value: data.summary.conversionRate },
    { label: 'Tempo medio no funil', value: `${data.summary.avgFunnelDays} dias` },
    { label: 'Ticket medio', value: data.summary.avgTicket },
  ];
  const margin = 14;
  const gap = 4;
  const cardW = (pageW - margin * 2 - gap * 3) / 4;
  const cardH = 22;
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + gap);
    pdf.setDrawColor(220);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(c.label, x + 3, y + 6);
    pdf.setFontSize(13);
    pdf.setTextColor(20);
    pdf.text(c.value, x + 3, y + 15);
  });
  y += cardH + 8;

  // Funnel table
  autoTable(pdf, {
    startY: y,
    head: [['Estagio', 'Quantidade', '%']],
    body: data.funnel.map(f => [
      f.name,
      String(f.value),
      f.pct,
    ]),
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      pdf.setFontSize(11);
      pdf.setTextColor(20);
      pdf.text('Leads por estagio', 14, y - 2);
    },
  });
  y = (pdf as any).lastAutoTable.finalY + 10;

  // Loss reasons
  if (data.lossReasons.length) {
    if (y > pageH - 60) { pdf.addPage(); y = 15; }
    pdf.setFontSize(11);
    pdf.setTextColor(20);
    pdf.text('Motivos de perda', 14, y);
    autoTable(pdf, {
      startY: y + 2,
      head: [['Motivo', 'Qtd', '%']],
      body: data.lossReasons.map(r => [r.reason, String(r.count), `${r.pct}%`]),
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = (pdf as any).lastAutoTable.finalY + 10;
  }

  // Performance
  if (data.performance && data.performance.length) {
    if (y > pageH - 60) { pdf.addPage(); y = 15; }
    pdf.setFontSize(11);
    pdf.setTextColor(20);
    pdf.text('Performance por responsavel', 14, y);
    autoTable(pdf, {
      startY: y + 2,
      head: [['Responsavel', 'Ativos', 'Fechados', 'Conversao']],
      body: data.performance.map(p => [p.name, String(p.active), String(p.closed), `${p.rate}%`]),
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = (pdf as any).lastAutoTable.finalY + 10;
  }

  // Footer on every page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      `Gerado por Quintal Ideal em ${format(now, 'dd/MM/yyyy HH:mm')} - Pagina ${i}/${pageCount}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    );
  }

  pdf.save(`relatorio-crm-${format(now, 'yyyy-MM-dd')}.pdf`);
}

export interface LeadCsvRow {
  nome: string;
  telefone: string;
  cidade: string;
  estagio: string;
  responsavel: string;
  data_criacao: string;
  motivo_perda: string;
}

export function exportLeadsCsv(rows: LeadCsvRow[]) {
  const headers = ['Nome', 'Telefone', 'Cidade', 'Estagio', 'Responsavel', 'Data de criacao', 'Motivo de perda'];
  const sep = ';';
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(sep),
    ...rows.map(r => [
      r.nome, r.telefone, r.cidade, r.estagio, r.responsavel, r.data_criacao, r.motivo_perda,
    ].map(escape).join(sep)),
  ];
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
