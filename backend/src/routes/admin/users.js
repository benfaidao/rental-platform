const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, role: true, isActive: true, createdAt: true,
      agencyUsers: { include: { agency: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

router.post('/', async (req, res) => {
  const { email, firstName, lastName, phone, password, role, agencyId } = req.body;
  if (!email || !firstName || !lastName || !password) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email déjà utilisé' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email, firstName, lastName, phone, password: hashed, role: role || 'AGENCY_USER',
      ...(agencyId ? { agencyUsers: { create: { agencyId, role: 'USER' } } } : {}),
    },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true, role: true,
      agencyUsers: { include: { agency: { select: { id: true, name: true } } } },
    },
  });
  res.status(201).json(user);
});

router.put('/:id', async (req, res) => {
  const { firstName, lastName, phone, isActive, role, password } = req.body;
  const data = { firstName, lastName, phone, isActive, role };
  if (password) data.password = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true },
  });
  res.json(user);
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Impossible de supprimer son propre compte' });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: 'Utilisateur supprimé' });
});

module.exports = router;
