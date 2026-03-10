# 🎟️ CouponHive

A community-powered coupon sharing platform built with React.

## 🚀 Quick Start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Demo Accounts

| Role  | Email                     | Password  |
|-------|---------------------------|-----------|
| Admin | admin@couponhive.com      | admin123  |
| User  | deals@demo.com            | demo123   |
| User  | save@demo.com             | demo123   |

## 📁 Project Structure

```
src/
├── api/
│   └── db.js              # localStorage backend (swap for real API)
├── components/
│   ├── Navbar.js
│   ├── Toast.js
│   ├── AuthModal.js
│   ├── UploadModal.js
│   ├── CouponCard.js
│   └── CouponDetailModal.js
├── hooks/
│   └── useToast.js
├── pages/
│   ├── HomePage.js
│   ├── ProfilePage.js
│   └── AdminPage.js
├── App.js
├── App.css
└── index.js
```

## ✨ Features

### Public (no login needed)
- Browse all coupons with search, category filter, and sort
- One-click copy coupon code
- View coupon details, expiry, usage count

### Logged-in Users
- Upload coupons (title, code, store, category, discount %, expiry)
- Edit & delete your own coupons
- Like coupons ❤️
- Comment on coupons 💬
- Report coupons 🚩 (3+ reports = flagged to admin)
- Profile page with stats

### Admin Panel
- Platform overview dashboard
- Reported coupons queue (auto-flagged at 3 reports)
- Remove coupons, block/unblock users, delete users
- Full coupon management table

## 🔒 Security

- Input sanitization on all text fields
- Username validation (alphanumeric only, 3–20 chars)
- Email format validation
- Password minimum 6 characters
- Whitelist-only profile updates (cannot escalate to admin)
- Admin role re-verified from DB on every sensitive action
- Session re-validated on load and every 10 seconds
- Blocked users auto-kicked from active session
- Users cannot like/report their own coupons

## 🔧 Going to Production

Replace the `DB` layer in `src/api/db.js` with real `fetch()` API calls:

```js
// Example: swap DB.get / DB.set with your backend
const getCoupons = async (filter) => {
  const res = await fetch(`/api/coupons?${new URLSearchParams(filter)}`);
  return res.json();
};
```

Recommended backend stack: **Node.js + Express + MongoDB** or **Supabase**.
