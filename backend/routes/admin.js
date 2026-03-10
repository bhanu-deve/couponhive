const express  = require('express');
const User     = require('../models/User');
const Coupon   = require('../models/Coupon');
const bcrypt   = require('bcryptjs');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(protect, adminOnly);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalCoupons, blockedUsers, reportedCoupons, copiesResult] = await Promise.all([
      User.countDocuments(),
      Coupon.countDocuments(),
      User.countDocuments({ blocked: true }),
      Coupon.countDocuments({ 'reports.0': { $exists: true } }), // ANY reports (1+)
      Coupon.aggregate([{ $group: { _id: null, total: { $sum: '$copies' } } }]),
    ]);
    res.json({
      totalUsers, totalCoupons, blockedUsers, reportedCoupons,
      activeUsers: totalUsers - blockedUsers,
      totalCopies: copiesResult[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/admin/users/:id/block
router.patch('/users/:id/block', async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Cannot block another admin' });
    if (String(target._id) === String(req.user._id)) return res.status(400).json({ error: 'Cannot block yourself' });
    target.blocked = !target.blocked;
    await target.save();
    res.json({ user: target, message: target.blocked ? 'User blocked' : 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// PATCH /api/admin/users/:id/credentials  — admin changes any user's username or password
router.patch('/users/:id/credentials', async (req, res) => {
  try {
    const target = await User.findById(req.params.id).select('+password');
    if (!target) return res.status(404).json({ error: 'User not found' });

    const { username, newPassword } = req.body;

    if (username !== undefined) {
      const u = String(username).trim();
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(u))
        return res.status(400).json({ error: 'Username must be 3-20 alphanumeric/underscore characters' });
      const taken = await User.findOne({ username: u, _id: { $ne: target._id } });
      if (taken) return res.status(409).json({ error: 'Username already taken' });
      target.username = u;
      // Update denormalised name on their coupons too
      await Coupon.updateMany({ uploadedBy: target._id }, { uploaderName: u });
    }

    if (newPassword !== undefined) {
      if (String(newPassword).length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      target.password = String(newPassword); // pre-save hook will hash it
    }

    await target.save();
    const safe = target.toObject();
    delete safe.password;
    res.json({ user: safe, message: 'Credentials updated' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Failed to update credentials' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === String(req.user._id)) return res.status(400).json({ error: 'Cannot delete yourself' });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    await Coupon.deleteMany({ uploadedBy: req.params.id });
    await target.deleteOne();
    res.json({ message: 'User and their coupons removed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/coupons
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ coupons });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// GET /api/admin/reported  — coupons with 1+ reports
router.get('/reported', async (req, res) => {
  try {
    const reported = await Coupon.find({ 'reports.0': { $exists: true } })
      .sort({ 'reports': -1, createdAt: -1 })
      .lean();
    res.json({ coupons: reported });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reported coupons' });
  }
});

// DELETE /api/admin/coupons/:id
router.delete('/coupons/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// PATCH /api/admin/coupons/:id/verify
router.patch('/coupons/:id/verify', async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { verified: true }, { new: true });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify coupon' });
  }
});

module.exports = router;
