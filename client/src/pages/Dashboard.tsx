import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { isStaff } from '../api';
import { useAuth } from '../auth';
import { StatusBadge, Tag, Button } from '../components/common';
import type { DashboardData, Flag } from '../types';

function Stat({ label, value, to, accent }: { label: string; value: number | string; to?: string; accent?: boolean }) {
  const inner = (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
      <div className={`text-2xl font-bold ${accent ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
  return to ? <Link to={to} className="block hover:shadow-sm transition-shadow">{inner}</Link> : inner;
}

function targetLink(f: Flag): string {
  if (f.targetType === 'concern' && f.concern) return `/community/concerns/${f.concern._id}`;
  if (f.targetType === 'comment' && f.forum) return `/community/forums/${f.forum._id}`;
  if (f.targetType === 'user' && f.targetUser) return `/community/users/${f.targetUser._id}`;
  return '#';
}

function targetLabel(f: Flag): string {
  if (f.targetType === 'concern') return `Concern: ${f.concern?.title ?? '(deleted)'}`;
  if (f.targetType === 'comment') return `Comment in: ${f.forum?.title ?? '(deleted)'}`;
  return `User: ${f.targetUser?.name ?? '(deleted)'}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [flags, setFlags] = useState<Flag[]>([]);
  const staff = isStaff(user);

  const loadFlags = useCallback(() => {
    if (staff) api.get<{ flags: Flag[] }>('/flags', { params: { status: 'open' } }).then((r) => setFlags(r.data.flags)).catch(() => {});
  }, [staff]);

  useEffect(() => {
    api.get<DashboardData>('/dashboard').then((r) => setData(r.data)).catch(() => {});
    loadFlags();
  }, [loadFlags]);

  const resolveFlag = async (id: string, status: 'resolved' | 'dismissed') => {
    setFlags((prev) => prev.filter((f) => f._id !== id));
    await api.put(`/flags/${id}/resolve`, { status }).catch(() => {});
  };
  const banUser = async (uid: string) => {
    await api.put(`/users/${uid}/ban`, { banned: true, reason: 'Flagged content' }).catch(() => {});
    loadFlags();
  };

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
          <Stat label="Pending review" value={data.staff.pendingCount} accent={data.staff.pendingCount > 0} />
          <Stat label="Open flags" value={data.staff.openFlags} accent={data.staff.openFlags > 0} />
          <Stat label="Active concerns" value={data.staff.activeConcerns} />
          <Stat label="Open forums" value={data.staff.openForums} to="/community/forums" />
          <Stat label="Members" value={data.staff.memberCount} />
        </>}
      </div>

      {/* Staff: moderation queue */}
      {staff && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Moderation queue ({flags.length})</h2>
          {flags.length === 0 ? (
            <p className="text-sm text-slate-400">No open flags. 🎉</p>
          ) : (
            <div className="space-y-2">
              {flags.map((f) => (
                <div key={f._id} className="bg-white border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={targetLink(f)} className="text-sm font-medium text-brand-700 hover:underline">
                        {targetLabel(f)}
                      </Link>
                      {f.reason && <p className="text-sm text-slate-600 mt-0.5">“{f.reason}”</p>}
                      <p className="text-xs text-slate-400 mt-0.5">
                        flagged by {f.reporter?.name ?? 'someone'} · {new Date(f.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {f.targetType === 'user' && f.targetUser && !f.targetUser.banned && (
                        <Button size="sm" variant="destructive" onClick={() => banUser(f.targetUser!._id)}>Ban user</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => resolveFlag(f._id, 'resolved')}>Resolve</Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveFlag(f._id, 'dismissed')}>Dismiss</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Staff: pending concerns */}
      {staff && data.staff && data.staff.pendingConcerns.length > 0 && (
        <section>
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
