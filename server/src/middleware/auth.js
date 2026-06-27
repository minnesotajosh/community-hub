import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const RANK = {
  member: 1,
  hub_moderator: 2,
  hub_admin: 3,
  iac_board: 4,
  top_admin: 5,
};

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Require one of the listed roles
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// Require at least a given seniority rank
export function requireRank(minRole) {
  return (req, res, next) => {
    if (!req.user || RANK[req.user.role] < RANK[minRole]) {
      return res.status(403).json({ error: 'Forbidden: insufficient rank' });
    }
    next();
  };
}

export const isStaff = (user) => RANK[user.role] >= RANK.hub_moderator;
export const isGlobal = (user) => RANK[user.role] >= RANK.iac_board;
export { RANK };
