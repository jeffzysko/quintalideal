import { type ProposalData, formatCurrency, getPaymentLabel, generateVerificationCode } from './ProposalShared';
import { format } from 'date-fns';
import logoQuintalIdeal from '@/assets/logo-quintal-ideal.png';

export async function exportProposalPDF(proposal: ProposalData, discountAmount: number) {
  const [{ jsPDF }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode'),
  ]);

  const A4_W = 210, A4_H = 297, M = 18;
  const CW = A4_W - M * 2;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = M;

  const brandBlue = [8, 161, 214] as const;
  const brandPink = [232, 6, 133] as const;
  const textDark = [30, 30, 35] as const;
  const textMuted = [120, 125, 135] as const;
  const textLight = [160, 165, 172] as const;
  const borderColor = [225, 228, 232] as const;
  const bgMuted = [245, 247, 250] as const;

  const checkPageBreak = (needed: number) => {
    if (y + needed > A4_H - M - 12) {
      pdf.addPage();
      y = M;
    }
  };

  const drawRoundedRect = (x: number, ry: number, w: number, h: number, r: number, fill: readonly [number, number, number], stroke?: readonly [number, number, number]) => {
    if (stroke) { pdf.setDrawColor(...stroke); pdf.setLineWidth(0.3); }
    pdf.setFillColor(...fill);
    pdf.roundedRect(x, ry, w, h, r, r, stroke ? 'FD' : 'F');
  };

  // ── HEADER with gradient line ──
  pdf.setFillColor(...brandBlue);
  pdf.rect(0, 0, A4_W, 2.5, 'F');
  pdf.setFillColor(...brandPink);
  pdf.rect(A4_W * 0.6, 0, A4_W * 0.4, 2.5, 'F');
  y = 8;

  // Logo
  const logoImg = new Image();
  logoImg.crossOrigin = 'anonymous';
  logoImg.src = logoQuintalIdeal;
  await new Promise<void>((res) => { logoImg.onload = () => res(); logoImg.onerror = () => res(); });
  if (logoImg.complete && logoImg.naturalWidth > 0) {
    const logoH = 14;
    const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
    pdf.addImage(logoImg, 'PNG', M, y, logoW, logoH);
  }

  // Right-aligned proposal info
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...textMuted);
  pdf.text(`Proposta #${proposal.id.slice(0, 4).toUpperCase()}`, A4_W - M, y + 4, { align: 'right' });
  pdf.text(`Emitida em ${format(new Date(proposal.created_at), "dd/MM/yyyy")}`, A4_W - M, y + 9, { align: 'right' });
  if (proposal.franchise?.nome_franquia) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(proposal.franchise.nome_franquia, A4_W - M, y + 14, { align: 'right' });
  }
  y += 22;

  pdf.setDrawColor(...borderColor);
  pdf.setLineWidth(0.4);
  pdf.line(M, y, A4_W - M, y);
  y += 6;

  // ── SELLER / CONSULTANT SECTION ──
  if (proposal.seller?.full_name) {
    checkPageBreak(22);
    drawRoundedRect(M, y, CW, 18, 3, bgMuted, borderColor);
    const avatarCx = M + 14;
    const avatarCy = y + 9;
    pdf.setFillColor(...brandBlue);
    pdf.circle(avatarCx, avatarCy, 5, 'F');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    const initial = (proposal.seller.full_name || 'V')[0].toUpperCase();
    pdf.text(initial, avatarCx, avatarCy + 1, { align: 'center' });
    const sellerX = M + 24;
    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...textDark);
    pdf.text(proposal.seller.full_name, sellerX, y + 7.5);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textMuted);
    const sellerInfo: string[] = ['Consultor comercial'];
    if (proposal.seller.telefone) sellerInfo.push(`Tel: ${proposal.seller.telefone}`);
    pdf.text(sellerInfo.join('  •  '), sellerX, y + 13);
    y += 24;
  }

  // ── CLIENT SECTION ──
  checkPageBreak(40);
  drawRoundedRect(M, y, CW, 32, 3, bgMuted, borderColor);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...brandBlue);
  pdf.text('DADOS DO CLIENTE', M + 5, y + 6);
  pdf.setFontSize(10);
  pdf.setTextColor(...textDark);
  pdf.setFont('helvetica', 'bold');
  pdf.text(proposal.client_name, M + 5, y + 14);
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...textMuted);
  let clientY = y + 20;
  const clientDetails: string[] = [];
  if (proposal.client_document) clientDetails.push(`${proposal.person_type === 'pj' ? 'CNPJ' : 'CPF'}: ${proposal.client_document}`);
  if (proposal.client_phone) clientDetails.push(`Tel: ${proposal.client_phone}`);
  if (proposal.client_email) clientDetails.push(`Email: ${proposal.client_email}`);
  if (clientDetails.length > 0) {
    pdf.text(clientDetails.join('   •   '), M + 5, clientY);
    clientY += 5;
  }
  if (proposal.client_address) {
    pdf.text(proposal.client_address, M + 5, clientY);
  }
  y += 38;

  // ── ITEMS TABLE ──
  checkPageBreak(20 + proposal.items.length * 14);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...brandBlue);
  pdf.text('ITENS DA PROPOSTA', M, y + 3);
  y += 8;
  const colX = { item: M, qty: M + CW * 0.55, unit: M + CW * 0.70, sub: M + CW * 0.85 };
  drawRoundedRect(M, y, CW, 8, 2, brandBlue);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('PRODUTO / SERVIÇO', colX.item + 4, y + 5.5);
  pdf.text('QTD', colX.qty + 2, y + 5.5, { align: 'center' });
  pdf.text('UNITÁRIO', colX.unit + (CW * 0.15 / 2), y + 5.5, { align: 'center' });
  pdf.text('SUBTOTAL', A4_W - M - 4, y + 5.5, { align: 'right' });
  y += 10;

  proposal.items.forEach((item, i) => {
    checkPageBreak(16);
    const rowH = item.description ? 14 : 10;
    if (i % 2 === 0) drawRoundedRect(M, y, CW, rowH, 1.5, bgMuted);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...textDark);
    pdf.text(item.product_name, colX.item + 4, y + 5.5);
    if (item.description) {
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...textLight);
      const descLines = pdf.splitTextToSize(item.description, CW * 0.50);
      pdf.text(descLines[0] || '', colX.item + 4, y + 10.5);
    }
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textMuted);
    pdf.text(String(item.quantity), colX.qty + 2, y + 5.5, { align: 'center' });
    pdf.text(formatCurrency(item.unit_price), colX.unit + (CW * 0.15 / 2), y + 5.5, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...textDark);
    pdf.text(formatCurrency(item.subtotal), A4_W - M - 4, y + 5.5, { align: 'right' });
    y += rowH + 1.5;
  });
  y += 3;

  // ── TOTALS ──
  checkPageBreak(35);
  const totalsX = M + CW * 0.55;
  pdf.setDrawColor(...borderColor);
  pdf.setLineWidth(0.3);
  pdf.line(totalsX, y, A4_W - M, y);
  y += 5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...textMuted);
  pdf.text('Subtotal', totalsX, y + 1);
  pdf.setTextColor(...textDark);
  pdf.text(formatCurrency(proposal.subtotal), A4_W - M - 4, y + 1, { align: 'right' });
  y += 6;
  if (discountAmount > 0) {
    pdf.setTextColor(...textMuted);
    pdf.text('Desconto', totalsX, y + 1);
    pdf.setTextColor(34, 160, 90);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`- ${formatCurrency(discountAmount)}`, A4_W - M - 4, y + 1, { align: 'right' });
    y += 6;
  }
  const totalsW = CW * 0.45;
  drawRoundedRect(totalsX - 3, y, totalsW + 3, 14, 3, brandBlue);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('TOTAL', totalsX + 2, y + 9);
  pdf.setFontSize(14);
  pdf.text(formatCurrency(proposal.total), A4_W - M - 4, y + 9.5, { align: 'right' });
  y += 20;

  // ── CONDITIONS ──
  const conditions: { label: string; value: string }[] = [];
  if (proposal.payment_method) conditions.push({ label: 'Forma de Pagamento', value: getPaymentLabel(proposal.payment_method) });
  if (proposal.delivery_deadline) conditions.push({ label: 'Prazo de Entrega', value: proposal.delivery_deadline });
  if (proposal.validity_date) conditions.push({ label: 'Válida até', value: format(new Date(proposal.validity_date), "dd/MM/yyyy") });

  if (conditions.length > 0) {
    checkPageBreak(22);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...brandBlue);
    pdf.text('CONDIÇÕES', M, y + 3);
    y += 8;
    const condW = (CW - (conditions.length - 1) * 4) / conditions.length;
    conditions.forEach((c, i) => {
      const cx = M + i * (condW + 4);
      drawRoundedRect(cx, y, condW, 16, 2.5, bgMuted, borderColor);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...textLight);
      pdf.text(c.label.toUpperCase(), cx + condW / 2, y + 6, { align: 'center' });
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...textDark);
      pdf.text(c.value, cx + condW / 2, y + 12, { align: 'center' });
    });
    y += 22;
  }

  if (proposal.payment_conditions) {
    checkPageBreak(16);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...brandBlue);
    pdf.text('CONDIÇÕES DE PAGAMENTO', M, y + 3);
    y += 7;
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textMuted);
    const condLines = pdf.splitTextToSize(proposal.payment_conditions, CW);
    pdf.text(condLines, M, y + 1);
    y += condLines.length * 4 + 6;
  }

  if (proposal.observations) {
    checkPageBreak(20);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...brandBlue);
    pdf.text('OBSERVAÇÕES', M, y + 3);
    y += 7;
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textMuted);
    const obsLines = pdf.splitTextToSize(proposal.observations, CW);
    pdf.text(obsLines, M, y + 1);
    y += obsLines.length * 4 + 6;
  }

  // ── FRANCHISE CONTACT INFO ──
  if (proposal.franchise) {
    const contactLines: string[] = [];
    if (proposal.franchise.whatsapp) contactLines.push(`WhatsApp: ${proposal.franchise.whatsapp}`);
    if (proposal.franchise.email) contactLines.push(`E-mail: ${proposal.franchise.email}`);
    if (proposal.franchise.endereco) contactLines.push(proposal.franchise.endereco);
    else if (proposal.franchise.cidade_base) contactLines.push(proposal.franchise.cidade_base);
    const boxH = 16 + contactLines.length * 5 + 8;
    checkPageBreak(boxH + 12);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...brandBlue);
    pdf.text('CONTATO', M, y + 3);
    y += 8;
    drawRoundedRect(M, y, CW, boxH, 3, bgMuted, borderColor);
    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...textDark);
    pdf.text(proposal.franchise.nome_franquia, M + 5, y + 7);
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textMuted);
    let cY = y + 14;
    contactLines.forEach(line => {
      pdf.text(line, M + 5, cY);
      cY += 5;
    });
    pdf.setFontSize(7.5);
    pdf.setTextColor(...textLight);
    pdf.text('Entre em contato para dúvidas ou negociações sobre esta proposta.', M + 5, cY + 2);
    y += boxH + 6;
  }

  // ── VERIFICATION FOOTER WITH QR CODE ──
  const verCode = generateVerificationCode(proposal.id, proposal.public_token);
  const proposalUrl = `https://quintalideal.com.br/proposta/${proposal.public_token}`;
  checkPageBreak(42);
  pdf.setDrawColor(...borderColor);
  pdf.setLineWidth(0.3);
  pdf.line(M, y, A4_W - M, y);
  y += 6;

  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(proposalUrl, {
      width: 200, margin: 1,
      color: { dark: '#1e1e23', light: '#f5f7fa' },
    });
  } catch { /* QR generation failed */ }

  const verBoxH = 30;
  drawRoundedRect(M, y, CW, verBoxH, 3, bgMuted, borderColor);
  if (qrDataUrl) {
    const qrSize = 22;
    pdf.addImage(qrDataUrl, 'PNG', M + 5, y + (verBoxH - qrSize) / 2, qrSize, qrSize);
  }
  const textStartX = qrDataUrl ? M + 32 : M + 5;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...textLight);
  pdf.text('CÓDIGO DE VERIFICAÇÃO', textStartX + (qrDataUrl ? 30 : (CW - 10) / 2), y + 7, { align: 'center' });
  pdf.setFontSize(13);
  pdf.setFont('courier', 'bold');
  pdf.setTextColor(...textDark);
  pdf.text(verCode, textStartX + (qrDataUrl ? 30 : (CW - 10) / 2), y + 15, { align: 'center' });
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...textLight);
  pdf.text('Escaneie o QR Code para verificar', textStartX + (qrDataUrl ? 30 : (CW - 10) / 2), y + 21, { align: 'center' });
  pdf.text('esta proposta online', textStartX + (qrDataUrl ? 30 : (CW - 10) / 2), y + 25, { align: 'center' });
  y += verBoxH + 6;
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...textLight);
  pdf.text('Este documento garante a autenticidade desta proposta. Verifique com a Splash Piscinas em caso de dúvida.', A4_W / 2, y, { align: 'center' });

  // ── PAGE NUMBERS ──
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFillColor(...brandBlue);
    pdf.rect(0, A4_H - 3, A4_W * 0.6, 3, 'F');
    pdf.setFillColor(...brandPink);
    pdf.rect(A4_W * 0.6, A4_H - 3, A4_W * 0.4, 3, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...textLight);
    pdf.text(`Splash Piscinas  •  Página ${i} de ${pageCount}`, A4_W / 2, A4_H - 6, { align: 'center' });
  }

  pdf.save(`proposta-${proposal.id.slice(0, 8)}.pdf`);
}
