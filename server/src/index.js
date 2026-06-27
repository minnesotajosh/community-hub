import 'dotenv/config';
import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import communityRoutes from './routes/communities.js';
import userRoutes from './routes/users.js';
import concernRoutes from './routes/concerns.js';
import forumRoutes from './routes/forums.js';
import notificationRoutes from './routes/notifications.js';
import flagRoutes from './routes/flags.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/concerns', concernRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/dashboard', dashboardRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // A bad ObjectId (e.g. malformed :id in the URL) -> treat as not found, not a 500.
  if (err.name === 'CastError') {
    return res.status(404).json({ error: 'Not found' });
  }
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
});
