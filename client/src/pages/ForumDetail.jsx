import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { isStaff } from '../api';
import { useAuth } from '../auth';
import { Tag, StatusBadge, Rich, Avatar, Button } from '../components/ui';
import RichEditor from '../components/RichEditor';

export default function ForumDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [forum, setForum] = useState(null);
  const [canComment, setCanComment] = useState(false);
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [closeMode, setCloseMode] = useState(false);
  const [summary, setSummary] = useState('');
  const [closeLinked, setCloseLinked] = useState(true);

  // staff helpers
  const [members, setMembers] = useState([]);
  const [concerns, setConcerns] = useState([]);

  const load = () =>
    api.get(`/forums/${id}`).then((r) => { setForum(r.data.forum); setCanComment(r.data.canComment); })
      .catch(() => nav('/community/forums'));
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (isStaff(user)) {
      api.get('/users').then((r) => setMembers(r.data.users)).catch(() => {});
      api.get('/concerns').then((r) => setConcerns(r.data.concerns)).catch(() => {});
    }
  }, [user]);

  if (!forum) return null;
  const staff = isStaff(user);
  const closed = forum.status === 'closed';

  const isBlank = (html) => !html || !html.replace(/<(.|\n)*?>/g, '').trim();
  const addComment = async (e) => {
    e.preventDefault();
    if (isBlank(body)) return;
    await api.post(`/forums/${id}/comments`, { body });
    setBody(''); load();
  };
  const saveEdit = async (cid) => {
    await api.put(`/forums/${id}/comments/${cid}`, { body: editBody });
    setEditing(null); load();
  };
  const delComment = async (cid) => { await api.delete(`/forums/${id}/comments/${cid}`); load(); };
  const starComment = async (cid) => { await api.post(`/forums/${id}/comments/${cid}/star`); load(); };
  const invite = async (uid) => { await api.post(`/forums/${id}/invite`, { userIds: [uid] }); load(); };
  const link = async (cid) => { await api.post(`/forums/${id}/link`, { concernId: cid }); load(); };
  const closeForum = async () => {
    await api.put(`/forums/${id}/close`, { resolutionSummary: summary, closeLinkedConcerns: closeLinked });
    setCloseMode(false); load();
  };

  const isInvited = (uid) => forum.invitedUsers?.some((u) => u._id === uid);

  return (
    <div>
      <Link to="/community/forums" className="text-sm text-brand-600">← Back to forums</Link>
      <div className="bg-white rounded-xl p-6 shadow-sm mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{forum.title}</h1>
          <Tag tag={forum.tag} />
          <StatusBadge status={forum.status} />
        </div>
        <div className="text-xs text-slate-500 mt-1">started by {forum.author?.name}</div>
        <div className="mt-3"><Rich html={forum.description} /></div>

        {closed && (
          <div className="mt-4 bg-slate-50 border rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Resolution summary</p>
            <Rich html={forum.resolutionSummary} />
            <p className="text-xs text-slate-400 mt-1">Closed {new Date(forum.closedAt).toLocaleString()}</p>
          </div>
        )}

        {/* Linked concerns */}
        {forum.linkedConcerns?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Linked concerns</p>
            <div className="flex flex-wrap gap-2">
              {forum.linkedConcerns.map((c) => (
                <Link key={c._id} to={`/community/concerns/${c._id}`}
                  className="text-sm bg-brand-50 text-brand-700 px-2 py-1 rounded">
                  {c.title} {c.closed && '✓'}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Invited users */}
        <div className="mt-3 text-xs text-slate-500">
          Can comment: staff{forum.invitedUsers?.length ? ' + ' + forum.invitedUsers.map((u) => u.name).join(', ') : ''}
        </div>
      </div>

      {/* Staff panel */}
      {staff && !closed && (
        <div className="bg-white rounded-xl p-4 shadow-sm mt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase">Moderator tools</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-1">
              Invite member:
              <select className="border rounded px-2 py-1" defaultValue=""
                onChange={(e) => e.target.value && invite(e.target.value)}>
                <option value="">— select —</option>
                {members.filter((m) => m.role === 'member' && !isInvited(m._id))
                  .map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1">
              Link concern:
              <select className="border rounded px-2 py-1" defaultValue=""
                onChange={(e) => e.target.value && link(e.target.value)}>
                <option value="">— select —</option>
                {concerns.filter((c) => !forum.linkedConcerns.some((l) => l._id === c._id))
                  .map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </label>
            <Button variant="ghost" onClick={() => setCloseMode(!closeMode)}>Close forum…</Button>
          </div>
          {closeMode && (
            <div className="border-t pt-3 space-y-2">
              <RichEditor placeholder="Resolution summary — actions taken / next steps"
                value={summary} onChange={setSummary} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={closeLinked} onChange={(e) => setCloseLinked(e.target.checked)} />
                Also close all linked concerns
              </label>
              <Button onClick={closeForum}>Confirm close</Button>
            </div>
          )}
        </div>
      )}

      {/* Comments */}
      <div className="mt-4">
        <h2 className="font-semibold mb-2">Discussion ({forum.comments?.length || 0})</h2>
        <div className="space-y-3">
          {forum.comments?.map((cm) => {
            const mine = cm.author?._id === user._id;
            const starred = cm.stars?.includes(user._id);
            return (
              <div key={cm._id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Avatar user={cm.author} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{cm.author?.name}</div>
                    <div className="text-xs text-slate-400">{new Date(cm.createdAt).toLocaleString()}</div>
                  </div>
                  <button onClick={() => !mine && starComment(cm._id)}
                    disabled={mine}
                    title={mine ? "Can't star your own comment" : 'Star'}
                    className={`flex items-center gap-1 text-sm ${starred ? 'text-amber-500' : 'text-slate-400'} ${mine ? 'opacity-40' : 'hover:text-amber-500'}`}>
                    ★ {cm.stars?.length || 0}
                  </button>
                </div>
                {editing === cm._id ? (
                  <div className="mt-2 space-y-2">
                    <RichEditor value={editBody} onChange={setEditBody} />
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(cm._id)}>Save</Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2"><Rich html={cm.body} /></div>
                )}
                {(mine || staff) && editing !== cm._id && (
                  <div className="mt-2 flex gap-3 text-xs text-slate-400">
                    {mine && <button onClick={() => { setEditing(cm._id); setEditBody(cm.body); }} className="hover:text-brand-600">Edit</button>}
                    <button onClick={() => delComment(cm._id)} className="hover:text-red-600">Delete</button>
                  </div>
                )}
              </div>
            );
          })}
          {forum.comments?.length === 0 && <p className="text-slate-400 text-sm">No comments yet.</p>}
        </div>

        {/* Add comment */}
        {!closed && canComment && (
          <form onSubmit={addComment} className="bg-white rounded-xl p-4 shadow-sm mt-3 space-y-2">
            <RichEditor placeholder="Add a comment…" value={body} onChange={setBody} />
            <Button type="submit">Post comment</Button>
          </form>
        )}
        {!closed && !canComment && (
          <p className="text-sm text-slate-400 mt-3 bg-white rounded-xl p-4 shadow-sm">
            You can view this forum but you have not been invited to comment.
          </p>
        )}
      </div>
    </div>
  );
}
