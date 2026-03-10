// ─────────────────────────────────────────────────────────────
// api.js  —  All HTTP calls to the Express / MongoDB backend
// ─────────────────────────────────────────────────────────────

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Token helpers ─────────────────────────────────────────
export const getToken   = () => sessionStorage.getItem('ch_token');
export const setToken   = (t) => sessionStorage.setItem('ch_token', t);
export const clearToken = () => sessionStorage.removeItem('ch_token');

// ── Core fetch wrapper ────────────────────────────────────
async function req(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const API = {

  // ── Auth ───────────────────────────────────────────────
  async login(email, password) {
    const data = await req('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data.user;
  },

  async signup(username, email, password) {
    const data = await req('/auth/signup', {
      method: 'POST',
      body:   JSON.stringify({ username, email, password }),
    });
    setToken(data.token);
    return data.user;
  },

  async getMe() {
    return (await req('/auth/me')).user;
  },

  logout() {
    clearToken();
  },

  // ── Forgot password OTP flow ────────────────────────────
  // Step 1: send OTP email
  async forgotPassword(email) {
    return req('/auth/forgot-password', {
      method: 'POST',
      body:   JSON.stringify({ email }),
    });
  },

  // Step 2: verify the 6-digit OTP → get a resetToken back
  async verifyOTP(email, otp) {
    return req('/auth/verify-otp', {
      method: 'POST',
      body:   JSON.stringify({ email, otp }),
    });
  },

  // Step 3: set new password using resetToken → auto-logged in
  async resetPassword(resetToken, newPassword) {
    const data = await req('/auth/reset-password', {
      method: 'POST',
      body:   JSON.stringify({ resetToken, newPassword }),
    });
    setToken(data.token);
    return data.user;
  },

  // ── Coupons ────────────────────────────────────────────
  async getCoupons(filter = {}) {
    const p = new URLSearchParams();
    if (filter.search)                          p.set('search',   filter.search);
    if (filter.category && filter.category !== 'All') p.set('category', filter.category);
    if (filter.sort)                            p.set('sort',     filter.sort);
    if (filter.userId)                          p.set('userId',   filter.userId);
    return (await req(`/coupons?${p}`)).coupons;
  },

  async getCoupon(id)     { return (await req(`/coupons/${id}`)).coupon; },
  async createCoupon(d)   { return (await req('/coupons',        { method: 'POST',   body: JSON.stringify(d) })).coupon; },
  async updateCoupon(id,d){ return (await req(`/coupons/${id}`,  { method: 'PUT',    body: JSON.stringify(d) })).coupon; },
  async deleteCoupon(id)  { return req(`/coupons/${id}`,         { method: 'DELETE' }); },
  async incrementCopies(id){ return req(`/coupons/${id}/copy`,   { method: 'POST' }); },
  async toggleLike(id)    { return (await req(`/coupons/${id}/like`,    { method: 'POST' })).coupon; },
  async addComment(id, text){ return (await req(`/coupons/${id}/comment`,{ method: 'POST', body: JSON.stringify({ text }) })).coupon; },
  async reportCoupon(id)  { return (await req(`/coupons/${id}/report`,  { method: 'POST' })).coupon; },

  // ── User ───────────────────────────────────────────────
  async updateMe(updates) {
    return (await req('/users/me', { method: 'PATCH', body: JSON.stringify(updates) })).user;
  },

  async changePassword(currentPassword, newPassword) {
    return req('/users/me/password', {
      method: 'PATCH',
      body:   JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // ── Admin ──────────────────────────────────────────────
  async getAdminStats()    { return req('/admin/stats'); },
  async getAdminUsers()    { return (await req('/admin/users')).users; },
  async getAdminCoupons()  { return (await req('/admin/coupons')).coupons; },
  async getReportedCoupons(){ return (await req('/admin/reported')).coupons; },

  async blockUser(id) {
    return (await req(`/admin/users/${id}/block`, { method: 'PATCH' })).user;
  },
  async removeUser(id) {
    return req(`/admin/users/${id}`, { method: 'DELETE' });
  },
  async adminDeleteCoupon(id) {
    return req(`/admin/coupons/${id}`, { method: 'DELETE' });
  },
  async verifyCoupon(id) {
    return (await req(`/admin/coupons/${id}/verify`, { method: 'PATCH' })).coupon;
  },
  async adminUpdateCredentials(id, payload) {
    return (await req(`/admin/users/${id}/credentials`, {
      method: 'PATCH',
      body:   JSON.stringify(payload),
    })).user;
  },
};

export default API;
