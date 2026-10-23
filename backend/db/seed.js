/* eslint-disable no-console */
/**
 * Seed: populates demo users (admin/customers/technicians), categories, locations.
 * Usage: npm run db:seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DB_NAME = process.env.DB_NAME || 'emergency_dispatch';

// Bhubaneswar area anchors for realistic GPS spread
const CENTER = { lat: 20.2961, lng: 85.8245 };
const jitter = (km) => (km / 111.32) * (Math.random() - 0.5) * 2;

const CATEGORIES = [
  { code: 'plumbing', label: 'Plumbing & Leak Repair', icon: '🚰', description: 'Burst pipes, leaks, drainage blockages', base_price: 499 },
  { code: 'electrical', label: 'Electrical Repair', icon: '⚡', description: 'Power failure, short circuit, wiring faults', base_price: 549 },
  { code: 'ac', label: 'AC & Refrigeration', icon: '❄️', description: 'AC breakdown, gas refill, servicing', base_price: 699 },
  { code: 'appliance', label: 'Appliance Repair', icon: '🔧', description: 'Fridge, washing machine, microwave repair', base_price: 449 },
  { code: 'pest', label: 'Pest Control', icon: '🐜', description: 'Emergency pest and rodent control', base_price: 799 },
  { code: 'security', label: 'Locksmith & Security', icon: '🔐', description: 'Lockouts, broken locks, security setup', base_price: 399 },
];

const TECHNICIANS = [
  { name: 'Ramesh Patra',   email: 'ramesh@tech.com',   cat: 'plumbing',  lat: 5, lng: 3,  rate: 49 },
  { name: 'Suresh Behera',  email: 'suresh@tech.com',   cat: 'plumbing',  lat: -4, lng: 6,  rate: 52 },
  { name: 'Anil Mohanty',   email: 'anil@tech.com',     cat: 'electrical', lat: 8, lng: -2, rate: 55 },
  { name: 'Priya Das',      email: 'priya@tech.com',    cat: 'electrical', lat: -6, lng: -7, rate: 50 },
  { name: 'Deepak Nayak',   email: 'deepak@tech.com',   cat: 'ac',        lat: 10, lng: 5, rate: 60 },
  { name: 'Bikash Jena',    email: 'bikash@tech.com',   cat: 'ac',        lat: 3, lng: -5, rate: 58 },
  { name: 'Prakash Sahoo',  email: 'prakash@tech.com',  cat: 'appliance', lat: -8, lng: 4, rate: 45 },
  { name: 'Sunita Panda',   email: 'sunita@tech.com',   cat: 'appliance', lat: 6, lng: 8, rate: 47 },
  { name: 'Manoj Swain',    email: 'manoj@tech.com',    cat: 'pest',      lat: -3, lng: 9, rate: 65 },
  { name: 'Kunal Mahapatra',email: 'kunal@tech.com',    cat: 'security',  lat: 11, lng: -6, rate: 42 },
];

const CUSTOMERS = [
  { name: 'Arpita Mishra', email: 'arpita@cust.com', lat: 2, lng: 1, address: 'Bapuji Nagar, Bhubaneswar' },
  { name: 'Sourav Panda',  email: 'sourav@cust.com', lat: -2, lng: -3, address: 'Saheed Nagar, Bhubaneswar' },
  { name: 'Meghna Rath',   email: 'meghna@cust.com', lat: 5, lng: -4, address: 'Jaydev Vihar, Bhubaneswar' },
];

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);

  // Admin
  await client.query(
    `INSERT INTO users (role, name, email, phone, password_hash) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
    ['admin', 'System Admin', 'admin@dispatch.com', '9000000000', hash]
  );

  // Categories
  for (const c of CATEGORIES) {
    await client.query(
      `INSERT INTO service_categories (code,label,icon,description,base_price)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO NOTHING`,
      [c.code, c.label, c.icon, c.description, c.base_price]
    );
  }
  const catRows = await client.query('SELECT id, code FROM service_categories');
  const catId = Object.fromEntries(catRows.rows.map((r) => [r.code, r.id]));

  // Technicians
  for (const t of TECHNICIANS) {
    const { rows } = await client.query(
      `INSERT INTO users (role, name, email, phone, password_hash) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      ['technician', t.name, t.email, '9' + String(Math.floor(100000000 + Math.random() * 899999999)), hash]
    );
    const lat = CENTER.lat + jitter(t.lat);
    const lng = CENTER.lng + jitter(t.lng);
    await client.query(
      `INSERT INTO technicians (user_id, skill_category, current_lat, current_lng, availability_status, hourly_rate)
       VALUES ($1,$2,$3,$4,'available',$5)
       ON CONFLICT (user_id) DO UPDATE
         SET skill_category = EXCLUDED.skill_category,
             current_lat = EXCLUDED.current_lat,
             current_lng = EXCLUDED.current_lng,
             availability_status = 'available'`,
      [rows[0].id, t.cat, lat, lng, t.rate]
    );
  }

  // Customers
  for (const c of CUSTOMERS) {
    const { rows } = await client.query(
      `INSERT INTO users (role, name, email, phone, password_hash) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      ['customer', c.name, c.email, '8' + String(Math.floor(100000000 + Math.random() * 899999999)), hash]
    );
    await client.query(
      `INSERT INTO customers (user_id, address, default_lat, default_lng)
       VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO NOTHING`,
      [rows[0].id, c.address, CENTER.lat + jitter(c.lat), CENTER.lng + jitter(c.lng)]
    );
  }

  const summary = await client.query(
    `SELECT (SELECT COUNT(*) FROM users) users,
            (SELECT COUNT(*) FROM technicians) technicians,
            (SELECT COUNT(*) FROM customers) customers,
            (SELECT COUNT(*) FROM service_categories) categories`
  );
  console.log('[seed] Done:', summary.rows[0]);
  console.log('[seed] All accounts use password: password123');
  console.log('[seed] Admin login: admin@dispatch.com');

  await client.end();
}

main().catch((err) => {
  console.error('[seed] FAILED:', err.message);
  process.exit(1);
});