import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api, { isStaff } from '../api';
import { useAuth } from '../auth';
import { Tag, StatusBadge, Rich, Avatar, Button, SelectField, Input } from '../components/common';
import type { Concern, ConcernStatus, Forum } from '../types';

// Inner concern view, used both as a full page and inside a modal.
// `onNotFound` fires on a 404 (close modal / navigate away); `onChanged` after edits.
export function ConcernView({ id, onNotFound, onChanged }: {
  id?: string;
  onNotFound?: () => void;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [c, setC] = useState<Concern | null>(null);
  const [forums, setForums] = useState<Forum[]>([]);
  // Escalation UI: 'create' a new forum from this concern, or 'link' to an existing one.
  const [escalate, setEscalate] = useState<'create' | 'link' | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [linkTarget, setLinkTarget] = useState('');

  const load = () =>
    api.get<{ concern: Concern }>(`/concerns/${id}`)
      .then((r) => setC(r.data.concern))
      .catch(() => { toast.error('Concern not found or no longer available.'); onNotFound?.(); });
  useEffect(() => { setC(null); setEscalate(null); if (id) load(); }, [id]);
  useEffect(() => {
    if (isStaff(user)) api.get<{ forums: Forum[] }>('/forums').then((r) => setForums(r.data.forums)).catch(() => {});
  }, [user]);
  if (!c) return null;

  const staff = isStaff(user);
  const refresh = () => { load(); onChanged?.(); };
  const setStatus = async (status: ConcernStatus) => { await api.put(`/concerns/${id}/status`, { status }); refresh(); };
  const toggleClose = async () => { await api.put(`/concerns/${id}/close`, { closed: !c.closed }); refresh(); };
  const star = async () => { await api.post(`/concerns/${id}/star`); refresh(); };

  const createForum = async () => {
    const r = await api.post<{ forum: Forum }>('/forums', {
      title: newTitle.trim() || c.title, tag: c.tag, description: '', linkedConcerns: [id],
    });
    nav(`/community/forums/${r.data.forum._id}`);
  };
  const linkExisting = async () => {
    if (!linkTarget) return;
    await api.post(`/forums/${linkTarget}/link`, { concernId: id });
    setEscalate(null); refresh();
  };
  const unlink = async () => {
    if (!c.forum) return;
    await api.delete(`/forums/${c.forum._id}/link/${id}`);
    refresh();
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Tag tag={c.tag} />
            <StatusBadge status={c.status} />
            {c.closed && <StatusBadge status="closed" />}
          </div>
        </div>
        <button onClick={star} className="flex items-center gap-1 text-amber-500">
          <span className="text-2xl">★</span>
          <span className="text-sm font-semibold">{c.stars?.length || 0}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
        <Avatar user={c.author} />
        <div>
          {c.author ? (
            <Link to={`/community/users/${c.author._id}`} className="font-medium text-slate-700 hover:text-brand-600 hover:underline">
              {c.author.name}
            </Link>
          ) : <div className="font-medium text-slate-700">Unknown</div>}
          <div className="text-xs">{c.city?.name} · {new Date(c.createdAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-4 border-t pt-4"><Rich html={c.description} /></div>

      {c.forum && (
        <div className="mt-4 bg-brand-50 rounded-lg p-3 text-sm flex items-center justify-between gap-2">
          <span>
            Escalated to forum:{' '}
            <Link to={`/community/forums/${c.forum._id}`} className="text-brand-600 font-medium hover:underline">
              {c.forum.title}
            </Link>
          </span>
          {staff && !c.closed && (
            <button onClick={unlink} className="text-xs text-slate-500 hover:text-red-600 underline shrink-0">
              Unlink
            </button>
          )}
        </div>
      )}

      {staff && !c.forum && !c.closed && (
        <div className="mt-4 border rounded-lg p-3">
          {escalate === null && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Escalate to a forum:</span>
              <Button size="sm" onClick={() => { setNewTitle(c.title); setEscalate('create'); }}>Create forum from concern</Button>
              <Button size="sm" variant="outline" onClick={() => setEscalate('link')}>Link to existing forum</Button>
            </div>
          )}
          {escalate === 'create' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">New forum from this concern</p>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Forum title" />
              <div className="flex gap-2">
                <Button size="sm" onClick={createForum}>Create &amp; open</Button>
                <Button size="sm" variant="ghost" onClick={() => setEscalate(null)}>Cancel</Button>
              </div>
            </div>
          )}
          {escalate === 'link' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">Link to an existing forum</p>
              <SelectField value={linkTarget} onChange={setLinkTarget} placeholder="— select a forum —"
                options={forums.filter((f) => f.status === 'open').map((f) => ({ value: f._id, label: f.title }))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={linkExisting} disabled={!linkTarget}>Link concern</Button>
                <Button size="sm" variant="ghost" onClick={() => setEscalate(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {staff && (
        <div className="mt-6 border-t pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Moderator actions</p>
          <div className="flex flex-wrap gap-2">
            {c.status === 'pending' && <>
              <Button onClick={() => setStatus('approved')}>Approve</Button>
              <Button variant="destructive" onClick={() => setStatus('denied')}>Deny</Button>
            </>}
            {c.status === 'denied' && <Button onClick={() => setStatus('approved')}>Approve</Button>}
            {c.status === 'approved' && <Button onClick={() => setStatus('active')}>Mark active</Button>}
            <Button variant="ghost" onClick={toggleClose}>
              {c.closed ? 'Reopen' : 'Mark resolved'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Full-page route (used for deep links, e.g. from a forum's linked concerns).
export default function ConcernDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  return (
    <div>
      <Link to="/community/concerns" className="text-sm text-brand-600">← Back to concerns</Link>
      <div className="bg-white rounded-xl p-6 shadow-sm mt-3">
        <ConcernView id={id} onNotFound={() => nav('/community/concerns')} />
      </div>
    </div>
  );
}
