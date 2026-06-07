const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

const SETTINGS_ID = 'platform';

// GET / — infos de la société plateforme
router.get('/', async (req, res) => {
  const settings = await prisma.platformSettings.findUnique({ where: { id: SETTINGS_ID } });
  res.json(settings || { id: SETTINGS_ID, companyName: null, address: null, ice: null, ic: null, rc: null });
});

// PUT / — met à jour les infos de la société plateforme
router.put('/', async (req, res) => {
  const { companyName, address, ice, ic, rc } = req.body;
  const data = {
    companyName: companyName?.trim() || null,
    address:     address?.trim()     || null,
    ice:         ice?.trim()         || null,
    ic:          ic?.trim()          || null,
    rc:          rc?.trim()          || null,
  };
  const settings = await prisma.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...data },
  });
  res.json(settings);
});

module.exports = router;
