const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { compressUploads } = require('../../middleware/upload');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

router.get('/', async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const soonEnd = new Date(todayStart); soonEnd.setDate(soonEnd.getDate() + 3);

  const cars = await prisma.car.findMany({
    where: { agencyId: req.params.agencyId, isActive: true },
    include: {
      _count: { select: { contracts: true, oilChanges: true, repairs: true } },
      oilChangeConfig: true,
      contracts: {
        where: {
          OR: [
            { status: 'ACTIVE', startDate: { lte: todayEnd }, endDate: { gte: todayStart } },
            { status: { in: ['PENDING', 'RESERVATION', 'RESERVATION_CONFIRMED'] }, startDate: { lte: soonEnd }, endDate: { gte: todayStart } },
          ],
        },
        select: { id: true, status: true, startDate: true, endDate: true },
      },
      documents: {
        where: { type: 'PHOTO' },
        orderBy: [{ isMainPhoto: 'desc' }, { createdAt: 'desc' }],
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = cars.map(({ contracts, documents, ...car }) => {
    let displayStatus;
    if (car.status === 'MAINTENANCE') {
      displayStatus = 'ENTRETIEN';
    } else if (car.status === 'INACTIVE') {
      displayStatus = 'HORS_SERVICE';
    } else {
      const rentedNow = contracts.some(c =>
        c.status === 'ACTIVE' && new Date(c.startDate) <= now && new Date(c.endDate) >= now
      );
      const upcomingSoon = contracts.some(c =>
        ['PENDING', 'RESERVATION', 'RESERVATION_CONFIRMED'].includes(c.status) && new Date(c.startDate) <= soonEnd
      );
      if (rentedNow) displayStatus = 'LOUE';
      else if (upcomingSoon) displayStatus = 'EN_ATTENTE_LIVRAISON';
      else displayStatus = 'DISPONIBLE';
    }
    return { ...car, displayStatus, mainPhotoUrl: documents[0]?.url || null };
  });

  res.json(result);
});

// Calendar: returns all cars with their contracts for a date range
router.get('/calendar', async (req, res) => {
  const { year, month, includePartners } = req.query;
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;

  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0, 23, 59, 59);

  const ownCars = await prisma.car.findMany({
    where: { agencyId: req.params.agencyId, isActive: true },
    select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true, status: true, agencyId: true },
    orderBy: { brand: 'asc' },
  });

  let allCars = ownCars.map(c => ({ ...c, isPartner: false, ownerAgency: null }));

  if (includePartners === 'true') {
    const accesses = await prisma.agencyAccess.findMany({
      where: { receiverAgencyId: req.params.agencyId },
      include: {
        giverAgency: { select: { id: true, name: true } },
        carAccesses: { select: { carId: true } },
      },
    });

    const allAccessGivers = accesses.filter(a => a.accessType === 'ALL').map(a => a.giverAgencyId);
    const specificCarIds = accesses.filter(a => a.accessType === 'SPECIFIC').flatMap(a => a.carAccesses.map(ca => ca.carId));
    const agencyMap = Object.fromEntries(accesses.map(a => [a.giverAgencyId, a.giverAgency]));

    const orClauses = [];
    if (allAccessGivers.length) orClauses.push({ agencyId: { in: allAccessGivers } });
    if (specificCarIds.length) orClauses.push({ id: { in: specificCarIds } });

    if (orClauses.length) {
      const partnerCars = await prisma.car.findMany({
        where: { isActive: true, OR: orClauses },
        select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true, status: true, agencyId: true },
        orderBy: { brand: 'asc' },
      });
      allCars = [
        ...allCars,
        ...partnerCars.map(c => ({ ...c, isPartner: true, ownerAgency: agencyMap[c.agencyId] || null })),
      ];
    }
  }

  const allCarIds = allCars.map(c => c.id);

  const contracts = await prisma.rentalContract.findMany({
    where: {
      carId: { in: allCarIds },
      status: { in: ['PENDING', 'RESERVATION', 'RESERVATION_CONFIRMED', 'ACTIVE', 'COMPLETED'] },
      startDate: { lte: to },
      endDate: { gte: from },
    },
    select: {
      id: true, carId: true, contractNumber: true,
      clientName: true, startDate: true, endDate: true,
      status: true, rentalAmount: true,
      bookedByAgency: { select: { id: true, name: true } },
    },
  });

  const contractsBycar = contracts.reduce((acc, c) => {
    if (!acc[c.carId]) acc[c.carId] = [];
    acc[c.carId].push(c);
    return acc;
  }, {});

  // Include unavailabilities for own cars
  const ownCarIds = ownCars.map(c => c.id);
  const unavailabilities = await prisma.carUnavailability.findMany({
    where: { carId: { in: ownCarIds }, startDate: { lte: to }, endDate: { gte: from } },
    select: { id: true, carId: true, startDate: true, endDate: true, reason: true },
  });
  const unavailsBycar = unavailabilities.reduce((acc, u) => {
    if (!acc[u.carId]) acc[u.carId] = [];
    acc[u.carId].push(u);
    return acc;
  }, {});

  res.json({
    year: y, month: m,
    cars: allCars.map(car => ({
      ...car,
      contracts: contractsBycar[car.id] || [],
      unavailabilities: unavailsBycar[car.id] || [],
    })),
  });
});

