const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

const generateContractNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `CTR-${year}-${random}`;
};

// GET available cars from partner agencies (respecting accessType ALL vs SPECIFIC)
router.get('/cars', async (req, res) => {
  const { search } = req.query;
  const agencyId = req.params.agencyId;

  const accesses = await prisma.agencyAccess.findMany({
    where: { receiverAgencyId: agencyId, accessType: { not: 'BLOCKED' } },
    include: {
      giverAgency: { select: { id: true, name: true } },
      carAccesses: { select: { carId: true } },
    },
  });

  if (!accesses.length) return res.json([]);

  // Build allowed car ID sets per access type
  const allAccessGivers = accesses.filter(a => a.accessType === 'ALL').map(a => a.giverAgencyId);
  const specificCarIds = accesses
    .filter(a => a.accessType === 'SPECIFIC')
    .flatMap(a => a.carAccesses.map(ca => ca.carId));

  const agencyMap = Object.fromEntries(accesses.map(a => [a.giverAgencyId, a.giverAgency]));

  const baseWhere = { status: 'AVAILABLE', isActive: true };
  if (search) {
    baseWhere.OR = [
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
      { finalPlate: { contains: search, mode: 'insensitive' } },
      { wwPlate: { contains: search, mode: 'insensitive' } },
    ];
  }

  const orClauses = [];
  if (allAccessGivers.length) orClauses.push({ agencyId: { in: allAccessGivers } });
  if (specificCarIds.length) orClauses.push({ id: { in: specificCarIds } });

  if (!orClauses.length) return res.json([]);

  const cars = await prisma.car.findMany({
    where: { ...baseWhere, OR: orClauses },
    orderBy: [{ agencyId: 'asc' }, { brand: 'asc' }],
  });

  res.json(cars.map(c => ({ ...c, ownerAgency: agencyMap[c.agencyId] || null })));
});

// GET bookings this agency made on partner cars
router.get('/bookings', async (req, res) => {
  const { status } = req.query;
  const where = { bookedByAgencyId: req.params.agencyId };
  if (status) where.status = status;

  const bookings = await prisma.rentalContract.findMany({
    where,
    include: {
      car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } },
      agency: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(bookings);
});

// POST book a car from a partner agency
router.post('/book', async (req, res) => {
  const {
    carId, clientName, clientPhone, clientEmail, clientIdNumber, clientAddress,
    startDate, endDate, rentalAmount, guaranteeAmount, currency,
    guaranteeCheck, guaranteeCheckNumber, startMileage, notes, amountPaid,
  } = req.body;

  if (!carId || !clientName || !startDate || !endDate || !rentalAmount) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car) return res.status(404).json({ error: 'Voiture introuvable' });
  if (car.status !== 'AVAILABLE') return res.status(400).json({ error: 'Voiture non disponible' });

  // Verify access: car owner gave access to booking agency (and not BLOCKED)
  const access = await prisma.agencyAccess.findFirst({
    where: { giverAgencyId: car.agencyId, receiverAgencyId: req.params.agencyId },
    include: { receiverAgency: { select: { name: true } } },
  });
  if (!access) return res.status(403).json({ error: 'Accès non autorisé pour cette voiture' });
  if (access.accessType === 'BLOCKED') return res.status(403).json({ error: 'Accès bloqué par cette agence' });
  const bookingAgencyName = access.receiverAgency?.name || null;

  // Check for date conflicts
  const conflict = await prisma.rentalContract.findFirst({
    where: {
      carId,
      status: { in: ['ACTIVE', 'PENDING'] },
      OR: [
        { startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } },
      ],
    },
  });
  if (conflict) return res.status(409).json({ error: 'La voiture est déjà réservée sur cette période' });

  let contractNumber;
  let attempts = 0;
  do {
    contractNumber = generateContractNumber();
    attempts++;
  } while (await prisma.rentalContract.findUnique({ where: { contractNumber } }) && attempts < 10);

  const contract = await prisma.rentalContract.create({
    data: {
      contractNumber,
      agencyId: car.agencyId,
      carId,
      clientName,
      clientPhone,
      clientEmail,
      clientIdNumber,
      clientAddress,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rentalAmount: parseFloat(rentalAmount),
      guaranteeAmount: parseFloat(guaranteeAmount || 0),
      currency: currency || 'MAD',
      guaranteeCheck: !!guaranteeCheck,
      guaranteeCheckNumber,
      isSubRental: true,
      subrenterName: bookingAgencyName,
      startMileage: startMileage ? parseInt(startMileage) : null,
      notes,
      status: 'PENDING',
      bookedByAgencyId: req.params.agencyId,
      amountPaid: amountPaid ? parseFloat(amountPaid) : 0,
    },
    include: {
      car: { select: { id: true, brand: true, model: true, finalPlate: true } },
      agency: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(contract);
});

// DELETE cancel a booking made by this agency
router.delete('/bookings/:contractId', async (req, res) => {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: req.params.contractId, bookedByAgencyId: req.params.agencyId },
  });
  if (!contract) return res.status(404).json({ error: 'Réservation introuvable' });
  if (contract.status === 'ACTIVE') return res.status(400).json({ error: 'Impossible d\'annuler un contrat actif' });

  await prisma.rentalContract.update({
    where: { id: contract.id },
    data: { status: 'CANCELLED' },
  });
  res.json({ message: 'Réservation annulée' });
});

