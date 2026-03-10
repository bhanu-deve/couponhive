# 🎟️ CouponHive — Full Stack (React + Node.js + MongoDB Atlas)

## 🗂️ Project Structure
```
couponhive-full/
├── backend/          ← Node.js + Express + MongoDB Atlas API
└── frontend/
    └── couponhive/   ← React app
```

---

## 🚀 Quick Start

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev       # uses nodemon (hot reload)
# OR
npm start         # production
```
Server runs at: **http://localhost:5000**

### 2. Start the Frontend
```bash
cd frontend/couponhive
npm install
npm start
```
App runs at: **http://localhost:3000**

---

## 🔑 Demo Accounts (auto-seeded on first run)

| Role  | Email                    | Password |
|-------|--------------------------|----------|
| Admin | admin@couponhive.com     | admin123 |
| User  | deals@demo.com           | demo123  |
| User  | save@demo.com            | demo123  |

---

## 🌐 API Endpoints

### Auth
| Method | Path              | Description        |
|--------|-------------------|--------------------|
| POST   | /api/auth/signup  | Register new user  |
| POST   | /api/auth/login   | Login              |
| GET    | /api/auth/me      | Validate token     |

### Coupons
| Method | Path                        | Auth     | Description         |
|--------|-----------------------------|----------|---------------------|
| GET    | /api/coupons                | Optional | List/search coupons |
| GET    | /api/coupons/:id            | Optional | Get single coupon   |
| POST   | /api/coupons                | Required | Create coupon       |
| PUT    | /api/coupons/:id            | Owner    | Update coupon       |
| DELETE | /api/coupons/:id            | Owner    | Delete coupon       |
| POST   | /api/coupons/:id/copy       | Public   | Increment copies    |
| POST   | /api/coupons/:id/like       | Required | Toggle like         |
| POST   | /api/coupons/:id/comment    | Required | Add comment         |
| POST   | /api/coupons/:id/report     | Required | Report coupon       |

### Users
| Method | Path          | Auth     | Description    |
|--------|---------------|----------|----------------|
| GET    | /api/users/:id| Public   | Get user info  |
| PATCH  | /api/users/me | Required | Update bio     |

### Admin (admin role required)
| Method | Path                          | Description             |
|--------|-------------------------------|-------------------------|
| GET    | /api/admin/stats              | Platform stats          |
| GET    | /api/admin/users              | All users               |
| PATCH  | /api/admin/users/:id/block    | Block/unblock user      |
| DELETE | /api/admin/users/:id          | Delete user             |
| GET    | /api/admin/coupons            | All coupons             |
| GET    | /api/admin/reported           | Coupons with 3+ reports |
| DELETE | /api/admin/coupons/:id        | Delete any coupon       |
| PATCH  | /api/admin/coupons/:id/verify | Mark coupon verified    |

---

## 🔒 Security Features
- Passwords hashed with **bcryptjs** (cost factor 12)
- **JWT** authentication (7-day expiry)
- Rate limiting: 200 req/15min globally, 20 req/15min on auth routes
- **Helmet.js** security headers
- Input sanitization on all fields
- Whitelist-only profile updates (bio only — no role escalation)
- Admin role re-verified server-side on every admin action
- Blocked users receive 403 on every authenticated request
- Users cannot like/report their own coupons

## ☁️ Deploying to Production

**Backend** → Railway / Render / Heroku:
- Set environment variables from `.env`
- Change `CLIENT_URL` to your frontend domain

**Frontend** → Vercel / Netlify:
- Set `REACT_APP_API_URL=https://your-backend-url/api`
- `npm run build` → deploy `/build` folder
