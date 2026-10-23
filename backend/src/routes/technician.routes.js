/**
 * Technician routes: availability, job notifications (accept/decline),
 * location pings, and job lifecycle (start / complete).
 */
const express = require('express');
const pool = require('../config/db');
const dispatch = require('../services/dispatch.service');
const socket = require('../config/socket');
const { asyncHandler, AppError } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('technician'));

// Load technician profile id onto req
router.use(asyncHandler(async (req, _res, next) => {
  if (req.user.technician_id == null) {
    const { rows } = await pool.query('SELECT id FROM technicians WHERE user_id = $1', [req.user.id]);
    if (!rows.length) throw new AppError(404, 'Technician profile not found');
    req.user.technician_id = rows[0].id;
  }
  next();
}));

// ---------------------------
// GET /api/technician/profile
// ---------------------------
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email, u.phone,
              t.id, t.skill_category, t.current_lat, t.current_lng,
              t.availability_status, t.rating, t.jobs_completed, t.avg_speed_kmh, t.hourly_rate
         FROM users u JOIN technicians t ON t.user_id = u.id
        WHERE t.id = $1`,
      [req.user.technician_id]
    );
    res.json(rows[0]);
  })
);

// ---------------------------
// PUT /api/technician/availability   { status: 'online'|'offline'|'available' }
// ---------------------------
router.put(
  '/availability',
  asyncHandler(async (req, res) => {
    const { status } = req.body || {};
    if (!['online', 'offline', 'available'].includes(status)) {
      throw new AppError(400, 'status must be online, offline or available');
    }
    await pool.query(
      `UPDATE technicians SET availability_status = $1 WHERE id = $2`,
      [status, req.user.technician_id]
    );
    const { rows } = await pool.query(
      'SELECT id, availability_status FROM technicians WHERE id = $1',
      [req.user.technician_id]
    );
    socket.emitToRole('admin', 'admin:technician_status', {
      technicianId: req.user.technician_id,
      name: req.user.name,
      status: rows[0].availability_status,
      at: new Date().toISOString(),
    });
    res.json({ message: 'Availability updated', status: rows[0].availability_status });
  })
);

// ---------------------------
// PUT /api/technician/location   { lat, lng }  (GPS ping)
// ---------------------------
router.put(
  '/location',
  asyncHandler(async (req, res) => {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new AppError(400, 'lat and lng are required');
    }
    await pool.query(
      'UPDATE technicians SET current_lat = $1, current_lng = $2 WHERE id = $3',
      [lat, lng, req.user.technician_id]
    );
    await pool.query(
      'INSERT INTO technician_location_logs (technician_id, latitude, longitude) VALUES ($1,$2,$3)',
      [req.user.technician_id, lat, lng]
    );
    socket.emitToRole('admin', 'admin:technician_location', {
      technicianId: req.user.technician_id, lat, lng, at: new Date().toISOString(),
    });
    res.json({ message: 'Location updated', lat, lng });
  })
);
// ---------------------------
// GET /api/technician/jobs/current      (active / assignable job)
// GET /api/technician/jobs/history
// ---------------------------
router.get(
  '/jobs/current',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT sr.id, sr.title, sr.description, sr.priority, sr.address,
              sr.latitude, sr.longitude, sr.status, sr.requested_at, sr.accepted_at,
              sr.eta_seconds, sr.distance_km,
              c.label AS category_label, c.icon AS category_icon
         FROM service_requests sr
         JOIN service_categories c ON c.id = sr.category_id
        WHERE sr.assigned_technician_id = $1
          AND sr.status IN ('assigned','on_the_way','in_progress')
        ORDER BY sr.requested_at DESC`,
      [req.user.technician_id]
    );
    res.json(rows);
  })
);

