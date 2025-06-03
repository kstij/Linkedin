import mongoose from 'mongoose';

const StoredLinkSchema = new mongoose.Schema({
  link: {
    type: String,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
  usedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

const StoredLink = mongoose.models.StoredLink || mongoose.model('StoredLink', StoredLinkSchema);

export default StoredLink; 