// ─── Own-car availability by date range (must be before /:carId) ──────────────
router.get('/availability', async (req, res) => {
  const { startDate, endDate } = req.query;
  const agencyId = req.params.agencyId;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises' });

  const start = new Date(startDate);
  const end = new Date(endDate);

  const [bookedContracts, unavails] = await Promise.all([
    prisma.rentalContract.findMany({
      where: { agencyId, status: { in: ['ACTIVE', 'PENDING', 'RESERVATION', 'RESERVATION_CONFIRMED'] }, startDate: { lte: end }, endDate: { gte: start } },
      select: { carId: true },
    }),
    prisma.carUnavailability.findMany({
      where: { car: { agencyId }, startDate: { lte: end }, endDate: { gte: start } },
      select: { carId: true },
    }),
  ]);

  const unavailableIds = new Set([
    ...bookedContracts.map(c => c.carId),
    ...unavails.map(u => u.carId),
  ]);

  const cars = await prisma.car.findMany({
    where: { agencyId, isActive: true, id: { notIn: [...unavailableIds] } },
    select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true, color: true, fuelType: true },
    orderBy: [{ brand: 'asc' }, { model: 'asc' }],
  });

  res.json(cars);
});

router.get('/external', async (req, res) => {
  const access = await prisma.agencyAccess.findMany({
    where: { receiverAgencyId: req.params.agencyId },
    select: { giverAgencyId: true },
  });
  const agencyIds = access.map(a => a.giverAgencyId);
  const cars = await prisma.car.findMany({
    where: { agencyId: { in: agencyIds }, isActive: true, status: 'AVAILABLE' },
    include: { agency: { select: { id: true, name: true } } },
  });
  res.json(cars);
});

