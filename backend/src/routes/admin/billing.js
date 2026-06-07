const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const generateAgencyInvoicePdf = require('../../services/agencyInvoicePdf');

const router = express.Router();
const prisma = new PrismaClient();
const SETTINGS_ID = 'platform';

router.use(authenticate, requireAdmin);

// Agences dont le contrat ouvert a dépassé la fin de la dernière période facturée
// sans qu'une nouvelle facture n'ait été émise pour la période suivante.
async function computeOverdueContracts() {
  const today = new Date();
  const contracts = await prisma.agencyContract.findMany({
    where: { status: 'ACTIVE' },
    include: {
      agency: { select: { id: true, name: true } },
      billings: { orderBy: { periodEnd: 'desc' }, take: 1, where: { periodEnd: { not: null } } },
    },
  });
  return contracts
    .filter(c => {
      const last = c.billings[0];
      if (!last || !last.periodEnd) return false;
      return new Date(last.periodEnd) < today;
    })
    .map(c => ({
      contractId: c.id,
      agency: c.agency,
      lastPeriodEnd: c.billings[0].periodEnd,
      daysOverdue: Math.floor((today - new Date(c.billings[0].periodEnd)) / 86400000),
    }));
}

router.get('/', async (req, res) => {
  const billings = await prisma.agencyBilling.findMany({
    include: { agency: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(billings);
});

router.get('/agency/:agencyId', async (req, res) => {
  const billings = await prisma.agencyBilling.findMany({
    where: { agencyId: req.params.agencyId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(billings);
});

router.get('/stats', async (req, res) => {
  const [total, paid, pending, overdue] = await Promise.all([
    prisma.agencyBilling.aggregate({ _sum: { amount: true } }),
    prisma.agencyBilling.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.agencyBilling.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    prisma.agencyBilling.aggregate({ where: { status: 'OVERDUE' }, _sum: { amount: true } }),
  ]);
  res.json({
    total: total._sum.amount || 0,
    paid: paid._sum.amount || 0,
    pending: pending._sum.amount || 0,
    overdue: overdue._sum.amount || 0,
  });
});

router.get('/alerts', async (req, res) => {
  const overdue = await computeOverdueContracts();
  res.json({ overdueContracts: overdue });
});

router.post('/', async (req, res) => {
  const { agencyId, contractId, amount, dueDate, description, period, periodStart, periodEnd, paymentMethod } = req.body;
  if (!agencyId || !amount || !dueDate) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const billing = await prisma.agencyBilling.create({
    data: {
      agencyId,
      contractId: contractId || null,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate),
      description,
      period,
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
      paymentMethod,
    },
    include: { agency: { select: { id: true, name: true } } },
  });
  res.status(201).json(billing);
});

router.put('/:id', async (req, res) => {
  const { amount, dueDate, paidDate, status, paymentMethod, description, notes, periodStart, periodEnd, contractId } = req.body;
  const billing = await prisma.agencyBilling.update({
    where: { id: req.params.id },
    data: {
      amount: amount ? parseFloat(amount) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      paidDate: paidDate ? new Date(paidDate) : undefined,
      status,
      paymentMethod,
      description,
      notes,
      ...(periodStart !== undefined && { periodStart: periodStart ? new Date(periodStart) : null }),
      ...(periodEnd !== undefined && { periodEnd: periodEnd ? new Date(periodEnd) : null }),
      ...(contractId !== undefined && { contractId: contractId || null }),
    },
    include: { agency: { select: { id: true, name: true } } },
  });
  res.json(billing);
});

router.delete('/:id', async (req, res) => {
  await prisma.agencyBilling.delete({ where: { id: req.params.id } });
  res.json({ message: 'Facturation supprimée' });
});

router.get('/:id/pdf', async (req, res) => {
  const billing = await prisma.agencyBilling.findUnique({
    where: { id: req.params.id },
    include: { agency: true },
  });
  if (!billing) return res.status(404).json({ error: 'Facture non trouvée' });
  const settings = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="facture-${billing.id}.pdf"`);
  generateAgencyInvoicePdf(billing, settings, res);
});

module.exports = router;
