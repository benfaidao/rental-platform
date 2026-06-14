const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const generateContractPdf = require('../../services/pdf');
const generateInvoicePdf = require('../../services/invoice');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

const generateContractNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `CTR-${year}-${random}`;
};

// Auto-generate period entries for PERIODIC contracts
function generatePeriods(startDate, endDate, periodUnit, amount) {
  const periods = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    const periodStart = new Date(current);
    let periodEnd;
    if (periodUnit === 'WEEK') {
      periodEnd = new Date(current);
      periodEnd.setDate(periodEnd.getDate() + 7);
    } else {
      periodEnd = new Date(current);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    if (periodEnd > end) periodEnd = new Date(end);
    periods.push({ periodStart, periodEnd, amount });
    current = new Date(periodEnd);
  }
  return periods;
}

router.get('/', async (req, res) => {
  const { status, search, clientId, carId, dateFrom, dateTo } = req.query;
  const where = { agencyId: req.params.agencyId };
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (carId) where.carId = carId;
  if (dateFrom || dateTo) {
    where.startDate = {};
    if (dateFrom) where.startDate.gte = new Date(dateFrom);
    if (dateTo) where.startDate.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { contractNumber: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
      { clientPhone: { contains: search, mode: 'insensitive' } },
    ];
  }
  const contracts = await prisma.rentalContract.findMany({
    where,
    include: {
      car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      bookedByAgency: { select: { id: true, name: true } },
      periodicPayments: { orderBy: { periodStart: 'asc' } },
      documents: { where: { type: 'SIGNED_CONTRACT' }, select: { id: true, url: true, filename: true, createdAt: true } },
      photos: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(contracts);
});

router.get('/upcoming', async (req, res) => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const [startingSoon, endingSoon] = await Promise.all([
    prisma.rentalContract.findMany({
      where: {
        agencyId: req.params.agencyId,
        status: 'PENDING',
        startDate: { gte: today, lte: nextWeek },
      },
      include: { car: true },
    }),
    prisma.rentalContract.findMany({
      where: {
        agencyId: req.params.agencyId,
        status: 'ACTIVE',
        endDate: { gte: today, lte: nextWeek },
      },
      include: { car: true },
    }),
  ]);

  res.json({ startingSoon, endingSoon });
});

// ── Periodic payments CRUD (before /:contractId) ──────────────────────────────
router.get('/:contractId/payments', async (req, res) => {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: req.params.contractId, agencyId: req.params.agencyId },
  });
  if (!contract) return res.status(404).json({ error: 'Contrat non trouvé' });

  const payments = await prisma.periodicPayment.findMany({
    where: { contractId: req.params.contractId },
    orderBy: { periodStart: 'asc' },
  });
  res.json(payments);
});

router.post('/:contractId/payments', async (req, res) => {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: req.params.contractId, agencyId: req.params.agencyId },
  });
  if (!contract) return res.status(404).json({ error: 'Contrat non trouvé' });

  const { periodStart, periodEnd, amount, paidAt, notes } = req.body;
  const payment = await prisma.periodicPayment.create({
    data: {
      contractId: req.params.contractId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      amount: parseFloat(amount),
      paidAt: paidAt ? new Date(paidAt) : null,
      notes: notes || null,
    },
  });
  res.status(201).json(payment);
});

router.put('/:contractId/payments/:paymentId', async (req, res) => {
  const { paidAt, amount, notes } = req.body;
  const payment = await prisma.periodicPayment.update({
    where: { id: req.params.paymentId },
    data: {
      paidAt: paidAt !== undefined ? (paidAt ? new Date(paidAt) : null) : undefined,
      amount: amount !== undefined ? parseFloat(amount) : undefined,
      notes: notes !== undefined ? notes : undefined,
    },
  });
  res.json(payment);
});

router.delete('/:contractId/payments/:paymentId', async (req, res) => {
  await prisma.periodicPayment.delete({ where: { id: req.params.paymentId } });
  res.json({ message: 'Période supprimée' });
});

router.get('/:contractId', async (req, res) => {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: req.params.contractId, agencyId: req.params.agencyId },
    include: {
      car: true,
      photos: true,
      documents: true,
      periodicPayments: { orderBy: { periodStart: 'asc' } },
    },
  });
  if (!contract) return res.status(404).json({ error: 'Contrat non trouvé' });
  res.json(contract);
});

