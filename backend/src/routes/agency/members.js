const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

// Admin only for write operations
function requireAdmin(req, res, next) {
  if (req.user.role !== 'SUPER_ADMIN' && req.agencyRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Droits administrateur requis' });
  }
  next();
}

// GET — list members of the agency
router.get('/', async (req, res) => {
  const members = await prisma.agencyUser.findMany({
    where: { agencyId: req.params.agencyId },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true } } },
  });
  res.json(members);
});

// POST — create or add a user to the agency (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { email, firstName, lastName, phone, password, role } = req.body;
  if (!email || !firstName || !lastName || !password) {
    return res.status(400).json({ error: 'Prénom, nom, email et mot de passe requis' });
  }

  let user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    const hashed = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null,
        password: hashed,
        role: 'AGENCY_USER',
      },
    });
  }

  const existing = await prisma.agencyUser.findUnique({
    where: { userId_agencyId: { userId: user.id, agencyId: req.params.agencyId } },
  });
  if (existing) return res.status(400).json({ error: 'Cet utilisateur est déjà membre de cette agence' });

  const member = await prisma.agencyUser.create({
    data: { userId: user.id, agencyId: req.params.agencyId, role: role === 'ADMIN' ? 'ADMIN' : 'USER' },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
  });
  res.status(201).json(member);
});

// PUT — update member role (admin only)
router.put('/:userId', requireAdmin, async (req, res) => {
  const { role } = req.body;
  const member = await prisma.agencyUser.update({
    where: { userId_agencyId: { userId: req.params.userId, agencyId: req.params.agencyId } },
    data: { role: role === 'ADMIN' ? 'ADMIN' : 'USER' },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });
  res.json(member);
});

// DELETE — remove user from agency (admin only)
router.delete('/:userId', requireAdmin, async (req, res) => {
  // Prevent removing self
  if (req.params.userId === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas vous retirer vous-même' });
  }
  await prisma.agencyUser.deleteMany({
    where: { agencyId: req.params.agencyId, userId: req.params.userId },
  });
  res.json({ message: 'Membre retiré' });
});

module.exports = router;
