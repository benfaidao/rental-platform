require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const adminAgenciesRoutes = require('./routes/admin/agencies');
const adminBillingRoutes = require('./routes/admin/billing');
const adminAgencyContractsRoutes = require('./routes/admin/agencyContracts');
const adminUsersRoutes = require('./routes/admin/users');
const adminAccessRoutes = require('./routes/admin/access');
const adminSettingsRoutes = require('./routes/admin/settings');
const agencyCarsRoutes = require('./routes/agency/cars');
const agencyContractsRoutes = require('./routes/agency/contracts');
const agencyMaintenanceRoutes = require('./routes/agency/maintenance');
const agencyChecksRoutes = require('./routes/agency/checks');
const agencyFinancialRoutes = require('./routes/agency/financial');
const agencyDashboardRoutes = require('./routes/agency/dashboard');
const agencyAccessRoutes = require('./routes/agency/access');
const agencyClientsRoutes = require('./routes/agency/clients');
const agencyPartnersRoutes = require('./routes/agency/partners');
const agencyExternalRoutes = require('./routes/agency/external');
const agencyRequestsRoutes = require('./routes/agency/requests');
const agencySinistresRoutes = require('./routes/agency/sinistres');
const agencyProfileRoutes   = require('./routes/agency/profile');
const agencyMembersRoutes   = require('./routes/agency/members');
const publicRoutes          = require('./routes/public');

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// userId → { socketId, name, agencyName }
const onlineUsers = new Map();

async function getUnreadSummary(userId) {
  const rows = await prisma.chatMessage.groupBy({
    by: ['senderId', 'senderName', 'agencyName'],
    where: { toUserId: userId, isPublic: false, isRead: false },
    _count: { id: true },
  });
  return rows.map(r => ({
    senderId: r.senderId,
    senderName: r.senderName,
    agencyName: r.agencyName,
    count: r._count.id,
  }));
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Non authentifié'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId || decoded.id;
    next();
  } catch {
    next(new Error('Token invalide'));
  }
});

io.on('connection', async (socket) => {
  const user = await prisma.user.findUnique({
    where: { id: socket.userId },
    select: {
      id: true, firstName: true, lastName: true,
      agencyUsers: { include: { agency: { select: { name: true } } }, take: 1 },
    },
  });
  if (!user) { socket.disconnect(); return; }

  const senderName = `${user.firstName} ${user.lastName}`;
  const agencyName = user.agencyUsers[0]?.agency?.name || null;

  onlineUsers.set(socket.userId, { socketId: socket.id, name: senderName, agencyName });
  socket.join('public');

  io.emit('online_users', Array.from(onlineUsers.entries()).map(([id, u]) => ({ id, ...u })));

  // Send unread summary on connect
  const unread = await getUnreadSummary(socket.userId);
  socket.emit('unread_summary', unread);

  // Public message
  socket.on('public_message', async ({ content }) => {
    if (!content?.trim()) return;
    const msg = await prisma.chatMessage.create({
      data: { senderId: socket.userId, senderName, agencyName, content: content.trim(), isPublic: true, isRead: true },
    });
    io.to('public').emit('public_message', msg);
  });

  // Private message — delivered to recipient if online, saved regardless
  socket.on('private_message', async ({ toUserId, content }) => {
    if (!content?.trim() || !toUserId) return;
    const recipientOnline = onlineUsers.has(toUserId);
    const msg = await prisma.chatMessage.create({
      data: {
        senderId: socket.userId, senderName, agencyName,
        content: content.trim(), isPublic: false, toUserId,
        isRead: recipientOnline,
      },
    });
    const target = onlineUsers.get(toUserId);
    if (target) {
      io.to(target.socketId).emit('private_message', msg);
      // Update unread summary for recipient (still 0 since isRead=true, but refresh)
      const unreadForRecipient = await getUnreadSummary(toUserId);
      io.to(target.socketId).emit('unread_summary', unreadForRecipient);
    }
    socket.emit('private_message', msg);
  });

  // Mark conversation as read
  socket.on('mark_read', async ({ fromUserId }) => {
    await prisma.chatMessage.updateMany({
      where: { senderId: fromUserId, toUserId: socket.userId, isRead: false },
      data: { isRead: true },
    });
    const unread = await getUnreadSummary(socket.userId);
    socket.emit('unread_summary', unread);
  });

  // Delete a message (only sender can delete)
  socket.on('delete_message', async ({ messageId }) => {
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.senderId !== socket.userId) return;
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true, content: '' },
    });
    if (msg.isPublic) {
      io.to('public').emit('message_deleted', { messageId });
    } else {
      socket.emit('message_deleted', { messageId });
      const target = onlineUsers.get(msg.toUserId);
      if (target) io.to(target.socketId).emit('message_deleted', { messageId });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
    io.emit('online_users', Array.from(onlineUsers.entries()).map(([id, u]) => ({ id, ...u })));
  });
});

