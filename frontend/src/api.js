// Lightweight API client with token persistence.

const BASE = '/api'; // Vite proxies /api -> backend :4000

export const tokenStore = {
  get token() { return localStorage.getItem('hs_token'); },
  set token(v) { v ? localStorage.setItem('hs_token', v) : localStorage.removeItem('hs_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('hs_user')); } catch { return null; } },
  set user(u) { u ? localStorage.setItem('hs_user', JSON.stringify(u)) : localStorage.removeItem('hs_user'); },
  clear() { this.token = null; this.user = null; },
};

async function request(method, path, { body, formData } = {}) {
  const headers = {};
  if (tokenStore.token) headers.Authorization = `Bearer ${tokenStore.token}`;
  let payload;
  if (formData) payload = formData;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, body) => request('POST', p, { body }),
  put: (p, body) => request('PUT', p, { body }),
  postForm: (p, formData) => request('POST', p, { formData }),

  async login(email, password) {
    const data = await request('POST', '/auth/login', { body: { email, password } });
    tokenStore.token = data.token;
    tokenStore.user = data.user;
    return data.user;
  },

  logout() { tokenStore.clear(); },

  async forgotPassword(email) {
    return request('POST', '/auth/forgot-password', { body: { email } });
  },

  async resetPassword(token, password) {
    return request('POST', '/auth/reset-password', { body: { token, password } });
  },

  async changePassword(currentPassword, newPassword) {
    return request('POST', '/auth/change-password', { body: { currentPassword, newPassword } });
  },

  async register(role, name, email, phone, password, extra = {}) {
    const data = await request('POST', '/auth/register', {
      body: { role, name, email, phone: phone || null, password, ...extra },
    });
    tokenStore.token = data.token;
    tokenStore.user = data.user;
    return data.user;
  },

  portalFor(role) {
    return role === 'customer' ? '/customer'
      : role === 'technician' ? '/technician'
      : '/admin';
  },
};

export default api;