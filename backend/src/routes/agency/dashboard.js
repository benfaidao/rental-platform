const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

router.get('/', async (req, res) => {
  const agencyId = req.params.agencyId;
  const today = new Date();
  const in3days = new Date(); in3days.setDate(today.getDate() + 3);
  const in7days = new Date(); in7days.setDate(today.getDate() + 7);
  const in30days = new Date(); in30days.setDate(today.getDate() + 30);

  const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

  const [
    totalCars, availableCars, rentedCars,
    carsWithActiveContractOrUnavailability,
    activeContracts, pendingContracts,
    contractsReturningSoon,
    contractsEndingSoon, contractsStartingSoon,
    totalIncome, totalExpense, totalContribution, totalAccountPayment,
    checksIssuedUnused, checksReceivedUnused,
    carsInsuranceExpiring, carsTechExpiring, carsAuthExpiring,
    oilChangeDue,
    repairsUpcoming,
    carsOilKmRaw,
  ] = await Promise.all([
    prisma.car.count({ where: { agencyId, isActive: true } }),
    prisma.car.count({ where: { agencyId, isActive: true, status: 'AVAILABLE' } }),
    prisma.car.count({
      where: {
        agencyId, isActive: true,
        contracts: { some: { status: { in: ['ACTIVE', 'PENDING'] }, startDate: { lte: todayEnd }, endDate: { gte: todayStart } } },
      },
    }),
    prisma.car.findMany({
      where: {
        agencyId, isActive: true,
        OR: [
          { contracts: { some: { status: { in: ['ACTIVE', 'PENDING'] }, startDate: { lte: todayEnd }, endDate: { gte: todayStart } } } },
          { unavailabilities: { some: { startDate: { lte: todayEnd }, endDate: { gte: todayStart } } } },
        ],
      },
      select: { id: true },
    }),
    prisma.rentalContract.count({ where: { agencyId, status: 'ACTIVE' } }),
    prisma.rentalContract.count({ where: { agencyId, status: 'PENDING' } }),
    prisma.rentalContract.findMany({
      where: { agencyId, status: 'ACTIVE', endDate: { gte: today, lte: in3days } },
      include: { car: { select: { brand: true, model: true, finalPlate: true, wwPlate: true } } },
      orderBy: { endDate: 'asc' },
    }),
    prisma.rentalContract.findMany({
      where: { agencyId, status: { in: ['ACTIVE', 'PENDING'] }, startDate: { lte: todayEnd }, endDate: { gte: today, lte: in7days } },
      include: { car: { select: { brand: true, model: true, finalPlate: true } } },
      orderBy: { endDate: 'asc' },
    }),
    prisma.rentalContract.findMany({
      where: { agencyId, status: { in: ['PENDING', 'RESERVATION', 'RESERVATION_CONFIRMED'] }, startDate: { gt: today, lte: in7days } },
      include: { car: { select: { brand: true, model: true, finalPlate: true, wwPlate: true } } },
      orderBy: { startDate: 'asc' },
    }),
    prisma.financialTransaction.aggregate({
      where: { agencyId, type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { agencyId, type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    prisma.contribution.aggregate({
      where: { agencyId },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { agencyId, type: 'ACCOUNT_PAYMENT' },
      _sum: { amount: true },
    }),
    prisma.checkIssued.count({ where: { agencyId, status: 'UNUSED' } }),
    prisma.checkReceived.count({ where: { agencyId, status: 'UNUSED' } }),
    prisma.car.findMany({
      where: { agencyId, isActive: true, insuranceExpiry: { gte: today, lte: in30days } },
      select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true, insuranceExpiry: true },
    }),
    prisma.car.findMany({
      where: { agencyId, isActive: true, nextTechnicalInspection: { gte: today, lte: in30days } },
      select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true, nextTechnicalInspection: true },
    }),
    prisma.car.findMany({
      where: { agencyId, isActive: true, circulationAuthExpiry: { gte: today, lte: in30days } },
      select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true, circulationAuthExpiry: true },
    }),
    prisma.oilChange.findMany({
      where: { car: { agencyId }, nextDate: { gte: today, lte: in30days } },
      include: { car: { select: { id: true, brand: true, model: true, finalPlate: true } } },
      orderBy: { nextDate: 'asc' },
    }),
    prisma.repair.findMany({
      where: { car: { agencyId }, nextRepairDate: { gte: today, lte: in30days } },
      include: { car: { select: { id: true, brand: true, model: true, finalPlate: true } } },
      orderBy: { nextRepairDate: 'asc' },
    }),
    // For km-based oil change alerts
    prisma.car.findMany({
      where: { agencyId, isActive: true },
      select: {
        id: true, brand: true, model: true, finalPlate: true, wwPlate: true, mileage: true,
        oilChangeConfig: { select: { intervalKm: true } },
        oilChanges: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { mileage: true, date: true },
        },
        contracts: {
          where: { status: { in: ['COMPLETED', 'ACTIVE'] }, endMileage: { not: null } },
          orderBy: { endDate: 'desc' },
          take: 1,
          select: { endMileage: true },
        },
      },
    }),
  ]);

  const carsAvailableToday = totalCars - carsWithActiveContractOrUnavailability.length;

  // ── Alerte de facturation (contrat-cadre plateforme/agence) ────────────────
  let billingAlert = null;
  const openContract = await prisma.agencyContract.findFirst({
    where: { agencyId, status: 'ACTIVE' },
    include: {
      billings: { orderBy: { periodEnd: 'desc' }, take: 1, where: { periodEnd: { not: null } } },
    },
    orderBy: { startDate: 'desc' },
  });
  if (openContract) {
    const lastBilling = openContract.billings[0];
    if (lastBilling?.periodEnd && new Date(lastBilling.periodEnd) < today) {
      billingAlert = {
        contractId: openContract.id,
        lastPeriodEnd: lastBilling.periodEnd,
        daysOverdue: Math.floor((today - new Date(lastBilling.periodEnd)) / 86400000),
      };
    }
  }

  // ── Voitures partenaires ───────────────────────────────────────────────────
  const agencyAccesses = await prisma.agencyAccess.findMany({
    where: { receiverAgencyId: agencyId, accessType: { not: 'BLOCKED' } },
    include: { carAccesses: { select: { carId: true } } },
  });

  let partnerCarsTotal = 0;
  let partnerCarsAvailableToday = 0;
  let partnerCarsRentedByUs = 0;

  if (agencyAccesses.length) {
    const allAccessGivers = agencyAccesses.filter(a => a.accessType === 'ALL').map(a => a.giverAgencyId);
    const specificCarIds  = agencyAccesses.filter(a => a.accessType === 'SPECIFIC').flatMap(a => a.carAccesses.map(ca => ca.carId));

    const orClauses = [];
    if (allAccessGivers.length) orClauses.push({ agencyId: { in: allAccessGivers } });
    if (specificCarIds.length)  orClauses.push({ id: { in: specificCarIds } });

    if (orClauses.length) {
      const [pTotal, pRentedToday, pRentedByUs] = await Promise.all([
        prisma.car.count({ where: { isActive: true, OR: orClauses } }),
        prisma.car.count({
          where: {
            isActive: true, OR: orClauses,
            contracts: { some: { status: { in: ['ACTIVE', 'PENDING'] }, startDate: { lte: todayEnd }, endDate: { gte: todayStart } } },
          },
        }),
        prisma.rentalContract.count({
          where: {
            bookedByAgencyId: agencyId,
            status: { in: ['ACTIVE', 'PENDING'] },
            startDate: { lte: todayEnd },
            endDate: { gte: todayStart },
          },
        }),
      ]);
      partnerCarsTotal         = pTotal;
      partnerCarsAvailableToday = pTotal - pRentedToday;
      partnerCarsRentedByUs    = pRentedByUs;
    }
  }

  const OIL_ALERT_THRESHOLD_KM = 2000;

  const oilChangeDueByKm = carsOilKmRaw
    .filter(car => car.oilChanges.length > 0)
    .map(car => {
      const lastOilChange = car.oilChanges[0];
      const intervalKm = car.oilChangeConfig?.intervalKm || 5000;
      const contractKm = car.contracts[0]?.endMileage || 0;
      const currentMileage = Math.max(car.mileage || 0, contractKm);
      if (!currentMileage || !lastOilChange.mileage) return null;
      const kmSince = currentMileage - lastOilChange.mileage;
      const kmRemaining = intervalKm - kmSince;
      return { car, kmSince, kmRemaining, intervalKm, currentMileage, lastOilChangeMileage: lastOilChange.mileage };
    })
    .filter(r => r !== null && r.kmRemaining <= OIL_ALERT_THRESHOLD_KM)
    .sort((a, b) => a.kmRemaining - b.kmRemaining)
    .map(({ car, kmSince, kmRemaining, intervalKm, currentMileage, lastOilChangeMileage }) => ({
      car: { id: car.id, brand: car.brand, model: car.model, finalPlate: car.finalPlate, wwPlate: car.wwPlate },
      kmSince,
      kmRemaining,
      intervalKm,
      currentMileage,
      lastOilChangeMileage,
    }));

  res.json({
    stats: {
      totalCars,
      availableCars,
      carsAvailableToday,
      rentedCars,
      activeContracts,
      pendingContracts,
      totalIncome: totalIncome._sum.amount || 0,
      totalExpense: totalExpense._sum.amount || 0,
      cashBalance: (totalIncome._sum.amount || 0) + (totalContribution._sum.amount || 0) - (totalExpense._sum.amount || 0) - (totalAccountPayment._sum.amount || 0),
      balance: (totalIncome._sum.amount || 0) + (totalContribution._sum.amount || 0) - (totalExpense._sum.amount || 0) - (totalAccountPayment._sum.amount || 0),
      checksIssuedUnused,
      checksReceivedUnused,
      partnerCarsTotal,
      partnerCarsAvailableToday,
      partnerCarsRentedByUs,
    },
    billingAlert,
    alerts: {
      contractsReturningSoon,
      contractsEndingSoon,
      contractsStartingSoon,
      carsInsuranceExpiring,
      carsTechExpiring,
      carsAuthExpiring,
      oilChangeDue,
      oilChangeDueByKm,
      repairsUpcoming,
    },
  });
});

module.exports = router;
