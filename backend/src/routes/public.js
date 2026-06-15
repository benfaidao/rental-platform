const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

function getMailer() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

router.post('/demo-request', async (req, res) => {
  const { firstName, lastName, agency, phone, email, city } = req.body;
  if (!firstName || !email) return res.status(400).json({ error: 'Prénom et email requis' });

  await prisma.demoRequest.create({
    data: { firstName, lastName: lastName || null, agencyName: agency || null, phone: phone || null, email, city: city || null },
  });

  const mailer = getMailer();
  if (mailer) {
    try {
      await mailer.sendMail({
        from: `"Mobiliscar" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: process.env.DEMO_EMAIL || process.env.SMTP_USER,
        subject: `🚗 Nouvelle demande de démo — ${agency || email}`,
        html: `
          <h2 style="color:#1a3f8f">Nouvelle demande de démo Mobiliscar</h2>
          <table cellpadding="6" style="font-size:15px">
            <tr><td><strong>Prénom :</strong></td><td>${firstName}</td></tr>
            <tr><td><strong>Nom :</strong></td><td>${lastName || '-'}</td></tr>
            <tr><td><strong>Agence :</strong></td><td>${agency || '-'}</td></tr>
            <tr><td><strong>Téléphone :</strong></td><td>${phone || '-'}</td></tr>
            <tr><td><strong>Email :</strong></td><td>${email}</td></tr>
            <tr><td><strong>Ville :</strong></td><td>${city || '-'}</td></tr>
          </table>
        `,
      });
    } catch (e) {
      console.error('Demo request mail error:', e);
    }
  } else {
    console.log('Demo request (no SMTP):', { firstName, lastName, agency, phone, email, city });
  }

  res.json({ success: true });
});

router.get('/contracts/:contractNumber', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({
      where: { contractNumber: req.params.contractNumber },
      include: {
        car: { select: { brand: true, model: true, finalPlate: true, wwPlate: true } },
        client: { select: { firstName: true, lastName: true, phone: true, email: true } },
        agency: { select: { name: true, phone: true, address: true } },
        periodicPayments: { orderBy: { periodStart: 'asc' } },
      },
    });
    if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
    res.json(contract);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
