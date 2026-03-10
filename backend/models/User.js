const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true, trim: true,
    minlength: 3, maxlength: 20,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
  },
  email: {
    type: String, required: true, unique: true, lowercase: true, trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
  },
  password:       { type: String, required: true, minlength: 6, select: false },
  role:           { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar:         { type: String, default: '🐱' },
  bio:            { type: String, default: '', maxlength: 200 },
  blocked:        { type: Boolean, default: false },

  // ── OTP (forgot password) ─────────────────────────────────
  otpCode:        { type: String, select: false },
  otpExpiry:      { type: Date,   select: false },
  otpAttempts:    { type: Number, default: 0, select: false },

  // ── Login brute-force protection ──────────────────────────
  loginAttempts:  { type: Number, default: 0 },
  lockUntil:      { type: Date },
}, { timestamps: true });

// ── Hash password before save ─────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Compare plain password ────────────────────────────────
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ── Account lock helpers ──────────────────────────────────
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

userSchema.methods.incLoginAttempts = async function () {
  const MAX  = parseInt(process.env.LOGIN_MAX_ATTEMPTS)  || 5;
  const LOCK = parseInt(process.env.LOGIN_LOCK_MINUTES)  || 15;

  // If previous lock has expired, start fresh
  if (this.lockUntil && this.lockUntil < new Date()) {
    this.loginAttempts = 1;
    this.lockUntil     = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= MAX) {
      this.lockUntil = new Date(Date.now() + LOCK * 60 * 1000);
    }
  }
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil     = undefined;
  await this.save({ validateBeforeSave: false });
};

// ── Strip sensitive fields from JSON output ───────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otpCode;
  delete obj.otpExpiry;
  delete obj.otpAttempts;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
