const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess, requireAgencyAdmin } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

// GET list of all other active agencies (for granting access)
router.get('/agencies', async (req, res) => {
  const agencies = await prisma.agency.findMany({
    where: { isActive: true, id: { not: req.params.agencyId } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  res.json(agencies);
});

// GET all access relationships (given & received)
router.get('/', async (req, res) => {
  const [given, received] = await Promise.all([
    prisma.agencyAccess.findMany({
      where: { giverAgencyId: req.params.agencyId },
      include: {
        receiverAgency: { select: { id: true, name: true } },
        carAccesses: { include: { car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } } } },
      },
    }),
    prisma.agencyAccess.findMany({
      where: { receiverAgencyId: req.params.agencyId },
      include: {
        giverAgency: { select: { id: true, name: true } },
        carAccesses: { include: { car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } } } },
      },
    }),
  ]);
  res.json({ given, received });
});

// PUT update access type and/or cars (agency configures their own sharing)
router.put('/:accessId', async (req, res) => {
  const { accessType, carIds } = req.body;

  const access = await prisma.agencyAccess.findFirst({
    where: { id: req.params.accessId, giverAgencyId: req.params.agencyId },
  });
  if (!access) return res.status(404).json({ error: 'Accès non trouvé' });

  // Replace car accesses if provided
  if (carIds !== undefined) {
    await prisma.agencyCarAccess.deleteMany({ where: { accessId: req.params.accessId } });
    if (accessType === 'SPECIFIC' && carIds.length) {
      await prisma.agencyCarAccess.createMany({
        data: carIds.map(carId => ({ accessId: req.params.accessId, carId })),
      });
    }
  }

  const updated = await prisma.agencyAccess.update({
    where: { id: req.params.accessId },
    data: { accessType: accessType || access.accessType },
    include: {
      receiverAgency: { select: { id: true, name: true } },
      carAccesses: { include: { car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } } } },
    },
  });
  res.json(updated);
});

// POST add a car to a SPECIFIC access
router.post('/:accessId/cars', async (req, res) => {
  const { carId } = req.body;
  if (!carId) return res.status(400).json({ error: 'carId requis' });

  const access = await prisma.agencyAccess.findFirst({
    where: { id: req.params.accessId, giverAgencyId: req.params.agencyId },
  });
  if (!access) return res.status(404).json({ error: 'Accès non trouvé' });

  // Switch to SPECIFIC if needed
  if (access.accessType !== 'SPECIFIC') {
    await prisma.agencyAccess.update({ where: { id: req.params.accessId }, data: { accessType: 'SPECIFIC' } });
  }

  await prisma.agencyCarAccess.upsert({
    where: { accessId_carId: { accessId: req.params.accessId, carId } },
    create: { accessId: req.params.accessId, carId },
    update: {},
  });

  const updated = await prisma.agencyAccess.findFirst({
    where: { id: req.params.accessId },
    include: {
      receiverAgency: { select: { id: true, name: true } },
      carAccesses: { include: { car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } } } },
    },
  });
  res.json(updated);
});

// DELETE remove a car from a SPECIFIC access
router.delete('/:accessId/cars/:carId', requireAgencyAdmin, async (req, res) => {
  await prisma.agencyCarAccess.deleteMany({
    where: { accessId: req.params.accessId, carId: req.params.carId },
  });
  res.json({ message: 'Voiture retirée de l\'accès' });
});

// DELETE revoke full access (agency cannot revoke — only admin can, but kept for safety)
router.delete('/:accessId', requireAgencyAdmin, async (req, res) => {
  await prisma.agencyAccess.delete({ where: { id: req.params.accessId } });
  res.json({ message: 'Accès révoqué' });
});

module.exports = router;