router.post('/', async (req, res) => {
  const {
    carId, clientId, clientName, clientPhone, clientEmail, clientIdNumber, clientIdExpiry, clientAddress,
    startDate, endDate, rentalAmount, guaranteeAmount, guaranteeCollectedAmount, currency, guaranteeCheck,
    guaranteeCheckNumber, guaranteeCheckAmount, isSubRental, subrenterName, startMileage, notes, amountPaid,
    collectedBy, collectedAt, montantTTC,
    rentalType, periodUnit, intervalType, allowOverage,
    startTime, endTime, pickupLocation, dropoffLocation,
    clientLicenseNumber, clientLicenseExpiry,
    secondDriverName, secondDriverIdNumber, secondDriverIdExpiry,
    secondDriverLicense, secondDriverLicenseExpiry,
  } = req.body;

  if (!carId || !clientName || !startDate || !endDate || !rentalAmount) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }

  let resolvedClientId = clientId || null;
  if (!resolvedClientId && clientName) {
    const parts = clientName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || parts[0];
    let existingClient = null;
    if (clientPhone) {
      existingClient = await prisma.client.findFirst({
        where: { agencyId: req.params.agencyId, phone: clientPhone },
      });
    }
    if (!existingClient) {
      existingClient = await prisma.client.findFirst({
        where: {
          agencyId: req.params.agencyId,
          firstName: { equals: firstName, mode: 'insensitive' },
          lastName: { equals: lastName, mode: 'insensitive' },
        },
      });
    }
    if (existingClient) {
      resolvedClientId = existingClient.id;
    } else {
      const newClient = await prisma.client.create({
        data: {
          agencyId: req.params.agencyId,
          firstName,
          lastName,
          phone: clientPhone || null,
          email: clientEmail || null,
          address: clientAddress || null,
          idNumber: clientIdNumber || null,
        },
      });
      resolvedClientId = newClient.id;
    }
  }

  let contractNumber;
  let attempts = 0;
  do {
    contractNumber = generateContractNumber();
    attempts++;
  } while (await prisma.rentalContract.findUnique({ where: { contractNumber } }) && attempts < 10);

  const resolvedRentalType = rentalType || 'STANDARD';
  const resolvedIntervalType = intervalType || 'CLOSED';

  const contract = await prisma.rentalContract.create({
    data: {
      contractNumber,
      agencyId: req.params.agencyId,
      carId,
      clientName,
      clientPhone,
      clientEmail,
      clientIdNumber,
      clientIdExpiry: clientIdExpiry ? new Date(clientIdExpiry) : null,
      clientAddress,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rentalAmount: parseFloat(rentalAmount),
      guaranteeAmount: parseFloat(guaranteeAmount || 0),
      guaranteeCollectedAmount: guaranteeCollectedAmount ? parseFloat(guaranteeCollectedAmount) : null,
      currency: currency || 'MAD',
      guaranteeCheck: !!guaranteeCheck,
      guaranteeCheckNumber: guaranteeCheckNumber || null,
      guaranteeCheckAmount: guaranteeCheckAmount ? parseFloat(guaranteeCheckAmount) : null,
      isSubRental: !!isSubRental,
      subrenterName,
      startMileage: startMileage ? parseInt(startMileage) : null,
      notes,
      clientId: resolvedClientId,
      status: 'PENDING',
      amountPaid: amountPaid ? parseFloat(amountPaid) : 0,
      collectedBy: collectedBy?.trim() || null,
      collectedAt: collectedAt ? new Date(collectedAt) : null,
      montantTTC: montantTTC ? parseFloat(montantTTC) : null,
      rentalType: resolvedRentalType,
      periodUnit: resolvedRentalType === 'PERIODIC' ? (periodUnit || 'MONTH') : null,
      intervalType: resolvedIntervalType,
      allowOverage: !!allowOverage,
      startTime: startTime || null,
      endTime: endTime || null,
      pickupLocation: pickupLocation || null,
      dropoffLocation: dropoffLocation || null,
      clientLicenseNumber: clientLicenseNumber || null,
      clientLicenseExpiry: clientLicenseExpiry ? new Date(clientLicenseExpiry) : null,
      secondDriverName: secondDriverName || null,
      secondDriverIdNumber: secondDriverIdNumber || null,
      secondDriverIdExpiry: secondDriverIdExpiry ? new Date(secondDriverIdExpiry) : null,
      secondDriverLicense: secondDriverLicense || null,
      secondDriverLicenseExpiry: secondDriverLicenseExpiry ? new Date(secondDriverLicenseExpiry) : null,
    },
    include: { car: true },
  });

  // Auto-generate periods for PERIODIC contracts
  if (resolvedRentalType === 'PERIODIC' && periodUnit) {
    const periods = generatePeriods(startDate, endDate, periodUnit, parseFloat(rentalAmount));
    if (periods.length > 0) {
      await prisma.periodicPayment.createMany({
        data: periods.map(p => ({ ...p, contractId: contract.id })),
      });
    }
  }

  res.status(201).json(contract);
});

