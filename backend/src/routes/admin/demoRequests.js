const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

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

router.get('/', async (req, res) => {
  const requests = await prisma.demoRequest.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

router.post('/:id/approve', async (req, res) => {
  const { demoDays = 14 } = req.body;
  const demoRequest = await prisma.demoRequest.findUnique({ where: { id: req.params.id } });
  if (!demoRequest) return res.status(404).json({ error: 'Demande introuvable' });
  if (demoRequest.status === 'APPROVED') return res.status(400).json({ error: 'Déjà approuvée' });

  const demoExpiresAt = new Date();
  demoExpiresAt.setDate(demoExpiresAt.getDate() + Number(demoDays));

  const agency = await prisma.agency.create({
    data: {
      name: demoRequest.agencyName || `Demo - ${demoRequest.firstName}`,
      phone: demoRequest.phone || null,
      email: demoRequest.email,
      isDemo: true,
      demoExpiresAt,
    },
  });

  const rawPassword = Math.random().toString(36).slice(2, 8).toUpperCase() + Math.random().toString(36).slice(2, 5) + '!2';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const existingUser = await prisma.user.findUnique({ where: { email: demoRequest.email } });
  let user;
  if (existingUser) {
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        agencyUsers: { create: { agencyId: agency.id, role: 'ADMIN' } },
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: demoRequest.email,
        password: hashedPassword,
        firstName: demoRequest.firstName,
        lastName: demoRequest.lastName || '',
        phone: demoRequest.phone || null,
        role: 'AGENCY_ADMIN',
        mustChangePassword: true,
        agencyUsers: { create: { agencyId: agency.id, role: 'ADMIN' } },
      },
    });
  }

  await prisma.demoRequest.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED', demoAgencyId: agency.id, demoUserId: user.id },
  });

  const appUrl = process.env.APP_URL || '';
  const mailer = getMailer();
  if (mailer) {
    try {
      await mailer.sendMail({
        from: `"Mobiliscar" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: demoRequest.email,
        subject: '🎉 Votre accès démo Mobiliscar est prêt !',
        html: `
          <h2 style="color:#1a3f8f">Bienvenue sur Mobiliscar !</h2>
          <p>Bonjour ${demoRequest.firstName},</p>
          <p>Votre accès démo est activé pour <strong>${demoDays} jours</strong> (jusqu'au ${demoExpiresAt.toLocaleDateString('fr-FR')}).</p>
          <h3>Vos identifiants de connexion</h3>
          <table cellpadding="6" style="font-size:15px;background:#f8fafc;border-radius:8px;padding:12px">
            <tr><td><strong>URL :</strong></td><td><a href="${appUrl}">${appUrl}</a></td></tr>
            <tr><td><strong>Email :</strong></td><td>${demoRequest.email}</td></tr>
            <tr><td><strong>Mot de passe :</strong></td><td>${rawPassword}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px">Vous serez invité à changer votre mot de passe à la première connexion.</p>
          <p>Bonne découverte !</p>
        `,
      });
    } catch (e) {
      console.error('Demo approval mail error:', e);
    }
  }

  res.json({ success: true, agency, credentials: { email: demoRequest.email, password: rawPassword } });
});

router.post('/:id/reject', async (req, res) => {
  const demoRequest = await prisma.demoRequest.findUnique({ where: { id: req.params.id } });
  if (!demoRequest) return res.status(404).json({ error: 'Demande introuvable' });
  await prisma.demoRequest.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  await prisma.demoRequest.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
