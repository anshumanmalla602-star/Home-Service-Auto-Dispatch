/**
 * Emergency Home Services Auto-Dispatch System — API server entry point.
 *
 * Boots Express (REST) + Socket.io (real-time) and wires all role routes.
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');

const { initIo } = require('./config/socket');
const { notFound, errorHandler } = require('./utils/helpers');

const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const technicianRoutes = require('./routes/technician.routes');
const adminRoutes = require('./routes/admin.routes');
const analyticsRoutes = require('./routes/analytics.routes');

const app = express();
const server = http.createServer(app);

// Real-time layer (Socket.io) shares the same HTTP server
initIo(server);

// ---------- Middleware ----------
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
];

app.use(
  cors({
    origin: allowedOrigins.filter(Boolean),
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ---------- Static uploads ----------
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ---------- Health ----------
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'emergency-dispatch-api', time: new Date().toISOString() })
);

// ---------- Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/technician', technicianRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', analyticsRoutes); // /api/admin/analytics

// ---------- 404 + errors ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Boot ----------
const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`[api] Emergency Dispatch API listening on http://localhost:${PORT}`);
  console.log(`[api] Health: http://localhost:${PORT}/api/health`);
});

module.exports = { app, server };