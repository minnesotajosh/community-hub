import { Router } from 'express';
import Concern from '../models/Concern.js';
import Forum from '../models/Forum.js';
import User from '../models/User.js';
import Flag from '../models/Flag.js';
import Notification from '../models/Notification.js';
import { authRequired, isStaff } from '../middleware/auth.js';
import { communityFilter } from '../middleware/scope.js';

const router = Router();
router.use(authRequired);

// Role-aware home dashboard summary.
router.get('/', async (req, res) => {
  const me = req.user;
  const scope = communityFilter(me); // {} for global roles, else { community }

  const [unreadNotifications, myConcerns, invitedForums] = await Promise.all([
    Notification.countDocuments({ recipient: me._id, read: false }),
    Concern.find({ author: me._id })
      .select('title status closed createdAt forum')
      .sort({ createdAt: -1 })
      .limit(5),
    Forum.find({ ...scope, invitedUsers: me._id, status: 'open' })
      .select('title tag status')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  const data = {
    role: me.role,
    unreadNotifications,
    myConcerns,
    myConcernCount: await Concern.countDocuments({ author: me._id }),
    invitedForums,
  };

  // Staff get a moderation overview for their community (or all, if global).
  if (isStaff(me)) {
    const [pendingConcerns, pendingCount, openFlags, memberCount, openForums, activeConcerns] = await Promise.all([
      Concern.find({ ...scope, status: 'pending' })
        .select('title tag author createdAt')
        .populate('author', 'name')
        .sort({ createdAt: -1 })
        .limit(8),
      Concern.countDocuments({ ...scope, status: 'pending' }),
      Flag.countDocuments({ ...scope, status: 'open' }),
      User.countDocuments({ ...scope }),
      Forum.countDocuments({ ...scope, status: 'open' }),
      Concern.countDocuments({ ...scope, status: 'active' }),
    ]);
    data.staff = { pendingConcerns, pendingCount, openFlags, memberCount, openForums, activeConcerns };
  }

  res.json(data);
});

export default router;