router.get(
  '/jobs/history',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT sr.id, sr.title, sr.priority, sr.status, sr.requested_at,
              sr.accepted_at, sr.completed_at, sr.response_time_seconds,
              sr.feedback_rating, c.label AS category_label, c.icon AS category_icon
         FROM service_requests sr
         JOIN service_categories c ON c.id = sr.category_id
        WHERE sr.assigned_technician_id = $1
          AND sr.status IN ('completed','cancelled','reassigned')
        ORDER BY sr.requested_at DESC
        LIMIT 50`,
      [req.user.technician_id]
    );
    res.json(rows);
  })
);

// ---------------------------
// POST /api/technician/jobs/:id/accept   |   /decline
// ---------------------------
router.post(
  '/jobs/:id/accept',
  asyncHandler(async (req, res) => {
    const result = await dispatch.acceptJob(Number(req.params.id), req.user.technician_id);
    if (!result.ok) {
      const msg = {
        not_found: 'Job not found',
        not_assignable: 'Job is no longer assignable',
        not_your_job: 'This job is assigned to another technician',
      }[result.reason];
      throw new AppError(400, msg || 'Could not accept job');
    }
    res.json({ message: 'Job accepted!', responseTimeSeconds: result.responseTimeSeconds });
  })
);

router.post(
  '/jobs/:id/decline',
  asyncHandler(async (req, res) => {
    const result = await dispatch.declineJob(Number(req.params.id), req.user.technician_id);
    res.json({
      message: 'Job declined — dispatch will reassign',
      reassignAttempt: result.ok ? result.attempt : null,
    });
  })
);

// ---------------------------
// POST /api/technician/jobs/:id/start  (arrived at customer premises)
// ---------------------------
router.post(
  '/jobs/:id/start',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `UPDATE service_requests
          SET status = 'in_progress', started_at = NOW()
        WHERE id = $1 AND assigned_technician_id = $2
          AND status = 'on_the_way'
        RETURNING id, status, started_at`,
      [req.params.id, req.user.technician_id]
    );
    if (!rows.length) throw new AppError(400, 'Job not in "on_the_way" state for you');
    await logStatusChange(req.params.id, 'on_the_way', 'in_progress', 'technician', 'Arrived and started work');
    await notifyTrackers(req.params.id);
    res.json({ message: 'Work started', job: rows[0] });
  })
);

// ---------------------------
// POST /api/technician/jobs/:id/complete
// ---------------------------
router.post(
  '/jobs/:id/complete',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `UPDATE service_requests
          SET status = 'completed', completed_at = NOW()
        WHERE id = $1 AND assigned_technician_id = $2
          AND status = 'in_progress'
        RETURNING id, status, completed_at`,
      [req.params.id, req.user.technician_id]
    );
    if (!rows.length) throw new AppError(400, 'Job not in "in_progress" state for you');

    // Bump stats and free the technician up
    await pool.query(
      `UPDATE technicians SET jobs_completed = jobs_completed + 1, availability_status = 'available'
        WHERE id = $1`,
      [req.user.technician_id]
    );
    await logStatusChange(req.params.id, 'in_progress', 'completed', 'technician', 'Job completed');
    await notifyTrackers(req.params.id);
    res.json({ message: 'Job completed — technician released for new jobs', job: rows[0] });
  })
);

// --------------------------- helpers ---------------------------
async function logStatusChange(requestId, oldStatus, newStatus, actor, note) {
  await pool.query(
    `INSERT INTO status_logs (request_id, old_status, new_status, actor, note)
     VALUES ($1,$2,$3,$4,$5)`,
    [requestId, oldStatus, newStatus, actor, note]
  );
}

async function notifyTrackers(requestId) {
  const { rows } = await pool.query(
    `SELECT sr.id, sr.status, cu.user_id AS customer_user_id
       FROM service_requests sr JOIN customers cu ON cu.id = sr.customer_id
      WHERE sr.id = $1`,
    [requestId]
  );
  if (!rows.length) return;
  socket.emitToUser(rows[0].customer_user_id, 'request:update', {
    requestId: rows[0].id,
    status: rows[0].status,
    at: new Date().toISOString(),
  });
}

module.exports = router;