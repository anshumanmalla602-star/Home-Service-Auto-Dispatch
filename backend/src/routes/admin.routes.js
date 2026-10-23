/**
 * Admin routes: live dashboard, technician monitoring, analytics & reports.
 */
const express = require('express');
const pool = require('../config/db');
const { asyncHandler, AppError } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

// -------------------------------
// GET /api/admin/summary — KPI cards
// -------------------------------
router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM service_requests) AS total_requests,
        (SELECT COUNT(*) FROM service_requests WHERE status = 'pending') AS pending_requests,
        (SELECT COUNT(*) FROM service_requests WHERE status IN ('assigned','on_the_way','in_progress')) AS active_requests,
        (SELECT COUNT(*) FROM service_requests WHERE status = 'completed') AS completed_requests,
        (SELECT COUNT(*) FROM technicians WHERE availability_status IN ('available','online')) AS technicians_available,
        (SELECT COUNT(*) FROM technicians WHERE availability_status IN ('assigned','on_job')) AS technicians_on_job,
        (SELECT ROUND(AVG(response_time_seconds)) FROM service_requests WHERE response_time_seconds IS NOT NULL) AS avg_response_sec,
        (SELECT ROUND(AVG(feedback_rating)::numeric, 2) FROM service_requests WHERE feedback_rating IS NOT NULL) AS avg_rating
      `
    );
    res.json(rows[0]);
  })
);

// -------------------------------
// GET /api/admin/requests — all requests with joins (status filter optional)
// -------------------------------
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    const params = [];
    let where = '';
    if (status && status !== 'all') {
      params.push(status);
      where = `WHERE sr.status = $${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT sr.id, sr.priority, sr.status, sr.requested_at, sr.assigned_at,
              sr.eta_seconds, sr.distance_km, sr.response_time_seconds,
              sr.feedback_rating,
              c.label AS category_label, c.icon AS category_icon,
              cu.name AS customer_name, cu.phone AS customer_phone,
              tu.name AS technician_name, tu.phone AS technician_phone
         FROM service_requests sr
         JOIN service_categories c ON c.id = sr.category_id
         JOIN customers cust ON cust.id = sr.customer_id
         JOIN users cu ON cu.id = cust.user_id
         LEFT JOIN technicians t ON t.id = sr.assigned_technician_id
         LEFT JOIN users tu ON tu.id = t.user_id
         ${where}
        ORDER BY sr.requested_at DESC
        LIMIT 150`,
      params
    );
    res.json(rows);
  })
);

// -------------------------------
// GET /api/admin/requests/:id — full detail incl. dispatch + status logs
// -------------------------------
router.get(
  '/requests/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT sr.*, c.label AS category_label, c.icon AS category_icon,
              cu.name AS customer_name, cu.phone AS customer_phone,
              tu.name AS technician_name, tu.phone AS technician_phone
         FROM service_requests sr
         JOIN service_categories c ON c.id = sr.category_id
         JOIN customers cust ON cust.id = sr.customer_id
         JOIN users cu ON cu.id = cust.user_id
         LEFT JOIN technicians t ON t.id = sr.assigned_technician_id
         LEFT JOIN users tu ON tu.id = t.user_id
        WHERE sr.id = $1`,
      [req.params.id]
    );
    if (!rows.length) throw new AppError(404, 'Request not found');
    const [events, statusLogs] = await Promise.all([
      pool.query(
        `SELECT de.*, tu.name AS technician_name
           FROM dispatch_events de
           LEFT JOIN technicians t ON t.id = de.technician_id
           LEFT JOIN users tu ON tu.id = t.user_id
          WHERE de.request_id = $1 ORDER BY de.created_at`,
        [req.params.id]
      ),
      pool.query(
        'SELECT * FROM status_logs WHERE request_id = $1 ORDER BY changed_at',
        [req.params.id]
      ),
    ]);
    res.json({ ...rows[0], dispatchEvents: events.rows, statusLogs: statusLogs.rows });
  })
);

// -------------------------------
// GET /api/admin/technicians — live availability + location
// -------------------------------
router.get(
  '/technicians',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT t.id, t.skill_category, t.current_lat, t.current_lng,
              t.availability_status, t.rating, t.jobs_completed, t.avg_speed_kmh,
              tu.name, tu.phone, tu.email
         FROM technicians t JOIN users tu ON tu.id = t.user_id
        ORDER BY t.availability_status, t.id`
    );
    res.json(rows);
  })
);

module.exports = router;