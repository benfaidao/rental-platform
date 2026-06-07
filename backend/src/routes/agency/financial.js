const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

// Associates
router.get('/associates', async (req, res) => {
  const associates = await prisma.associate.findMany({
    where: { agencyId: req.params.agencyId, isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(associates);
});

router.post('/associates', async (req, res) => {
  const { name, email, phone, role, sharePercent } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const associate = await prisma.associate.create({
    data: {
      agencyId: req.params.agencyId,
      name, email, phone,
      role: role || 'ASSOCIATE',
      sharePercent: sharePercent ? parseFloat(sharePercent) : null,
    },
  });
  res.status(201).json(associate);
});

router.put('/associates/:id', async (req, res) => {
  const { name, email, phone, role, sharePercent, isActive } = req.body;
  const associate = await prisma.associate.update({
    where: { id: req.params.id },
    data: { name, email, phone, role, sharePercent: sharePercent ? parseFloat(sharePercent) : undefined, isActive },
  });
  res.json(associate);
});

router.delete('/associates/:id', async (req, res) => {
  await prisma.associate.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Associé désactivé' });
});

// Contributions
router.get('/contributions', async (req, res) => {
  const { associateId } = req.query;
  const where = { agencyId: req.params.agencyId };
  if (associateId) where.associateId = associateId;
  const contributions = await prisma.contribution.findMany({
    where,
    include: { associate: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(contributions);
});

router.post('/contributions', async (req, res) => {
  const { associateId, amount, date, period, notes } = req.body;
  if (!associateId || !amount || !date) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const contribution = await prisma.contribution.create({
    data: {
      agencyId: req.params.agencyId,
      associateId,
      amount: parseFloat(amount),
      date: new Date(date),
      period, notes,
    },
    include: { associate: { select: { id: true, name: true } } },
  });
  res.status(201).json(contribution);
});

router.put('/contributions/:id', async (req, res) => {
  const { amount, date, period, notes } = req.body;
  const contribution = await prisma.contribution.update({
    where: { id: req.params.id },
    data: {
      amount: amount ? parseFloat(amount) : undefined,
      date: date ? new Date(date) : undefined,
      period, notes,
    },
  });
  res.json(contribution);
});

router.delete('/contributions/:id', async (req, res) => {
  await prisma.contribution.delete({ where: { id: req.params.id } });
  res.json({ message: 'Cotisation supprimée' });
});

// Transactions
router.get('/transactions', async (req, res) => {
  const { type, associateId, startDate, endDate } = req.query;
  const agencyId = req.params.agencyId;
  const dateRange = {};
  if (startDate) dateRange.gte = new Date(startDate);
  if (endDate)   dateRange.lte = new Date(endDate);
  const hasDate = startDate || endDate;

  const includeTransactions  = !type || type !== 'CONTRIBUTION';
  const includeContributions = !type || type === 'CONTRIBUTION';

  let transactions = [];
  if (includeTransactions) {
    const where = { agencyId };
    if (type) where.type = type;
    if (associateId) where.associateId = associateId;
    if (hasDate) where.date = dateRange;
    transactions = await prisma.financialTransaction.findMany({
      where,
      include: { associate: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  let contributions = [];
  if (includeContributions) {
    const where = { agencyId };
    if (associateId) where.associateId = associateId;
    if (hasDate) where.date = dateRange;
    const raw = await prisma.contribution.findMany({
      where,
      include: { associate: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    contributions = raw.map(c => ({
      id: c.id,
      type: 'CONTRIBUTION',
      amount: c.amount,
      currency: 'MAD',
      description: `Cotisation${c.period ? ` — ${c.period}` : ''}`,
      date: c.date,
      associate: c.associate,
      category: 'Cotisation',
      notes: c.notes,
      _isContribution: true,
    }));
  }

  const all = [...transactions, ...contributions].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
  res.json(all);
});

router.get('/transactions/summary', async (req, res) => {
  const { startDate, endDate } = req.query;
  const where = { agencyId: req.params.agencyId };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const contractWhere = { agencyId: req.params.agencyId, amountPaid: { gt: 0 } };
  if (startDate || endDate) {
    contractWhere.startDate = {};
    if (startDate) contractWhere.startDate.gte = new Date(startDate);
    if (endDate) contractWhere.startDate.lte = new Date(endDate);
  }

  const agencyId = req.params.agencyId;
  const contribWhere = { agencyId };
  if (startDate || endDate) {
    contribWhere.date = {};
    if (startDate) contribWhere.date.gte = new Date(startDate);
    if (endDate)   contribWhere.date.lte = new Date(endDate);
  }

  const [income, expense, contribution, accountPayment, bankExpense, profitWithdrawal, profitWithdrawalBank, cashTransfer, rentalPaid, rentalTotal, checksReceivedPaid, checksIssuedPaid] = await Promise.all([
    prisma.financialTransaction.aggregate({ where: { ...where, type: 'INCOME' }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { ...where, type: 'EXPENSE' }, _sum: { amount: true } }),
    prisma.contribution.aggregate({ where: contribWhere, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { ...where, type: 'ACCOUNT_PAYMENT' }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { ...where, type: 'BANK_EXPENSE' }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { ...where, type: 'PROFIT_WITHDRAWAL' }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { ...where, type: 'PROFIT_WITHDRAWAL_BANK' }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { ...where, type: 'CASH_TRANSFER' }, _sum: { amount: true } }),
    prisma.rentalContract.aggregate({ where: contractWhere, _sum: { amountPaid: true } }),
    prisma.rentalContract.aggregate({ where: { agencyId, ...(startDate || endDate ? contractWhere : {}) }, _sum: { rentalAmount: true } }),
    prisma.checkReceived.aggregate({ where: { agencyId, status: 'PAID' }, _sum: { amount: true } }),
    prisma.checkIssued.aggregate({ where: { agencyId, status: 'PAID' }, _sum: { amount: true } }),
  ]);

  const incomeAmt = income._sum.amount || 0;
  const expenseAmt = expense._sum.amount || 0;
  const contributionAmt = contribution._sum.amount || 0;
  const accountPaymentAmt = accountPayment._sum.amount || 0;
  const bankExpenseAmt = bankExpense._sum.amount || 0;
  const profitWithdrawalAmt = profitWithdrawal._sum.amount || 0;
  const profitWithdrawalBankAmt = profitWithdrawalBank._sum.amount || 0;
  const cashTransferAmt = cashTransfer._sum.amount || 0;
  const checksReceivedPaidAmt = checksReceivedPaid._sum.amount || 0;
  const checksIssuedPaidAmt = checksIssuedPaid._sum.amount || 0;

  res.json({
    income: incomeAmt,
    expense: expenseAmt,
    contribution: contributionAmt,
    accountPayment: accountPaymentAmt,
    bankExpense: bankExpenseAmt,
    profitWithdrawal: profitWithdrawalAmt,
    profitWithdrawalBank: profitWithdrawalBankAmt,
    cashTransfer: cashTransferAmt,
    cashBalance: incomeAmt + contributionAmt + cashTransferAmt - expenseAmt - accountPaymentAmt - profitWithdrawalAmt,
    bankBalance: checksReceivedPaidAmt - checksIssuedPaidAmt + accountPaymentAmt - bankExpenseAmt - profitWithdrawalBankAmt,
    balance: incomeAmt + contributionAmt + cashTransferAmt - expenseAmt - accountPaymentAmt - profitWithdrawalAmt,
    rentalIncome: rentalPaid._sum.amountPaid || 0,
    rentalTotal: rentalTotal._sum.rentalAmount || 0,
  });
});

router.post('/transactions', async (req, res) => {
  const { type, amount, currency, description, date, associateId, collectedByName, category, notes } = req.body;
  if (!type || !amount || !description || !date) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const transaction = await prisma.financialTransaction.create({
    data: {
      agencyId: req.params.agencyId,
      type, amount: parseFloat(amount),
      currency: currency || 'MAD',
      description,
      date: new Date(date),
      associateId: associateId || null,
      collectedByName: collectedByName?.trim() || null,
      category, notes,
    },
    include: { associate: { select: { id: true, name: true } } },
  });
  res.status(201).json(transaction);
});

router.put('/transactions/:id', async (req, res) => {
  const { type, amount, currency, description, date, associateId, collectedByName, category, notes } = req.body;
  const transaction = await prisma.financialTransaction.update({
    where: { id: req.params.id },
    data: {
      type, amount: amount ? parseFloat(amount) : undefined,
      currency, description,
      date: date ? new Date(date) : undefined,
      associateId: associateId || null,
      collectedByName: collectedByName?.trim() || null,
      category, notes,
    },
  });
  res.json(transaction);
});

router.delete('/transactions/:id', async (req, res) => {
  await prisma.financialTransaction.delete({ where: { id: req.params.id } });
  res.json({ message: 'Transaction supprimée' });
});

module.exports = router;
