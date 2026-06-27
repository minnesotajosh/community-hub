import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../api';
import type { Notification } from '../types';
import { Avatar } from './common';

const POLL_MS = 30_000;

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Where a notification points to: the concern or forum detail page.
function linkFor(n: Notification): string | null {
  if (n.concern) return `/community/concerns/${n.concern._id}`;
  if (n.forum) return `/community/forums/${n.forum._id}`;
  return null;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadCount = useCallback(async () => {
    try {
      const r = await api.get<{ unread: number }>('/notifications/unread-count');
      setUnread(r.data.unread);
    } catch { /* ignore transient errors */ }
  }, []);

  const loadList = useCallback(async () => {
    const r = await api.get<{ notifications: Notification[]; unread: number }>('/notifications');
    setItems(r.data.notifications);
    setUnread(r.data.unread);
  }, []);

  // Poll the unread count in the background.
  useEffect(() => {
    loadCount();
    const id = setInterval(loadCount, POLL_MS);
    return () => clearInterval(id);
  }, [loadCount]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  const onItemClick = async (n: Notification) => {
    setOpen(false);
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
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg z-20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</div>
            ) : (
              items.map((n) => (
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
