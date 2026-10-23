/* eslint-disable no-console */
/**
 * DB Setup: creates the database (if missing) and applies schema.sql.
 * Usage: npm run db:setup
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'emergency_dispatch';

async function main() {
  // 1) Connect to the default 'postgres' database to create our DB
  const adminClient = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });
  await adminClient.connect();

  const exists = await adminClient.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [DB_NAME]
  );
  if (exists.rowCount === 0) {
    // pg prevents parameterization for CREATE DATABASE; validated DB_NAME above
    await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`[setup] Created database "${DB_NAME}"`);
  } else {
    console.log(`[setup] Database "${DB_NAME}" already exists`);
  }
  await adminClient.end();

  // 2) Apply schema
  const schemaClient = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
  });
  await schemaClient.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await schemaClient.query(sql);
  console.log('[setup] Schema applied successfully');
  await schemaClient.end();
}

main().catch((err) => {
  console.error('[setup] FAILED:', err.message);
  process.exit(1);
});