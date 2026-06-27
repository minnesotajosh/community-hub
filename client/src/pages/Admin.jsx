import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, Link, useParams, useNavigate } from 'react-router-dom';
import api, { ROLE_LABELS, isGlobal, RANK } from '../api';
import { useAuth } from '../auth';
import { Button, Modal, Avatar } from '../components/ui';
import { useTableControls, TableToolbar, DataTable, TableCard } from '../components/DataTable';

export default function Admin() {
  const { user } = useAuth();
  const global = isGlobal(user);

  const tabClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium ${isActive ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'}`;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{global ? 'Administration' : 'Hub Management'}</h1>
      <p className="text-sm text-slate-500 mb-4">Signed in as {ROLE_LABELS[user.role]}</p>
      <div className="flex gap-2 mb-4">
        <NavLink to="/admin/communities" className={tabClass}>Communities &amp; Cities</NavLink>
        {global && <NavLink to="/admin/users" className={tabClass}>Users</NavLink>}
      </div>

      <Routes>
        <Route index element={<Navigate to="communities" replace />} />
        <Route path="communities" element={<CommunitiesList />} />
        <Route path="communities/:communityId" element={<CommunityDetail />} />
        <Route path="communities/:communityId/cities/:cityId" element={<CityDetail />} />
        {/* Cross-community user directory is global-only; others reach member profiles via their community/city. */}
        {global && <Route path="users" element={<UsersList />} />}
        <Route path="users/:memberId" element={<MemberDetail />} />
        <Route path="*" element={<Navigate to="communities" replace />} />
      </Routes>
    </div>
  );
}

// ---------------- shared helpers ----------------

const blankUser = (community = '') => ({ name: '', email: '', password: 'test', role: 'member', community, city: '', bio: '' });

function creatableRolesFor(role) {
  if (role === 'top_admin') return ['member', 'hub_moderator', 'hub_admin', 'iac_board', 'top_admin'];
  if (role === 'iac_board') return ['member', 'hub_moderator', 'hub_admin'];
  if (role === 'hub_admin') return ['member', 'hub_moderator'];
  return [];
}

function Crumbs({ items }) {
  return (
    <nav className="text-sm text-slate-500 mb-3 flex flex-wrap gap-1 items-center">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {it.to ? <Link to={it.to} className="text-brand-600 hover:underline">{it.label}</Link>
                 : <span className="text-slate-700">{it.label}</span>}
          {i < items.length - 1 && <span className="text-slate-300">/</span>}
        </span>
      ))}
    </nav>
  );
}

// Reusable Add-user modal. Pass a fixed community/city to lock the selectors.
function AddUserModal({ open, onClose, onCreated, communities, lockCommunity, lockCity }) {
  const { user } = useAuth();
  const global = isGlobal(user);
  const roles = creatableRolesFor(user.role);
  const [form, setForm] = useState(blankUser());

  useEffect(() => {
    if (open) setForm(blankUser(lockCommunity || (!global ? communities[0]?._id : '') || ''));
  }, [open, lockCommunity]); // eslint-disable-line

  useEffect(() => { if (lockCity) setForm((f) => ({ ...f, city: lockCity })); }, [lockCity, open]);

  const selected = communities.find((c) => c._id === form.community);
  const cityOptions = selected?.cities || [];
  const create = async (e) => {
    e.preventDefault();
    await api.post('/users', form);
    onClose(); onCreated?.();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a user">
      <form onSubmit={create} className="space-y-2">
        <input required placeholder="Name" className="w-full border rounded px-2 py-1.5 text-sm"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder="Email" className="w-full border rounded px-2 py-1.5 text-sm"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" className="w-full border rounded px-2 py-1.5 text-sm"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="w-full border rounded px-2 py-1.5 text-sm"
          value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select required disabled={!global || !!lockCommunity}
          className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-500"
          value={form.community} onChange={(e) => setForm({ ...form, community: e.target.value, city: '' })}>
          <option value="">— select community —</option>
          {communities.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select required disabled={!form.community || !!lockCity}
          className="w-full border rounded px-2 py-1.5 text-sm disabled:bg-slate-100 disabled:text-slate-400"
          value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
          <option value="">{form.community ? '— select city —' : '— select community first —'}</option>
          {cityOptions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">Create user</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

// Reusable members table (rows link to member detail).
function MembersTable({ users, emptyText = 'No users.', onChanged }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const remove = async (e, id) => { e.stopPropagation(); if (confirm('Remove this user?')) { await api.delete(`/users/${id}`); onChanged?.(); } };
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
        <tr><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Community</th><th></th></tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u._id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => nav(`/admin/users/${u._id}`)}>
            <td className="p-3">
              <div className="font-medium text-brand-700">{u.name}</div>
              <div className="text-xs text-slate-400">{u.email}</div>
            </td>
            <td className="p-3">{ROLE_LABELS[u.role]}</td>
            <td className="p-3 text-slate-500">{u.community?.name || '—'}</td>
            <td className="p-3 text-right">
              {RANK[u.role] < RANK[user.role] && u._id !== user._id && (
                <button onClick={(e) => remove(e, u._id)} className="text-xs text-red-500 hover:underline">Remove</button>
              )}
            </td>
          </tr>
        ))}
        {users.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-sm text-slate-400">{emptyText}</td></tr>}
      </tbody>
    </table>
  );
}

