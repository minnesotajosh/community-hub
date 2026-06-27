import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import api, { TAGS, isStaff } from '../api';
import { useAuth } from '../auth';
import { Tag, StatusBadge, Button, TagSelect, Modal } from '../components/ui';
import RichEditor from '../components/RichEditor';
import { useTableControls, TableToolbar, DataTable, TableCard } from '../components/DataTable';
import ConcernDetail from './ConcernDetail';
import ForumDetail from './ForumDetail';

const tagOptions = TAGS.map((t) => ({ value: t, label: t.replace('_', ' & ') }));

export default function Community() {
  const { user } = useAuth();
  const tabClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium ${isActive ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'}`;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Community</h1>
      <p className="text-sm text-slate-500 mb-4">
        {user.community ? user.community.name : 'All communities'} — concerns, forums & resources
      </p>
      <div className="flex gap-2 mb-4">
        <NavLink to="/community/concerns" className={tabClass}>Concerns</NavLink>
        <NavLink to="/community/forums" className={tabClass}>Forums</NavLink>
        <NavLink to="/community/resources" className={tabClass}>Resources</NavLink>
      </div>

      <Routes>
        <Route index element={<Navigate to="concerns" replace />} />
        <Route path="concerns" element={<ConcernsList />} />
        <Route path="concerns/:id" element={<ConcernDetail />} />
        <Route path="forums" element={<ForumsList />} />
        <Route path="forums/:id" element={<ForumDetail />} />
        <Route path="resources" element={<Resources />} />
        <Route path="*" element={<Navigate to="concerns" replace />} />
      </Routes>
    </div>
  );
}

// ---------------- concerns ----------------

const CONCERN_STATUSES = ['pending', 'denied', 'approved', 'active'];

