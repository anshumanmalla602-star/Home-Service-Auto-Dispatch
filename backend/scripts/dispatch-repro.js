/**
 * Minimal dispatch repro — login as customer, raise request, wait, print.
 * Run: node scripts/dispatch-repro.js
 */
const BASE = 'http://127.0.0.1:4000';

async function j(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: JSON.stringify(body) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

(async () => {
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
  console.log('RAISED id=', raised.data.request && raised.data.request.id, 'status=', raised.data.request && raised.data.request.status);
  await new Promise((r) => setTimeout(r, 2000));
  const detail = await j('GET', `/api/customer/requests/${raised.data.request.id}`, { token: tok });
  console.log('DETAIL status=', detail.data.status, 'tech=', detail.data.technician_name);
})().catch((e) => { console.error('REPRO FAIL:', e.message); process.exit(1); });