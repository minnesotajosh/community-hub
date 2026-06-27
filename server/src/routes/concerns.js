import { Router } from 'express';
import Concern from '../models/Concern.js';
import { authRequired, requireRank, isStaff } from '../middleware/auth.js';
import { communityFilter, canAccessCommunity } from '../middleware/scope.js';

const router = Router();
router.use(authRequired);

// List concerns visible to the user (scoped). Members see approved/active + their own.
router.get('/', async (req, res) => {
  const filter = communityFilter(req.user);
  // Non-staff members only see approved/active concerns, plus their own pending/denied ones.
  if (!isStaff(req.user)) {
    filter.$or = [
      { status: { $in: ['approved', 'active'] } },
      { author: req.user._id },
    ];
  }
  const concerns = await Concern.find(filter)
    .populate('author', 'name role profileImage')
    .populate('city', 'name')
    .populate('forum', 'title status')
    .sort({ createdAt: -1 });
  res.json({ concerns });
});

router.get('/:id', async (req, res) => {
  const concern = await Concern.findById(req.params.id)
    .populate('author', 'name role profileImage bio')
    .populate('city', 'name')
    .populate('forum', 'title status');
  if (!concern) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, concern.community))
    return res.status(403).json({ error: 'Forbidden' });
  res.json({ concern });
});

// Any authenticated user can raise a concern (starts pending)
router.post('/', async (req, res) => {
  const { title, tag, description, images } = req.body;
  if (!req.user.community)
    return res.status(400).json({ error: 'You must belong to a community to raise a concern' });
  const concern = await Concern.create({
    title,
    tag,
    description,
    images: images || [],
    author: req.user._id,
    community: req.user.community,
    city: req.user.city,
    status: 'pending',
  });
  res.status(201).json({ concern });
});

// Star / unstar (toggle) — any user in community
router.post('/:id/star', async (req, res) => {
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, concern.community))
    return res.status(403).json({ error: 'Forbidden' });
  const uid = String(req.user._id);
  const has = concern.stars.some((s) => String(s) === uid);
  concern.stars = has
    ? concern.stars.filter((s) => String(s) !== uid)
    : [...concern.stars, req.user._id];
  await concern.save();
  res.json({ stars: concern.stars.length, starred: !has });
});

// Moderate status — staff only (mod/admin)
router.put('/:id/status', requireRank('hub_moderator'), async (req, res) => {
  const { status } = req.body; // approved | denied | active | pending
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, concern.community))
    return res.status(403).json({ error: 'Forbidden' });
  concern.status = status;
  await concern.save();
  res.json({ concern });
});

// Close / reopen — staff
router.put('/:id/close', requireRank('hub_moderator'), async (req, res) => {
  const { closed } = req.body;
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, concern.community))
    return res.status(403).json({ error: 'Forbidden' });
  concern.closed = !!closed;
  concern.closedAt = closed ? new Date() : null;
  await concern.save();
  res.json({ concern });
});

// Author can edit own concern while pending; staff can always edit
router.put('/:id', async (req, res) => {
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });
  const owner = String(concern.author) === String(req.user._id);
  if (!owner && !isStaff(req.user))
    return res.status(403).json({ error: 'Forbidden' });
  const { title, tag, description } = req.body;
  if (title !== undefined) concern.title = title;
  if (tag !== undefined) concern.tag = tag;
  if (description !== undefined) concern.description = description;
  await concern.save();
  res.json({ concern });
});

export default router;
