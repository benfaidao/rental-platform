const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

// --- Partners ---
router.get('/', async (req, res) => {
  const { search } = req.query;
  const where = { agencyId: req.params.agencyId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { type: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
      { contacts: { some: { name: { contains: search, mode: 'insensitive' } } } },
      { contacts: { some: { phone: { contains: search, mode: 'insensitive' } } } },
    ];
  }
  const partners = await prisma.partner.findMany({
    where,
    include: { contacts: { orderBy: { createdAt: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  res.json(partners);
});

router.post('/', async (req, res) => {
  const { name, contactName, type, address, phone, email, website, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const partner = await prisma.partner.create({
    data: { agencyId: req.params.agencyId, name, contactName, type, address, phone, email, website, notes },
    include: { contacts: true },
  });
  res.status(201).json(partner);
});

router.put('/:partnerId', async (req, res) => {
  const { name, contactName, type, address, phone, email, website, notes } = req.body;
  const partner = await prisma.partner.update({
    where: { id: req.params.partnerId },
    data: { name, contactName, type, address, phone, email, website, notes },
    include: { contacts: true },
  });
  res.json(partner);
});

router.delete('/:partnerId', async (req, res) => {
  await prisma.partner.delete({ where: { id: req.params.partnerId } });
  res.json({ message: 'Partenaire supprimé' });
});

// --- Partner Contacts ---
router.get('/:partnerId/contacts', async (req, res) => {
  const contacts = await prisma.partnerContact.findMany({
    where: { partnerId: req.params.partnerId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(contacts);
});

router.post('/:partnerId/contacts', async (req, res) => {
  const { name, role, phone, email, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const contact = await prisma.partnerContact.create({
    data: { partnerId: req.params.partnerId, name, role, phone, email, notes },
  });
  res.status(201).json(contact);
});

router.put('/:partnerId/contacts/:contactId', async (req, res) => {
  const { name, role, phone, email, notes } = req.body;
  const contact = await prisma.partnerContact.update({
    where: { id: req.params.contactId },
    data: { name, role, phone, email, notes },
  });
  res.json(contact);
});

router.delete('/:partnerId/contacts/:contactId', async (req, res) => {
  await prisma.partnerContact.delete({ where: { id: req.params.contactId } });
  res.json({ message: 'Contact supprimé' });
});

module.exports = router;
