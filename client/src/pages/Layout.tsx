import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth';
import { isStaff, isGlobal } from '../api';
import NotificationBell from '../components/NotificationBell';
import UserMenu from '../components/UserMenu';

export default function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return null;

  const navItem = (to: string, label: string) => {
    const active = loc.pathname.startsWith(to);
    return (
      <Link to={to}
        className={`px-3 py-2 rounded-lg text-sm font-medium ${active ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <Link to="/" className="font-bold text-brand-700 text-lg mr-4">Civic Hub</Link>
          {navItem('/community', 'Community')}
          {isStaff(user) && navItem('/admin', isGlobal(user) ? 'Admin' : 'Manage')}
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
