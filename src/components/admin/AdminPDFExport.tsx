import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import _autoTable from 'jspdf-autotable';
void _autoTable;

interface Lead {
  franquia_id: string | null;
  status_lead: string;
  pontuacao_quintal: number | null;
  modelo_recomendado: string | null;
  cidade: string | null;
  created_at: string;
}

interface AdminPDFExportProps {
  leads: Lead[];
  franchiseMap: Record<string, string>;
  franchiseId?: string; // specific franchise or all
  franchiseName?: string;
}


export function AdminPDFExport({ leads, franchiseId, franchiseName }: AdminPDFExportProps) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const filteredLeads = franchiseId
        ? leads.filter(l => l.franquia_id === franchiseId)
        : leads;

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const now = new Date();
      const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const title = franchiseName || 'Todas as Franquias';

      // Header
      doc.setFillColor(3, 105, 161); // primary blue
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 Relatório de Performance', 14, 16);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`${title} · ${monthLabel}`, 14, 26);

      // KPIs Section
      const total = filteredLeads.length;
      const sold = filteredLeads.filter(l => l.status_lead === 'vendido').length;
      const lost = filteredLeads.filter(l => l.status_lead === 'perdido').length;
      const novo = filteredLeads.filter(l => l.status_lead === 'novo').length;
      const contacted = filteredLeads.filter(l => l.status_lead === 'contatado').length;
      const negotiating = filteredLeads.filter(l => l.status_lead === 'em_negociacao').length;
      const avgScore = total > 0
        ? Math.round(filteredLeads.reduce((s, l) => s + (l.pontuacao_quintal || 0), 0) / total)
        : 0;
      const conversionRate = total > 0 ? Math.round((sold / total) * 100) : 0;
      const cities = new Set(filteredLeads.map(l => l.cidade).filter(Boolean)).size;

      let y = 45;

      // KPI boxes
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('INDICADORES-CHAVE', 14, y);
      y += 8;

      const kpis = [
        { label: 'Total Leads', value: String(total) },
        { label: 'Vendidos', value: String(sold) },
        { label: 'Conversão', value: `${conversionRate}%` },
        { label: 'Média Quintal', value: `${avgScore}%` },
        { label: 'Cidades', value: String(cities) },
      ];

      const kpiWidth = (pageWidth - 28) / kpis.length;
      kpis.forEach((kpi, i) => {
        const x = 14 + i * kpiWidth;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, kpiWidth - 4, 22, 3, 3, 'F');
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(3, 105, 161);
        doc.text(kpi.value, x + (kpiWidth - 4) / 2, y + 11, { align: 'center' });
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'normal');
        doc.text(kpi.label, x + (kpiWidth - 4) / 2, y + 18, { align: 'center' });
      });

      y += 30;

      // Funnel
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('FUNIL DE VENDAS', 14, y);
      y += 6;

      const funnel = [
        { label: 'Novos', value: novo, color: [59, 130, 246] },
        { label: 'Contatados', value: contacted, color: [6, 182, 212] },
        { label: 'Em Negociação', value: negotiating, color: [234, 179, 8] },
        { label: 'Vendidos', value: sold, color: [34, 197, 94] },
        { label: 'Perdidos', value: lost, color: [239, 68, 68] },
      ];

      funnel.forEach((step) => {
        const barWidth = total > 0 ? Math.max(10, (step.value / total) * (pageWidth - 60)) : 10;
        doc.setFillColor(step.color[0], step.color[1], step.color[2]);
        doc.roundedRect(14, y, barWidth, 8, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.text(`${step.label}: ${step.value}`, barWidth + 18, y + 6);
        y += 12;
      });

      y += 5;

      // Top cities table
      const cityCounts: Record<string, number> = {};
      filteredLeads.forEach(l => {
        if (l.cidade) cityCounts[l.cidade] = (cityCounts[l.cidade] || 0) + 1;
      });
      const topCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (topCities.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('TOP CIDADES', 14, y);
        y += 2;

        (doc as any).autoTable({
          startY: y,
          head: [['#', 'Cidade', 'Leads', '% do Total']],
          body: topCities.map(([city, count], i) => [
            `${i + 1}`,
            city,
            count,
            `${Math.round((count / total) * 100)}%`,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [3, 105, 161], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          tableWidth: 'auto',
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Top models table
      const modelCounts: Record<string, number> = {};
      filteredLeads.forEach(l => {
        if (l.modelo_recomendado) modelCounts[l.modelo_recomendado] = (modelCounts[l.modelo_recomendado] || 0) + 1;
      });
      const topModels = Object.entries(modelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (topModels.length > 0 && y < 240) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('TOP MODELOS', 14, y);
        y += 2;

        (doc as any).autoTable({
          startY: y,
          head: [['#', 'Modelo', 'Leads', '% do Total']],
          body: topModels.map(([model, count], i) => [
            `${i + 1}`,
            model,
            count,
            `${Math.round((count / total) * 100)}%`,
          ]),
          theme: 'grid',
          headStyles: { fillColor: [3, 105, 161], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          tableWidth: 'auto',
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Splash Piscinas · Gerado em ${now.toLocaleDateString('pt-BR')} · Página ${p}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }

      const fileName = franchiseName
        ? `relatorio-${franchiseName.toLowerCase().replace(/\s+/g, '-')}-${now.toISOString().slice(0, 7)}.pdf`
        : `relatorio-geral-${now.toISOString().slice(0, 7)}.pdf`;

      doc.save(fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={generating}
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
    >
      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      {generating ? 'Gerando...' : 'Exportar PDF'}
    </Button>
  );
}
