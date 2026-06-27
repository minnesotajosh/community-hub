import { Router } from 'express';
import Community from '../models/Community.js';
import City from '../models/City.js';
import { authRequired, requireRank } from '../middleware/auth.js';
import { communityFilter, canAccessCommunity } from '../middleware/scope.js';

const router = Router();
router.use(authRequired);

// List communities (scoped). Global users see all.
router.get('/', async (req, res) => {
  const communities = await Community.find(communityFilter(req.user)).sort({ name: 1 });
  const withCities = await Promise.all(
    communities.map(async (c) => {
      const cities = await City.find({ community: c._id }).sort({ name: 1 });
      return { ...c.toObject(), cities };
    })
  );
  res.json({ communities: withCities });
});

router.get('/:id', async (req, res) => {
  if (!canAccessCommunity(req.user, req.params.id))
    return res.status(403).json({ error: 'Forbidden' });
  const community = await Community.findById(req.params.id);
  if (!community) return res.status(404).json({ error: 'Not found' });
  const cities = await City.find({ community: community._id });
  res.json({ community: { ...community.toObject(), cities } });
});

// Create community — IAC board / top admin
router.post('/', requireRank('iac_board'), async (req, res) => {
  const { name, description, iac } = req.body;
  const community = await Community.create({ name, description, iac });
  res.status(201).json({ community });
});

// Add city — IAC board / top admin
router.post('/:id/cities', requireRank('iac_board'), async (req, res) => {
  const { name, description } = req.body;
  const city = await City.create({ name, description, community: req.params.id });
  res.status(201).json({ city });
});

// Edit city — hub_admin+ (must be in community unless global)
router.put('/cities/:cityId', requireRank('hub_admin'), async (req, res) => {
  const city = await City.findById(req.params.cityId);
  if (!city) return res.status(404).json({ error: 'Not found' });
  if (!canAccessCommunity(req.user, city.community))
    return res.status(403).json({ error: 'Forbidden' });
  const { name, description } = req.body;
  if (name !== undefined) city.name = name;
  if (description !== undefined) city.description = description;
  await city.save();
  res.json({ city });
});

// Delete community — IAC board / top admin
router.delete('/:id', requireRank('iac_board'), async (req, res) => {
  await City.deleteMany({ community: req.params.id });
  await Community.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