router.get('/:carId', async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const soonEnd = new Date(todayStart); soonEnd.setDate(soonEnd.getDate() + 3);
  const car = await prisma.car.findFirst({
    where: { id: req.params.carId, agencyId: req.params.agencyId },
    include: {
      documents: true,
      oilChanges: { orderBy: { date: 'desc' }, take: 5 },
      repairs: { orderBy: { date: 'desc' }, take: 5, include: { photos: true } },
      tireRecords: { orderBy: { date: 'desc' }, take: 5 },
      oilChangeConfig: true,
      unavailabilities: { orderBy: { startDate: 'asc' } },
      contracts: {
        orderBy: { startDate: 'desc' },
        select: {
          id: true, contractNumber: true, clientName: true, status: true,
          startDate: true, endDate: true, rentalAmount: true, montantTTC: true,
          amountPaid: true,
        },
      },
    },
  });
  if (!car) return res.status(404).json({ error: 'Véhicule non trouvé' });

  const { contracts, ...rest } = car;
  const completedRentals = contracts.filter(c =>
    c.status === 'COMPLETED' || (c.status === 'ACTIVE' && new Date(c.endDate) < now)
  );
  const upcomingReservations = contracts.filter(c =>
    ['PENDING', 'RESERVATION', 'RESERVATION_CONFIRMED'].includes(c.status) || (c.status === 'ACTIVE' && new Date(c.startDate) > now)
  );
  const activeRental = contracts.find(c => c.status === 'ACTIVE' && new Date(c.startDate) <= now && new Date(c.endDate) >= now) || null;

  let displayStatus;
  if (rest.status === 'MAINTENANCE') {
    displayStatus = 'ENTRETIEN';
  } else if (rest.status === 'INACTIVE') {
    displayStatus = 'HORS_SERVICE';
  } else if (activeRental) {
    displayStatus = 'LOUE';
  } else if (contracts.some(c => ['PENDING', 'RESERVATION', 'RESERVATION_CONFIRMED'].includes(c.status) && new Date(c.startDate) <= soonEnd)) {
    displayStatus = 'EN_ATTENTE_LIVRAISON';
  } else {
    displayStatus = 'DISPONIBLE';
  }

  res.json({ ...rest, displayStatus, completedRentals, upcomingReservations, activeRental });
});

router.post('/', async (req, res) => {
  const {
    wwPlate, finalPlate, brand, model, year, color, fuelType, mileage,
    authorizationDate, firstCirculationDate, lastTechnicalInspection, nextTechnicalInspection,
    insuranceExpiry, circulationAuthExpiry, notes, purchasePrice, purchaseDate,
    rentalPriceTTC, transmission, fiscalPower,
    chassisNumber, cylindersCount, vehicleType, genre,
  } = req.body;
  if (!brand || !model) return res.status(400).json({ error: 'Marque et modèle requis' });

  const car = await prisma.car.create({
    data: {
      agencyId: req.params.agencyId,
      wwPlate, finalPlate, brand, model,
      year: year ? parseInt(year) : null,
      color, fuelType,
      mileage: mileage ? parseInt(mileage) : null,
      authorizationDate: authorizationDate ? new Date(authorizationDate) : null,
      firstCirculationDate: firstCirculationDate ? new Date(firstCirculationDate) : null,
      lastTechnicalInspection: lastTechnicalInspection ? new Date(lastTechnicalInspection) : null,
      nextTechnicalInspection: nextTechnicalInspection ? new Date(nextTechnicalInspection) : null,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      circulationAuthExpiry: circulationAuthExpiry ? new Date(circulationAuthExpiry) : null,
      notes,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      rentalPriceTTC: rentalPriceTTC ? parseFloat(rentalPriceTTC) : null,
      transmission: transmission || null,
      fiscalPower: fiscalPower ? parseInt(fiscalPower) : null,
      chassisNumber: chassisNumber || null,
      cylindersCount: cylindersCount ? parseInt(cylindersCount) : null,
      vehicleType: vehicleType || null,
      genre: genre || null,
    },
  });
  res.status(201).json(car);
});

