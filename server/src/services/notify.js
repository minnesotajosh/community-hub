import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { RANK } from '../middleware/auth.js';

// Roles that count as community staff for notification purposes.
const STAFF_ROLES = Object.keys(RANK).filter((r) => RANK[r] >= RANK.hub_moderator);

/**
 * Resolve the set of staff users within a community (moderators/admins).
 * Scoped to the community so global admins aren't spammed across every hub.
 */
export async function communityStaffIds(communityId) {
  if (!communityId) return [];
  const staff = await User.find(
    { community: communityId, role: { $in: STAFF_ROLES } },
    '_id'
  );
  return staff.map((u) => u._id);
}

/** Distinct comment-author ids on a forum. */
export function forumCommenterIds(forum) {
  return forum.comments.map((c) => c.author);
}

/**
 * Create in-app notifications for a set of recipients.
 *
 * Recipients are de-duplicated and the actor is always excluded (you don't get
 * notified about your own action). Delivery is in-app only for now; additional
 * channels (e.g. email) can hook in where noted below without touching callers.
 */
export async function notify({ recipients, actor, type, message, concern = null, forum = null }) {
  const actorId = actor ? String(actor._id || actor) : null;
  const ids = [...new Set((recipients || []).map((r) => String(r)).filter(Boolean))]
    .filter((id) => id !== actorId);
  if (!ids.length) return [];

  const docs = ids.map((recipient) => ({
    recipient,
    actor: actor?._id || actor || null,
    type,
    message,
    concern,
    forum,
  }));
  const created = await Notification.insertMany(docs);

  // Future delivery channels (email, push, …) plug in here — they receive the
  // same resolved recipient list and payload as the in-app records above.
  // await emailChannel(ids, { type, message, concern, forum });

  return created;
}
