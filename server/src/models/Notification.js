import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'concern_new',
  'concern_status',
  'concern_closed',
  'forum_new',
  'forum_comment',
  'forum_closed',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true },
    concern: { type: mongoose.Schema.Types.ObjectId, ref: 'Concern', default: null },
    forum: { type: mongoose.Schema.Types.ObjectId, ref: 'Forum', default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Fast lookup of a user's feed and unread counts.
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
