/**
 * AUTO-DISPATCH ENGINE (Core Module)
 *
 * Algorithm:
 *  1. Load the request; guard against double-dispatch.
 *  2. Scan technicians whose skill category matches the request, whose
 *     availability_status = 'available' and who sit inside the dispatch radius.
 *  3. Compute the fastest route (road-adjusted distance / avg speed) for each.
 *  4. Assign the fastest technician, push a real-time job notification.
 *  5. Start an acceptance timer; if the job is not accepted within the
 *     timeout, automatically reassign to the next-fastest candidate.
 */
const pool = require('../config/db');
const socket = require('../config/socket');
const geo = require('../utils/geo');

const DISPATCH_RADIUS_KM = Number(process.env.DISPATCH_RADIUS_KM) || 25;
const ACCEPT_TIMEOUT_SECONDS = Number(process.env.DISPATCH_ACCEPT_TIMEOUT_SECONDS) || 60;

// requestId -> timer handle
const pendingTimers = new Map();

// ---------------------------------------------------------------------------
// Small DB helpers
// ---------------------------------------------------------------------------
const logDispatch = (requestId, technicianId, attempt, event, detail) =>
  pool.query(
    `INSERT INTO dispatch_events (request_id, technician_id, attempt, event, detail)
     VALUES ($1, $2, $3, $4, $5)`,
    [requestId, technicianId || null, attempt, event || null, detail || null]
  );

