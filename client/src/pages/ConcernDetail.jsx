import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { isStaff } from '../api';
import { useAuth } from '../auth';
import { Tag, StatusBadge, Rich, Avatar, Button } from '../components/ui';

export default function ConcernDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [c, setC] = useState(null);

  const load = () => api.get(`/concerns/${id}`).then((r) => setC(r.data.concern)).catch(() => nav('/community/concerns'));
  useEffect(() => { load(); }, [id]);
  if (!c) return null;

  const staff = isStaff(user);
  const setStatus = async (status) => { await api.put(`/concerns/${id}/status`, { status }); load(); };
  const toggleClose = async () => { await api.put(`/concerns/${id}/close`, { closed: !c.closed }); load(); };
  const star = async () => { await api.post(`/concerns/${id}/star`); load(); };

  return (
    <div>
      <Link to="/community/concerns" className="text-sm text-brand-600">← Back to concerns</Link>
      <div className="bg-white rounded-xl p-6 shadow-sm mt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{c.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Tag tag={c.tag} />
              <StatusBadge status={c.status} />
              {c.closed && <StatusBadge status="closed" />}
            </div>
          </div>
          <button onClick={star} className="flex flex-col items-center text-amber-500">
            <span className="text-2xl">★</span>
            <span className="text-xs font-semibold">{c.stars?.length || 0}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
          <Avatar user={c.author} />
          <div>
            <div className="font-medium text-slate-700">{c.author?.name}</div>
            <div className="text-xs">{c.city?.name} · {new Date(c.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-4 border-t pt-4"><Rich html={c.description} /></div>

        {c.forum && (
          <div className="mt-4 bg-brand-50 rounded-lg p-3 text-sm">
            Escalated to forum:{' '}
            <Link to={`/community/forums/${c.forum._id}`} className="text-brand-600 font-medium">
              {c.forum.title}
            </Link>
          </div>
        )}

        {staff && (
          <div className="mt-6 border-t pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Moderator actions</p>
            <div className="flex flex-wrap gap-2">
              {c.status === 'pending' && <>
                <Button onClick={() => setStatus('approved')}>Approve</Button>
                <Button variant="danger" onClick={() => setStatus('denied')}>Deny</Button>
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
    </div>
  );
}