function ConcernsList() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [concerns, setConcerns] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', tag: 'other', description: '' });

  const load = () => api.get('/concerns').then((r) => setConcerns(r.data.concerns));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/concerns', form);
    setForm({ title: '', tag: 'other', description: '' });
    setModal(false); load();
  };
  const star = async (e, id) => { e.stopPropagation(); await api.post(`/concerns/${id}/star`); load(); };

  const ctrl = useTableControls({
    rows: concerns,
    search: (c) => `${c.title} ${c.author?.name || ''}`,
    filters: [
      { key: 'tag', match: (c, v) => c.tag === v },
      { key: 'status', match: (c, v) => c.status === v },
    ],
    sortAccessors: {
      title: (c) => c.title.toLowerCase(),
      stars: (c) => c.stars?.length || 0,
      created: (c) => new Date(c.createdAt).getTime(),
    },
    initialSort: { key: 'created', dir: 'desc' },
  });

  const columns = [
    {
      key: 'star', header: '★', tdClass: 'w-12',
      render: (c) => (
        <button onClick={(e) => star(e, c._id)} className="flex flex-col items-center text-slate-400 hover:text-amber-500">
          <span>★</span><span className="text-xs font-semibold">{c.stars?.length || 0}</span>
        </button>
      ),
    },
    { key: 'title', header: 'Title', sortable: true, render: (c) => <span className="font-medium text-brand-700">{c.title}</span> },
    { key: 'tag', header: 'Category', render: (c) => <Tag tag={c.tag} /> },
    { key: 'status', header: 'Status', render: (c) => (
      <span className="flex gap-1">{<StatusBadge status={c.status} />}{c.closed && <StatusBadge status="closed" />}</span>
    ) },
    { key: 'author', header: 'Author', render: (c) => <span className="text-slate-500">{c.author?.name}</span> },
    { key: 'city', header: 'City', render: (c) => <span className="text-slate-500">{c.city?.name || '—'}</span> },
    { key: 'created', header: 'Raised', sortable: true, render: (c) => <span className="text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <div>
      <TableCard>
        <TableToolbar {...ctrl} searchPlaceholder="Search title or author…"
          filters={[
            { key: 'tag', allLabel: 'All categories', options: tagOptions },
            { key: 'status', allLabel: 'All statuses', options: CONCERN_STATUSES.map((s) => ({ value: s, label: s })) },
          ]}
          actions={user.community && <Button onClick={() => setModal(true)}>+ Raise a concern</Button>}
          count={ctrl.visible.length} total={concerns.length} />
        <DataTable columns={columns} rows={ctrl.visible} sort={ctrl.sort} toggleSort={ctrl.toggleSort}
          onRowClick={(c) => nav(`/community/concerns/${c._id}`)} empty="No concerns match your filters." />
      </TableCard>

      <Modal open={modal} onClose={() => setModal(false)} title="Raise a concern">
        <form onSubmit={create} className="space-y-3">
          <input required placeholder="Title" className="w-full border rounded px-3 py-2 text-sm"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Category:</span>
            <TagSelect value={form.tag} onChange={(t) => setForm({ ...form, tag: t })} />
          </div>
          <RichEditor placeholder="Describe the issue… add formatting, lists, links or images"
            value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <p className="text-xs text-slate-400">New concerns start as "pending" until a moderator approves them.</p>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Submit for approval</Button>
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ---------------- forums ----------------

function ForumsList() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [forums, setForums] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', tag: 'other', description: '' });

  const load = () => api.get('/forums').then((r) => setForums(r.data.forums));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/forums', form);
    setForm({ title: '', tag: 'other', description: '' });
    setModal(false); load();
  };

  const ctrl = useTableControls({
    rows: forums,
    search: (f) => `${f.title} ${f.author?.name || ''}`,
    filters: [
      { key: 'tag', match: (f, v) => f.tag === v },
      { key: 'status', match: (f, v) => f.status === v },
    ],
    sortAccessors: {
      title: (f) => f.title.toLowerCase(),
      comments: (f) => f.comments?.length || 0,
      created: (f) => new Date(f.createdAt).getTime(),
    },
    initialSort: { key: 'created', dir: 'desc' },
  });

  const columns = [
    { key: 'title', header: 'Title', sortable: true, render: (f) => <span className="font-medium text-brand-700">{f.title}</span> },
    { key: 'tag', header: 'Category', render: (f) => <Tag tag={f.tag} /> },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
    { key: 'comments', header: 'Comments', sortable: true, render: (f) => <span className="text-slate-500">{f.comments?.length || 0}</span> },
    { key: 'linked', header: 'Linked', render: (f) => <span className="text-slate-500">{f.linkedConcerns?.length || 0}</span> },
    { key: 'author', header: 'Started by', render: (f) => <span className="text-slate-500">{f.author?.name}</span> },
    { key: 'created', header: 'Created', sortable: true, render: (f) => <span className="text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <div>
      <TableCard>
        <TableToolbar {...ctrl} searchPlaceholder="Search title or author…"
          filters={[
            { key: 'tag', allLabel: 'All categories', options: tagOptions },
            { key: 'status', allLabel: 'All statuses', options: [{ value: 'open', label: 'open' }, { value: 'closed', label: 'closed' }] },
          ]}
          actions={isStaff(user) && <Button onClick={() => setModal(true)}>+ New forum</Button>}
          count={ctrl.visible.length} total={forums.length} />
        <DataTable columns={columns} rows={ctrl.visible} sort={ctrl.sort} toggleSort={ctrl.toggleSort}
          onRowClick={(f) => nav(`/community/forums/${f._id}`)} empty="No forums match your filters." />
      </TableCard>

      <Modal open={modal} onClose={() => setModal(false)} title="New forum">
        <form onSubmit={create} className="space-y-3">
          <input required placeholder="Forum title" className="w-full border rounded px-3 py-2 text-sm"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Category:</span>
            <TagSelect value={form.tag} onChange={(t) => setForm({ ...form, tag: t })} />
          </div>
          <RichEditor placeholder="What is this forum addressing?"
            value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Create forum</Button>
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ---------------- resources ----------------

const RESOURCES = [
  { title: 'Report a non-emergency issue (311)', url: 'https://www.usa.gov/state-local-governments', desc: 'Find your local 311 / government services portal.' },
  { title: 'Emergency services', url: 'tel:911', desc: 'Call 911 for emergencies.' },
  { title: 'Community meeting calendar', url: '#', desc: 'Upcoming town halls and board meetings.' },
  { title: 'Submit a public records request', url: '#', desc: 'How to file a FOIA / records request locally.' },
  { title: 'Neighborhood safety resources', url: '#', desc: 'Programs, contacts and safety tips.' },
];

function Resources() {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-semibold">Beneficial links & information</h2>
        <p className="text-sm text-slate-500">Helpful resources for residents of your community.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {RESOURCES.map((r) => (
          <a key={r.title} href={r.url} target="_blank" rel="noreferrer"
            className="block bg-white rounded-xl shadow-sm p-4 hover:shadow transition">
            <h3 className="font-medium text-brand-700">{r.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