const logStatus = (requestId, oldStatus, newStatus, actor, note) =>
  pool.query(
    `INSERT INTO status_logs (request_id, old_status, new_status, actor, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [requestId, oldStatus, newStatus, actor || 'system', note || null]
  );

const logSystem = (msg) =>
  pool.query(
    `INSERT INTO system_logs (log_type, message) VALUES ('dispatch', $1)`,
    [msg]
  );

// ---------------------------------------------------------------------------
// Candidate ranking for a request
// ---------------------------------------------------------------------------
const computeRoute = (cLat, cLng, tLat, tLng, avgSpeedKmh) => {
  const distKm = geo.estimateDriveKm(cLat, cLng, tLat, tLng);
  const etaSec = geo.travelTimeSeconds(distKm, avgSpeedKmh || 30);
  return { distKm: Math.round(distKm * 100) / 100, etaSec };
};

async function findCandidates(categoryId, lat, lng, radiusKm) {
  const { rows } = await pool.query(
    `SELECT t.id, t.user_id, u.name, u.phone, u.email,
            t.skill_category, t.current_lat, t.current_lng,
            t.avg_speed_kmh, t.rating, t.jobs_completed,
            (earth_distance(ll_to_earth($1, $2),
                            ll_to_earth(t.current_lat, t.current_lng)) / 1000.0) AS straight_km
       FROM technicians t
       JOIN users u ON u.id = t.user_id
      WHERE t.skill_category = (SELECT code FROM service_categories WHERE id = $3)
        AND t.availability_status = 'available'
        AND earth_distance(ll_to_earth($1, $2),
                           ll_to_earth(t.current_lat, t.current_lng)) / 1000.0 <= $4
      ORDER BY straight_km ASC`,
    [lat, lng, categoryId, radiusKm]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Core dispatch flow
// ---------------------------------------------------------------------------
async function dispatchRequest(requestId) {
  const { rows } = await pool.query(
    `SELECT sr.*, c.code AS category_code, c.label AS category_label,
            cu.user_id AS customer_user_id,
            u.name AS customer_name, u.phone AS customer_phone
       FROM service_requests sr
       JOIN service_categories c ON c.id = sr.category_id
       JOIN customers cu ON cu.id = sr.customer_id
       JOIN users u ON u.id = cu.user_id
      WHERE sr.id = $1`,
    [requestId]
  );
  const req = rows[0];
  if (!req) return { ok: false, reason: 'not_found' };
  if (!['pending', 'reassigned'].includes(req.status)) {
    return { ok: false, reason: 'already_handled', status: req.status };
  }

  const attemptResult = await pool.query(
    'SELECT COALESCE(MAX(attempt), 0) AS n FROM dispatch_events WHERE request_id = $1',
    [requestId]
  );
  const attempt = attemptResult.rows[0].n + 1;

  const candidates = await findCandidates(
    req.category_id,
    Number(req.latitude),
    Number(req.longitude),
    DISPATCH_RADIUS_KM
  );

  const ranked = candidates
    .map((t) => {
      const route = computeRoute(
        Number(req.latitude), Number(req.longitude),
        Number(t.current_lat), Number(t.current_lng),
        t.avg_speed_kmh
      );
      return { ...t, ...route };
    })
    .sort((a, b) => a.etaSec - b.etaSec);

  const best = ranked[0];

  if (!best) {
    await logDispatch(requestId, null, attempt, 'cancelled', 'No available technician within radius');
    await pool.query(
      'UPDATE service_requests SET status = $2 WHERE id = $1',
      [requestId, 'cancelled']
    );
    await logStatus(requestId, req.status, 'cancelled', 'system', 'Auto-dispatch: no technician available in radius');
    socket.emitToUser(req.customer_user_id, 'request:update', {
      requestId,
      status: 'cancelled',
      note: 'No technician available nearby right now. Please try again shortly.',
    });
    socket.emitToRole('admin', 'admin:dispatch', {
      type: 'no_technician',
      requestId,
      category: req.category_label,
      message: 'No available technician within radius',
    });
    return { ok: false, reason: 'no_candidates' };
  }

  // Assign the fastest technician
  await pool.query(
    `UPDATE service_requests
        SET assigned_technician_id = $1, assigned_at = NOW(),
            status = 'assigned', eta_seconds = $2, distance_km = $3
      WHERE id = $4`,
    [best.id, best.etaSec, best.distKm, requestId]
  );
  await pool.query('UPDATE technicians SET availability_status = $2 WHERE id = $1', [best.id, 'on_job']);
  await logDispatch(requestId, best.id, attempt, 'assigned',
    `Fastest candidate — ${best.name}, ETA ~${Math.round(best.etaSec / 60)} min`);
  await logStatus(requestId, req.status, 'assigned', 'system', `Auto-assigned to ${best.name}`);
  await logSystem(`Request #${requestId}: assigned to #${best.id} (${best.name}) on attempt ${attempt}`);

  // Arm the acceptance timeout → auto-reassign
  armAcceptanceTimer(requestId, best.id, attempt);

  // Real-time notifications
  const jobPayload = {
    requestId,
    attempt,
    title: req.title || req.category_label,
    category: req.category_label,
    description: req.description,
    priority: req.priority,
    address: req.address,
    customerLat: Number(req.latitude),
    customerLng: Number(req.longitude),
    customerName: req.customer_name,
    customerPhone: req.customer_phone,
    etaSeconds: best.etaSec,
    distanceKm: best.distKm,
    acceptDeadlineSec: ACCEPT_TIMEOUT_SECONDS,
  };
  socket.emitToUser(best.user_id, 'job:assigned', jobPayload);
  socket.emitToUser(req.customer_user_id, 'request:update', {
    requestId,
    status: 'assigned',
    technician: { id: best.id, name: best.name, phone: best.phone, rating: Number(best.rating) },
    etaSeconds: best.etaSec,
    distanceKm: best.distKm,
  });
  socket.emitToRole('admin', 'admin:dispatch', {
    type: 'assigned', requestId, technician: best.name,
    category: req.category_label, etaSeconds: best.etaSec, priority: req.priority,
  });

  return { ok: true, attempt, technician: best, etaSeconds: best.etaSec, distanceKm: best.distKm };
}
// ---------------------------------------------------------------------------
// Acceptance window + auto-reassignment
// ---------------------------------------------------------------------------
function armAcceptanceTimer(requestId, technicianId, attempt) {
  clearPendingTimer(requestId);
  const timer = setTimeout(() => handleNoAccept(requestId, technicianId, attempt), ACCEPT_TIMEOUT_SECONDS * 1000);
  pendingTimers.set(requestId, timer);
  if (timer.unref) timer.unref();
}

function clearPendingTimer(requestId) {
  const existing = pendingTimers.get(requestId);
  if (existing) {
    clearTimeout(existing);
    pendingTimers.delete(requestId);
  }
}

