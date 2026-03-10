const express = require('express');
const Coupon  = require('../models/Coupon');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateCoupon }        = require('../middleware/validate');

const router = express.Router();

const VALID_CATEGORIES = ['Shopping','Food','Electronics','Fashion','Travel','Beauty','Shipping','Other'];

// ── GET /api/coupons  (public) ────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, category, sort, userId, page = 1, limit = 50 } = req.query;
    const query = {};

    if (userId)   query.uploadedBy = userId;
    if (category && category !== 'All' && VALID_CATEGORIES.includes(category))
      query.category = category;

    if (search?.trim()) {
      query.$or = [
        { title:       { $regex: search.trim(), $options: 'i' } },
        { store:       { $regex: search.trim(), $options: 'i' } },
        { code:        { $regex: search.trim(), $options: 'i' } },
      ];
    }

    let sortObj = { createdAt: -1 }; // newest (default)
    if (sort === 'popular')  sortObj = { copies: -1 };
    if (sort === 'expiring') sortObj = { expiresAt: 1 };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({ coupons, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// ── GET /api/coupons/:id  (public) ───────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).lean();
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch coupon' });
  }
});

// ── POST /api/coupons  (auth) ─────────────────────────────
router.post('/', protect, validateCoupon, async (req, res) => {
  try {
    const { title, code, store, description, discount, category, expiresAt } = req.body;

    const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 86400000);
    if (isNaN(expiry.getTime())) return res.status(400).json({ error: 'Invalid expiry date' });

    const cat = VALID_CATEGORIES.includes(category) ? category : 'Other';

    const coupon = await Coupon.create({
      title, code, store,
      description: description || '',
      discount:    discount    || '',
      category:    cat,
      expiresAt:   expiry,
      uploadedBy:    req.user._id,
      uploaderName:  req.user.username,
      uploaderAvatar:req.user.avatar,
    });

    res.status(201).json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// ── PUT /api/coupons/:id  (owner only) ───────────────────
router.put('/:id', protect, validateCoupon, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    if (String(coupon.uploadedBy) !== String(req.user._id))
      return res.status(403).json({ error: 'Not authorized' });

    const { title, code, store, description, discount, category, expiresAt } = req.body;
    const cat = VALID_CATEGORIES.includes(category) ? category : coupon.category;

    coupon.title       = title       || coupon.title;
    coupon.code        = code        || coupon.code;
    coupon.store       = store       || coupon.store;
    coupon.description = description !== undefined ? description : coupon.description;
    coupon.discount    = discount    !== undefined ? discount    : coupon.discount;
    coupon.category    = cat;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (!isNaN(d.getTime())) coupon.expiresAt = d;
    }

    await coupon.save();
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// ── DELETE /api/coupons/:id  (owner or admin) ───────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

    const isOwner = String(coupon.uploadedBy) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

    await coupon.deleteOne();
    res.json({ message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// ── POST /api/coupons/:id/copy  (public) ─────────────────
router.post('/:id/copy', async (req, res) => {
  try {
    await Coupon.findByIdAndUpdate(req.params.id, { $inc: { copies: 1 } });
    res.json({ message: 'Copy count incremented' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to increment copies' });
  }
});

// ── POST /api/coupons/:id/like  (auth) ───────────────────
router.post('/:id/like', protect, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    if (String(coupon.uploadedBy) === String(req.user._id))
      return res.status(400).json({ error: "You can't like your own coupon" });

    const liked = coupon.likes.map(String).includes(String(req.user._id));
    if (liked) coupon.likes.pull(req.user._id);
    else        coupon.likes.push(req.user._id);

    await coupon.save();
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// ── POST /api/coupons/:id/comment  (auth) ────────────────
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const text = String(req.body.text || '').trim().slice(0, 500);
    if (!text) return res.status(400).json({ error: 'Comment cannot be empty' });

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

    coupon.comments.push({
      user:     req.user._id,
      username: req.user.username,
      avatar:   req.user.avatar,
      text,
    });
    await coupon.save();
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ── POST /api/coupons/:id/report  (auth) ─────────────────
router.post('/:id/report', protect, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    if (String(coupon.uploadedBy) === String(req.user._id))
      return res.status(400).json({ error: "You can't report your own coupon" });

    const alreadyReported = coupon.reports.map(String).includes(String(req.user._id));
    if (alreadyReported) return res.status(400).json({ error: 'Already reported' });

    coupon.reports.push(req.user._id);
    await coupon.save();
    res.json({ coupon });
  } catch (err) {
    res.status(500).json({ error: 'Failed to report coupon' });
  }
});

module.exports = router;
