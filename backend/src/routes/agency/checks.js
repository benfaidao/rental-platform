const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

// Issued checks
router.get('/issued', async (req, res) => {
  const { status } = req.query;
  const where = { agencyId: req.params.agencyId };
  if (status) where.status = status;
  const checks = await prisma.checkIssued.findMany({
    where,
    orderBy: { date: 'desc' },
  });
  res.json(checks);
});

router.post('/issued', async (req, res) => {
  const { checkNumber, payableTo, amount, date, encaissementDate, status, reason, comment } = req.body;
  if (!checkNumber || !payableTo || !amount || !date) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const check = await prisma.checkIssued.create({
    data: {
      agencyId: req.params.agencyId,
      checkNumber, payableTo,
      amount: parseFloat(amount),
      date: new Date(date),
      encaissementDate: encaissementDate ? new Date(encaissementDate) : null,
      status: status || 'NONE',
      reason, comment,
    },
  });
  res.status(201).json(check);
});

router.put('/issued/:id', async (req, res) => {
  const { checkNumber, payableTo, amount, date, encaissementDate, status, reason, comment } = req.body;
  const check = await prisma.checkIssued.update({
    where: { id: req.params.id },
    data: {
      checkNumber, payableTo,
      amount: amount ? parseFloat(amount) : undefined,
      date: date ? new Date(date) : undefined,
      encaissementDate: encaissementDate ? new Date(encaissementDate) : null,
      status, reason, comment,
    },
  });
  res.json(check);
});

router.delete('/issued/:id', async (req, res) => {
  await prisma.checkIssued.delete({ where: { id: req.params.id } });
  res.json({ message: 'Chèque supprimé' });
});

// Received checks
router.get('/received', async (req, res) => {
  const { status } = req.query;
  const where = { agencyId: req.params.agencyId };
  if (status) where.status = status;
  const checks = await prisma.checkReceived.findMany({
    where,
    orderBy: { date: 'desc' },
  });
  res.json(checks);
});

router.post('/received', async (req, res) => {
  const { checkNumber, payableTo, amount, date, status, reason, comment } = req.body;
  if (!checkNumber || !payableTo || !amount || !date) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const check = await prisma.checkReceived.create({
    data: {
      agencyId: req.params.agencyId,
      checkNumber, payableTo,
      amount: parseFloat(amount),
      date: new Date(date),
      status: status || 'NONE',
      reason, comment,
    },
  });
  res.status(201).json(check);
});

router.put('/received/:id', async (req, res) => {
  const { checkNumber, payableTo, amount, date, status, reason, comment } = req.body;
  const check = await prisma.checkReceived.update({
    where: { id: req.params.id },
    data: {
      checkNumber, payableTo,
      amount: amount ? parseFloat(amount) : undefined,
      date: date ? new Date(date) : undefined,
      status, reason, comment,
    },
  });
  res.json(check);
});

router.delete('/received/:id', async (req, res) => {
  await prisma.checkReceived.delete({ where: { id: req.params.id } });
  res.json({ message: 'Chèque supprimé' });
});

module.exports = router;
