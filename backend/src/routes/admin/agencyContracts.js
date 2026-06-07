const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  const where = req.query.agencyId ? { agencyId: req.query.agencyId } : {};
  const contracts = await prisma.agencyContract.findMany({
    where,
    include: { agency: { select: { id: true, name: true } }, _count: { select: { billings: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(contracts);
});

router.post('/', async (req, res) => {
  const { agencyId, startDate, endDate, montantTTC, periodUnit, notes } = req.body;
  if (!agencyId || !startDate || !montantTTC) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const contract = await prisma.agencyContract.create({
    data: {
      agencyId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      montantTTC: parseFloat(montantTTC),
      periodUnit: periodUnit || 'MONTHLY',
      notes,
    },
    include: { agency: { select: { id: true, name: true } } },
  });
  res.status(201).json(contract);
});

router.put('/:id', async (req, res) => {
  const { startDate, endDate, montantTTC, periodUnit, status, notes } = req.body;
  const contract = await prisma.agencyContract.update({
    where: { id: req.params.id },
    data: {
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(montantTTC !== undefined && { montantTTC: parseFloat(montantTTC) }),
      ...(periodUnit !== undefined && { periodUnit }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: { agency: { select: { id: true, name: true } } },
  });
  res.json(contract);
});

router.post('/:id/end', async (req, res) => {
  const { endDate } = req.body;
  const contract = await prisma.agencyContract.update({
    where: { id: req.params.id },
    data: { status: 'ENDED', endDate: endDate ? new Date(endDate) : new Date() },
    include: { agency: { select: { id: true, name: true } } },
  });
  res.json(contract);
});

router.delete('/:id', async (req, res) => {
  await prisma.agencyContract.delete({ where: { id: req.params.id } });
  res.json({ message: 'Contrat supprimé' });
});

module.exports = router;
