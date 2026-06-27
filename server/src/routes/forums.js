import { Router } from 'express';
import Forum from '../models/Forum.js';
import Concern from '../models/Concern.js';
import { authRequired, requireRank, isStaff } from '../middleware/auth.js';
import { communityFilter, canAccessCommunity } from '../middleware/scope.js';
import { notify, forumCommenterIds } from '../services/notify.js';

const router = Router();
router.use(authRequired);

function canComment(user, forum) {
  if (isStaff(user)) return true;
  return forum.invitedUsers.some((u) => String(u) === String(user._id));
}

// Forum participants: the author, invited users, and anyone who has commented.
// The acting user is excluded inside notify().
function forumParticipants(forum) {
  return [forum.author, ...forum.invitedUsers, ...forumCommenterIds(forum)];
}

// List forums (scoped). All users in community can view.
router.get('/', async (req, res) => {
  const forums = await Forum.find(communityFilter(req.user))
    .populate('author', 'name role')
    .sort({ createdAt: -1 });
  res.json({ forums });
});

router.get('/:id', async (req, res) => {
  const forum = await Forum.findById(req.params.id)
    .populate('author', 'name role profileImage')
    .populate('invitedUsers', 'name role')
    .populate('linkedConcerns', 'title status tag closed')
    .populate('comments.author', 'name role profileImage');
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  // Strip the body of hidden comments for everyone except staff and the author.
  const out = forum.toJSON();
  out.comments = out.comments.map((c) => {
    if (c.hidden && !isStaff(req.user) && String(c.author?._id) !== String(req.user._id))
      return { ...c, body: '' };
    return c;
  });
  res.json({ forum: out, canComment: canComment(req.user, forum) });
});

// Create forum — staff (mod/admin)
router.post('/', requireRank('hub_moderator'), async (req, res) => {
  const { title, tag, description, linkedConcerns, invitedUsers } = req.body;
  const forum = await Forum.create({
    title,
    tag,
    description,
    author: req.user._id,
    community: req.user.community,
    linkedConcerns: linkedConcerns || [],
    invitedUsers: invitedUsers || [],
  });
  // mark linked concerns active
  if (linkedConcerns?.length) {
    await Concern.updateMany(
      { _id: { $in: linkedConcerns } },
      { status: 'active', forum: forum._id }
    );
  }
  // Let invited users know they've been brought into a new forum discussion.
  await notify({
    recipients: forum.invitedUsers,
    actor: req.user,
    type: 'forum_new',
    message: `You were invited to the forum "${forum.title}"`,
    forum: forum._id,
  });
  res.status(201).json({ forum });
});

// Link a concern to a forum — staff
router.post('/:id/link', requireRank('hub_moderator'), async (req, res) => {
  const { concernId } = req.body;
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  const concern = await Concern.findById(concernId);
  if (!concern) return res.status(404).json({ error: 'Concern not found' });
  if (!canAccessCommunity(req.user, concern.community))
    return res.status(403).json({ error: 'Forbidden' });
  // A concern belongs to one forum: detach it from any previous forum first.
  if (concern.forum && String(concern.forum) !== String(forum._id))
    await Forum.findByIdAndUpdate(concern.forum, { $pull: { linkedConcerns: concern._id } });
  if (!forum.linkedConcerns.some((c) => String(c) === String(concernId)))
    forum.linkedConcerns.push(concernId);
  await forum.save();
  concern.status = 'active';
  concern.forum = forum._id;
  await concern.save();
  res.json({ forum });
});

// Unlink a concern from a forum — staff
router.delete('/:id/link/:concernId', requireRank('hub_moderator'), async (req, res) => {
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  forum.linkedConcerns = forum.linkedConcerns.filter((c) => String(c) !== String(req.params.concernId));
  await forum.save();
  // Clear the link on the concern; revert an auto-activated concern to approved.
  const concern = await Concern.findById(req.params.concernId);
  if (concern && String(concern.forum) === String(forum._id)) {
    concern.forum = null;
    if (concern.status === 'active') concern.status = 'approved';
    await concern.save();
  }
  res.json({ forum });
});

