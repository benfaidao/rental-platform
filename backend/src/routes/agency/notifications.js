const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAgencyAccess } = require('../../middleware/auth');

const router = express.Router({ mergeParams: true });
const prisma = new PrismaClient();

router.use(authenticate, requireAgencyAccess);

// GET — notifications non lues pour l'utilisateur courant
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const notifications = await prisma.notification.findMany({
    where: {
      agencyId: req.params.agencyId,
      NOT: { readBy: { has: userId } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
});

// POST /read-all — marquer toutes comme lues
router.post('/read-all', async (req, res) => {
  const userId = req.user.id;
  const unread = await prisma.notification.findMany({
    where: {
      agencyId: req.params.agencyId,
      NOT: { readBy: { has: userId } },
    },
    select: { id: true },
  });
  if (unread.length > 0) {
    await prisma.$transaction(
      unread.map(n =>
        prisma.notification.update({
          where: { id: n.id },
          data: { readBy: { push: userId } },
        })
      )
    );
  }
  res.json({ count: unread.length });
});

// POST /:id/read — marquer une notification comme lue
router.post('/:id/read', async (req, res) => {
  const userId = req.user.id;
  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { readBy: { push: userId } },
  });
  res.json(notification);
});

module.exports = router;
