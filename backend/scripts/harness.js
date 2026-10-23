/**
 * Runs the API server in a child process and executes tests against it,
 * capturing the child's stdout/stderr so any crash is visible.
 *
 * Usage:
 *   node scripts/harness.js dispatch   -> minimal dispatch repro (default)
 *   node scripts/harness.js smoke      -> full smoke.js end-to-end test
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

function runNode(script, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: path.join(__dirname, '..') });
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function dispatchRepro() {
  const login = await j('POST', '/api/auth/login', { body: { email: 'sourav@cust.com', password: 'password123' } });
  const tok = login.data.token;
  const cats = await j('GET', '/api/customer/categories', { token: tok });
  const plumbing = cats.data.find((c) => c.code === 'plumbing');
  const raised = await j('POST', '/api/customer/requests', {
    token: tok,
    body: {
      categoryId: plumbing.id, latitude: 20.3010, longitude: 85.7950,
      address: 'Saheed Nagar, Bhubaneswar', title: 'Pipe leak', priority: 'high',
    },
  });
  console.log('RAISED status=', raised.status, 'requestId=', raised.data.request && raised.data.request.id);
  await new Promise((r) => setTimeout(r, 2000));
  const detail = await j('GET', `/api/customer/requests/${raised.data.request.id}`, { token: tok });
  console.log('DETAIL status=', detail.status, '=>', JSON.stringify(detail.data).slice(0, 260));
}

async function main() {
  const mode = process.argv[2] || 'dispatch';
  let out = '';
  let err = '';

  const proc = spawn(process.execPath, [SERVER], { cwd: path.join(__dirname, '..') });
  proc.stdout.on('data', (d) => { out += d; });
  proc.stderr.on('data', (d) => { err += d; });

  const up = await waitForServer(proc, 8000);
  console.log('SERVER UP:', up);
  if (!up) {
    console.log('OUT:', out);
    console.log('ERR:', err);
    proc.kill();
    process.exit(1);
  }

  try {
    if (mode === 'smoke') {
      await runNode(path.join(__dirname, 'smoke.js'));
    } else {
      await dispatchRepro();
    }
  } catch (e) {
    console.log('TEST ERROR:', e.message);
  }

  await new Promise((r) => setTimeout(r, 300));
  console.log('\n--- SERVER STDOUT ---');
  console.log(out);
  console.log('--- SERVER STDERR ---');
  console.log(err);
  console.log('--- SERVER ALIVE:', proc.exitCode == null, '---');
  proc.kill();
}

main().catch((e) => { console.error('HARNESS FAIL:', e); process.exit(1); });