// ---------------- communities list ----------------

function CommunitiesList() {
  const { user } = useAuth();
  const global = isGlobal(user);
  const [communities, setCommunities] = useState([]);
  const [commModal, setCommModal] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', description: '' });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  const load = () => api.get('/communities').then((r) => setCommunities(r.data.communities));
  useEffect(() => { load(); }, []);

  const addCommunity = async (e) => {
    e.preventDefault();
    await api.post('/communities', newComm);
    setNewComm({ name: '', description: '' }); setCommModal(false); load();
  };
  const delCommunity = async (e, id) => { e.preventDefault(); e.stopPropagation(); if (confirm('Delete community + its cities?')) { await api.delete(`/communities/${id}`); load(); } };

  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const sortArrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const visible = (() => {
    const q = search.trim().toLowerCase();
    const list = communities.filter((c) => !q || c.name.toLowerCase().includes(q) || c.cities.some((ci) => ci.name.toLowerCase().includes(q)));
    const dir = sort.dir === 'asc' ? 1 : -1;
    const keyOf = (c) => (sort.key === 'cities' ? c.cities.length : c.name.toLowerCase());
    return [...list].sort((a, b) => (keyOf(a) < keyOf(b) ? -dir : keyOf(a) > keyOf(b) ? dir : 0));
  })();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-2 items-center">
        <input placeholder="Search community or city name…" className="border rounded px-2 py-1.5 text-sm flex-1 min-w-[180px]"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={() => toggleSort('name')} className={`border rounded px-2 py-1.5 text-sm ${sort.key === 'name' ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`}>Name{sortArrow('name')}</button>
        <button onClick={() => toggleSort('cities')} className={`border rounded px-2 py-1.5 text-sm ${sort.key === 'cities' ? 'bg-brand-50 text-brand-700' : 'text-slate-600'}`}>City count{sortArrow('cities')}</button>
        {global && <Button onClick={() => { setNewComm({ name: '', description: '' }); setCommModal(true); }}>+ Add community</Button>}
        <span className="text-xs text-slate-400 ml-auto">{visible.length} of {communities.length}</span>
      </div>

      {visible.map((c) => (
        <Link key={c._id} to={`/admin/communities/${c._id}`} className="block bg-white rounded-xl shadow-sm p-4 hover:shadow transition">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-brand-700">{c.name}</h3>
              <p className="text-sm text-slate-500">{c.description}</p>
            </div>
            {global && <button onClick={(e) => delCommunity(e, c._id)} className="text-xs text-red-500 hover:underline shrink-0">Delete</button>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.cities.map((ci) => <span key={ci._id} className="text-sm bg-slate-100 rounded px-2 py-1">{ci.name}</span>)}
            {c.cities.length === 0 && <span className="text-xs text-slate-400">No cities yet</span>}
          </div>
        </Link>
      ))}
      {visible.length === 0 && <p className="text-center text-sm text-slate-400 py-6">No communities match your search.</p>}

      <Modal open={commModal} onClose={() => setCommModal(false)} title="Add a community">
        <form onSubmit={addCommunity} className="space-y-2">
          <input required placeholder="Community name" className="w-full border rounded px-2 py-1.5 text-sm"
            value={newComm.name} onChange={(e) => setNewComm({ ...newComm, name: e.target.value })} />
          <textarea placeholder="Description" rows={3} className="w-full border rounded px-2 py-1.5 text-sm"
            value={newComm.description} onChange={(e) => setNewComm({ ...newComm, description: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">Create community</Button>
            <Button type="button" variant="ghost" onClick={() => setCommModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ---------------- community detail ----------------

function CommunityDetail() {
  const { communityId } = useParams();
  const { user } = useAuth();
  const global = isGlobal(user);
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [cityModal, setCityModal] = useState(false);
  const [newCity, setNewCity] = useState({ name: '', description: '' });
  const [userModal, setUserModal] = useState(false);

  const load = () => {
    api.get(`/communities/${communityId}`).then((r) => setCommunity(r.data.community)).catch(() => setCommunity(false));
    api.get('/users').then((r) => setMembers(r.data.users.filter((u) => u.community?._id === communityId)));
  };
  useEffect(() => { load(); }, [communityId]);

  if (community === false) return <p className="text-slate-400">Community not found or not accessible.</p>;
  if (!community) return null;

  const addCity = async (e) => {
    e.preventDefault();
    await api.post(`/communities/${communityId}/cities`, newCity);
    setNewCity({ name: '', description: '' }); setCityModal(false); load();
  };
  // need full communities (with cities) for the add-user modal selectors
  const communitiesForModal = [community];

  return (
    <div>
      <Crumbs items={[{ label: 'Communities', to: '/admin/communities' }, { label: community.name }]} />
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="text-lg font-bold">{community.name}</h2>
        <p className="text-sm text-slate-500">{community.description}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Cities ({community.cities.length})</h3>
          {global && <Button variant="ghost" onClick={() => { setNewCity({ name: '', description: '' }); setCityModal(true); }}>+ Add city</Button>}
        </div>
        <div className="flex flex-wrap gap-2">
          {community.cities.map((ci) => (
            <Link key={ci._id} to={`/admin/communities/${communityId}/cities/${ci._id}`}
              className="text-sm bg-slate-100 hover:bg-brand-50 hover:text-brand-700 rounded px-3 py-1.5">
              {ci.name} →
            </Link>
          ))}
          {community.cities.length === 0 && <span className="text-xs text-slate-400">No cities yet</span>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Members ({members.length})</h3>
          {creatableRolesFor(user.role).length > 0 && <Button onClick={() => setUserModal(true)}>+ Add user</Button>}
        </div>
        <MembersTable users={members} emptyText="No members in this community yet." onChanged={load} />
      </div>

      <Modal open={cityModal} onClose={() => setCityModal(false)} title={`Add a city to ${community.name}`}>
        <form onSubmit={addCity} className="space-y-2">
          <input required placeholder="City name" className="w-full border rounded px-2 py-1.5 text-sm"
            value={newCity.name} onChange={(e) => setNewCity({ ...newCity, name: e.target.value })} />
          <textarea placeholder="Description" rows={3} className="w-full border rounded px-2 py-1.5 text-sm"
            value={newCity.description} onChange={(e) => setNewCity({ ...newCity, description: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">Add city</Button>
            <Button type="button" variant="ghost" onClick={() => setCityModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <AddUserModal open={userModal} onClose={() => setUserModal(false)} onCreated={load}
        communities={communitiesForModal} lockCommunity={communityId} />
    </div>
  );
}

// ---------------- city detail ----------------

function CityDetail() {
  const { communityId, cityId } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [userModal, setUserModal] = useState(false);

  const load = () => {
    api.get(`/communities/${communityId}`).then((r) => setCommunity(r.data.community)).catch(() => setCommunity(false));
    api.get('/users').then((r) => setMembers(r.data.users.filter((u) => u.city?._id === cityId)));
  };
  useEffect(() => { load(); }, [communityId, cityId]);

  if (community === false) return <p className="text-slate-400">Not found.</p>;
  if (!community) return null;
  const city = community.cities.find((c) => c._id === cityId);
  if (!city) return <p className="text-slate-400">City not found.</p>;

  return (
    <div>
      <Crumbs items={[
        { label: 'Communities', to: '/admin/communities' },
        { label: community.name, to: `/admin/communities/${communityId}` },
        { label: city.name },
      ]} />
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h2 className="text-lg font-bold">{city.name}</h2>
        <p className="text-sm text-slate-500">{city.description || 'No description.'}</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Members in {city.name} ({members.length})</h3>
          {creatableRolesFor(user.role).length > 0 && <Button onClick={() => setUserModal(true)}>+ Add user</Button>}
        </div>
        <MembersTable users={members} emptyText="No members in this city yet." onChanged={load} />
      </div>
      <AddUserModal open={userModal} onClose={() => setUserModal(false)} onCreated={load}
        communities={[community]} lockCommunity={communityId} lockCity={cityId} />
    </div>
  );
}

// ---------------- users list ----------------

function UsersList() {
  const { user } = useAuth();
  const global = isGlobal(user);
  const [users, setUsers] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const nav = useNavigate();

  const load = () => api.get('/users').then((r) => setUsers(r.data.users));
  useEffect(() => {
    load();
    api.get('/communities').then((r) => setCommunities(r.data.communities));
  }, []);

  const remove = async (e, id) => { e.stopPropagation(); if (confirm('Remove this user?')) { await api.delete(`/users/${id}`); load(); } };

  const ctrl = useTableControls({
    rows: users,
    search: (u) => `${u.name} ${u.email}`,
    filters: [
      { key: 'role', match: (u, v) => u.role === v },
      { key: 'community', match: (u, v) => (u.community?._id || '') === v },
    ],
    sortAccessors: {
      name: (u) => (u.name || '').toLowerCase(),
      role: (u) => RANK[u.role],
      community: (u) => (u.community?.name || '').toLowerCase(),
    },
    initialSort: { key: 'name', dir: 'asc' },
  });

  const columns = [
    { key: 'name', header: 'Name', sortable: true, render: (u) => (
      <><div className="font-medium text-brand-700">{u.name}</div><div className="text-xs text-slate-400">{u.email}</div></>
    ) },
    { key: 'role', header: 'Role', sortable: true, render: (u) => ROLE_LABELS[u.role] },
    { key: 'community', header: 'Community', sortable: true, render: (u) => <span className="text-slate-500">{u.community?.name || '—'}</span> },
    { key: 'actions', header: '', tdClass: 'text-right', render: (u) => (
      RANK[u.role] < RANK[user.role] && u._id !== user._id
        ? <button onClick={(e) => remove(e, u._id)} className="text-xs text-red-500 hover:underline">Remove</button>
        : null
    ) },
  ];

  const filters = [
    { key: 'role', allLabel: 'All roles', options: Object.keys(ROLE_LABELS).map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
    ...(global ? [{ key: 'community', allLabel: 'All communities', options: communities.map((c) => ({ value: c._id, label: c.name })) }] : []),
  ];

  return (
    <div>
      <TableCard>
        <TableToolbar {...ctrl} searchPlaceholder="Search name or email…" filters={filters}
          actions={creatableRolesFor(user.role).length > 0 && <Button onClick={() => setUserModal(true)}>+ Add user</Button>}
          count={ctrl.visible.length} total={users.length} />
        <DataTable columns={columns} rows={ctrl.visible} sort={ctrl.sort} toggleSort={ctrl.toggleSort}
          onRowClick={(u) => nav(`/admin/users/${u._id}`)} empty="No users match your filters." />
      </TableCard>
      <AddUserModal open={userModal} onClose={() => setUserModal(false)} onCreated={load} communities={communities} />
    </div>
  );
}

// ---------------- member detail ----------------

function MemberDetail() {
  const { memberId } = useParams();
  const { user } = useAuth();
  const global = isGlobal(user);
  const [member, setMember] = useState(null);

  useEffect(() => {
    api.get('/users').then((r) => setMember(r.data.users.find((u) => u._id === memberId) || false));
  }, [memberId]);

  if (member === false) return <p className="text-slate-400">Member not found or not accessible.</p>;
  if (!member) return null;

  return (
    <div>
      <Crumbs items={[
        ...(global ? [{ label: 'Users', to: '/admin/users' }] : [{ label: 'Communities', to: '/admin/communities' }]),
        ...(member.community ? [{ label: member.community.name, to: `/admin/communities/${member.community._id}` }] : []),
        { label: member.name },
      ]} />
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-4">
          <Avatar user={member} large />
          <div>
            <h2 className="text-xl font-bold">{member.name}</h2>
            <p className="text-sm text-slate-500">{member.email}</p>
            <span className="inline-block mt-1 text-xs bg-brand-50 text-brand-700 rounded-full px-2 py-0.5">{ROLE_LABELS[member.role]}</span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-3 mt-6 text-sm">
          <div><dt className="text-xs text-slate-400 uppercase">Community</dt>
            <dd>{member.community ? <Link className="text-brand-600 hover:underline" to={`/admin/communities/${member.community._id}`}>{member.community.name}</Link> : '—'}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase">City</dt><dd>{member.city?.name || '—'}</dd></div>
        </dl>
        {member.bio && (
          <div className="mt-4 border-t pt-4">
            <dt className="text-xs text-slate-400 uppercase mb-1">Bio</dt>
            <p className="text-sm text-slate-700">{member.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
