import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  claimLink: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: 'general',
  },
  isClaimed: {
    type: Boolean,
    default: false,
  },
  claimedAt: {
    type: Date,
    default: null,
  },
  claimedBy: {
    ip: String,
    userAgent: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Prevent model overwrite error
const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);

export default Coupon; 