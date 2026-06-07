const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

router.get('/', async (req, res) => {
  const { search } = req.query;
  const where = { agencyId: req.params.agencyId };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { idNumber: { contains: search, mode: 'insensitive' } },
    ];
  }
  const clients = await prisma.client.findMany({
    where,
    orderBy: { lastName: 'asc' },
  });
  res.json(clients);
});

router.get('/:clientId', async (req, res) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.clientId, agencyId: req.params.agencyId },
    include: {
      contracts: {
        orderBy: { startDate: 'desc' },
        include: {
          car: { select: { brand: true, model: true, finalPlate: true, wwPlate: true } },
        },
      },
    },
  });
  if (!client) return res.status(404).json({ error: 'Client non trouvé' });
  res.json(client);
});

const uploadFields = upload.fields([{ name: 'idFile', maxCount: 1 }, { name: 'licenseFile', maxCount: 1 }]);

router.post('/', uploadFields, async (req, res) => {
  const { firstName, lastName, phone, email, address, idType, idNumber, idExpiry, licenseNumber, licenseExpiry } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'Prénom et nom requis' });

  const client = await prisma.client.create({
    data: {
      agencyId: req.params.agencyId,
      firstName, lastName, phone, email, address,
      idType, idNumber,
      idExpiry: idExpiry ? new Date(idExpiry) : null,
      idFileUrl: req.files?.idFile?.[0] ? `/uploads/${req.files.idFile[0].filename}` : null,
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      licenseFileUrl: req.files?.licenseFile?.[0] ? `/uploads/${req.files.licenseFile[0].filename}` : null,
    },
  });
  res.status(201).json(client);
});

router.put('/:clientId', uploadFields, async (req, res) => {
  const { firstName, lastName, phone, email, address, idType, idNumber, idExpiry, licenseNumber, licenseExpiry } = req.body;
  const existing = await prisma.client.findFirst({ where: { id: req.params.clientId, agencyId: req.params.agencyId } });
  if (!existing) return res.status(404).json({ error: 'Client non trouvé' });

  const client = await prisma.client.update({
    where: { id: req.params.clientId },
    data: {
      firstName, lastName, phone, email, address,
      idType, idNumber,
      idExpiry: idExpiry ? new Date(idExpiry) : null,
      ...(req.files?.idFile?.[0] && { idFileUrl: `/uploads/${req.files.idFile[0].filename}` }),
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      ...(req.files?.licenseFile?.[0] && { licenseFileUrl: `/uploads/${req.files.licenseFile[0].filename}` }),
    },
  });
  res.json(client);
});

router.delete('/:clientId', async (req, res) => {
  await prisma.client.delete({ where: { id: req.params.clientId } });
  res.json({ message: 'Client supprimé' });
});

module.exports = router;
