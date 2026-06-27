import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await user.checkPassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.banned) return res.status(403).json({ error: 'This account has been banned.' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

router.get('/me', authRequired, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('city', 'name')
    .populate('community', 'name');
  res.json({ user });
});

// Dev convenience: list seeded accounts for the login dropdown
router.get('/dev-accounts', async (_req, res) => {
  const users = await User.find()
    .select('name email role')
    .populate('community', 'name')
    .sort({ role: 1 });
  res.json({ accounts: users });
});

export default router;
