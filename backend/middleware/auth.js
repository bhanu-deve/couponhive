const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT and attach user to request
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+password');
    if (!user) return res.status(401).json({ error: 'User no longer exists.' });
    if (user.blocked) return res.status(403).json({ error: 'Your account has been blocked.' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

// Must be admin
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
};

// Optional auth — attaches user if token present, continues either way
exports.optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && !user.blocked) req.user = user;
    }
  } catch { /* no-op */ }
  next();
};
