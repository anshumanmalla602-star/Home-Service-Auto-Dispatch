/* eslint-disable no-console */
/**
 * DB Reset: drops and recreates the schema from scratch.
 * Usage: npm run db:reset
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'emergency_dispatch';

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
  });
  await client.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.query(sql);
  console.log('[reset] Database dropped and schema re-applied successfully');
  await client.end();
}

main().catch((err) => {
  console.error('[reset] FAILED:', err.message);
  process.exit(1);
});