router.put('/:contractId', async (req, res) => {
  const {
    clientName, clientPhone, clientEmail, clientIdNumber, clientIdExpiry, clientAddress,
    startDate, endDate, rentalAmount, guaranteeAmount, guaranteeCollectedAmount, currency, guaranteeCheck,
    guaranteeCheckNumber, guaranteeCheckAmount, isSubRental, subrenterName, status, startMileage,
    endMileage, notes, amountPaid, collectedBy, collectedAt, montantTTC, intervalType, allowOverage,
    startTime, endTime, pickupLocation, dropoffLocation,
    clientLicenseNumber, clientLicenseExpiry,
    secondDriverName, secondDriverIdNumber, secondDriverIdExpiry,
    secondDriverLicense, secondDriverLicenseExpiry,
  } = req.body;

  let resolvedStatus = status;
  if (!resolvedStatus && amountPaid !== undefined) {
    const existing = await prisma.rentalContract.findUnique({ where: { id: req.params.contractId }, select: { status: true } });
    if (existing?.status === 'RESERVATION' && parseFloat(amountPaid) > 0) {
      resolvedStatus = 'RESERVATION_CONFIRMED';
    }
  }

  const contract = await prisma.rentalContract.update({
    where: { id: req.params.contractId },
    data: {
      clientName, clientPhone, clientEmail, clientIdNumber, clientAddress,
      clientIdExpiry: clientIdExpiry !== undefined ? (clientIdExpiry ? new Date(clientIdExpiry) : null) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      rentalAmount: rentalAmount ? parseFloat(rentalAmount) : undefined,
      guaranteeAmount: guaranteeAmount !== undefined ? parseFloat(guaranteeAmount) : undefined,
      guaranteeCollectedAmount: guaranteeCollectedAmount !== undefined ? (guaranteeCollectedAmount ? parseFloat(guaranteeCollectedAmount) : null) : undefined,
      currency, guaranteeCheck,
      guaranteeCheckNumber: guaranteeCheckNumber !== undefined ? (guaranteeCheckNumber || null) : undefined,
      guaranteeCheckAmount: guaranteeCheckAmount !== undefined ? (guaranteeCheckAmount ? parseFloat(guaranteeCheckAmount) : null) : undefined,
      isSubRental, subrenterName, status: resolvedStatus,
      startMileage: startMileage ? parseInt(startMileage) : undefined,
      endMileage: endMileage ? parseInt(endMileage) : undefined,
      notes,
      amountPaid: amountPaid !== undefined ? parseFloat(amountPaid) : undefined,
      collectedBy: collectedBy !== undefined ? (collectedBy?.trim() || null) : undefined,
      collectedAt: collectedAt !== undefined ? (collectedAt ? new Date(collectedAt) : null) : undefined,
      montantTTC: montantTTC !== undefined ? (montantTTC ? parseFloat(montantTTC) : null) : undefined,
      intervalType: intervalType || undefined,
      allowOverage: allowOverage !== undefined ? !!allowOverage : undefined,
      startTime: startTime !== undefined ? (startTime || null) : undefined,
      endTime: endTime !== undefined ? (endTime || null) : undefined,
      pickupLocation: pickupLocation !== undefined ? (pickupLocation || null) : undefined,
      dropoffLocation: dropoffLocation !== undefined ? (dropoffLocation || null) : undefined,
      clientLicenseNumber: clientLicenseNumber !== undefined ? (clientLicenseNumber || null) : undefined,
      clientLicenseExpiry: clientLicenseExpiry !== undefined ? (clientLicenseExpiry ? new Date(clientLicenseExpiry) : null) : undefined,
      secondDriverName: secondDriverName !== undefined ? (secondDriverName || null) : undefined,
      secondDriverIdNumber: secondDriverIdNumber !== undefined ? (secondDriverIdNumber || null) : undefined,
      secondDriverIdExpiry: secondDriverIdExpiry !== undefined ? (secondDriverIdExpiry ? new Date(secondDriverIdExpiry) : null) : undefined,
      secondDriverLicense: secondDriverLicense !== undefined ? (secondDriverLicense || null) : undefined,
      secondDriverLicenseExpiry: secondDriverLicenseExpiry !== undefined ? (secondDriverLicenseExpiry ? new Date(secondDriverLicenseExpiry) : null) : undefined,
    },
    include: { car: true },
  });

  if (contract.status === 'ACTIVE') {
    await prisma.car.update({ where: { id: contract.carId }, data: { status: 'RENTED' } });
  } else if (contract.status === 'COMPLETED' || contract.status === 'CANCELLED') {
    await prisma.car.update({ where: { id: contract.carId }, data: { status: 'AVAILABLE' } });
  }

  res.json(contract);
});

