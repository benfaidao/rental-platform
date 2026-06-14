const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

function requireAdmin(req, res, next) {
  if (req.user.role !== 'SUPER_ADMIN' && req.agencyRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Droits administrateur requis' });
  }
  next();
}

// ── Seasons ──────────────────────────────────────────────────────────────────

router.get('/seasons', async (req, res) => {
  const seasons = await prisma.pricingSeason.findMany({
    where: { agencyId: req.params.agencyId },
    orderBy: { startDate: 'asc' },
  });
  res.json(seasons);
});

router.post('/seasons', requireAdmin, async (req, res) => {
  const { name, startDate, endDate, type, value, isActive } = req.body;
  if (!name || !startDate || !endDate || !type || value == null) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  if (!['PERCENTAGE', 'FIXED'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide (PERCENTAGE ou FIXED)' });
  }
  const season = await prisma.pricingSeason.create({
    data: {
      agencyId: req.params.agencyId,
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      value: parseFloat(value),
      isActive: isActive !== false,
    },
  });
  res.status(201).json(season);
});

router.put('/seasons/:id', requireAdmin, async (req, res) => {
  const { name, startDate, endDate, type, value, isActive } = req.body;
  const existing = await prisma.pricingSeason.findFirst({
    where: { id: req.params.id, agencyId: req.params.agencyId },
  });
  if (!existing) return res.status(404).json({ error: 'Saison introuvable' });

  const season = await prisma.pricingSeason.update({
    where: { id: req.params.id },
    data: {
      ...(name != null && { name: name.trim() }),
      ...(startDate != null && { startDate: new Date(startDate) }),
      ...(endDate != null && { endDate: new Date(endDate) }),
      ...(type != null && { type }),
      ...(value != null && { value: parseFloat(value) }),
      ...(isActive != null && { isActive }),
    },
  });
  res.json(season);
});

router.delete('/seasons/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.pricingSeason.findFirst({
    where: { id: req.params.id, agencyId: req.params.agencyId },
  });
  if (!existing) return res.status(404).json({ error: 'Saison introuvable' });
  await prisma.pricingSeason.delete({ where: { id: req.params.id } });
  res.json({ message: 'Saison supprimée' });
});

// ── Options ───────────────────────────────────────────────────────────────────

router.get('/options', async (req, res) => {
  const options = await prisma.rentalOption.findMany({
    where: { agencyId: req.params.agencyId },
    orderBy: { name: 'asc' },
  });
  res.json(options);
});

router.post('/options', requireAdmin, async (req, res) => {
  const { name, pricePerDay, isActive } = req.body;
  if (!name || pricePerDay == null) {
    return res.status(400).json({ error: 'Nom et prix par jour requis' });
  }
  const option = await prisma.rentalOption.create({
    data: {
      agencyId: req.params.agencyId,
      name: name.trim(),
      pricePerDay: parseFloat(pricePerDay),
      isActive: isActive !== false,
    },
  });
  res.status(201).json(option);
});

router.put('/options/:id', requireAdmin, async (req, res) => {
  const { name, pricePerDay, isActive } = req.body;
  const existing = await prisma.rentalOption.findFirst({
    where: { id: req.params.id, agencyId: req.params.agencyId },
  });
  if (!existing) return res.status(404).json({ error: 'Option introuvable' });

  const option = await prisma.rentalOption.update({
    where: { id: req.params.id },
    data: {
      ...(name != null && { name: name.trim() }),
      ...(pricePerDay != null && { pricePerDay: parseFloat(pricePerDay) }),
      ...(isActive != null && { isActive }),
    },
  });
  res.json(option);
});

router.delete('/options/:id', requireAdmin, async (req, res) => {
  const existing = await prisma.rentalOption.findFirst({
    where: { id: req.params.id, agencyId: req.params.agencyId },
  });
  if (!existing) return res.status(404).json({ error: 'Option introuvable' });
  await prisma.rentalOption.delete({ where: { id: req.params.id } });
  res.json({ message: 'Option supprimée' });
});

module.exports = router;