// Invite users — staff
router.post('/:id/invite', requireRank('hub_moderator'), async (req, res) => {
  const { userIds } = req.body;
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  for (const id of userIds || []) {
    if (!forum.invitedUsers.some((u) => String(u) === String(id)))
      forum.invitedUsers.push(id);
  }
  await forum.save();
  res.json({ forum });
});

// Add a comment — staff or invited members
router.post('/:id/comments', async (req, res) => {
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  if (!canComment(req.user, forum))
    return res.status(403).json({ error: 'You are not invited to comment on this forum' });
  if (forum.status === 'closed')
    return res.status(400).json({ error: 'Forum is closed' });
  // Capture participants before adding the new comment so the commenter isn't
  // double-counted and the recipient set reflects prior activity.
  const recipients = forumParticipants(forum);
  forum.comments.push({ author: req.user._id, body: req.body.body || '' });
  await forum.save();
  await notify({
    recipients,
    actor: req.user,
    type: 'forum_comment',
    message: `${req.user.name} commented on "${forum.title}"`,
    forum: forum._id,
  });
  const populated = await forum.populate('comments.author', 'name role profileImage');
  res.status(201).json({ comment: populated.comments[populated.comments.length - 1] });
});

// Edit own comment
router.put('/:id/comments/:commentId', async (req, res) => {
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  const comment = forum.comments.id(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (String(comment.author) !== String(req.user._id))
    return res.status(403).json({ error: 'Can only edit your own comment' });
  comment.body = req.body.body ?? comment.body;
  await forum.save();
  res.json({ comment });
});

// Delete own comment (or staff can remove)
router.delete('/:id/comments/:commentId', async (req, res) => {
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  const comment = forum.comments.id(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (String(comment.author) !== String(req.user._id) && !isStaff(req.user))
    return res.status(403).json({ error: 'Forbidden' });
  comment.deleteOne();
  await forum.save();
  res.json({ ok: true });
});

// Star/unstar a comment — any user in community (not your own)
router.post('/:id/comments/:commentId/star', async (req, res) => {
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  const comment = forum.comments.id(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (String(comment.author) === String(req.user._id))
    return res.status(400).json({ error: 'Cannot star your own comment' });
  const uid = String(req.user._id);
  const has = comment.stars.some((s) => String(s) === uid);
  comment.stars = has
    ? comment.stars.filter((s) => String(s) !== uid)
    : [...comment.stars, req.user._id];
  await forum.save();
  res.json({ stars: comment.stars.length, starred: !has });
});

// Hide / unhide a comment — staff (for offensive content).
router.put('/:id/comments/:commentId/hide', requireRank('hub_moderator'), async (req, res) => {
  const { hidden } = req.body;
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  const comment = forum.comments.id(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  comment.hidden = !!hidden;
  comment.hiddenBy = hidden ? req.user._id : null;
  comment.hiddenAt = hidden ? new Date() : null;
  await forum.save();
  res.json({ ok: true });
});

// Close forum with resolution summary — staff
router.put('/:id/close', requireRank('hub_moderator'), async (req, res) => {
  const { resolutionSummary, closeLinkedConcerns } = req.body;
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  forum.status = 'closed';
  forum.resolutionSummary = resolutionSummary || '';
  forum.closedAt = new Date();
  await forum.save();
  if (closeLinkedConcerns) {
    await Concern.updateMany(
      { _id: { $in: forum.linkedConcerns } },
      { closed: true, closedAt: new Date() }
    );
  }
  await notify({
    recipients: forumParticipants(forum),
    actor: req.user,
    type: 'forum_closed',
    message: `The forum "${forum.title}" was closed`,
    forum: forum._id,
  });
  res.json({ forum });
});

// Reopen a closed forum — staff
router.put('/:id/reopen', requireRank('hub_moderator'), async (req, res) => {
  const forum = await Forum.findById(req.params.id);
  if (!forum) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, forum.community))
    return res.status(403).json({ error: 'Forbidden' });
  forum.status = 'open';
  forum.closedAt = null;
  await forum.save();
  await notify({
    recipients: forumParticipants(forum),
    actor: req.user,
    type: 'forum_closed',
    message: `The forum "${forum.title}" was reopened`,
    forum: forum._id,
  });
  res.json({ forum });
});

export default router;
