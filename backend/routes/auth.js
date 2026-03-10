const express   = require('express');
const crypto    = require('crypto');
const bcrypt    = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const User      = require('../models/User');
const { sendToken }      = require('../utils/token');
const { protect }        = require('../middleware/auth');
const { validateSignup } = require('../middleware/validate');
const { sendOTPEmail }   = require('../utils/mailer');

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,                      // max 5 OTP requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Try again in 1 hour.' },
});

// ── Helper: generate cryptographically secure 6-digit OTP ─
function generateOTP() {
  // Using crypto for true randomness (not Math.random)
  const bytes = crypto.randomBytes(4);
  const num   = bytes.readUInt32BE(0) % 900000 + 100000; // always 6 digits
  return num.toString();
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────
router.post('/signup', authLimiter, validateSignup, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }],
    });
    if (existing) {
      return res.status(409).json({
        error: existing.email === email.toLowerCase()
          ? 'Email already registered'
          : 'Username already taken',
      });
    }

    const AVATARS = ['🐱','🐶','🦁','🐺','🦊','🐸','🐧','🦋'];
    const user = await User.create({
      username: username.trim(),
      email:    email.toLowerCase().trim(),
      password,
      avatar:   AVATARS[Math.floor(Math.random() * AVATARS.length)],
    });

    sendToken(user, 201, res);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email or username already taken' });
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// ───────────────────────────────────────────
// POST /api/auth/login
// ───────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password +loginAttempts +lockUntil');

    // ── Account lockout check ──────────────────────────────
    if (user?.isLocked()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account locked due to too many failed attempts. Try again in ${remaining} minute${remaining > 1 ? 's' : ''}.`,
      });
    }

    // ── Wrong credentials ──────────────────────────────────
    if (!user || !(await user.comparePassword(password))) {
      if (user) await user.incLoginAttempts();
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.blocked)
      return res.status(403).json({ error: 'Your account has been blocked. Contact support.' });

    // ── Success — reset counter ────────────────────────────
    await user.resetLoginAttempts();
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me  —  validate & refresh session
// ─────────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Generates a 6-digit OTP, hashes it, saves it, emails it
// ─────────────────────────────────────────────────────────────
router.post('/forgot-password', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+otpCode +otpExpiry +otpAttempts');

    // Always respond success — never reveal if email is registered
    if (!user) {
      return res.json({ message: 'If that email is registered, an OTP has been sent.' });
    }

    const expiresMin = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;
    const otp        = generateOTP();
    const hashedOTP  = await bcrypt.hash(otp, 10);

    user.otpCode     = hashedOTP;
    user.otpExpiry   = new Date(Date.now() + expiresMin * 60 * 1000);
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    await sendOTPEmail({
      to:             user.email,
      username:       user.username,
      otp,
      expiresMinutes: expiresMin,
    });

    res.json({ message: 'OTP sent to your email. Please check your inbox (and spam folder).' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Checks the OTP — on success returns a short-lived reset token
// ─────────────────────────────────────────────────────────────
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+otpCode +otpExpiry +otpAttempts');

    // No OTP on record
    if (!user || !user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    }

    // OTP expired
    if (user.otpExpiry < new Date()) {
      user.otpCode = undefined; user.otpExpiry = undefined; user.otpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Too many wrong attempts — invalidate OTP
    if (user.otpAttempts >= 5) {
      user.otpCode = undefined; user.otpExpiry = undefined; user.otpAttempts = 0;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ error: 'Too many wrong attempts. Please request a new OTP.' });
    }

    // Compare OTP
    const isValid = await bcrypt.compare(String(otp).trim(), user.otpCode);
    if (!isValid) {
      user.otpAttempts += 1;
      await user.save({ validateBeforeSave: false });
      const left = 5 - user.otpAttempts;
      return res.status(400).json({
        error: `Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.`,
      });
    }

    // ── OTP correct — generate a one-time reset token (15 min) ──
    const rawResetToken    = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    user.otpCode     = hashedResetToken;          // reuse field for reset token
    user.otpExpiry   = new Date(Date.now() + 15 * 60 * 1000); // 15 min to set new password
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    res.json({
      message:    'OTP verified successfully.',
      resetToken: rawResetToken, // sent to frontend, used in next step
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Validates reset token, sets new password, logs user in
// ─────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword)
      return res.status(400).json({ error: 'Reset token and new password are required' });

    if (String(newPassword).length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Find user whose otpCode matches AND hasn't expired
    const user = await User.findOne({ otpExpiry: { $gt: new Date() } })
      .select('+otpCode +otpExpiry +password');

    if (!user || !user.otpCode || user.otpCode !== hashedToken) {
      return res.status(400).json({ error: 'Reset token is invalid or has expired. Please request a new OTP.' });
    }

    // Set new password and clear OTP fields
    user.password  = newPassword; // pre-save hook hashes it
    user.otpCode   = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.loginAttempts = 0;
    user.lockUntil     = undefined;
    await user.save();

    // Log them in automatically after reset
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
