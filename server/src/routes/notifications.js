import { Router } from 'express';
import Notification from '../models/Notification.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

// List the current user's notifications (newest first) plus the unread count.
// `limit` caps the page size (default 50 for the dropdown, up to 200).
router.get('/', async (req, res) => {
  const filter = { recipient: req.user._id };
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const [notifications, unread] = await Promise.all([
    Notification.find(filter)
      .populate('actor', 'name role profileImage')
      .populate('concern', 'title')
      .populate('forum', 'title')
      .sort({ createdAt: -1 })
      .limit(limit),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  res.json({ notifications, unread });
});

// Lightweight unread count for polling.
router.get('/unread-count', async (req, res) => {
  const unread = await Notification.countDocuments({ recipient: req.user._id, read: false });
  res.json({ unread });
});

// Mark one notification read.
router.put('/:id/read', async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { read: true, readAt: new Date() },
    { new: true }
  );
  if (!notif) return res.status(404).json({ error: 'Not found' });
  res.json({ notification: notif });
});

// Mark all of the user's notifications read.
router.put('/read-all', async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );
  res.json({ ok: true });
});

export default router;
