// Simple lightweight validators (no extra package needed)
exports.validateSignup = (req, res, next) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required' });
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    return res.status(400).json({ error: 'Username must be 3–20 alphanumeric/underscore characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Invalid email format' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (password.length > 100)
    return res.status(400).json({ error: 'Password too long' });
  next();
};

exports.validateCoupon = (req, res, next) => {
  const { title, code, store } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!code?.trim())  return res.status(400).json({ error: 'Coupon code is required' });
  if (!store?.trim()) return res.status(400).json({ error: 'Store name is required' });
  
  // Clean code — uppercase alphanumeric + dash/underscore only
  req.body.code = String(code).toUpperCase().replace(/[^A-Z0-9\-_]/g, '').slice(0, 30);
  req.body.title = String(title).trim().slice(0, 100);
  req.body.store = String(store).trim().slice(0, 60);
  if (req.body.description) req.body.description = String(req.body.description).trim().slice(0, 500);
  if (req.body.discount)    req.body.discount    = String(req.body.discount).trim().slice(0, 30);
  if (!req.body.code) return res.status(400).json({ error: 'Coupon code must contain valid characters (A-Z, 0-9, -, _)' });
  next();
};
