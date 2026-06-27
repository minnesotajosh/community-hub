import mongoose from 'mongoose';

export const FLAG_TARGETS = ['concern', 'comment', 'user'];
export const FLAG_STATUS = ['open', 'resolved', 'dismissed'];

const flagSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: FLAG_TARGETS, required: true },
    reason: { type: String, default: '' },
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },

    // Target references — only the one matching targetType is set.
    concern: { type: mongoose.Schema.Types.ObjectId, ref: 'Concern', default: null },
    forum: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', default: null },
    commentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: { type: String, enum: FLAG_STATUS, default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

flagSchema.index({ community: 1, status: 1, createdAt: -1 });

export default mongoose.model('Flag', flagSchema);
