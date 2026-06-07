const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

const requestInclude = {
  agency: { select: { id: true, name: true } },
  offers: {
    include: {
      agency: { select: { id: true, name: true } },
      car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
};

// ─── Toggle opt-in ────────────────────────────────────────────────────────────
router.put('/settings', async (req, res) => {
  const { acceptsRentalRequests } = req.body;
  const agency = await prisma.agency.update({
    where: { id: req.params.agencyId },
    data: { acceptsRentalRequests: !!acceptsRentalRequests },
    select: { id: true, acceptsRentalRequests: true },
  });
  res.json(agency);
});

router.get('/settings', async (req, res) => {
  const agency = await prisma.agency.findUnique({
    where: { id: req.params.agencyId },
    select: { acceptsRentalRequests: true },
  });
  res.json(agency);
});

// ─── Stats for sidebar badges ─────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const agencyId = req.params.agencyId;

  const [pendingDecisionsRaw, agency, incomingRaw, myOfferedRequestIds] = await Promise.all([
    // My own OPEN requests that have at least one PENDING offer
    prisma.rentalRequest.findMany({
      where: { agencyId, status: 'OPEN', offers: { some: { status: 'PENDING' } } },
      select: { id: true },
    }),
    prisma.agency.findUnique({ where: { id: agencyId }, select: { acceptsRentalRequests: true } }),
    // All OPEN requests from other agencies
    prisma.rentalRequest.findMany({
      where: { agencyId: { not: agencyId }, status: 'OPEN' },
      select: { id: true },
    }),
    // Requests I've already offered on
    prisma.rentalOffer.findMany({
      where: { agencyId },
      select: { requestId: true },
    }),
  ]);

  const offeredIds = new Set(myOfferedRequestIds.map(o => o.requestId));
  const incomingNotYetAnswered = agency?.acceptsRentalRequests
    ? incomingRaw.filter(r => !offeredIds.has(r.id)).length
    : 0;

  res.json({
    pendingDecisions: pendingDecisionsRaw.length,
    incomingNotAnswered: incomingNotYetAnswered,
  });
});

// ─── Own requests (created by this agency) ────────────────────────────────────
router.get('/', async (req, res) => {
  const requests = await prisma.rentalRequest.findMany({
    where: { agencyId: req.params.agencyId },
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

router.post('/', async (req, res) => {
  const { clientName, phone, startDate, endDate, carType, budget, notes } = req.body;
  if (!clientName || !startDate || !endDate) {
    return res.status(400).json({ error: 'Client, date début et date fin requis' });
  }
  const request = await prisma.rentalRequest.create({
    data: {
      agencyId: req.params.agencyId,
      clientName,
      phone: phone?.trim() || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      carType: carType || null,
      budget: budget ? parseFloat(budget) : null,
      notes: notes || null,
      status: 'OPEN',
    },
    include: requestInclude,
  });
  res.status(201).json(request);
});

router.put('/:requestId', async (req, res) => {
  const { status } = req.body;
  const request = await prisma.rentalRequest.findFirst({
    where: { id: req.params.requestId, agencyId: req.params.agencyId },
  });
  if (!request) return res.status(404).json({ error: 'Demande introuvable' });

  const updated = await prisma.rentalRequest.update({
    where: { id: req.params.requestId },
    data: { status },
    include: requestInclude,
  });
  res.json(updated);
});

router.delete('/:requestId', async (req, res) => {
  const request = await prisma.rentalRequest.findFirst({
    where: { id: req.params.requestId, agencyId: req.params.agencyId },
  });
  if (!request) return res.status(404).json({ error: 'Demande introuvable' });
  await prisma.rentalRequest.update({
    where: { id: req.params.requestId },
    data: { status: 'CANCELLED' },
  });
  res.json({ message: 'Demande annulée' });
});

// ─── Incoming requests (from all other agencies) ──────────────────────────────
router.get('/incoming', async (req, res) => {
  const agency = await prisma.agency.findUnique({
    where: { id: req.params.agencyId },
    select: { acceptsRentalRequests: true },
  });
  if (!agency?.acceptsRentalRequests) {
    return res.json([]);
  }

  const requests = await prisma.rentalRequest.findMany({
    where: {
      agencyId: { not: req.params.agencyId },
      status: 'OPEN',
    },
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// ─── Offers on a request ──────────────────────────────────────────────────────
router.post('/:requestId/offers', async (req, res) => {
  const { carId, price, phone, notes } = req.body;
  if (!price) return res.status(400).json({ error: 'Prix requis' });

  const request = await prisma.rentalRequest.findUnique({ where: { id: req.params.requestId } });
  if (!request || request.status !== 'OPEN') {
    return res.status(400).json({ error: 'Demande non disponible' });
  }
  if (request.agencyId === req.params.agencyId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas répondre à votre propre demande' });
  }

  // Check if already made an offer
  const existing = await prisma.rentalOffer.findFirst({
    where: { requestId: req.params.requestId, agencyId: req.params.agencyId },
  });
  if (existing) {
    // Update the existing offer
    const updated = await prisma.rentalOffer.update({
      where: { id: existing.id },
      data: { carId: carId || null, price: parseFloat(price), phone: phone?.trim() || null, notes: notes || null, status: 'PENDING' },
      include: {
        agency: { select: { id: true, name: true } },
        car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } },
      },
    });
    return res.json(updated);
  }

  const offer = await prisma.rentalOffer.create({
    data: {
      requestId: req.params.requestId,
      agencyId: req.params.agencyId,
      carId: carId || null,
      price: parseFloat(price),
      phone: phone?.trim() || null,
      notes: notes || null,
    },
    include: {
      agency: { select: { id: true, name: true } },
      car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } },
    },
  });
  res.status(201).json(offer);
});

// Accept or reject an offer (only the requesting agency can do this)
router.put('/:requestId/offers/:offerId', async (req, res) => {
  const { status } = req.body; // ACCEPTED or REJECTED

  const request = await prisma.rentalRequest.findFirst({
    where: { id: req.params.requestId, agencyId: req.params.agencyId },
  });
  if (!request) return res.status(403).json({ error: 'Non autorisé' });

  const offer = await prisma.rentalOffer.update({
    where: { id: req.params.offerId },
    data: { status },
    include: {
      agency: { select: { id: true, name: true } },
      car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } },
    },
  });

  // If accepted, close the request and reject other offers
  if (status === 'ACCEPTED') {
    await prisma.rentalRequest.update({
      where: { id: req.params.requestId },
      data: { status: 'FULFILLED' },
    });
    await prisma.rentalOffer.updateMany({
      where: { requestId: req.params.requestId, id: { not: req.params.offerId } },
      data: { status: 'REJECTED' },
    });
  }

  res.json(offer);
});

module.exports = router;