// ─── REST API ─────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const { authenticate, requireAgencyAccess } = require('./middleware/auth');
const fs = require('fs');

// Protected file serving — requires auth + agency membership
app.get('/agencies/:agencyId/files/:filename', authenticate, requireAgencyAccess, (req, res) => {
  const filename = path.basename(req.params.filename);
  const agencyPath = path.join(__dirname, '../uploads', req.params.agencyId, filename);
  const legacyPath = path.join(__dirname, '../uploads', filename);
  const filePath = fs.existsSync(agencyPath) ? agencyPath : (fs.existsSync(legacyPath) ? legacyPath : null);
  if (!filePath) return res.status(404).json({ error: 'Fichier introuvable' });
  res.sendFile(filePath);
});

// Unread count (HTTP fallback for socket)
app.get('/chat/unread', authenticate, async (req, res) => {
  const summary = await getUnreadSummary(req.user.id);
  const total = summary.reduce((s, r) => s + r.count, 0);
  res.json({ total, summary });
});

// List users for chat — own agency by default, all when searching
app.get('/chat/users', authenticate, async (req, res) => {
  const { search } = req.query;
  const select = {
    id: true, firstName: true, lastName: true,
    agencyUsers: { include: { agency: { select: { name: true } } }, take: 1 },
  };
  const orderBy = [{ firstName: 'asc' }, { lastName: 'asc' }];

  let where;
  if (search) {
    where = {
      id: { not: req.user.id },
      isActive: true,
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ],
    };
  } else {
    const myAgencyIds = req.user.agencyUsers.map(au => au.agencyId);
    where = {
      id: { not: req.user.id },
      isActive: true,
      agencyUsers: { some: { agencyId: { in: myAgencyIds } } },
    };
  }

  const users = await prisma.user.findMany({ where, select, orderBy });
  res.json(users.map(u => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    agencyName: u.agencyUsers[0]?.agency?.name || null,
  })));
});

// Public chat history (2-month retention)
app.get('/chat/public', authenticate, async (req, res) => {
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const messages = await prisma.chatMessage.findMany({
    where: { isPublic: true, createdAt: { gte: twoMonthsAgo } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  res.json(messages);
});

// Private chat history (also marks as read)
app.get('/chat/private/:otherUserId', authenticate, async (req, res) => {
  const me = req.user.id;
  const other = req.params.otherUserId;

  // Check if user has hidden this conversation
  const hide = await prisma.chatConversationHide.findUnique({
    where: { userId_otherUserId: { userId: me, otherUserId: other } },
  });

  const messages = await prisma.chatMessage.findMany({
    where: {
      isPublic: false,
      OR: [
        { senderId: me, toUserId: other },
        { senderId: other, toUserId: me },
      ],
      ...(hide ? { createdAt: { gt: hide.hiddenAt } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });
  await prisma.chatMessage.updateMany({
    where: { senderId: other, toUserId: me, isRead: false },
    data: { isRead: true },
  });
  res.json(messages);
});

// Delete (hide) a private conversation for the requesting user only
app.delete('/chat/conversations/:otherUserId', authenticate, async (req, res) => {
  const me = req.user.id;
  const other = req.params.otherUserId;
  await prisma.chatConversationHide.upsert({
    where: { userId_otherUserId: { userId: me, otherUserId: other } },
    update: { hiddenAt: new Date() },
    create: { userId: me, otherUserId: other },
  });
  res.json({ ok: true });
});

app.use('/public', publicRoutes);
app.use('/auth', authRoutes);
app.use('/admin/agencies', adminAgenciesRoutes);
app.use('/admin/billing', adminBillingRoutes);
app.use('/admin/agency-contracts', adminAgencyContractsRoutes);
app.use('/admin/users', adminUsersRoutes);
app.use('/admin/access', adminAccessRoutes);
app.use('/admin/settings', adminSettingsRoutes);
app.use('/agencies/:agencyId/cars', agencyCarsRoutes);
app.use('/agencies/:agencyId/contracts', agencyContractsRoutes);
app.use('/agencies/:agencyId/maintenance', agencyMaintenanceRoutes);
app.use('/agencies/:agencyId/checks', agencyChecksRoutes);
app.use('/agencies/:agencyId/financial', agencyFinancialRoutes);
app.use('/agencies/:agencyId/dashboard', agencyDashboardRoutes);
app.use('/agencies/:agencyId/access', agencyAccessRoutes);
app.use('/agencies/:agencyId/clients', agencyClientsRoutes);
app.use('/agencies/:agencyId/partners', agencyPartnersRoutes);
app.use('/agencies/:agencyId/external', agencyExternalRoutes);
app.use('/agencies/:agencyId/requests', agencyRequestsRoutes);
app.use('/agencies/:agencyId/sinistres', agencySinistresRoutes);
app.use('/agencies/:agencyId/profile',   agencyProfileRoutes);
app.use('/agencies/:agencyId/members',   agencyMembersRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
