const express = require('express');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:id (public)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/users/me  — whitelist: bio only
router.patch('/me', protect, async (req, res) => {
  try {
    const allowed = {};
    if (req.body.bio !== undefined) allowed.bio = String(req.body.bio).trim().slice(0, 200);
    const user = await User.findByIdAndUpdate(req.user._id, allowed, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PATCH /api/users/me/password  — user changes own password
router.patch('/me/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    if (String(newPassword).length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id).select('+password');
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    user.password = String(newPassword);
    await user.save(); // pre-save hook hashes it
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;
