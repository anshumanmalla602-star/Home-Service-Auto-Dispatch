/**
 * Socket.io real-time layer.
 * - Authenticates every socket using the JWT from the handshake.
 * - Rooms: `user:{id}` (personal), `role:{role}` (role broadcast).
 * - Event bus used by the dispatch engine to push job notifications,
 *   live technician locations, ETA updates and admin dashboard feeds.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('./db');

let io = null;

function initIo(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
    },
  });

  // --- handshake auth ---
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      socket.userId = payload.sub;
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.role, u.name, t.id AS technician_id
           FROM users u
           LEFT JOIN technicians t ON t.user_id = u.id
          WHERE u.id = $1 AND u.is_active = TRUE`,
        [socket.userId]
      );
      if (!rows.length) return socket.disconnect(true);
      socket.user = rows[0];
      socket.join(`user:${socket.user.id}`);
      socket.join(`role:${socket.user.role}`);
      console.log(`[ws] ${socket.user.role}:${socket.user.name} connected (${socket.user.id})`);

      // Live technician GPS ping
      socket.on('location:update', async (payload) => {
        if (socket.user.role !== 'technician' || socket.user.technicianId == null) return;
        await handleLocationUpdate(socket, payload);
      });

      socket.on('disconnect', () => {
        console.log(`[ws] ${socket.user.name} disconnected`);
      });
    } catch (err) {
      console.error('[ws] connection setup failed:', err.message);
      socket.disconnect(true);
    }
  });

  return io;
}

/**
 * Persist a technician's live coordinate, log it, then propagate to
 * the admin dashboard and, if a job is active, to the waiting customer.
 */
async function handleLocationUpdate(socket, payload) {
  const lat = Number(payload && payload.lat);
  const lng = Number(payload && payload.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const techId = socket.user.technicianId;

  // Resolve technician profile id if not attached (fallback path)
  let tid = techId;
  let t;
  if (tid == null) {
    const { rows } = await pool.query(
      'SELECT id FROM technicians WHERE user_id = $1',
      [socket.user.id]
    );
    if (!rows.length) return;
    t = rows[0];
    socket.user.technicianId = t.id;
    tid = t.id;
  }

  await pool.query(
    'UPDATE technicians SET current_lat = $1, current_lng = $2 WHERE id = $3',
    [lat, lng, tid]
  );
  await pool.query(
    `INSERT INTO technician_location_logs (technician_id, latitude, longitude)
     VALUES ($1, $2, $3)`,
    [tid, lat, lng]
  );

  const update = { technicianId: tid, lat, lng, at: new Date().toISOString() };
  io.to('role:admin').emit('admin:technician_location', update);

  // Customer live tracking: if the tech is en route / working on a request
  const { rows: active } = await pool.query(
    `SELECT sr.id, sr.latitude AS c_lat, sr.longitude AS c_lng, sr.status,
            sr.customer_id, cu.user_id AS customer_user_id,
            t.current_lat, t.current_lng, t.avg_speed_kmh
       FROM service_requests sr
       JOIN technicians t ON t.id = sr.assigned_technician_id
       JOIN customers cu ON cu.id = sr.customer_id
      WHERE sr.assigned_technician_id = $1
        AND sr.status IN ('assigned', 'on_the_way', 'in_progress')`,
    [tid]
  );
  for (const r of active) {
    if (!r.customer_user_id) continue;
    const { estimateDriveKm, travelTimeSeconds } = require('../utils/geo');
    const distKm = estimateDriveKm(
      Number(r.current_lat), Number(r.current_lng),
      Number(r.c_lat), Number(r.c_lng)
    );
    const etaSec = travelTimeSeconds(distKm, r.avg_speed_kmh || 30);
    io.to(`user:${r.customer_user_id}`).emit('request:tracking', {
      requestId: r.id,
      technicianLat: Number(r.current_lat),
      technicianLng: Number(r.current_lng),
      remainingDistanceKm: Math.round(distKm * 100) / 100,
      etaSeconds: etaSec,
      status: r.status,
      at: new Date().toISOString(),
    });
  }
}

/** Room-scoped emit helpers used by services/routes. */
const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};
const emitToRole = (role, event, payload) => {
  if (io) io.to(`role:${role}`).emit(event, payload);
};
const emitAll = (event, payload) => {
  if (io) io.emit(event, payload);
};

/** Fetch a technician's profile id by user id (for socket-side joins). */
const getTechnicianId = async (userId) => {
  const { rows } = await pool.query('SELECT id FROM technicians WHERE user_id = $1', [userId]);
  return rows.length ? rows[0].id : null;
};

module.exports = { initIo, emitToUser, emitToRole, emitAll, getTechnicianId };