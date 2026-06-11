const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/contracts/:contractNumber', async (req, res) => {
  try {
    const contract = await prisma.rentalContract.findUnique({
      where: { contractNumber: req.params.contractNumber },
      include: {
        car: { select: { brand: true, model: true, finalPlate: true, wwPlate: true } },
        client: { select: { firstName: true, lastName: true, phone: true, email: true } },
        agency: { select: { name: true, phone: true, address: true } },
        periodicPayments: { orderBy: { periodStart: 'asc' } },
      },
    });
    if (!contract) return res.status(404).json({ error: 'Contrat introuvable' });
    res.json(contract);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