router.delete('/:contractId', async (req, res) => {
  await prisma.rentalContract.delete({ where: { id: req.params.contractId } });
  res.json({ message: 'Contrat supprimé' });
});

router.get('/:contractId/pdf', async (req, res) => {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: req.params.contractId, agencyId: req.params.agencyId },
    include: {
      car: true,
      agency: true,
      periodicPayments: { orderBy: { periodStart: 'asc' } },
    },
  });
  if (!contract) return res.status(404).json({ error: 'Contrat non trouvé' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="contrat-${contract.contractNumber}.pdf"`);
  await generateContractPdf(contract, res);
});

router.post('/:contractId/pdf', async (req, res) => {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: req.params.contractId, agencyId: req.params.agencyId },
    include: { car: true, agency: true, periodicPayments: { orderBy: { periodStart: 'asc' } } },
  });
  if (!contract) return res.status(404).json({ error: 'Contrat non trouvé' });
  const { signatureClient, signatureDriver2, signatureAgency } = req.body;
  const signatures = { client: signatureClient, driver2: signatureDriver2, agency: signatureAgency };
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="contrat-${contract.contractNumber}.pdf"`);
  await generateContractPdf(contract, res, signatures);
});

router.get('/:contractId/invoice', async (req, res) => {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: req.params.contractId, agencyId: req.params.agencyId },
    include: { car: true, agency: true },
  });
  if (!contract) return res.status(404).json({ error: 'Contrat non trouvé' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="facture-${contract.contractNumber}.pdf"`);
  await generateInvoicePdf(contract, res);
});

router.post('/:contractId/invoice', async (req, res) => {
  const contract = await prisma.rentalContract.findFirst({
    where: { id: req.params.contractId, agencyId: req.params.agencyId },
    include: { car: true, agency: true },
  });
  if (!contract) return res.status(404).json({ error: 'Contrat non trouvé' });
  const { signatureClient } = req.body;
  const signatures = { client: signatureClient };
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="facture-${contract.contractNumber}.pdf"`);
  await generateInvoicePdf(contract, res, signatures);
});

router.post('/:contractId/photos', upload.array('photos', 10), async (req, res) => {
  const { type } = req.body;
  if (!req.files?.length) return res.status(400).json({ error: 'Photos requises' });

  const photos = await prisma.$transaction(
    req.files.map(file =>
      prisma.contractPhoto.create({
        data: {
          contractId: req.params.contractId,
          type: type || 'START',
          filename: file.originalname,
          url: `/agencies/${req.params.agencyId}/files/${file.filename}`,
        },
      })
    )
  );
  res.status(201).json(photos);
});

router.post('/:contractId/documents', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier requis' });
  const { notes, type } = req.body;
  const doc = await prisma.contractDocument.create({
    data: {
      contractId: req.params.contractId,
      filename: req.file.originalname,
      url: `/agencies/${req.params.agencyId}/files/${req.file.filename}`,
      type: type || 'OTHER',
      notes: notes || null,
    },
  });
  res.status(201).json(doc);
});

router.delete('/:contractId/documents/:documentId', async (req, res) => {
  await prisma.contractDocument.delete({ where: { id: req.params.documentId } });
  res.json({ message: 'Document supprimé' });
});

module.exports = router;
