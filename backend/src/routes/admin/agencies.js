const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  const agencies = await prisma.agency.findMany({
    include: {
      _count: { select: { cars: true, contracts: true, agencyUsers: true } },
      billings: { where: { status: { not: 'PAID' } }, select: { amount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(agencies);
});

router.post('/', async (req, res) => {
  const { name, address, phone, email, ice, ic, rc } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const agency = await prisma.agency.create({ data: { name, address, phone, email, ice, ic, rc } });
  res.status(201).json(agency);
});

router.put('/:id', async (req, res) => {
  const { name, address, phone, email, isActive, isSuspended, ice, ic, rc } = req.body;
  const agency = await prisma.agency.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(isActive !== undefined && { isActive }),
      ...(isSuspended !== undefined && { isSuspended }),
      ...(ice !== undefined && { ice }),
      ...(ic !== undefined && { ic }),
      ...(rc !== undefined && { rc }),
    },
  });
  res.json(agency);
});

router.delete('/:id', async (req, res) => {
  await prisma.agency.delete({ where: { id: req.params.id } });
  res.json({ message: 'Agence supprimée' });
});

router.get('/:id/users', async (req, res) => {
  const users = await prisma.agencyUser.findMany({
    where: { agencyId: req.params.id },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, isActive: true } } },
  });
  res.json(users);
});

router.post('/:id/users', async (req, res) => {
  const { email, firstName, lastName, phone, password, role } = req.body;
  if (!email || !firstName || !lastName || !password) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hashed = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: { email, firstName, lastName, phone, password: hashed, role: 'AGENCY_USER' },
    });
  }

  const existing = await prisma.agencyUser.findUnique({
    where: { userId_agencyId: { userId: user.id, agencyId: req.params.id } },
  });
  if (existing) return res.status(400).json({ error: 'Utilisateur déjà membre de cette agence' });

  const agencyUser = await prisma.agencyUser.create({
    data: { userId: user.id, agencyId: req.params.id, role: role || 'USER' },
    include: { user: true },
  });
  res.status(201).json(agencyUser);
});

router.delete('/:id/users/:userId', async (req, res) => {
  await prisma.agencyUser.deleteMany({
    where: { agencyId: req.params.id, userId: req.params.userId },
  });
  res.json({ message: 'Utilisateur retiré' });
});

module.exports = router;
