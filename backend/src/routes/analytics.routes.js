/**
 * Analytics & reports: response-time trends, category breakdown, daily volume.
 */
const express = require('express');
const pool = require('../config/db');
const { asyncHandler } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

// ---------------------------------------------------------------------------
// GET /api/admin/analytics
// Returns headline KPIs + trend data for the reports view.
// ---------------------------------------------------------------------------
router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 365);

    const [kpi, catTrend, dailyTrend] = await Promise.all([
      pool.query(
        `SELECT
          (SELECT ROUND(AVG(response_time_seconds) FILTER
                 (WHERE response_time_seconds IS NOT NULL))::int
             FROM service_requests) AS avg_response_sec,
          (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') /
                   NULLIF(COUNT(*), 0), 1)::float
             FROM service_requests) AS completion_rate_pct,
          (SELECT ROUND(100.0 *
                   (COUNT(*) FILTER (WHERE status = 'completed'))::numeric /
                   NULLIF(COUNT(*) FILTER (WHERE assigned_technician_id IS NOT NULL), 0), 1)::float
             FROM service_requests) AS dispatch_accuracy_pct,
          (SELECT ROUND(AVG(feedback_rating)::numeric, 2)::float
             FROM service_requests WHERE feedback_rating IS NOT NULL) AS avg_rating,
          (SELECT COUNT(*) FROM dispatch_events WHERE event = 'reassigned') AS reassignment_count`
      ),
      pool.query(
        `SELECT sc.label, COUNT(sr.id) AS request_count, ROUND(AVG(sr.response_time_seconds) FILTER
                 (WHERE sr.response_time_seconds IS NOT NULL))::int AS avg_response_sec
           FROM service_categories sc
           LEFT JOIN service_requests sr ON sr.category_id = sc.id
           AND sr.requested_at > NOW() - ($1::int * INTERVAL '1 day')
          GROUP BY sc.id, sc.label
          ORDER BY request_count DESC`,
        [days]
      ),
      pool.query(
        `SELECT to_char(requested_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
                COUNT(*) AS request_count,
                COUNT(*) FILTER (WHERE status IN ('assigned','on_the_way','in_progress','completed')) AS dispatched_count
           FROM service_requests
          WHERE requested_at > NOW() - ($1::int * INTERVAL '1 day')
          GROUP BY day
          ORDER BY day`,
        [days]
      ),
    ]);

    res.json({
      kpi: kpi.rows[0],
      byCategory: catTrend.rows,
      dailyTrend: dailyTrend.rows,
      periodDays: days,
      generatedAt: new Date().toISOString(),
    });
  })
);

module.exports = router;