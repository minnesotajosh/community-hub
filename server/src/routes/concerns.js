import { Router } from 'express';
import Concern from '../models/Concern.js';
import { authRequired, isStaff } from '../middleware/auth.js';
import { communityFilter, canAccessCommunity } from '../middleware/scope.js';
import { notify, communityStaffIds } from '../services/notify.js';

const router = Router();

// Recipients interested in a concern: its author, anyone who starred it, and
// the community's staff. The acting user is excluded inside notify().
async function concernRecipients(concern) {
  const staff = await communityStaffIds(concern.community);
  return [concern.author, ...concern.stars, ...staff];
}

// Only the concern's creator or community staff (mod/admin) may change its status.
function canChangeConcern(user, concern) {
  return isStaff(user) || String(concern.author) === String(user._id);
}
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
    .populate('statusChangedBy', 'name role')
    .sort({ createdAt: -1 });
  res.json({ concerns });
});

router.get('/:id', async (req, res) => {
  const concern = await Concern.findById(req.params.id)
    .populate('author', 'name role profileImage bio')
    .populate('city', 'name')
    .populate('forum', 'title status')
    .populate('statusChangedBy', 'name role');
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
  // New concerns start pending — only staff can see them, so notify staff.
  await notify({
    recipients: await communityStaffIds(concern.community),
    actor: req.user,
    type: 'concern_new',
    message: `${req.user.name} raised a concern: "${concern.title}"`,
    concern: concern._id,
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

// Change status — the concern's creator or staff (mod/admin)
router.put('/:id/status', async (req, res) => {
  const { status } = req.body; // approved | denied | active | pending
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, concern.community))
    return res.status(403).json({ error: 'Forbidden' });
  if (!canChangeConcern(req.user, concern))
    return res.status(403).json({ error: 'Only the creator or a moderator can change status' });
  concern.status = status;
  concern.statusChangedBy = req.user._id;
  concern.statusChangedAt = new Date();
  await concern.save();
  await concern.populate('statusChangedBy', 'name role');
  await notify({
    recipients: await concernRecipients(concern),
    actor: req.user,
    type: 'concern_status',
    message: `Concern "${concern.title}" was marked ${status}`,
    concern: concern._id,
  });
  res.json({ concern });
});

// Close / reopen — the concern's creator or staff (mod/admin)
router.put('/:id/close', async (req, res) => {
  const { closed } = req.body;
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, concern.community))
    return res.status(403).json({ error: 'Forbidden' });
  if (!canChangeConcern(req.user, concern))
    return res.status(403).json({ error: 'Only the creator or a moderator can change status' });
  concern.closed = !!closed;
  concern.closedAt = closed ? new Date() : null;
  concern.statusChangedBy = req.user._id;
  concern.statusChangedAt = new Date();
  await concern.save();
  await concern.populate('statusChangedBy', 'name role');
  await notify({
    recipients: await concernRecipients(concern),
    actor: req.user,
    type: 'concern_closed',
    message: `Concern "${concern.title}" was ${concern.closed ? 'closed' : 'reopened'}`,
    concern: concern._id,
  });
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
