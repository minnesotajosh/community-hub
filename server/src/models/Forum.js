import mongoose from 'mongoose';
import { TAGS } from './Concern.js';

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, default: '' },
    stars: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hidden: { type: Boolean, default: false },
    hiddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hiddenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const forumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    tag: { type: String, enum: TAGS, default: 'other' },
    description: { type: String, default: '' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    linkedConcerns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concern' }],
    invitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    resolutionSummary: { type: String, default: '' },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Forum', forumSchema);
