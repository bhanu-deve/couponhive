require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const authRoutes   = require('./routes/auth');
const couponRoutes = require('./routes/coupons');
const userRoutes   = require('./routes/users');
const adminRoutes  = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
}));

// ── General middleware ────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/admin',   adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── MongoDB connection ────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅  MongoDB Atlas connected');
    // Seed demo data on first run
    await require('./utils/seed')();
    app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
