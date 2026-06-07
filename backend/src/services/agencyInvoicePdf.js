const PDFDocument = require('pdfkit');

const FONT_SIZE = 10;
const SEC_SIZE  = 11;

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtAmount(n, currency = 'MAD') {
  if (n == null) return '-';
  return `${Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function buildRows(arr) {
  return arr.filter(Boolean);
}

function lineH(doc) {
  doc.fontSize(FONT_SIZE).font('Helvetica');
  return doc.currentLineHeight(true) * 1.45;
}

function sectionTitle(doc, title, x, width) {
  doc.fontSize(SEC_SIZE).font('Helvetica-Bold').text(title, x, doc.y, { underline: true, width });
  doc.moveDown(0.3);
}

function invoiceNumber(billing) {
  const d = new Date(billing.createdAt || billing.dueDate);
  const y = d.getFullYear();
  const seq = billing.id.slice(-6).toUpperCase();
  return `FACT-${y}-${seq}`;
}

/**
 * Génère une facture formelle entre la société de la plateforme (émetteur)
 * et une agence cliente (destinataire), pour une période donnée.
 */
function generateAgencyInvoicePdf(billing, platformSettings, stream) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  const W = 515;
  const agency = billing.agency;
  const issuer = platformSettings || {};
  const number = invoiceNumber(billing);

  // ── En-tête ────────────────────────────────────────────────────────────────
  doc.fontSize(20).font('Helvetica-Bold').text('FACTURE', 40, 40, { width: W, align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`N° ${number}`, 40, doc.y + 4, { width: W, align: 'center' });
  doc.fontSize(9).text(`Date d'émission : ${formatDate(billing.createdAt)}`, 40, doc.y + 2, { width: W, align: 'center' });

  const afterHeader = doc.y + 14;
  doc.moveTo(40, afterHeader).lineTo(555, afterHeader).stroke();
  doc.y = afterHeader + 14;

  // ── Émetteur / Destinataire (2 colonnes) ───────────────────────────────────
  const colW = Math.floor(W / 2) - 10;
  const colRX = 40 + colW + 20;
  const blockTopY = doc.y;

  sectionTitle(doc, 'ÉMETTEUR', 40, colW);
  const issuerY = doc.y;
  const issuerRows = buildRows([
    [issuer.companyName || 'Plateforme de gestion locative', null],
    issuer.address && [issuer.address, null],
    issuer.ice && [`ICE : ${issuer.ice}`, null],
    issuer.ic  && [`IC : ${issuer.ic}`, null],
    issuer.rc  && [`RC : ${issuer.rc}`, null],
  ]);
  doc.y = issuerY;
  doc.font('Helvetica').fontSize(FONT_SIZE);
  for (const [text] of issuerRows) {
    doc.text(text, 40, doc.y, { width: colW });
  }
  const issuerEndY = doc.y;

  doc.y = blockTopY;
  sectionTitle(doc, 'DESTINATAIRE', colRX, colW);
  const destY = doc.y;
  const destRows = buildRows([
    [agency.name || '', null],
    agency.address && [agency.address, null],
    agency.ice && [`ICE : ${agency.ice}`, null],
    agency.ic  && [`IC : ${agency.ic}`, null],
    agency.rc  && [`RC : ${agency.rc}`, null],
    agency.phone && [`Tél : ${agency.phone}`, null],
    agency.email && [agency.email, null],
  ]);
  doc.y = destY;
  doc.font('Helvetica').fontSize(FONT_SIZE);
  for (const [text] of destRows) {
    doc.text(text, colRX, doc.y, { width: colW });
  }
  const destEndY = doc.y;

  doc.y = Math.max(issuerEndY, destEndY) + 16;

  // ── Détails de la facture ──────────────────────────────────────────────────
  sectionTitle(doc, 'DÉTAILS DE LA FACTURE', 40, W);

  const lh = lineH(doc);
  const detailRows = buildRows([
    ['Objet :', billing.description || `Prestation de services - ${agency.name || ''}`],
    (billing.periodStart || billing.periodEnd) && ['Période facturée :', `Du ${formatDate(billing.periodStart)} au ${formatDate(billing.periodEnd)}`],
    billing.period && !billing.periodStart && ['Période :', billing.period],
    ['Date d\'échéance :', formatDate(billing.dueDate)],
    ['Mode de paiement :', billing.paymentMethod || '-'],
  ]);
  for (const [label, value] of detailRows) {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(FONT_SIZE).text(label, 40, y, { width: 140 });
    doc.font('Helvetica').fontSize(FONT_SIZE).text(value, 184, y, { width: 371 });
    doc.y = y + lh;
  }

  doc.moveDown(0.8);

  // ── Tableau du montant ──────────────────────────────────────────────────────
  const tableY = doc.y;
  const tableH = 28;
  doc.rect(40, tableY, W, tableH).fillAndStroke('#f3f4f6', '#d1d5db');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(FONT_SIZE)
     .text('Désignation', 50, tableY + 9, { width: 350 })
     .text('Montant TTC', 400, tableY + 9, { width: 145, align: 'right' });

  const rowY = tableY + tableH;
  const rowH = 30;
  doc.rect(40, rowY, W, rowH).stroke('#d1d5db');
  doc.font('Helvetica').fontSize(FONT_SIZE)
     .text(billing.description || `Prestation de services - période facturée`, 50, rowY + 10, { width: 350 })
     .text(fmtAmount(billing.amount, billing.currency), 400, rowY + 10, { width: 145, align: 'right' });

  const totalY = rowY + rowH;
  doc.rect(40, totalY, W, tableH).fillAndStroke('#f3f4f6', '#d1d5db');
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(FONT_SIZE)
     .text('TOTAL TTC', 50, totalY + 9, { width: 350 })
     .text(fmtAmount(billing.amount, billing.currency), 400, totalY + 9, { width: 145, align: 'right' });

  doc.y = totalY + tableH + 10;
  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#6b7280')
     .text('Montant exprimé toutes taxes comprises (TVA incluse le cas échéant).', 40, doc.y, { width: W });
  doc.fillColor('#000000');

  // ── Statut ─────────────────────────────────────────────────────────────────
  doc.moveDown(1);
  const STATUS_LABELS = { PENDING: 'En attente de règlement', PAID: 'Payée', OVERDUE: 'En retard de règlement' };
  doc.font('Helvetica-Bold').fontSize(FONT_SIZE).text('Statut : ', 40, doc.y, { continued: true });
  doc.font('Helvetica').text(STATUS_LABELS[billing.status] || billing.status);
  if (billing.paidDate) {
    doc.font('Helvetica-Bold').text('Réglée le : ', 40, doc.y + 4, { continued: true });
    doc.font('Helvetica').text(formatDate(billing.paidDate));
  }

  // ── Mentions légales ───────────────────────────────────────────────────────
  doc.moveDown(2);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica-Bold').text('Mentions légales : ', 40, doc.y, { continued: true });
  doc.font('Helvetica').text(
    "Cette facture est émise dans le cadre du contrat-cadre liant l'émetteur et le destinataire pour la mise à disposition de services de gestion de flotte. " +
    "Toute contestation doit être notifiée par écrit dans un délai de 15 jours à compter de la date d'émission. " +
    "En cas de retard de paiement, des pénalités pourront être appliquées conformément à la législation en vigueur.",
    { width: 515 }
  );

  // ── Pied de page : signatures ──────────────────────────────────────────────
  doc.moveDown(2);
  const sigY = doc.y;
  doc.fontSize(FONT_SIZE).font('Helvetica-Bold');
  doc.text("Cachet et signature de l'émetteur :", 40, sigY, { width: 220 });
  doc.text('Cachet et signature du destinataire :', 310, sigY, { width: 220 });
  doc.rect(40, sigY + 16, 220, 60).stroke('#d1d5db');
  doc.rect(310, sigY + 16, 220, 60).stroke('#d1d5db');

  doc.end();
}

module.exports = generateAgencyInvoicePdf;
