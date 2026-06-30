import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Button } from './common';
import type { Flag } from '../types';

function targetLink(f: Flag): string {
  if (f.targetType === 'concern' && f.concern) return `/community/concerns/${f.concern._id}`;
  if (f.targetType === 'comment' && f.forum)
    return `/community/forums/${f.forum._id}${f.commentId ? `#comment-${f.commentId}` : ''}`;
  if (f.targetType === 'user' && f.targetUser) return `/community/users/${f.targetUser._id}`;
  return '#';
}

function targetLabel(f: Flag): string {
  if (f.targetType === 'concern') return `Concern: ${f.concern?.title ?? '(deleted)'}`;
  if (f.targetType === 'comment') return `Comment in: ${f.forum?.title ?? '(deleted)'}`;
  return `User: ${f.targetUser?.name ?? '(deleted)'}`;
}

// Open-flag moderation queue. Self-contained: loads flags and reports the count
// to the parent via onCount so headings/badges can stay in sync.
export default function ModerationQueue({ onCount }: { onCount?: (n: number) => void }) {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loaded, setLoaded] = useState(false);

  const setAll = useCallback((next: Flag[]) => { setFlags(next); onCount?.(next.length); }, [onCount]);

  const load = useCallback(() => {
    api.get<{ flags: Flag[] }>('/flags', { params: { status: 'open' } })
      .then((r) => setAll(r.data.flags))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [setAll]);

  useEffect(() => { load(); }, [load]);

  const resolveFlag = async (id: string, status: 'resolved' | 'dismissed') => {
    setAll(flags.filter((f) => f._id !== id));
    await api.put(`/flags/${id}/resolve`, { status }).catch(() => {});
  };
  const banUser = async (uid: string) => {
    await api.put(`/users/${uid}/ban`, { banned: true, reason: 'Flagged content' }).catch(() => {});
    load();
  };

  if (!loaded) return <p className="text-sm text-slate-400">Loading…</p>;
  if (flags.length === 0) return <p className="text-sm text-slate-400">No open flags. 🎉</p>;

  return (
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
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Link to={targetLink(f)}><Button size="sm">Review →</Button></Link>
              {f.targetType === 'user' && f.targetUser && !f.targetUser.banned && (
                <Button size="sm" variant="destructive" onClick={() => banUser(f.targetUser!._id)}>Ban user</Button>
              )}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t flex justify-end gap-4 text-xs text-slate-400">
            <button onClick={() => resolveFlag(f._id, 'resolved')} className="hover:text-green-600">Mark handled</button>
            <button onClick={() => resolveFlag(f._id, 'dismissed')} className="hover:text-slate-600">Dismiss (no action)</button>
          </div>
        </div>
      ))}
    </div>
  );
}
