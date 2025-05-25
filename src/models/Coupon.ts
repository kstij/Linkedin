import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  claimLink: {
    type: String,
    required: true,
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
  createdBy: {
    type: String,
    required: true,
  },
});

export default mongoose.models.Coupon || mongoose.model('Coupon', couponSchema); 