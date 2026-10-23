/**
 * API smoke test — exercises the full stack:
 * login (all roles) → customer raises emergency request → auto-dispatch → accept → start → complete → feedback → admin dashboard
 * Run: node scripts/smoke.js   (server must be running on :4000)
 */
const BASE = 'http://127.0.0.1:4000';

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const log = (label, result) => {
  const short = result && result.data && typeof result.data === 'object'
    ? JSON.stringify(result.data).slice(0, 220)
    : String(result.data).slice(0, 220);
  console.log(`\n[${label}] HTTP ${result.status}\n  ${short}`);
  return result;
};

async function main() {
  console.log('== EMERGENCY DISPATCH API SMOKE TEST ==');

  // 1. Login admin / customer / technician
  const admin = log('ADMIN LOGIN', await call('POST', '/api/auth/login',
    { body: { email: 'admin@dispatch.com', password: 'password123' } }));
  const cust = log('CUSTOMER LOGIN', await call('POST', '/api/auth/login',
    { body: { email: 'arpita@cust.com', password: 'password123' } }));
  const tech = log('TECH LOGIN', await call('POST', '/api/auth/login',
    { body: { email: 'ramesh@tech.com', password: 'password123' } }));

  const adminTok = admin.data.token;
  const custTok = cust.data.token;
  const techTok = tech.data.token;
  if (!adminTok || !custTok || !techTok) throw new Error('Login failed — tokens missing');

  // 2. Categories list
  const cats = log('CATEGORIES', await call('GET', '/api/customer/categories', { token: custTok }));
  const plumbing = cats.data.find((c) => c.code === 'plumbing');
  if (!plumbing) throw new Error('Plumbing category missing');

  // 3. Customer raises an emergency request (Bhubaneswar)
  const REQ = await call('POST', '/api/customer/requests', {
    token: custTok,
    body: {
      categoryId: plumbing.id,
      latitude: 20.3010, longitude: 85.7950,
      address: 'Plot 12, Bapuji Nagar, Bhubaneswar',
      title: 'Burst water pipe — major leak',
      description: 'Kitchen pipe burst, water everywhere, needs urgent fix',
      priority: 'emergency',
    },
  });
  log('RAISE REQUEST', REQ);
  const requestId = REQ.data.request && REQ.data.request.id;
  if (!requestId) throw new Error('No request id returned');

  // Give dispatch engine a moment
  await new Promise((r) => setTimeout(r, 1500));

  // 4. Request detail (should be assigned) — find who was assigned
  const detail = log('REQUEST DETAIL', await call('GET', `/api/customer/requests/${requestId}`, { token: custTok }));
  console.log('  status=', detail.data.status, 'technician=', detail.data.technician_name, 'etaSec=', detail.data.eta_seconds);

  // 5. Login as the ACTUALLY assigned technician (engine picks the fastest)
  if (detail.data.technician_name) {
    const techs = await call('GET', '/api/admin/technicians', { token: adminTok });
    const assigned = techs.data.find((t) => t.name === detail.data.technician_name);
    if (assigned && assigned.email) {
      const asTech = log('ASSIGNED TECH LOGIN', await call('POST', '/api/auth/login',
        { body: { email: assigned.email, password: 'password123' } }));
      const tTok = asTech.data.token;
      const accept = log('TECH ACCEPT', await call('POST', `/api/technician/jobs/${requestId}/accept`, { token: tTok }));
      await new Promise((r) => setTimeout(r, 300));

      // 6. Technician updates location + start + complete
      await call('PUT', '/api/technician/location', {
        token: tTok, body: { lat: 20.2985, lng: 85.7991 },
      });
      log('TECH START', await call('POST', `/api/technician/jobs/${requestId}/start`, { token: tTok }));
      await new Promise((r) => setTimeout(r, 300));
      log('TECH COMPLETE', await call('POST', `/api/technician/jobs/${requestId}/complete`, { token: tTok }));
      log('TECH HISTORY', await call('GET', '/api/technician/jobs/history', { token: tTok }));
    }
  }

  // 7. Feedback
  log('FEEDBACK', await call('POST', `/api/customer/requests/${requestId}/feedback`, {
    token: custTok, body: { rating: 5, comment: 'Quick and professional!' },
  }));

  // 8. Admin dashboard
  log('ADMIN SUMMARY', await call('GET', '/api/admin/summary', { token: adminTok }));
  log('ADMIN TECHNICIANS', await call('GET', '/api/admin/technicians', { token: adminTok }));
  log('ADMIN ANALYTICS', await call('GET', '/api/admin/analytics', { token: adminTok }));
  log('ADMIN REQUEST DETAIL', await call('GET', `/api/admin/requests/${requestId}`, { token: adminTok }));

  console.log('\n== SMOKE TEST COMPLETE ==');
}

main().catch((err) => {
  console.error('\n[SMOKE] FAILED:', err.message);
  process.exit(1);
});