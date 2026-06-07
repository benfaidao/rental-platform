const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { agencyUsers: { include: { agency: true } } },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Utilisateur invalide' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Accès interdit' });
  }
  next();
};

const requireAgencyAccess = async (req, res, next) => {
  const { agencyId } = req.params;
  if (req.user.role === 'SUPER_ADMIN') return next();

  const membership = req.user.agencyUsers.find(au => au.agencyId === agencyId);
  if (!membership) {
    return res.status(403).json({ error: 'Accès à cette agence interdit' });
  }

  if (membership.agency?.isSuspended && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(423).json({ error: 'Cette agence est suspendue. Accès en lecture seule uniquement.' });
  }

  req.agencyRole = membership.role;
  req.agencyIsSuspended = !!membership.agency?.isSuspended;
  next();
};

const requireAgencyAdmin = async (req, res, next) => {
  const { agencyId } = req.params;
  if (req.user.role === 'SUPER_ADMIN') return next();

  const membership = req.user.agencyUsers.find(au => au.agencyId === agencyId);
  if (!membership || membership.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Droits administrateur requis' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireAgencyAccess, requireAgencyAdmin };
