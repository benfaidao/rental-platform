const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

// Oil changes
router.get('/oil-changes', async (req, res) => {
  const { carId } = req.query;
  const where = {
    car: { agencyId: req.params.agencyId },
  };
  if (carId) where.carId = carId;
  const records = await prisma.oilChange.findMany({
    where,
    include: { car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(records);
});

router.post('/oil-changes', async (req, res) => {
  const { carId, date, mileage, oilType, filterChanged, cost, notes, nextKm, nextDate } = req.body;
  if (!carId || !date || !mileage) return res.status(400).json({ error: 'Champs requis manquants' });

  const record = await prisma.oilChange.create({
    data: {
      carId,
      date: new Date(date),
      mileage: parseInt(mileage),
      oilType,
      filterChanged: !!filterChanged,
      cost: cost ? parseFloat(cost) : null,
      notes,
      nextKm: nextKm ? parseInt(nextKm) : null,
      nextDate: nextDate ? new Date(nextDate) : null,
    },
  });
  res.status(201).json(record);
});

router.put('/oil-changes/:id', async (req, res) => {
  const { date, mileage, oilType, filterChanged, cost, notes, nextKm, nextDate } = req.body;
  const record = await prisma.oilChange.update({
    where: { id: req.params.id },
    data: {
      date: date ? new Date(date) : undefined,
      mileage: mileage ? parseInt(mileage) : undefined,
      oilType, filterChanged, cost: cost ? parseFloat(cost) : undefined, notes,
      nextKm: nextKm ? parseInt(nextKm) : undefined,
      nextDate: nextDate ? new Date(nextDate) : undefined,
    },
  });
  res.json(record);
});

router.delete('/oil-changes/:id', async (req, res) => {
  await prisma.oilChange.delete({ where: { id: req.params.id } });
  res.json({ message: 'Vidange supprimée' });
});

router.get('/oil-change-config/:carId', async (req, res) => {
  let config = await prisma.oilChangeConfig.findUnique({ where: { carId: req.params.carId } });
  if (!config) config = { carId: req.params.carId, intervalKm: 5000, intervalMonths: 6 };
  res.json(config);
});

router.put('/oil-change-config/:carId', async (req, res) => {
  const { intervalKm, intervalMonths } = req.body;
  const config = await prisma.oilChangeConfig.upsert({
    where: { carId: req.params.carId },
    update: {
      intervalKm: parseInt(intervalKm),
      intervalMonths: parseInt(intervalMonths),
    },
    create: {
      carId: req.params.carId,
      intervalKm: parseInt(intervalKm),
      intervalMonths: parseInt(intervalMonths),
    },
  });
  res.json(config);
});

// Tires
router.get('/tires', async (req, res) => {
  const { carId } = req.query;
  const where = { car: { agencyId: req.params.agencyId } };
  if (carId) where.carId = carId;
  const records = await prisma.tireRecord.findMany({
    where,
    include: { car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(records);
});

router.post('/tires', async (req, res) => {
  const { carId, date, mileage, position, brand, size, cost, notes } = req.body;
  if (!carId || !date) return res.status(400).json({ error: 'Champs requis manquants' });
  const record = await prisma.tireRecord.create({
    data: {
      carId, date: new Date(date),
      mileage: mileage ? parseInt(mileage) : null,
      position, brand, size,
      cost: cost ? parseFloat(cost) : null, notes,
    },
  });
  res.status(201).json(record);
});

router.put('/tires/:id', async (req, res) => {
  const { date, mileage, position, brand, size, cost, notes } = req.body;
  const record = await prisma.tireRecord.update({
    where: { id: req.params.id },
    data: {
      date: date ? new Date(date) : undefined,
      mileage: mileage ? parseInt(mileage) : undefined,
      position, brand, size,
      cost: cost ? parseFloat(cost) : undefined, notes,
    },
  });
  res.json(record);
});

router.delete('/tires/:id', async (req, res) => {
  await prisma.tireRecord.delete({ where: { id: req.params.id } });
  res.json({ message: 'Enregistrement pneu supprimé' });
});

// Repairs
router.get('/repairs', async (req, res) => {
  const { carId } = req.query;
  const where = { car: { agencyId: req.params.agencyId } };
  if (carId) where.carId = carId;
  const records = await prisma.repair.findMany({
    where,
    include: {
      car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } },
      photos: true,
    },
    orderBy: { date: 'desc' },
  });
  res.json(records);
});

router.get('/repairs/upcoming', async (req, res) => {
  const upcoming = await prisma.repair.findMany({
    where: {
      car: { agencyId: req.params.agencyId },
      nextRepairDate: { gte: new Date() },
    },
    include: { car: { select: { id: true, brand: true, model: true, finalPlate: true } } },
    orderBy: { nextRepairDate: 'asc' },
  });
  res.json(upcoming);
});

router.post('/repairs', async (req, res) => {
  const { carId, date, description, mileage, cost, garage, nextRepairDate, nextRepairDescription, notes } = req.body;
  if (!carId || !date || !description) return res.status(400).json({ error: 'Champs requis manquants' });
  const record = await prisma.repair.create({
    data: {
      carId, date: new Date(date), description,
      mileage: mileage ? parseInt(mileage) : null,
      cost: cost ? parseFloat(cost) : null,
      garage,
      nextRepairDate: nextRepairDate ? new Date(nextRepairDate) : null,
      nextRepairDescription, notes,
    },
  });
  res.status(201).json(record);
});

router.put('/repairs/:id', async (req, res) => {
  const { date, description, mileage, cost, garage, nextRepairDate, nextRepairDescription, notes } = req.body;
  const record = await prisma.repair.update({
    where: { id: req.params.id },
    data: {
      date: date ? new Date(date) : undefined,
      description, mileage: mileage ? parseInt(mileage) : undefined,
      cost: cost ? parseFloat(cost) : undefined, garage,
      nextRepairDate: nextRepairDate ? new Date(nextRepairDate) : undefined,
      nextRepairDescription, notes,
    },
  });
  res.json(record);
});

router.delete('/repairs/:id', async (req, res) => {
  await prisma.repair.delete({ where: { id: req.params.id } });
  res.json({ message: 'Réparation supprimée' });
});

router.post('/repairs/:id/photos', upload.array('photos', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Photos requises' });
  const photos = await prisma.$transaction(
    req.files.map(file =>
      prisma.repairPhoto.create({
        data: {
          repairId: req.params.id,
          filename: file.originalname,
          url: `/uploads/${file.filename}`,
        },
      })
    )
  );
  res.status(201).json(photos);
});

module.exports = router;
