import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import { ROLE_LABELS } from '../api';
import { Avatar } from './common';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full ring-offset-2 hover:ring-2 hover:ring-slate-200 focus:outline-none"
        aria-label="Account menu"
      >
        <Avatar user={user} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white border rounded-xl shadow-lg z-20 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <div className="text-sm font-medium leading-tight">{user.name}</div>
            <div className="text-xs text-slate-500 leading-tight mt-0.5">
              {ROLE_LABELS[user.role]}
              {user.community ? ` · ${user.community.name}` : ''}
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
