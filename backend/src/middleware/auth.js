/**
 * Authentication & role-based access middleware.
 * - authenticate: verifies JWT, loads the user (with customer/technician ids).
 * - requireRole: grants access only to listed roles.
 */
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const { rows } = await pool.query(
      `SELECT u.id, u.role, u.name, u.email, u.phone,
              c.id AS customer_id, t.id AS technician_id
         FROM users u
         LEFT JOIN customers c  ON c.user_id = u.id
         LEFT JOIN technicians t ON t.user_id = u.id
        WHERE u.id = $1 AND u.is_active = TRUE`,
      [payload.sub]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    req.user = rows[0];
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied for your role' });
  }
  return next();
};

module.exports = { authenticate, requireRole };