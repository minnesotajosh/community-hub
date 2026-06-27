import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { ROLE_LABELS, isStaff } from '../api';
import { useAuth } from '../auth';
import { Avatar, Tag, StatusBadge, Button } from '../components/common';
import FlagButton from '../components/FlagButton';
import type { UserProfile } from '../types';

// Strip HTML tags for a plain-text comment preview.
function preview(html: string, max = 100): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    api.get<UserProfile>(`/users/${id}/profile`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.error || 'Could not load profile'));
  useEffect(() => { setData(null); setError(''); load(); }, [id]);

  const toggleBan = async (banned: boolean) => {
    await api.put(`/users/${id}/ban`, { banned, reason: banned ? 'Violation of community guidelines' : '' });
    load();
  };

  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return <div className="text-sm text-slate-400">Loading…</div>;

  const { user, concerns, comments, isSelf } = data;
  const staff = isStaff(me);

  return (
    <div className="space-y-6">
      <Link to="/community/concerns"><Button variant="ghost" className="px-0 text-slate-500">← Back</Button></Link>

      {/* Header */}
      <div className="bg-white border rounded-xl p-5 flex items-start gap-4">
        <Avatar user={user} large />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{user.name}</h1>
            {/* Role is only shown on your own profile. */}
            {isSelf && (
              <span className="text-xs font-medium text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">
                {ROLE_LABELS[user.role]}
              </span>
            )}
            {user.banned && (
              <span className="text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">Banned</span>
            )}
          </div>
          <div className="text-sm text-slate-500 mt-0.5">
            {user.city?.name}
            {user.community ? ` · ${user.community.name}` : ''}
          </div>
          {user.bio && <p className="text-sm text-slate-600 mt-2">{user.bio}</p>}
          {!isSelf && (
            <div className="mt-3 flex items-center gap-3">
              <FlagButton targetType="user" userId={user._id} label="Flag this account" />
              {staff && (user.banned
                ? <Button size="sm" variant="outline" onClick={() => toggleBan(false)}>Unban</Button>
                : <Button size="sm" variant="destructive" onClick={() => toggleBan(true)}>Ban user</Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Concerns raised */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Concerns raised ({concerns.length})
        </h2>
        {concerns.length === 0 ? (
          <p className="text-sm text-slate-400">No concerns yet.</p>
        ) : (
          <div className="space-y-2">
            {concerns.map((c) => (
              <Link key={c._id} to={`/community/concerns/${c._id}`}
                className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2 hover:bg-slate-50">
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{c.title}</span>
                <Tag tag={c.tag} />
                <StatusBadge status={c.closed ? 'closed' : c.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Forum comments */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Comments ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">No comments yet.</p>
        ) : (
          <div className="space-y-2">
            {comments.map((cm) => (
              <Link key={cm._id} to={`/community/forums/${cm.forum._id}`}
                className="block bg-white border rounded-lg px-3 py-2 hover:bg-slate-50">
                <div className="text-sm text-slate-700">{preview(cm.body)}</div>
                <div className="text-xs text-slate-400 mt-1">
                  on “{cm.forum.title}” · {new Date(cm.createdAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
