import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { ROLE_LABELS, isStaff, isGlobal } from '../api';
import { Avatar } from '../components/ui';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const navItem = (to, label) => {
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
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user.name}</div>
              <div className="text-xs text-slate-500 leading-tight">
                {ROLE_LABELS[user.role]}
                {user.community ? ` · ${user.community.name}` : ''}
              </div>
            </div>
            <Avatar user={user} />
            <button onClick={logout} className="text-xs text-slate-500 hover:text-red-600 underline">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