// GET available cars (own + partner) for a date range
router.get('/availability', async (req, res) => {
  const { startDate, endDate } = req.query;
  const agencyId = req.params.agencyId;

  if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises' });

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Find all cars booked or manually unavailable in this period
  const [bookedContracts, unavails] = await Promise.all([
    prisma.rentalContract.findMany({
      where: { status: { in: ['ACTIVE', 'PENDING'] }, startDate: { lte: end }, endDate: { gte: start } },
      select: { carId: true },
    }),
    prisma.carUnavailability.findMany({
      where: { startDate: { lte: end }, endDate: { gte: start } },
      select: { carId: true },
    }),
  ]);
  const bookedCarIds = [...new Set([
    ...bookedContracts.map(c => c.carId),
    ...unavails.map(u => u.carId),
  ])];

  // Own available cars
  const ownCars = await prisma.car.findMany({
    where: { agencyId, isActive: true, id: { notIn: bookedCarIds } },
    orderBy: [{ brand: 'asc' }, { model: 'asc' }],
  });

  // Partner accesses (excluding BLOCKED)
  const accesses = await prisma.agencyAccess.findMany({
    where: { receiverAgencyId: agencyId, accessType: { not: 'BLOCKED' } },
    include: {
      giverAgency: { select: { id: true, name: true } },
      carAccesses: { select: { carId: true } },
    },
  });

  const allAccessGivers = accesses.filter(a => a.accessType === 'ALL').map(a => a.giverAgencyId);
  const specificCarIds = accesses
    .filter(a => a.accessType === 'SPECIFIC')
    .flatMap(a => a.carAccesses.map(ca => ca.carId));
  const agencyMap = Object.fromEntries(accesses.map(a => [a.giverAgencyId, a.giverAgency]));

  const orClauses = [];
  if (allAccessGivers.length) orClauses.push({ agencyId: { in: allAccessGivers } });
  if (specificCarIds.length) orClauses.push({ id: { in: specificCarIds } });

  let partnerCars = [];
  if (orClauses.length) {
    partnerCars = await prisma.car.findMany({
      where: { isActive: true, id: { notIn: bookedCarIds }, OR: orClauses },
      orderBy: [{ agencyId: 'asc' }, { brand: 'asc' }],
    });
  }

  res.json({
    ownCars,
    partnerCars: partnerCars.map(c => ({ ...c, ownerAgency: agencyMap[c.agencyId] || null })),
  });
});

module.exports = router;
