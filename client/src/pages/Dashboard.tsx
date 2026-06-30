import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { isStaff, isGlobal } from '../api';
import { useAuth } from '../auth';
import { StatusBadge, Tag } from '../components/common';
import ModerationQueue from '../components/ModerationQueue';
import type { DashboardData } from '../types';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Stat({ label, value, to, onClick, accent }: {
  label: string; value: number | string; to?: string; onClick?: () => void; accent?: boolean;
}) {
  const clickable = !!(to || onClick);
  const inner = (
    <div className={`rounded-xl border p-4 h-full ${accent ? 'bg-red-50 border-red-200' : 'bg-white'} ${clickable ? 'hover:border-brand-300' : ''}`}>
      <div className={`text-2xl font-bold ${accent ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
  if (to) return <Link to={to} className="block hover:shadow-sm transition-shadow">{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left hover:shadow-sm transition-shadow">{inner}</button>;
  return inner;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [flagCount, setFlagCount] = useState<number | null>(null);
  const staff = isStaff(user);

  useEffect(() => {
    api.get<DashboardData>('/dashboard').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data || !user) return <div className="text-sm text-slate-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">
          {user.community?.name ? `${user.community.name} · ` : ''}Here's what needs your attention.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Unread notifications" value={data.unreadNotifications} to="/community/notifications" />
        <Stat label="My concerns" value={data.myConcernCount} to="/community/concerns" />
        {staff && data.staff && <>
          <Stat label="Pending review" value={data.staff.pendingCount} accent={data.staff.pendingCount > 0}
            onClick={() => scrollToId('pending-concerns')} />
          <Stat label="Open flags" value={flagCount ?? data.staff.openFlags} accent={(flagCount ?? data.staff.openFlags) > 0}
            onClick={() => scrollToId('moderation-queue')} />
          <Stat label="Active concerns" value={data.staff.activeConcerns} to="/community/concerns" />
          <Stat label="Open forums" value={data.staff.openForums} to="/community/forums" />
          <Stat label="Members" value={data.staff.memberCount} to={isGlobal(user) ? '/admin/users' : '/admin'} />
        </>}
      </div>

      {/* Staff: moderation queue */}
      {staff && (
        <section id="moderation-queue" className="scroll-mt-20">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Moderation queue{flagCount !== null ? ` (${flagCount})` : ''}
          </h2>
          <ModerationQueue onCount={setFlagCount} />
        </section>
      )}

      {/* Staff: pending concerns */}
      {staff && data.staff && data.staff.pendingConcerns.length > 0 && (
        <section id="pending-concerns" className="scroll-mt-20">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Concerns awaiting review</h2>
          <div className="space-y-2">
            {data.staff.pendingConcerns.map((c) => (
              <Link key={c._id} to={`/community/concerns/${c._id}`}
                className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2 hover:bg-slate-50">
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{c.title}</span>
                <Tag tag={c.tag} />
                <span className="text-xs text-slate-400">{c.author?.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Everyone: my concerns */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">My recent concerns</h2>
        {data.myConcerns.length === 0 ? (
          <p className="text-sm text-slate-400">You haven't raised any concerns yet.</p>
        ) : (
          <div className="space-y-2">
            {data.myConcerns.map((c) => (
              <Link key={c._id} to={`/community/concerns/${c._id}`}
                className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2 hover:bg-slate-50">
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{c.title}</span>
                <StatusBadge status={c.closed ? 'closed' : c.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Everyone: forums I'm in */}
      {data.invitedForums.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Forums you're part of</h2>
          <div className="space-y-2">
            {data.invitedForums.map((f) => (
              <Link key={f._id} to={`/community/forums/${f._id}`}
                className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2 hover:bg-slate-50">
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{f.title}</span>
                <Tag tag={f.tag} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