router.put('/:carId', async (req, res) => {
  const {
    wwPlate, finalPlate, brand, model, year, color, fuelType, mileage, status,
    authorizationDate, firstCirculationDate, lastTechnicalInspection, nextTechnicalInspection,
    insuranceExpiry, circulationAuthExpiry, notes, isActive, purchasePrice, purchaseDate,
    rentalPriceTTC, transmission, fiscalPower,
    chassisNumber, cylindersCount, vehicleType, genre,
  } = req.body;

  const car = await prisma.car.update({
    where: { id: req.params.carId },
    data: {
      wwPlate, finalPlate, brand, model,
      year: year ? parseInt(year) : undefined,
      color, fuelType, status,
      mileage: mileage ? parseInt(mileage) : undefined,
      authorizationDate: authorizationDate ? new Date(authorizationDate) : undefined,
      firstCirculationDate: firstCirculationDate ? new Date(firstCirculationDate) : undefined,
      lastTechnicalInspection: lastTechnicalInspection ? new Date(lastTechnicalInspection) : undefined,
      nextTechnicalInspection: nextTechnicalInspection ? new Date(nextTechnicalInspection) : undefined,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
      circulationAuthExpiry: circulationAuthExpiry ? new Date(circulationAuthExpiry) : undefined,
      notes, isActive,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      rentalPriceTTC: rentalPriceTTC !== undefined ? (rentalPriceTTC ? parseFloat(rentalPriceTTC) : null) : undefined,
      transmission: transmission !== undefined ? (transmission || null) : undefined,
      fiscalPower: fiscalPower !== undefined ? (fiscalPower ? parseInt(fiscalPower) : null) : undefined,
      chassisNumber: chassisNumber !== undefined ? (chassisNumber || null) : undefined,
      cylindersCount: cylindersCount !== undefined ? (cylindersCount ? parseInt(cylindersCount) : null) : undefined,
      vehicleType: vehicleType !== undefined ? (vehicleType || null) : undefined,
      genre: genre !== undefined ? (genre || null) : undefined,
    },
  });
  res.json(car);
});

router.delete('/:carId', async (req, res) => {
  await prisma.car.update({
    where: { id: req.params.carId },
    data: { isActive: false },
  });
  res.json({ message: 'Véhicule désactivé' });
});

router.get('/:carId/documents', async (req, res) => {
  const docs = await prisma.carDocument.findMany({
    where: { carId: req.params.carId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(docs);
});

router.post('/:carId/documents', upload.single('file'), compressUploads, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier requis' });
  const { type, notes, isMainPhoto } = req.body;
  const url = `/agencies/${req.params.agencyId}/files/${req.file.filename}`;
  const isMain = type === 'PHOTO' && isMainPhoto === 'true';
  if (isMain) {
    await prisma.carDocument.updateMany({
      where: { carId: req.params.carId, type: 'PHOTO' },
      data: { isMainPhoto: false },
    });
  }
  const doc = await prisma.carDocument.create({
    data: {
      carId: req.params.carId,
      type: type || 'OTHER',
      filename: req.file.originalname,
      url,
      notes,
      isMainPhoto: isMain,
    },
  });
  res.status(201).json(doc);
});

router.put('/:carId/documents/:docId/main', async (req, res) => {
  await prisma.carDocument.updateMany({
    where: { carId: req.params.carId, type: 'PHOTO' },
    data: { isMainPhoto: false },
  });
  const doc = await prisma.carDocument.update({
    where: { id: req.params.docId },
    data: { isMainPhoto: true },
  });
  res.json(doc);
});

router.delete('/:carId/documents/:docId', async (req, res) => {
  await prisma.carDocument.delete({ where: { id: req.params.docId } });
  res.json({ message: 'Document supprimé' });
});

// ─── Car unavailabilities ─────────────────────────────────────────────────────

router.get('/:carId/unavailabilities', async (req, res) => {
  const items = await prisma.carUnavailability.findMany({
    where: { carId: req.params.carId },
    orderBy: { startDate: 'asc' },
  });
  res.json(items);
});

router.post('/:carId/unavailabilities', async (req, res) => {
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate) return res.status(400).json({ error: 'Dates requises' });

  const item = await prisma.carUnavailability.create({
    data: {
      carId: req.params.carId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || null,
    },
  });
  res.status(201).json(item);
});

router.delete('/:carId/unavailabilities/:id', async (req, res) => {
  await prisma.carUnavailability.delete({ where: { id: req.params.id } });
  res.json({ message: 'Indisponibilité supprimée' });
});

module.exports = router;
