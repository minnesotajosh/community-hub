import { Router } from 'express';
import Flag, { FLAG_TARGETS } from '../models/Flag.js';
import Concern from '../models/Concern.js';
import Forum from '../models/Forum.js';
import User from '../models/User.js';
import { authRequired, requireRank, isStaff } from '../middleware/auth.js';
import { canAccessCommunity } from '../middleware/scope.js';

const router = Router();
router.use(authRequired);

// Raise a flag on a concern, a forum comment, or a user — any authenticated user.
router.post('/', async (req, res) => {
  const { targetType, reason, concernId, forumId, commentId, userId } = req.body;
  if (!FLAG_TARGETS.includes(targetType))
    return res.status(400).json({ error: 'Invalid target type' });

  const flag = { reporter: req.user._id, targetType, reason: reason || '', community: req.user.community };

  if (targetType === 'concern') {
    const concern = await Concern.findById(concernId);
    if (!concern) return res.status(404).json({ error: 'Concern not found' });
    flag.concern = concern._id;
    flag.community = concern.community;
  } else if (targetType === 'comment') {
    const forum = await Forum.findById(forumId);
    if (!forum || !forum.comments.id(commentId))
      return res.status(404).json({ error: 'Comment not found' });
    flag.forum = forum._id;
    flag.commentId = commentId;
    flag.community = forum.community;
  } else {
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: 'User not found' });
    flag.targetUser = target._id;
    flag.community = target.community || req.user.community;
  }

  const created = await Flag.create(flag);
  res.status(201).json({ flag: created });
});

// List flags — staff only, scoped to their community (global staff see all).
router.get('/', requireRank('hub_moderator'), async (req, res) => {
  const filter = {};
  if (!isStaff(req.user)) return res.status(403).json({ error: 'Forbidden' });
  // Non-global staff only see their own community's flags.
  if (req.user.community && !['iac_board', 'top_admin'].includes(req.user.role))
    filter.community = req.user.community;
  if (req.query.status) filter.status = req.query.status;

  const flags = await Flag.find(filter)
    .populate('reporter', 'name role')
    .populate('targetUser', 'name role banned')
    .populate('concern', 'title')
    .populate('forum', 'title')
    .sort({ status: 1, createdAt: -1 })
    .limit(200);
  res.json({ flags });
});

// Resolve or dismiss a flag — staff.
router.put('/:id/resolve', requireRank('hub_moderator'), async (req, res) => {
  const { status } = req.body; // 'resolved' | 'dismissed'
  const flag = await Flag.findById(req.params.id);
  if (!flag) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, flag.community))
    return res.status(403).json({ error: 'Forbidden' });
  flag.status = status === 'dismissed' ? 'dismissed' : 'resolved';
  flag.resolvedBy = req.user._id;
  flag.resolvedAt = new Date();
  await flag.save();
  res.json({ flag });
});

export default router;
