const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const FONT_SIZE  = 10;   // taille des données
const SEC_SIZE   = 11;   // taille titre de section
const SEC_GAP    = 0.55; // espace avant chaque section
const COL_W      = 237;  // largeur d'une colonne (2 colonnes dans 515px)
const COL_R      = 318;  // x départ colonne droite (40 + 237 + 41)

async function generateContractPdf(contract, stream, signatures = {}) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  const agency = contract.agency;
  const car    = contract.car;
  const W      = 515; // largeur utile (595 − 2×40)

  // ── QR code ────────────────────────────────────────────────────────────────
  const qrBuffer = await QRCode.toBuffer(
    `rental:contract:${contract.contractNumber}`,
    { width: 100, margin: 1 }
  );

  // ── En-tête ────────────────────────────────────────────────────────────────
  const headerY = 40;
  doc.image(qrBuffer, 462, headerY, { width: 70 });
  doc.fontSize(6).font('Helvetica')
     .text(contract.contractNumber, 462, headerY + 72, { width: 70, align: 'center' });

  doc.fontSize(18).font('Helvetica-Bold')
     .text('CONTRAT DE LOCATION', 40, headerY, { width: 415, align: 'center' });
  doc.fontSize(13)
     .text(agency.name || '', 40, doc.y + 4, { width: 415, align: 'center' });

  if (agency.address)
    doc.fontSize(8).font('Helvetica')
       .text(agency.address, 40, doc.y + 3, { width: 415, align: 'center' });

  const contactParts = [
    agency.phone ? `Tél: ${agency.phone}` : null,
    agency.email,
  ].filter(Boolean);
  if (contactParts.length)
    doc.fontSize(8)
       .text(contactParts.join('  ·  '), 40, doc.y + 2, { width: 415, align: 'center' });

  const afterHeader = Math.max(doc.y, headerY + 84) + 8;
  doc.moveTo(40, afterHeader).lineTo(555, afterHeader).stroke();
  doc.y = afterHeader + 8;

  // ── Infos contrat (N° + date sur une ligne) ────────────────────────────────
  sectionLine(doc, 'INFORMATIONS DU CONTRAT');
  rowDouble(doc, 'N° de Contrat :', contract.contractNumber,
                  'Date de création :', formatDate(contract.createdAt));

  // ── Bloc 2 colonnes : Client | Véhicule ────────────────────────────────────
  doc.moveDown(SEC_GAP);

  const clientRows = buildRows([
    ['Nom :', contract.clientName],
    contract.clientIdNumber      && ['CIN / Passeport :', contract.clientIdNumber],
    contract.clientLicenseNumber && ['Permis :', contract.clientLicenseNumber],
    contract.clientPhone         && ['Tél :', contract.clientPhone],
    contract.clientEmail         && ['Email :', contract.clientEmail],
    contract.clientAddress       && ['Adresse :', contract.clientAddress],
  ]);

  const vehicleRows = buildRows([
    ['Véhicule :', `${car.brand} ${car.model}`],
    (car.finalPlate || car.wwPlate) && ['Immat. :', car.finalPlate || car.wwPlate],
    car.color                       && ['Couleur :', car.color],
    contract.startMileage           && ['Km départ :', `${contract.startMileage} km`],
    contract.endMileage             && ['Km retour :', `${contract.endMileage} km`],
  ]);

  const afterBlock1 = twoColBlock(doc,
    'INFORMATIONS CLIENT',   clientRows,
    'INFORMATIONS VÉHICULE', vehicleRows
  );
  doc.y = afterBlock1 + 2;

  // ── Bloc 2 colonnes : Période | Finances ───────────────────────────────────
  doc.moveDown(SEC_GAP);

  const days = Math.ceil(
    (new Date(contract.endDate) - new Date(contract.startDate)) / 86400000
  );
  const periodRows = buildRows([
    ['Départ :', formatDate(contract.startDate) + (contract.startTime ? ` ${contract.startTime}` : '')],
    ['Retour :', formatDate(contract.endDate)   + (contract.endTime   ? ` ${contract.endTime}`   : '')],
    ['Durée :', `${days} jour(s)`],
    contract.pickupLocation  && ['Récupération :', contract.pickupLocation],
    contract.dropoffLocation && ['Restitution :', contract.dropoffLocation],
  ]);

  const CONTRACT_STATUS = { PENDING: 'En attente', RESERVATION: 'Réservation', RESERVATION_CONFIRMED: 'Réservation confirmée', ACTIVE: 'En cours', COMPLETED: 'Terminé', CANCELLED: 'Annulé' };
  const finRows = buildRows([
    ['Montant :', `${contract.rentalAmount} ${contract.currency}`],
    contract.montantTTC != null && ['Montant TTC :', `${contract.montantTTC} ${contract.currency}`],
    ['Statut :', CONTRACT_STATUS[contract.status] || contract.status],
    (contract.amountPaid != null) && ['Encaissé :', `${contract.amountPaid} ${contract.currency}`],
    contract.guaranteeAmount > 0 && ['Garantie :', `${contract.guaranteeAmount} ${contract.currency}`],
    ['Dépassement :', contract.allowOverage ? 'Autorisé' : 'Non autorisé'],
  ]);

  const afterBlock2 = twoColBlock(doc,
    'PÉRIODE DE LOCATION', periodRows,
    'CONDITIONS FINANCIÈRES', finRows
  );
  doc.y = afterBlock2 + 2;

  // ── 2ème conducteur ────────────────────────────────────────────────────────
  if (contract.secondDriverName) {
    doc.moveDown(SEC_GAP);
    const d2Rows = buildRows([
      ['Nom :', contract.secondDriverName],
      contract.secondDriverIdNumber      && ['CIN / Passeport :', contract.secondDriverIdNumber],
      contract.secondDriverIdExpiry      && ['Exp. CIN :', formatDate(contract.secondDriverIdExpiry)],
      contract.secondDriverLicense       && ['Permis :', contract.secondDriverLicense],
      contract.secondDriverLicenseExpiry && ['Exp. Permis :', formatDate(contract.secondDriverLicenseExpiry)],
    ]);

    if (d2Rows.length >= 3) {
      // Répartir en 2 colonnes
      const half = Math.ceil(d2Rows.length / 2);
      const afterD2 = twoColBlock(doc,
        '2ÈME CONDUCTEUR', d2Rows.slice(0, half),
        '',                d2Rows.slice(half),
        1
      );
      doc.y = afterD2 + 2;
    } else {
      sectionLine(doc, '2ÈME CONDUCTEUR');
      for (const [lbl, val] of d2Rows) row(doc, lbl, val);
    }
  }

  // ── Sous-location ──────────────────────────────────────────────────────────
  if (contract.isSubRental && contract.subrenterName) {
    doc.moveDown(SEC_GAP);
    sectionLine(doc, 'SOUS-LOCATION');
    row(doc, 'Loueur :', contract.subrenterName);
  }

  // ── Observations ──────────────────────────────────────────────────────────
  if (contract.notes) {
    doc.moveDown(SEC_GAP);
    sectionLine(doc, 'OBSERVATIONS');
    doc.font('Helvetica').fontSize(FONT_SIZE).text(contract.notes, 40, doc.y, { width: W });
  }

  // ── NB ────────────────────────────────────────────────────────────────────
  doc.moveDown(0.8);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.4);
  doc.fontSize(8).font('Helvetica-Bold').text('NB : ', 40, doc.y, { continued: true });
  doc.font('Helvetica').text(
    "Ce contrat ne vaut en aucun cas comme facture. J'ai lu et accepté les conditions stipulées ci-contre au verso de ce contrat. Le client est responsable des violations de la loi sur la circulation routière.",
    { width: W }
  );

  // ── Signatures ─────────────────────────────────────────────────────────────
  doc.moveDown(0.8);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);
  const sigY = doc.y;
  const SIG_H  = 55;
  const footY  = sigY + 16 + SIG_H + 6;
  doc.fontSize(FONT_SIZE).font('Helvetica-Bold');
  if (contract.secondDriverName) {
    doc.text('Signature du Client :',          40,  sigY, { width: 155 });
    doc.text('Signature du 2ème conducteur :', 205, sigY, { width: 165 });
    doc.text("Signature de l'Agence :",        375, sigY, { width: 155 });
    embedSig(doc, signatures.client,  40,  sigY + 16, 155, SIG_H);
    embedSig(doc, signatures.driver2, 205, sigY + 16, 165, SIG_H);
    embedSig(doc, signatures.agency,  375, sigY + 16, 155, SIG_H);
    doc.font('Helvetica').fontSize(9);
    doc.text('Lu et approuvé',      40,  footY, { width: 155 });
    doc.text('Lu et approuvé',      205, footY, { width: 165 });
    doc.text('Cachet et signature', 375, footY, { width: 155 });
  } else {
    doc.text('Signature du Client :',   40,  sigY, { width: 220 });
    doc.text("Signature de l'Agence :", 310, sigY, { width: 220 });
    embedSig(doc, signatures.client, 40,  sigY + 16, 220, SIG_H);
    embedSig(doc, signatures.agency, 310, sigY + 16, 220, SIG_H);
    doc.font('Helvetica').fontSize(9);
    doc.text('Lu et approuvé',      40,  footY, { width: 220 });
    doc.text('Cachet et signature', 310, footY, { width: 220 });
  }

  // ── Page 2 : Conditions générales ─────────────────────────────────────────
  doc.addPage();
  addConditionsGenerales(doc, agency.name || 'L\'agence');

  doc.end();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Filtre les falsy et retourne [[label, value], ...] */
