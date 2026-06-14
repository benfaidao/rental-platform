const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

function getMailer() {
  if (!process.env.SMTP_HOST) return null;
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

router.use(authenticate, requireAgencyAccess);

// GET / — agency profile + current user info
router.get('/', async (req, res) => {
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: req.params.agencyId },
      select: { id: true, name: true, address: true, phone: true, email: true, ice: true, ic: true, rc: true, device: true, vatRate: true },
    });
    if (!agency) return res.status(404).json({ error: 'Agence introuvable' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });

    res.json({ agency, user, agencyRole: req.agencyRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT / — update agency info (ADMIN only)
router.put('/', async (req, res) => {
  try {
    if (req.agencyRole !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
    }
    const { name, address, phone, email, ice, ic, rc, device, vatRate } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Le nom est requis' });

    const agency = await prisma.agency.update({
      where: { id: req.params.agencyId },
      data: {
        name:    name.trim(),
        address: address?.trim() || null,
        phone:   phone?.trim()   || null,
        email:   email?.trim()   || null,
        ice:     ice?.trim()     || null,
        ic:      ic?.trim()      || null,
        rc:      rc?.trim()      || null,
        device:  device?.trim()  || null,
        vatRate: vatRate !== undefined ? (vatRate === '' || vatRate === null ? null : parseFloat(vatRate)) : undefined,
      },
      select: { id: true, name: true, address: true, phone: true, email: true, ice: true, ic: true, rc: true, device: true, vatRate: true },
    });
    res.json(agency);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /me — update current user's own profile (any role)
router.put('/me', async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: 'Prénom et nom requis' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phone:     phone?.trim() || null,
      },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /me/request-email-change — envoie un code de vérification au nouvel email
router.post('/me/request-email-change', async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail?.trim()) return res.status(400).json({ error: 'Nouvel email requis' });

    const email = newEmail.trim().toLowerCase();

    // Email déjà utilisé par un autre compte
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé par un autre compte' });
    }
    if (existing && existing.id === req.user.id) {
      return res.status(400).json({ error: 'C\'est déjà votre email actuel' });
    }

    // Invalider les demandes précédentes
    await prisma.emailChangeRequest.updateMany({
      where: { userId: req.user.id, used: false },
      data: { used: true },
    });

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 chiffres
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.emailChangeRequest.create({
      data: { id: crypto.randomUUID(), userId: req.user.id, newEmail: email, code, expiresAt },
    });

    const mailer = getMailer();
    if (mailer) {
      try {
        await mailer.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'Confirmation de changement d\'email',
          html: `
            <p>Bonjour,</p>
            <p>Votre code de vérification pour changer votre adresse email est :</p>
            <h2 style="letter-spacing:8px;font-size:32px;">${code}</h2>
            <p>Ce code expire dans <strong>15 minutes</strong>.</p>
          `,
        });
        return res.json({ message: `Un code de vérification a été envoyé à ${email}.` });
      } catch (err) {
        console.error('Email send error:', err.message);
      }
    }

    // Pas de SMTP — retourner le code directement
    res.json({
      message: 'Aucun serveur email configuré. Utilisez le code ci-dessous.',
      code,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /me/confirm-email-change — vérifie le code et met à jour l'email
router.post('/me/confirm-email-change', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Code requis' });

    const record = await prisma.emailChangeRequest.findFirst({
      where: { userId: req.user.id, code: code.trim(), used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    // Vérifier que le nouvel email n'est pas pris (re-check)
    const taken = await prisma.user.findUnique({ where: { email: record.newEmail } });
    if (taken) return res.status(400).json({ error: 'Cet email est déjà utilisé' });

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.user.id }, data: { email: record.newEmail } }),
      prisma.emailChangeRequest.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    res.json({ message: 'Email mis à jour avec succès.', newEmail: record.newEmail });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
