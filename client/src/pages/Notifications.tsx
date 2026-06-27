import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import type { Notification } from '../types';
import { Avatar, Button } from '../components/common';
import { timeAgo, linkFor } from '../lib/notifications';

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const r = await api.get<{ notifications: Notification[]; unread: number }>('/notifications', {
      params: { limit: 200 },
    });
    setItems(r.data.notifications);
    setUnread(r.data.unread);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onItemClick = async (n: Notification) => {
    if (!n.read) {
      setItems((prev) => prev.map((p) => (p._id === n._id ? { ...p, read: true } : p)));
      setUnread((u) => Math.max(0, u - 1));
      api.put(`/notifications/${n._id}/read`).catch(() => {});
    }
    const to = linkFor(n);
    if (to) navigate(to);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((p) => ({ ...p, read: true })));
    setUnread(0);
    await api.put('/notifications/read-all').catch(() => {});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Notifications {unread > 0 && <span className="text-brand-600">({unread} unread)</span>}
        </h1>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">No notifications yet.</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          {items.map((n) => (
            <button
              key={n._id}
              onClick={() => onItemClick(n)}
              className={`w-full text-left px-4 py-3 flex gap-3 border-b last:border-b-0 hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/50'}`}
            >
              <Avatar user={n.actor} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-700">{n.message}</div>
                <div className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
