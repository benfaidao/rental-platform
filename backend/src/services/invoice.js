const PDFDocument = require('pdfkit');

const FONT_SIZE = 10;
const LBL_SIZE  = 8.5;

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAmount(n, currency) {
  if (n == null) return '-';
  return `${Number(n).toLocaleString('fr-MA')} ${currency}`;
}

async function generateInvoicePdf(contract, stream, signatures = {}) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  const agency  = contract.agency;
  const car     = contract.car;
  const W       = 515;
  const today   = formatDate(new Date());
  const invoiceNumber = `F-${contract.contractNumber}`;

  const days = Math.ceil(
    (new Date(contract.endDate) - new Date(contract.startDate)) / 86400000
  );
  const remaining = (contract.rentalAmount || 0) - (contract.amountPaid || 0);

  // ── En-tête agence ─────────────────────────────────────────────────────────
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a5f')
     .text('FACTURE', 40, 40, { width: W, align: 'center' });
  doc.fillColor('black');

  doc.fontSize(13).font('Helvetica-Bold')
     .text(agency.name || '', 40, doc.y + 6, { width: W, align: 'center' });

  const agencyInfo = [
    agency.address,
    agency.phone ? `Tél : ${agency.phone}` : null,
    agency.email,
    agency.ice  ? `ICE : ${agency.ice}`  : null,
    agency.rc   ? `RC : ${agency.rc}`    : null,
  ].filter(Boolean).join('  ·  ');

  if (agencyInfo)
    doc.fontSize(8).font('Helvetica').fillColor('#555555')
       .text(agencyInfo, 40, doc.y + 3, { width: W, align: 'center' });

  doc.fillColor('black');

  // ── Ligne de séparation + Référence ────────────────────────────────────────
  const sepY = Math.max(doc.y, 110) + 10;
  doc.moveTo(40, sepY).lineTo(555, sepY).strokeColor('#1e3a5f').lineWidth(2).stroke();
  doc.lineWidth(1).strokeColor('black');
  doc.y = sepY + 10;

  // N° facture à gauche, date à droite
  const refY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold')
     .text(`N° Facture : ${invoiceNumber}`, 40, refY, { width: 260 });
  doc.text(`Date : ${today}`, 295, refY, { width: 260, align: 'right' });
  doc.y = refY + 18;

  // ── Bloc Agence | Client côte à côte ───────────────────────────────────────
  const blockY = doc.y + 6;
  const colW   = 237;
  const colR   = 318;

  // Colonne gauche : agence
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#666666')
     .text('DE :', 40, blockY);
  doc.fillColor('black').fontSize(FONT_SIZE).font('Helvetica-Bold')
     .text(agency.name || '', 40, doc.y + 1, { width: colW });
  if (agency.address)
    doc.font('Helvetica').fontSize(LBL_SIZE).text(agency.address, 40, doc.y + 1, { width: colW });
  if (agency.phone)
    doc.text(`Tél : ${agency.phone}`, 40, doc.y + 1, { width: colW });
  if (agency.ice)
    doc.text(`ICE : ${agency.ice}`, 40, doc.y + 1, { width: colW });

  const leftEnd = doc.y;

  // Colonne droite : client
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#666666')
     .text('FACTURER À :', colR, blockY);
  doc.fillColor('black').fontSize(FONT_SIZE).font('Helvetica-Bold')
     .text(contract.clientName || '', colR, doc.y + 1 < blockY + 14 ? blockY + 14 : doc.y + 1, { width: colW });
  if (contract.clientPhone)
    doc.font('Helvetica').fontSize(LBL_SIZE).text(`Tél : ${contract.clientPhone}`, colR, doc.y + 1, { width: colW });
  if (contract.clientEmail)
    doc.text(`Email : ${contract.clientEmail}`, colR, doc.y + 1, { width: colW });
  if (contract.clientAddress)
    doc.text(contract.clientAddress, colR, doc.y + 1, { width: colW });

  const rightEnd = doc.y;
  doc.y = Math.max(leftEnd, rightEnd) + 16;

  // ── Tableau des prestations ────────────────────────────────────────────────
  const tableY = doc.y;
  const colDescW  = 260;
  const colValW   = W - colDescW - 10;
  const colValX   = 40 + colDescW + 10;
  const rowH      = 20;

  function tableRow(label, value, shade) {
    const y = doc.y;
    if (shade) doc.rect(40, y, W, rowH).fill('#f4f7fb').stroke('#e5e7eb');
    else doc.rect(40, y, W, rowH).fill('#ffffff').stroke('#e5e7eb');
    doc.fillColor('#374151').fontSize(LBL_SIZE).font('Helvetica-Bold')
       .text(label, 46, y + 5, { width: colDescW - 6 });
    doc.font('Helvetica').fillColor('#111827')
       .text(String(value), colValX, y + 5, { width: colValW, align: 'right' });
    doc.fillColor('black');
    doc.y = y + rowH;
  }

  // En-tête de tableau
  doc.rect(40, tableY, W, rowH).fill('#1e3a5f').stroke('#1e3a5f');
  doc.fillColor('white').fontSize(LBL_SIZE).font('Helvetica-Bold')
     .text('DESCRIPTION', 46, tableY + 5, { width: colDescW - 6 });
  doc.text('MONTANT', colValX, tableY + 5, { width: colValW, align: 'right' });
  doc.fillColor('black');
  doc.y = tableY + rowH;

  // Lignes
  const vehicleDesc = [
    `Location de véhicule : ${car.brand} ${car.model}`,
    car.finalPlate || car.wwPlate ? ` (${car.finalPlate || car.wwPlate})` : '',
  ].join('');

  const periodeDesc = [
    `Période : ${formatDate(contract.startDate)}${contract.startTime ? ' ' + contract.startTime : ''}`,
    ` → ${formatDate(contract.endDate)}${contract.endTime ? ' ' + contract.endTime : ''}`,
    ` — ${days} jour(s)`,
  ].join('');

  tableRow(vehicleDesc, formatAmount(contract.rentalAmount, contract.currency), false);
  tableRow(periodeDesc, '', true);

  if (contract.pickupLocation || contract.dropoffLocation) {
    const lieuDesc = [
      contract.pickupLocation  ? `Récupération : ${contract.pickupLocation}`  : null,
      contract.dropoffLocation ? `Restitution : ${contract.dropoffLocation}` : null,
    ].filter(Boolean).join('  ·  ');
    tableRow(lieuDesc, '', false);
  }

  // ── Récapitulatif financier ────────────────────────────────────────────────
  doc.y += 10;
  const sumX = 310;
  const sumW = 245;

  function sumRow(label, value, bold, color) {
    const y = doc.y;
    doc.fontSize(FONT_SIZE).font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fillColor(color || 'black')
       .text(label, sumX, y, { width: 140 })
       .text(value,  sumX + 145, y, { width: 100, align: 'right' });
    doc.fillColor('black');
    doc.y = y + 16;
  }

  const vatRate = agency.vatRate;
  if (contract.montantTTC != null) {
    // Ancien mode manuel : rentalAmount = HT, montantTTC = TTC
    sumRow('Montant HT :', formatAmount(contract.rentalAmount, contract.currency), false);
    sumRow('Montant TTC :', formatAmount(contract.montantTTC, contract.currency), false);
  } else if (vatRate != null && vatRate > 0) {
    // TVA configurée au niveau agence : rentalAmount = TTC
    const montantTTC = contract.rentalAmount || 0;
    const montantHT  = montantTTC / (1 + vatRate / 100);
    const montantTVA = montantTTC - montantHT;
    sumRow('Montant HT :', formatAmount(montantHT, contract.currency), false);
    sumRow(`TVA (${vatRate}%) :`, formatAmount(montantTVA, contract.currency), false);
    sumRow('Montant TTC :', formatAmount(montantTTC, contract.currency), false);
  } else {
    sumRow('Montant :', formatAmount(contract.rentalAmount, contract.currency), false);
  }

  // Séparation
  doc.moveTo(sumX, doc.y).lineTo(555, doc.y).stroke();
  doc.y += 4;

  sumRow('Encaissé :', formatAmount(contract.amountPaid || 0, contract.currency), true, '#15803d');
  if (remaining > 0)
    sumRow('Reste à payer :', formatAmount(remaining, contract.currency), true, '#b91c1c');
  else if (remaining <= 0)
    sumRow('Solde :', 'Soldé', true, '#15803d');

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (contract.notes) {
    doc.y += 8;
    doc.fontSize(8).font('Helvetica-Bold').text('Notes :', 40, doc.y);
    doc.font('Helvetica').text(contract.notes, 40, doc.y + 1, { width: W });
  }

  // ── Mention de réception ──────────────────────────────────────────────────
  doc.y += 16;
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.y += 10;

  doc.fontSize(9).font('Helvetica-Bold')
     .text('ACCUSÉ DE RÉCEPTION', 40, doc.y, { width: W, align: 'center' });
  doc.y += 4;
  doc.fontSize(9).font('Helvetica')
     .text(
       `Je soussigné(e), ${contract.clientName}, certifie avoir reçu la présente facture et reconnaît avoir pris connaissance des informations y figurant.`,
       40, doc.y + 4, { width: W, align: 'center' }
     );

  // ── Zone de signature client ───────────────────────────────────────────────
  doc.y += 16;
  const sigY  = doc.y;
  const SIG_H = 60;

  doc.fontSize(FONT_SIZE).font('Helvetica-Bold')
     .text('Signature du client :', 40, sigY, { width: W, align: 'center' });

  if (signatures.client) {
    try {
      const data = signatures.client.replace(/^data:image\/\w+;base64,/, '');
      const buf  = Buffer.from(data, 'base64');
      doc.image(buf, 40 + (W - 200) / 2, sigY + 16, { fit: [200, SIG_H] });
    } catch {}
  }

  doc.fontSize(9).font('Helvetica').fillColor('#555555')
     .text('Lu et approuvé — Bon pour accord', 40, sigY + 16 + SIG_H + 6, { width: W, align: 'center' });
  doc.fillColor('black');

  doc.end();
}

module.exports = generateInvoicePdf;