function buildRows(arr) {
  return arr.filter(Boolean);
}

/** Calcule la hauteur d'une ligne de données */
function lineH(doc) {
  doc.fontSize(FONT_SIZE).font('Helvetica');
  return doc.currentLineHeight(true) * 1.45;
}

/** Titre de section inline (texte + underline) */
function sectionLine(doc, title) {
  doc.fontSize(SEC_SIZE).font('Helvetica-Bold').text(title, 40, doc.y, { underline: true, width: 515 });
  doc.moveDown(0.2);
}

/** Une ligne label / valeur pleine largeur */
function row(doc, label, value) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(FONT_SIZE).text(label,        40, y, { width: 100 });
  doc.font('Helvetica').fontSize(FONT_SIZE).text(value || '-', 144, y, { width: 411 });
  doc.y = y + lineH(doc);
}

/** Deux paires label/valeur côte à côte sur la même ligne */
function rowDouble(doc, lbl1, val1, lbl2, val2) {
  const y   = doc.y;
  const mid = 40 + Math.round(515 / 2);
  doc.font('Helvetica-Bold').fontSize(FONT_SIZE).text(lbl1, 40,       y, { width: 95 });
  doc.font('Helvetica').fontSize(FONT_SIZE).text(val1 || '-', 138,    y, { width: mid - 142 });
  doc.font('Helvetica-Bold').fontSize(FONT_SIZE).text(lbl2, mid,      y, { width: 100 });
  doc.font('Helvetica').fontSize(FONT_SIZE).text(val2 || '-', mid + 104, y, { width: 555 - mid - 104 });
  doc.y = y + lineH(doc);
}

