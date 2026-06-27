import mongoose from 'mongoose';

export const TAGS = [
  'finance',
  'safety',
  'infrastructure',
  'policy',
  'parks_rec',
  'environment',
  'housing',
  'other',
];

export const CONCERN_STATUS = ['pending', 'denied', 'approved', 'active'];

const concernSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    tag: { type: String, enum: TAGS, default: 'other' },
    description: { type: String, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    stars: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: CONCERN_STATUS, default: 'pending' },
    statusChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    statusChangedAt: { type: Date, default: null },
    closed: { type: Boolean, default: false },
    closedAt: { type: Date, default: null },
    forum: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', default: null },
    images: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model('Concern', concernSchema);