async function handleNoAccept(requestId, technicianId, attempt) {
  pendingTimers.delete(requestId);
  const { rows } = await pool.query(
    'SELECT status, assigned_technician_id FROM service_requests WHERE id = $1',
    [requestId]
  );
  const req = rows[0];
  // Only act if this tech is still the assigned one and hasn't accepted
  if (!req || req.status !== 'assigned' || req.assigned_technician_id !== technicianId) return;

  await logDispatch(requestId, technicianId, attempt, 'timed_out', 'Did not accept within time limit');
  await pool.query('UPDATE technicians SET availability_status = $2 WHERE id = $1', [technicianId, 'available']);
  await pool.query(
    `UPDATE service_requests
        SET assigned_technician_id = NULL, assigned_at = NULL,
            status = 'reassigned', eta_seconds = NULL, distance_km = NULL
      WHERE id = $1`,
    [requestId]
  );
  await logStatus(requestId, 'assigned', 'reassigned', 'system', 'Auto-reassign: not accepted in time');
  await logSystem(`Request #${requestId}: technician #${technicianId} timed out, reassigning`);

  socket.emitToRole('admin', 'admin:dispatch', {
    type: 'reassign', requestId, technicianId,
    note: 'Technician timed out — reassigning',
  });

  return dispatchRequest(requestId); // next-fastest candidate, attempt+1
}

// ---------------------------------------------------------------------------
// Technician accept / decline (called from routes)
// ---------------------------------------------------------------------------
async function acceptJob(requestId, technicianId) {
  clearPendingTimer(requestId);
  const { rows } = await pool.query(
    `SELECT sr.*, cu.user_id AS customer_user_id
       FROM service_requests sr
       JOIN customers cu ON cu.id = sr.customer_id
      WHERE sr.id = $1`,
    [requestId]
  );
  const req = rows[0];
  if (!req) return { ok: false, reason: 'not_found' };
  if (req.status !== 'assigned') return { ok: false, reason: 'not_assignable', status: req.status };
  if (req.assigned_technician_id !== technicianId) {
    return { ok: false, reason: 'not_your_job' };
  }

  const responseSec = Math.max(
    0,
    Math.round((Date.now() - new Date(req.requested_at).getTime()) / 1000)
  );

  await pool.query(
    `UPDATE service_requests
        SET accepted_at = NOW(), response_time_seconds = $2, status = 'on_the_way'
      WHERE id = $1`,
    [requestId, responseSec]
  );
  await logDispatch(requestId, technicianId, 0, 'accepted', `Accepted in ${responseSec}s`);
  await logStatus(requestId, 'assigned', 'on_the_way', 'technician', 'Job accepted — en route');

  socket.emitToUser(req.customer_user_id, 'request:update', {
    requestId, status: 'on_the_way',
    accepted: true, responseTimeSeconds: responseSec,
    note: 'Technician accepted your job and is on the way',
  });
  socket.emitToRole('admin', 'admin:dispatch', {
    type: 'accepted', requestId, technicianId,
    responseTimeSeconds: responseSec,
  });

  return { ok: true, responseTimeSeconds: responseSec };
}

async function declineJob(requestId, technicianId) {
  clearPendingTimer(requestId);
  const { rows } = await pool.query(
    'SELECT status, assigned_technician_id FROM service_requests WHERE id = $1',
    [requestId]
  );
  const req = rows[0];
  if (!req || req.status !== 'assigned') return { ok: false, reason: 'not_assignable' };

  await logDispatch(requestId, technicianId, 0, 'declined', 'Technician declined the job');
  await pool.query('UPDATE technicians SET availability_status = $2 WHERE id = $1', [technicianId, 'available']);
  await pool.query(
    `UPDATE service_requests
        SET assigned_technician_id = NULL, assigned_at = NULL,
            status = 'reassigned', eta_seconds = NULL, distance_km = NULL
      WHERE id = $1`,
    [requestId]
  );
  await logStatus(requestId, 'assigned', 'reassigned', 'technician', 'Technician declined');
  await logSystem(`Request #${requestId}: declined by tech #${technicianId}, reassigning`);

  return dispatchRequest(requestId);
}

/** Cancel the acceptance timer when a technician accepts/declines. */
function cancelPendingTimer(requestId) {
  clearPendingTimer(requestId);
}

module.exports = {
  dispatchRequest,
  acceptJob,
  declineJob,
  cancelPendingTimer,
  findCandidates,
  computeRoute,
};