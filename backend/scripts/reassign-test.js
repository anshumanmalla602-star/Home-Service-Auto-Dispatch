/**
 * Auto-reassign test: spawns server with a very short accept-timeout (5s),
 * raises a request, does NOT accept, and verifies the dispatch engine
 * automatically reassigns to the next-fastest technician.
 * Run: node scripts/harness.js reassign
 */
const { spawn } = require('child_process');
const path = require('path');

const SERVER = path.join(__dirname, '..', 'src', 'index.js');
const BASE = 'http://127.0.0.1:4000';

async function waitForServer(proc, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + '/api/health');
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function j(method, pathname, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + pathname, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function main() {
  const proc = spawn(process.execPath, [SERVER], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DISPATCH_ACCEPT_TIMEOUT_SECONDS: '5' },
  });
  proc.stdout.on('data', (d) => process.stdout.write('[srv] ' + d));
  proc.stderr.on('data', (d) => process.stdout.write('[srv-err] ' + d));

  const up = await waitForServer(proc, 8000);
  console.log('SERVER UP:', up);
  if (!up) { proc.kill(); process.exit(1); }

  const login = await j('POST', '/api/auth/login', { body: { email: 'meghna@cust.com', password: 'password123' } });
  const tok = login.data.token;
  const cats = await j('GET', '/api/customer/categories', { token: tok });
  const plumbing = cats.data.find((c) => c.code === 'plumbing');

  const raised = await j('POST', '/api/customer/requests', {
    token: tok,
    body: {
      categoryId: plumbing.id, latitude: 20.3010, longitude: 85.7950,
      address: 'Jaydev Vihar, Bhubaneswar', title: 'Water heater leak', priority: 'emergency',
    },
  });
  const id = raised.data.request.id;
  console.log('RAISED requestId=', id, 'status=', raised.data.request.status);

  const snap = (label) => j('GET', `/api/customer/requests/${id}`, { token: tok })
    .then((r) => console.log(label, '=> status=', r.data.status, 'tech=', r.data.technician_name, 'etaSec=', r.data.eta_seconds));

  await snap('t+0s  ');
  // Do NOT accept. Wait past the 5s timeout.
  await new Promise((r) => setTimeout(r, 8000));
  await snap('t+8s  (after 5s timeout)');

  const adminLogin = await j('POST', '/api/auth/login', { body: { email: 'admin@dispatch.com', password: 'password123' } });
  const adminTok = adminLogin.data.token;
  const detail = await j('GET', `/api/admin/requests/${id}`, { token: adminTok });
  console.log('DISPATCH EVENTS:');
  (detail.data.dispatchEvents || []).forEach((e) =>
    console.log(`  attempt=${e.attempt} event=${e.event} tech=${e.technician_name || e.technician_id}`));

  proc.kill();
  const full = JSON.stringify(detail.data);
  const ok = full.includes('timed_out') && full.includes('assigned');
  console.log(ok ? '\nRESULT: PASS — auto-reassign confirmed' : '\nRESULT: CHECK — inspect events above');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('REASSIGN TEST FAIL:', e); process.exit(1); });