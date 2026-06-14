let _io = null;
// userId → { socketId, agencyIds: string[] }
const _userSockets = new Map();

module.exports = {
  init(io) {
    _io = io;
  },

  registerUser(userId, socketId, agencyIds) {
    _userSockets.set(userId, { socketId, agencyIds });
  },

  unregisterUser(userId) {
    _userSockets.delete(userId);
  },

  // Emit to all online members of an agency except the sender
  emitToAgency(agencyId, event, data, excludeUserId = null) {
    if (!_io) return;
    for (const [userId, { socketId, agencyIds }] of _userSockets) {
      if (userId !== excludeUserId && agencyIds.includes(agencyId)) {
        _io.to(socketId).emit(event, data);
      }
    }
  },
};
