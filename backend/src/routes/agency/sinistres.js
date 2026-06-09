const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const fs = require('fs');
const path = require('path');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

const INCLUDE = {
  car: { select: { id: true, brand: true, model: true, finalPlate: true, wwPlate: true } },
  contract: { select: { id: true, contractNumber: true, clientName: true } },
  photos: { orderBy: { createdAt: 'asc' } },
};

// GET / — list all sinistres for the agency
router.get('/', async (req, res) => {
  try {
    const { carId, contractId, status } = req.query;
    const sinistres = await prisma.sinistre.findMany({
      where: {
        agencyId: req.params.agencyId,
        ...(carId      ? { carId }      : {}),
        ...(contractId ? { contractId } : {}),
        ...(status     ? { status }     : {}),
      },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(sinistres);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST / — create sinistre (+ optional financial transaction)
router.post('/', async (req, res) => {
  try {
    const { carId, contractId, title, description, collectedAmount, collectionDate } = req.body;
    const agencyId = req.params.agencyId;

    if (!carId) return res.status(400).json({ error: 'carId requis' });

    let transactionId = null;
    if (collectedAmount && parseFloat(collectedAmount) > 0 && collectionDate) {
      const car = await prisma.car.findUnique({ where: { id: carId }, select: { brand: true, model: true, finalPlate: true, wwPlate: true } });
      const plate = car?.finalPlate || car?.wwPlate || '';
      let label = `Sinistre — ${car?.brand || ''} ${car?.model || ''} ${plate}`.trim();
      if (contractId) {
        const contract = await prisma.rentalContract.findUnique({ where: { id: contractId }, select: { contractNumber: true } });
        if (contract) label += ` · ${contract.contractNumber}`;
      }
      const tx = await prisma.financialTransaction.create({
        data: {
          agencyId,
          type: 'INCOME',
          amount: parseFloat(collectedAmount),
          currency: 'MAD',
          description: label,
          date: new Date(collectionDate),
          category: 'Sinistre',
          userId: req.user?.id || null,
        },
      });
      transactionId = tx.id;
    }

    const sinistre = await prisma.sinistre.create({
      data: {
        agencyId,
        carId,
        contractId: contractId || null,
        title: title || null,
        description: description || null,
        collectedAmount: collectedAmount ? parseFloat(collectedAmount) : null,
        collectionDate: collectionDate ? new Date(collectionDate) : null,
        transactionId,
      },
      include: INCLUDE,
    });
    res.status(201).json(sinistre);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /:sinistreId — update sinistre
router.put('/:sinistreId', async (req, res) => {
  try {
    const { title, description, status, collectedAmount, collectionDate } = req.body;
    const agencyId = req.params.agencyId;

    const existing = await prisma.sinistre.findFirst({
      where: { id: req.params.sinistreId, agencyId },
    });
    if (!existing) return res.status(404).json({ error: 'Sinistre introuvable' });

    const newAmount = collectedAmount != null ? parseFloat(collectedAmount) : null;
    const newDate   = collectionDate ? new Date(collectionDate) : null;
    const hasFinancial = newAmount && newAmount > 0 && newDate;

    let transactionId = existing.transactionId;

    if (hasFinancial) {
      const car = await prisma.car.findUnique({ where: { id: existing.carId }, select: { brand: true, model: true, finalPlate: true, wwPlate: true } });
      const plate = car?.finalPlate || car?.wwPlate || '';
      let label = `Sinistre — ${car?.brand || ''} ${car?.model || ''} ${plate}`.trim();
      if (existing.contractId) {
        const contract = await prisma.rentalContract.findUnique({ where: { id: existing.contractId }, select: { contractNumber: true } });
        if (contract) label += ` · ${contract.contractNumber}`;
      }
      if (transactionId) {
        await prisma.financialTransaction.update({
          where: { id: transactionId },
          data: { amount: newAmount, date: newDate, description: label },
        });
      } else {
        const tx = await prisma.financialTransaction.create({
          data: {
            agencyId,
            type: 'INCOME',
            amount: newAmount,
            currency: 'MAD',
            description: label,
            date: newDate,
            category: 'Sinistre',
            userId: req.user?.id || null,
          },
        });
        transactionId = tx.id;
      }
    } else if (!hasFinancial && transactionId) {
      await prisma.financialTransaction.delete({ where: { id: transactionId } }).catch(() => {});
      transactionId = null;
    }

    const updated = await prisma.sinistre.update({
      where: { id: req.params.sinistreId },
      data: {
        title: title !== undefined ? (title || null) : existing.title,
        description: description ?? existing.description,
        status: status ?? existing.status,
        collectedAmount: newAmount,
        collectionDate: newDate,
        transactionId,
      },
      include: INCLUDE,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /:sinistreId
router.delete('/:sinistreId', async (req, res) => {
  try {
    const sinistre = await prisma.sinistre.findFirst({
      where: { id: req.params.sinistreId, agencyId: req.params.agencyId },
      include: { photos: true },
    });
    if (!sinistre) return res.status(404).json({ error: 'Sinistre introuvable' });

    // Delete physical photo files
    for (const photo of sinistre.photos) {
      const filePath = path.join(__dirname, '../../../uploads', photo.filename);
      fs.unlink(filePath, () => {});
    }

    // Delete linked transaction
    if (sinistre.transactionId) {
      await prisma.financialTransaction.delete({ where: { id: sinistre.transactionId } }).catch(() => {});
    }

    await prisma.sinistre.delete({ where: { id: req.params.sinistreId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /:sinistreId/photos — upload photos
router.post('/:sinistreId/photos', upload.array('photos', 10), async (req, res) => {
  try {
    const sinistre = await prisma.sinistre.findFirst({
      where: { id: req.params.sinistreId, agencyId: req.params.agencyId },
    });
    if (!sinistre) return res.status(404).json({ error: 'Sinistre introuvable' });

    const photos = await Promise.all(
      req.files.map(file =>
        prisma.sinistrePhoto.create({
          data: {
            sinistreId: req.params.sinistreId,
            filename: file.filename,
            url: `/agencies/${req.params.agencyId}/files/${file.filename}`,
          },
        })
      )
    );
    res.status(201).json(photos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /:sinistreId/photos/:photoId
router.delete('/:sinistreId/photos/:photoId', async (req, res) => {
  try {
    const photo = await prisma.sinistrePhoto.findFirst({
      where: { id: req.params.photoId, sinistreId: req.params.sinistreId },
    });
    if (!photo) return res.status(404).json({ error: 'Photo introuvable' });

    const filePath = path.join(__dirname, '../../../uploads', photo.filename);
    fs.unlink(filePath, () => {});
    await prisma.sinistrePhoto.delete({ where: { id: req.params.photoId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
