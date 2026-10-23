/**
 * Customer routes: categories, emergency requests, tracking, history, feedback.
 */
const express = require('express');
const multipart = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const dispatch = require('../services/dispatch.service');
const { asyncHandler, AppError } = require('../utils/helpers');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Image upload support for issue photos
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multipart.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multipart({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);
router.use(requireRole('customer'));

// ---------------------------
// GET /api/customer/categories
// ---------------------------
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const { rows } = await pool.query(
      'SELECT id, code, label, icon, description, base_price FROM service_categories ORDER BY id'
    );
    res.json(rows);
  })
);

// ---------------------------
// GET /api/customer/profile
// ---------------------------
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, c.address, c.default_lat, c.default_lng,
              c.emergency_contact
         FROM users u JOIN customers c ON c.user_id = u.id
        WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(rows[0]);
  })
);

// ---------------------------
// PUT /api/customer/profile
// ---------------------------
router.put(
  '/profile',
  asyncHandler(async (req, res) => {
    const { name, phone, address, latitude, longitude, emergencyContact } = req.body || {};
    await pool.query(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone) WHERE id = $3`,
      [name || null, phone || null, req.user.id]
    );
    await pool.query(
      `UPDATE customers
          SET address = COALESCE($1, address),
              default_lat = COALESCE($2, default_lat),
              default_lng = COALESCE($3, default_lng),
              emergency_contact = COALESCE($4, emergency_contact)
        WHERE user_id = $5`,
      [address || null, latitude != null ? Number(latitude) : null,
       longitude != null ? Number(longitude) : null, emergencyContact || null, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  })
);

// ---------------------------
// POST /api/customer/requests   -> raises request & triggers AUTO-DISPATCH
// body: categoryId, latitude, longitude, address?, title?, description?,
//       priority ('emergency'|'high'|'normal'), image file "image" (optional)
// ---------------------------
router.post(
  '/requests',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { categoryId, latitude, longitude } = req.body || {};
    if (!categoryId || latitude == null || longitude == null) {
      throw new AppError(400, 'categoryId, latitude and longitude are required');
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new AppError(400, 'Invalid coordinates');
    }

    const { rows: custRows } = await pool.query(
      'SELECT id FROM customers WHERE user_id = $1',
      [req.user.id]
    );
    if (!custRows.length) throw new AppError(404, 'Customer profile not found');
    const customerId = custRows[0].id;

    const priority = req.body.priority || 'normal';
    if (!['emergency', 'high', 'normal', 'low'].includes(priority)) {
      throw new AppError(400, 'Invalid priority value');
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const { rows } = await pool.query(
      `INSERT INTO service_requests
         (customer_id, category_id, title, description, image_url,
          latitude, longitude, address, priority, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       RETURNING *`,
      [
        customerId, categoryId, req.body.title || null, req.body.description || null,
        imageUrl, lat, lng, req.body.address || null, priority,
      ]
    );
    const request = rows[0];

    res.status(201).json({
      message: 'Request raised — dispatch engine running',
      request,
    });

    // Fire the auto-dispatch engine (async, response already sent)
    dispatch.dispatchRequest(request.id).catch((err) => console.error('[dispatch] error:', err.message));
  })
);

// ---------------------------
// GET /api/customer/requests            (my history)
// GET /api/customer/requests/:id        (with tracking details)
// ---------------------------
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT sr.*, c.label AS category_label, c.icon AS category_icon,
              tu.name AS technician_name, tu.phone AS technician_phone, t.rating AS technician_rating
         FROM service_requests sr
         JOIN service_categories c ON c.id = sr.category_id
         LEFT JOIN technicians t ON t.id = sr.assigned_technician_id
         LEFT JOIN users tu ON tu.id = t.user_id
        WHERE sr.customer_id = (SELECT id FROM customers WHERE user_id = $1)
        ORDER BY sr.requested_at DESC
        LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  })
);

router.get(
  '/requests/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT sr.*, c.label AS category_label, c.icon AS category_icon,
              tu.name AS technician_name, tu.phone AS technician_phone, t.rating AS technician_rating,
              t.current_lat AS technician_lat, t.current_lng AS technician_lng
         FROM service_requests sr
         JOIN service_categories c ON c.id = sr.category_id
         LEFT JOIN technicians t ON t.id = sr.assigned_technician_id
         LEFT JOIN users tu ON tu.id = t.user_id
        WHERE sr.id = $1
          AND sr.customer_id = (SELECT id FROM customers WHERE user_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) throw new AppError(404, 'Request not found');
    res.json(rows[0]);
  })
);

// ---------------------------
// POST /api/customer/requests/:id/feedback
// ---------------------------
router.post(
  '/requests/:id/feedback',
  asyncHandler(async (req, res) => {
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'rating must be an integer between 1 and 5');
    }
    const { rows } = await pool.query(
      `UPDATE service_requests
          SET feedback_rating = $2, feedback_comment = $3
        WHERE id = $1
          AND customer_id = (SELECT id FROM customers WHERE user_id = $4)
        RETURNING id, feedback_rating`,
      [req.params.id, rating, req.body?.comment || null, req.user.id]
    );
    if (!rows.length) throw new AppError(404, 'Request not found');
    res.json({ message: 'Feedback submitted — thank you!', rating });
  })
);

module.exports = router;