const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar:   { type: String, default: '🐱' },
  text:     { type: String, required: true, maxlength: 500, trim: true },
}, { timestamps: true });

const couponSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true, maxlength: 100 },
  code:        { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
  store:       { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  discount:    { type: String, default: '', trim: true, maxlength: 30 },
  category: {
    type: String,
    enum: ['Shopping','Food','Electronics','Fashion','Travel','Beauty','Shipping','Other'],
    default: 'Other',
  },
  expiresAt:     { type: Date, required: true },
  uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploaderName:  { type: String, required: true },
  uploaderAvatar:{ type: String, default: '🐱' },
  likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reports:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  copies:   { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

// Index for fast search
couponSchema.index({ title: 'text', store: 'text', code: 'text' });
couponSchema.index({ category: 1, expiresAt: 1 });
couponSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
