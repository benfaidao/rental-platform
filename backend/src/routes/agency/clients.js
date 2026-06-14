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
      { companyName: { contains: search, mode: 'insensitive' } },
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

const uploadFields = upload.fields([{ name: 'idFile', maxCount: 10 }, { name: 'licenseFile', maxCount: 10 }]);

const toUrls = (files, agencyId) =>
  (files || []).map(f => `/agencies/${agencyId}/files/${f.filename}`);

router.post('/', uploadFields, async (req, res) => {
  const { clientType, firstName, lastName, companyName, companyIce, phone, email, address, idType, idNumber, idExpiry, licenseNumber, licenseExpiry } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'Prénom et nom requis' });

  const idUrls      = toUrls(req.files?.idFile, req.params.agencyId);
  const licenseUrls = toUrls(req.files?.licenseFile, req.params.agencyId);

  const client = await prisma.client.create({
    data: {
      agencyId: req.params.agencyId,
      clientType: clientType || 'INDIVIDUAL',
      firstName, lastName,
      companyName: companyName || null,
      companyIce: companyIce || null,
      phone, email, address,
      idType, idNumber,
      idExpiry: idExpiry ? new Date(idExpiry) : null,
      idFileUrl:       idUrls[0] || null,
      idFileUrls:      idUrls,
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      licenseFileUrl:  licenseUrls[0] || null,
      licenseFileUrls: licenseUrls,
    },
  });
  res.status(201).json(client);
});

router.put('/:clientId', uploadFields, async (req, res) => {
  const { clientType, firstName, lastName, companyName, companyIce, phone, email, address, idType, idNumber, idExpiry, licenseNumber, licenseExpiry } = req.body;
  const existing = await prisma.client.findFirst({ where: { id: req.params.clientId, agencyId: req.params.agencyId } });
  if (!existing) return res.status(404).json({ error: 'Client non trouvé' });

  const idUrls      = toUrls(req.files?.idFile, req.params.agencyId);
  const licenseUrls = toUrls(req.files?.licenseFile, req.params.agencyId);

  const client = await prisma.client.update({
    where: { id: req.params.clientId },
    data: {
      clientType: clientType || 'INDIVIDUAL',
      firstName, lastName,
      companyName: companyName || null,
      companyIce: companyIce || null,
      phone, email, address,
      idType, idNumber,
      idExpiry: idExpiry ? new Date(idExpiry) : null,
      ...(idUrls.length > 0 && { idFileUrl: idUrls[0], idFileUrls: idUrls }),
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      ...(licenseUrls.length > 0 && { licenseFileUrl: licenseUrls[0], licenseFileUrls: licenseUrls }),
    },
  });
  res.json(client);
});

router.delete('/:clientId', async (req, res) => {
  await prisma.client.delete({ where: { id: req.params.clientId } });
  res.json({ message: 'Client supprimé' });
});

module.exports = router;
