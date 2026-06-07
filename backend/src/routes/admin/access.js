const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

// GET all inter-agency access relationships
router.get('/', async (req, res) => {
  const accesses = await prisma.agencyAccess.findMany({
    include: {
      giverAgency: { select: { id: true, name: true } },
      receiverAgency: { select: { id: true, name: true } },
      carAccesses: { select: { carId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(accesses);
});

// POST create a new inter-agency access (admin only)
router.post('/', async (req, res) => {
  const { giverAgencyId, receiverAgencyId } = req.body;
  if (!giverAgencyId || !receiverAgencyId) {
    return res.status(400).json({ error: 'Agence source et agence destinataire requises' });
  }
  if (giverAgencyId === receiverAgencyId) {
    return res.status(400).json({ error: 'Impossible de partager avec soi-même' });
  }

  const existing = await prisma.agencyAccess.findUnique({
    where: { giverAgencyId_receiverAgencyId: { giverAgencyId, receiverAgencyId } },
  });
  if (existing) return res.status(400).json({ error: 'Cet accès existe déjà' });

  const access = await prisma.agencyAccess.create({
    data: { giverAgencyId, receiverAgencyId, accessType: 'ALL' },
    include: {
      giverAgency: { select: { id: true, name: true } },
      receiverAgency: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(access);
});

// DELETE revoke an access
router.delete('/:id', async (req, res) => {
  await prisma.agencyAccess.delete({ where: { id: req.params.id } });
  res.json({ message: 'Accès révoqué' });
});

module.exports = router;
