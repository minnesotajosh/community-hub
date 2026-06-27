import { Router } from 'express';
import User, { ROLES } from '../models/User.js';
import City from '../models/City.js';
import { authRequired, requireRank, RANK, isGlobal } from '../middleware/auth.js';
import { communityFilter, canAccessCommunity } from '../middleware/scope.js';

const router = Router();
router.use(authRequired);

// List users — scoped to community for non-global roles
router.get('/', requireRank('hub_moderator'), async (req, res) => {
  const users = await User.find(communityFilter(req.user))
    .populate('city', 'name')
    .populate('community', 'name')
    .sort({ role: 1, name: 1 });
  res.json({ users });
});

// Create a user. RBAC:
//  - hub_admin can add members only, within their community
//  - iac_board can add hub_admins/mods/members
//  - top_admin can add anyone
router.post('/', requireRank('hub_admin'), async (req, res) => {
  const { name, email, password, role, bio, profileImage, city } = req.body;
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Bad role' });

  // hub_admin may only create members or moderators in their community
  if (req.user.role === 'hub_admin' && !['member', 'hub_moderator'].includes(role))
    return res.status(403).json({ error: 'Hub admins can only add members/moderators' });
  if (req.user.role === 'iac_board' && role === 'top_admin')
    return res.status(403).json({ error: 'IAC board cannot create top admins' });

  // resolve community from city for non-global new users
  let community = null;
  if (city) {
    const cityDoc = await City.findById(city);
    if (!cityDoc) return res.status(400).json({ error: 'Bad city' });
    community = cityDoc.community;
    if (!canAccessCommunity(req.user, community))
      return res.status(403).json({ error: 'Cannot add user outside your community' });
  }

  const user = new User({ name, email, role, bio, profileImage, city: city || null, community });
  await user.setPassword(password || 'test');
  await user.save();
  res.status(201).json({ user });
});

// Update a user
router.put('/:id', requireRank('hub_admin'), async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (!isGlobal(req.user) && !canAccessCommunity(req.user, target.community))
    return res.status(403).json({ error: 'Forbidden' });
  // cannot modify someone more senior than you
  if (RANK[target.role] > RANK[req.user.role])
    return res.status(403).json({ error: 'Cannot modify a more senior user' });

  const { name, bio, profileImage, role, password } = req.body;
  if (name !== undefined) target.name = name;
  if (bio !== undefined) target.bio = bio;
  if (profileImage !== undefined) target.profileImage = profileImage;
  if (role !== undefined && RANK[req.user.role] >= RANK.iac_board) target.role = role;
  if (password) await target.setPassword(password);
  await target.save();
  res.json({ user: target });
});

// Delete / remove a member — hub_admin+
router.delete('/:id', requireRank('hub_admin'), async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Not found' });
  if (!isGlobal(req.user) && !canAccessCommunity(req.user, target.community))
    return res.status(403).json({ error: 'Forbidden' });
  if (RANK[target.role] >= RANK[req.user.role])
    return res.status(403).json({ error: 'Cannot remove a peer or senior' });
  await target.deleteOne();
  res.json({ ok: true });
});

// Update own profile
router.put('/me/profile', async (req, res) => {
  const { name, bio, profileImage } = req.body;
  const me = await User.findById(req.user._id);
  if (name !== undefined) me.name = name;
  if (bio !== undefined) me.bio = bio;
  if (profileImage !== undefined) me.profileImage = profileImage;
  await me.save();
  res.json({ user: me });
});

export default router;