/**
 * Dessine deux blocs côte à côte.
 * Chaque bloc = titre de section + liste de lignes [label, valeur].
 * Retourne le y final (bas des deux colonnes).
 */
function twoColBlock(doc, titleL, rowsL, titleR, rowsR, rightYOffset = 0) {
  const startY = doc.y;
  const lh     = lineH(doc);
  const secH   = doc.fontSize(SEC_SIZE).currentLineHeight(true) * 1.7;
  const lblFrac = 0.35; // fraction de COL_W pour le label

  function drawBlock(x, colWidth, title, rows, baseY) {
    let y = baseY;
    if (title) {
      doc.fontSize(SEC_SIZE).font('Helvetica-Bold')
         .text(title, x, y, { underline: true, width: colWidth });
      y += secH;
    }
    const lblW = Math.round(colWidth * lblFrac);
    const valX = x + lblW + 4;
    const valW = colWidth - lblW - 4;
    for (const [lbl, val] of rows) {
      doc.font('Helvetica-Bold').fontSize(FONT_SIZE).text(lbl,        x,    y, { width: lblW });
      doc.font('Helvetica').fontSize(FONT_SIZE).text(val || '-', valX, y, { width: valW });
      y += lh;
    }
    return y;
  }

  const endL = drawBlock(40,    COL_W, titleL, rowsL, startY);
  const endR = drawBlock(COL_R, COL_W, titleR, rowsR, startY + rightYOffset * lh);

  return Math.max(endL, endR);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-MA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ── Conditions générales (page 2, 2 colonnes) ─────────────────────────────────
function addConditionsGenerales(doc, agencyName) {
  const CG_FONT  = 8.0;
  const CG_TITLE = 9.0;
  const CG_GAP   = 4;      // espace entre articles (pt)
  const PAGE_W   = 515;
  const COL_CG   = Math.floor(PAGE_W / 2) - 6;  // ~251 px par colonne
  const COL_R_CG = 40 + COL_CG + 12;            // x départ colonne droite
  const TOP      = 40;
  const BOTTOM   = 802;    // bas de page utilisable (842 - 40)

  doc.fontSize(11).font('Helvetica-Bold')
     .text('CONDITIONS GÉNÉRALES DE LOCATION', 40, TOP, { width: PAGE_W, align: 'center' });
  doc.moveTo(40, doc.y + 4).lineTo(555, doc.y + 4).stroke();

  const articles = [
    {
      num: '1', title: 'Conditions de location',
      body: `En signant le présent contrat, le preneur déclare avoir pris connaissance des conditions générales et donner son accord aux clauses du dit contrat.`,
    },
    {
      num: '2', title: 'État du véhicule et entretien',
      body: `Le locataire reconnaît avoir reçu le véhicule désigné au contrat en parfait état de marche et de propreté.\n\nL'usure mécanique normale est à la charge du client.\n\nToutes les réparations provenant d'une usure normale ou d'une négligence seront à la charge du client (excès de vitesse, conduite brutale sur mauvaise route, détérioration de pièces mécaniques : direction, train avant, amortisseur…). Le locataire s'engage à remplacer immédiatement les pièces cassées.\n\nEn cas d'immobilisation, les réparations pourront être exécutées avec l'accord du loueur et devront faire l'objet d'une facture acquittée et détaillée avec présentation des pièces remplacées.\n\nEn aucun cas le locataire ne pourra prétendre à une indemnité quelconque. Si le véhicule est laissé ailleurs que prévu sans consentement écrit, le locataire s'engage à le restituer avec tous ses accessoires à la date et au lieu fixés au contrat.`,
    },
    {
      num: '3', title: 'Coût de location',
      body: `Le montant approximatif de la location est payable au moment de la prise en charge du véhicule ; les ajustements seront faits en fin de location.`,
    },
    {
      num: '4', title: 'Prolongation - Modification',
      body: `Si le preneur désire modifier la période de location, il devra aviser ${agencyName} 48 heures à l'avance. L'accord ne pourra être donné que par écrit, autrement toute modification sera nulle.`,
    },
    {
      num: '5', title: 'Conducteur',
      body: `Le preneur s'engage à ce que le véhicule ne soit pas utilisé :\n• Pour le transport onéreux de passagers.\n• Pour propulser ou tirer un autre véhicule.\n• En compétition ou sur chantier.\n• Par une personne sous influence d'alcool ou narcotiques.\n\nPermis de conduire : émis depuis plus de 2 ans — Âge minimum : 23 ans.\n\nL'inobservation de ces règles engage l'entière responsabilité du preneur. Le véhicule ne peut être conduit que par les personnes désignées sur le contrat.`,
    },
    {
      num: '6', title: 'Assurance',
      body: `Le locataire déclare avoir pris connaissance des conditions générales du certificat d'assurance automobile mis à sa disposition dans nos bureaux.\n\nL'assurance couvre les dommages au tiers illimités ainsi que la responsabilité civile du locataire et du conducteur autorisé.\n\nLe locataire peut accepter ou refuser l'assurance personnes transportées aux conditions et tarifs en vigueur.`,
    },
    {
      num: '7', title: 'Accidents',
      body: `Le preneur s'engage à prendre toutes mesures utiles pour protéger les intérêts du loueur et de la compagnie d'assurance en cas d'accident, notamment : recueillir les noms et adresses des personnes en cause et des témoins, ne pas reconnaître sa responsabilité, ne pas abandonner le véhicule sans en assurer la sécurité, prévenir la police si nécessaire.\n\nFranchise en cas d'accident provoqué par le locataire : 20 % de la valeur globale du véhicule.`,
    },
    {
      num: '8', title: 'Documents du véhicule',
      body: `Le locataire s'engage à restituer tous les documents du véhicule à la fin de la location. À défaut, ${agencyName} se réserve le droit de facturer les journées d'immobilisation. Le locataire devra acquitter les frais de duplicata.`,
    },
    {
      num: '9', title: 'Délits et contraventions',
      body: `Pendant la durée de la location, le locataire sera responsable de tous délits ou contraventions relevés à son encontre.`,
    },
    {
      num: '10', title: 'Contestations',
      body: `En cas de désaccord ne pouvant être liquidé à l'amiable, les parties s'en remettront à la juridiction des tribunaux compétents.`,
    },
  ];

  // Répartir les articles en 2 colonnes en alternant article par article
  // jusqu'à ce que la colonne gauche soit pleine, puis remplir la droite
  const startY = doc.y + 10;

  function drawArticle(x, colWidth, article, yStart) {
    let y = yStart;
    // Titre
    doc.fontSize(CG_TITLE).font('Helvetica-Bold')
       .text(`${article.num}. ${article.title}`, x, y, { width: colWidth });
    y = doc.y + 1;
    // Corps
    doc.fontSize(CG_FONT).font('Helvetica')
       .text(article.body, x, y, { width: colWidth, lineGap: 0.5 });
    return doc.y + CG_GAP;
  }

  // Calcul de hauteur approximative pour répartir
  let leftY  = startY;
  let rightY = startY;
  const half = Math.ceil(articles.length / 2);

  for (let i = 0; i < articles.length; i++) {
    if (i < half) {
      leftY = drawArticle(40, COL_CG, articles[i], leftY);
    } else {
      rightY = drawArticle(COL_R_CG, COL_CG, articles[i], rightY);
    }
  }
}

function embedSig(doc, base64, x, y, w, h) {
  if (!base64) return;
  try {
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(data, 'base64');
    doc.image(buf, x, y, { fit: [w, h] });
  } catch {}
}

module.exports = generateContractPdf;
