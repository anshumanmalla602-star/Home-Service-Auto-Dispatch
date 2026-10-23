/**
 * Auth routes: register (customer / technician) and login for all roles.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { asyncHandler, AppError } = require('../utils/helpers');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const signToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

/**
 * POST /api/auth/register
 * Register a customer or technician. Technicians must supply skillCategory
 * and their current location + availability.
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { role, name, email, phone, password, ...extra } = req.body || {};
    if (!['customer', 'technician'].includes(role)) {
      throw new AppError(400, 'role must be "customer" or "technician"');
    }
    if (!name || !email || !password) {
      throw new AppError(400, 'name, email and password are required');
    }
    if (password.length < 6) {
      throw new AppError(400, 'Password must be at least 6 characters');
    }

    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO users (role, name, email, phone, password_hash)
         VALUES ($1, $2, LOWER($3), $4, $5) RETURNING id, role, name, email`,
        [role, name, email, phone || null, hash]
      );
      const user = rows[0];

      if (role === 'customer') {
        await client.query(
          `INSERT INTO customers (user_id, address, default_lat, default_lng)
           VALUES ($1, $2, $3, $4)`,
          [
            user.id,
            extra.address || null,
            extra.latitude != null ? Number(extra.latitude) : null,
            extra.longitude != null ? Number(extra.longitude) : null,
          ]
        );
      } else {
        const { skillCategory, latitude, longitude } = extra;
        if (!skillCategory) {
          throw new AppError(400, 'Technicians must provide a skillCategory');
        }
        if (latitude == null || longitude == null) {
          throw new AppError(400, 'Technicians must provide current latitude/longitude');
        }
        await client.query(
          `INSERT INTO technicians (user_id, skill_category, current_lat, current_lng, availability_status)
           VALUES ($1, $2, $3, $4, 'online')`,
          [user.id, skillCategory, Number(latitude), Number(longitude)]
        );
      }

      await client.query('COMMIT');
      return res.status(201).json({
        token: signToken(user.id),
        user: { id: user.id, role: user.role, name: user.name, email: user.email },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

/**
 * POST /api/auth/login
 * Issue a JWT and the full role profile.
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw new AppError(400, 'email and password are required');
    }
    const { rows } = await pool.query(
      `SELECT u.id, u.role, u.name, u.email, u.phone, u.password_hash,
              u.is_active, c.id AS customer_id, t.id AS technician_id,
              t.skill_category, t.availability_status
         FROM users u
         LEFT JOIN customers c  ON c.user_id = u.id
         LEFT JOIN technicians t ON t.user_id = u.id
        WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    const user = rows[0];
    if (!user) throw new AppError(401, 'Invalid email or password');
    if (!user.is_active) throw new AppError(403, 'Account is deactivated');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new AppError(401, 'Invalid email or password');

    delete user.password_hash;
    return res.json({ token: signToken(user.id), user });
  })
);

/**
 * POST /api/auth/forgot-password
 * Accept an email, generate a password-reset token (valid 15 min),
 * store it in system_logs, and return success (in production this would email the link).
 */
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (!email) throw new AppError(400, 'email is required');

    const { rows } = await pool.query(
      `SELECT id, name FROM users WHERE LOWER(email) = LOWER($1) AND is_active = TRUE`,
      [email]
    );
    if (!rows.length) {
      // Don't reveal whether email exists — always return success
      return res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
    }

    const user = rows[0];
    const resetToken = jwt.sign(
      { sub: user.id, type: 'reset' },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '15m' }
    );
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO system_logs (log_type, message, meta) VALUES ($1, $2, $3)`,
      ['password_reset', `Password reset requested for user ${user.name} (${user.id})`,
       JSON.stringify({ email, resetToken, expiresAt: resetExpires })]
    );

    res.json({
      message: 'If an account exists for this email, a reset link has been sent.',
      // In development, expose the reset token so it can be tested directly:
      ...(process.env.NODE_ENV === 'development' ? { resetToken } : {}),
    });
  })
);

/**
 * POST /api/auth/reset-password
 * Reset password using a valid reset token (from forgot-password).
 */
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { token, password } = req.body || {};
    if (!token || !password) {
      throw new AppError(400, 'token and password are required');
    }
    if (password.length < 6) {
      throw new AppError(400, 'Password must be at least 6 characters');
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    } catch (err) {
      throw new AppError(400, 'Invalid or expired reset token');
    }
    if (payload.type !== 'reset') throw new AppError(400, 'Invalid reset token type');

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, payload.sub]);

    // Invalidate any other reset tokens for this user
    await pool.query(
      `UPDATE system_logs SET message = message || ' [REVOKED]' WHERE log_type = 'password_reset' AND meta->>'email' IS NOT NULL`
    );

    res.json({ message: 'Password reset successful — you can now sign in with your new password.' });
  })
);

/**
 * POST /api/auth/change-password
 * Change password for an authenticated user (requires current password).
 * Header: Authorization: Bearer <jwt>
 * Body: { currentPassword, newPassword }
 */
router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      throw new AppError(400, 'currentPassword and newPassword are required');
    }
    if (newPassword.length < 6) {
      throw new AppError(400, 'New password must be at least 6 characters');
    }

    const { rows } = await pool.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!rows.length) throw new AppError(404, 'User not found');

    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) throw new AppError(401, 'Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    await pool.query(
      `INSERT INTO system_logs (log_type, message, meta) VALUES ($1, $2, $3)`,
      ['password_change', `User ${req.user.id} changed their password`, JSON.stringify({ userId: req.user.id })]
    );

    res.json({ message: 'Password changed successfully.' });
  })
);

module.exports = router;