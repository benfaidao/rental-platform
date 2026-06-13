const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Build a nodemailer transporter only if SMTP is configured
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

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token Google manquant' });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'Google OAuth non configuré' });

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName } = payload;

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
      include: { agencyUsers: { include: { agency: true } } },
    });

    if (!user) {
      return res.status(404).json({ error: 'Aucun compte trouvé pour cet email. Contactez votre administrateur.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Compte désactivé. Contactez votre administrateur.' });
    }

    // Link googleId if not yet stored
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
        include: { agencyUsers: { include: { agency: true } } },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Token Google invalide ou expiré' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { agencyUsers: { include: { agency: true } } },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

router.get('/me', authenticate, async (req, res) => {
  const { password: _, ...user } = req.user;
  res.json(user);
});

router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
  res.json({ message: 'Mot de passe mis à jour' });
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Always respond 200 to avoid user enumeration
  if (!user || !user.isActive) {
    return res.json({ message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.' });
  }

  // Invalidate previous tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

  const record = await prisma.passwordResetToken.create({
    data: { id: crypto.randomUUID(), userId: user.id, token, expiresAt },
  });

  const appUrl = process.env.APP_URL || 'http://localhost';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const mailer = getMailer();
  if (mailer) {
    try {
      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
          <p>Bonjour ${user.firstName},</p>
          <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Ce lien expire dans <strong>1 heure</strong>.</p>
          <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
        `,
      });
      return res.json({ message: 'Un lien de réinitialisation a été envoyé à votre adresse email.' });
    } catch (err) {
      console.error('Email send error:', err.message);
    }
  }

  // No SMTP configured — return the reset URL directly (dev / no-email setup)
  res.json({
    message: 'Aucun serveur email configuré. Utilisez le lien ci-dessous pour réinitialiser votre mot de passe.',
    resetUrl,
  });
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.used || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Lien invalide ou expiré. Veuillez faire une nouvelle demande.' });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);

  res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' });
});

module.exports = router;
