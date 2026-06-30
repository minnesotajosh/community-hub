import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { Routes, Route, Navigate, NavLink, Link, useParams, useNavigate } from 'react-router-dom';
import api, { ROLE_LABELS, isGlobal, RANK } from '../api';
import { useAuth } from '../auth';
import { Button, Modal, Avatar, Input, Textarea, SelectField } from '../components/common';
import { useTableControls, TableToolbar, DataTable, TableCard, type ColumnDef, type ToolbarFilter } from '../components/DataTable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ModerationQueue from '../components/ModerationQueue';
import { Tag } from '../components/common';
import type { Community, User, Role, DashboardData } from '../types';

export default function Admin() {
  const { user } = useAuth();
  const global = isGlobal(user);
  if (!user) return null;

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium ${isActive ? 'bg-brand-500 text-white' : 'bg-white text-slate-600'}`;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{global ? 'Administration' : 'Hub Management'}</h1>
      <p className="text-sm text-slate-500 mb-4">Signed in as {ROLE_LABELS[user.role]}</p>
      <div className="flex gap-2 mb-4">
        <NavLink to="/admin/communities" className={tabClass}>Communities &amp; Cities</NavLink>
        <NavLink to="/admin/moderation" className={tabClass}>Moderation</NavLink>
        {global && <NavLink to="/admin/users" className={tabClass}>Users</NavLink>}
      </div>

      <Routes>
        <Route index element={<Navigate to="communities" replace />} />
        <Route path="communities" element={<CommunitiesList />} />
        <Route path="communities/:communityId" element={<CommunityDetail />} />
        <Route path="communities/:communityId/cities/:cityId" element={<CityDetail />} />
        <Route path="moderation" element={<Moderation />} />
        {/* Cross-community user directory is global-only; others reach member profiles via their community/city. */}
        {global && <Route path="users" element={<UsersList />} />}
        <Route path="users/:memberId" element={<MemberDetail />} />
        <Route path="*" element={<Navigate to="communities" replace />} />
      </Routes>
    </div>
  );
}

// ---------------- moderation ----------------

function ModStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent && value > 0 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
      <div className={`text-2xl font-bold ${accent && value > 0 ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function Moderation() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [flagCount, setFlagCount] = useState<number | null>(null);

  useEffect(() => { api.get<DashboardData>('/dashboard').then((r) => setData(r.data)).catch(() => {}); }, []);

  const s = data?.staff;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ModStat label="Open flags" value={flagCount ?? s?.openFlags ?? 0} accent />
        <ModStat label="Pending review" value={s?.pendingCount ?? 0} accent />
        <ModStat label="Active concerns" value={s?.activeConcerns ?? 0} />
        <ModStat label="Open forums" value={s?.openForums ?? 0} />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Moderation queue{flagCount !== null ? ` (${flagCount})` : ''}
        </h2>
        <ModerationQueue onCount={setFlagCount} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Concerns awaiting review</h2>
        {!s || s.pendingConcerns.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing pending review.</p>
        ) : (
          <div className="space-y-2">
            {s.pendingConcerns.map((c) => (
              <Link key={c._id} to={`/community/concerns/${c._id}`}
                className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2 hover:bg-slate-50">
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{c.title}</span>
                <Tag tag={c.tag} />
                <span className="text-xs text-slate-400">{c.author?.name}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------- shared helpers ----------------

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: Role;
  community: string;
  city: string;
  bio: string;
}

const blankUser = (community = ''): UserForm => ({ name: '', email: '', password: 'test', role: 'member', community, city: '', bio: '' });

function creatableRolesFor(role: Role): Role[] {
  if (role === 'top_admin') return ['member', 'hub_moderator', 'hub_admin', 'iac_board', 'top_admin'];
  if (role === 'iac_board') return ['member', 'hub_moderator', 'hub_admin'];
  if (role === 'hub_admin') return ['member', 'hub_moderator'];
  return [];
}

interface Crumb { label: string; to?: string; }

function Crumbs({ items }: { items: Crumb[] }) {
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

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  communities: Community[];
  lockCommunity?: string;
  lockCity?: string;
}

// Reusable Add-user modal. Pass a fixed community/city to lock the selectors.
function AddUserModal({ open, onClose, onCreated, communities, lockCommunity, lockCity }: AddUserModalProps) {
  const { user } = useAuth();
  const global = isGlobal(user);
  const roles = user ? creatableRolesFor(user.role) : [];
  const [form, setForm] = useState<UserForm>(blankUser());

  useEffect(() => {
    if (open) setForm(blankUser(lockCommunity || (!global ? communities[0]?._id : '') || ''));
  }, [open, lockCommunity]); // eslint-disable-line

  useEffect(() => { if (lockCity) setForm((f) => ({ ...f, city: lockCity })); }, [lockCity, open]);

  const selected = communities.find((c) => c._id === form.community);
  const cityOptions = selected?.cities || [];
  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/users', form);
    onClose(); onCreated?.();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a user">
      <form onSubmit={create} className="space-y-2">
        <Input required placeholder="Name"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input required type="email" placeholder="Email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <SelectField value={form.role} onChange={(v) => setForm({ ...form, role: v as Role })}
          options={roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        <SelectField required disabled={!global || !!lockCommunity}
          placeholder="— select community —"
          value={form.community} onChange={(v) => setForm({ ...form, community: v, city: '' })}
          options={communities.map((c) => ({ value: c._id, label: c.name }))} />
        <SelectField required disabled={!form.community || !!lockCity}
          placeholder={form.community ? '— select city —' : '— select community first —'}
          value={form.city} onChange={(v) => setForm({ ...form, city: v })}
          options={cityOptions.map((c) => ({ value: c._id, label: c.name }))} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">Create user</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

// Reusable members table (rows link to member detail).
function MembersTable({ users, emptyText = 'No users.', onChanged }: { users: User[]; emptyText?: string; onChanged?: () => void }) {
  const { user } = useAuth();
  const nav = useNavigate();
  if (!user) return null;
  const remove = async (e: MouseEvent, id: string) => { e.stopPropagation(); if (confirm('Remove this user?')) { await api.delete(`/users/${id}`); onChanged?.(); } };
  return (
    <Table>
      <TableHeader>
        <TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Community</TableHead><TableHead /></TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u._id} className="cursor-pointer" onClick={() => nav(`/admin/users/${u._id}`)}>
            <TableCell>
              <div className="font-medium text-brand-700">{u.name}</div>
              <div className="text-xs text-slate-400">{u.email}</div>
            </TableCell>
            <TableCell>{ROLE_LABELS[u.role]}</TableCell>
            <TableCell className="text-slate-500">{u.community?.name || '—'}</TableCell>
            <TableCell className="text-right">
              {RANK[u.role] < RANK[user.role] && u._id !== user._id && (
                <button onClick={(e) => remove(e, u._id)} className="text-xs text-red-500 hover:underline">Remove</button>
              )}
            </TableCell>
          </TableRow>
        ))}
        {users.length === 0 && <TableRow><TableCell colSpan={4} className="p-6 text-center text-sm text-slate-400">{emptyText}</TableCell></TableRow>}
      </TableBody>
    </Table>
  );
}

// ---------------- communities list ----------------

function CommunitiesList() {
  const { user } = useAuth();
  const global = isGlobal(user);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [commModal, setCommModal] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', description: '' });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: 'name' | 'cities'; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });

  const load = () => api.get<{ communities: Community[] }>('/communities').then((r) => setCommunities(r.data.communities));
  useEffect(() => { load(); }, []);

  const addCommunity = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/communities', newComm);
    setNewComm({ name: '', description: '' }); setCommModal(false); load();
  };
  const delCommunity = async (e: MouseEvent, id: string) => { e.preventDefault(); e.stopPropagation(); if (confirm('Delete community + its cities?')) { await api.delete(`/communities/${id}`); load(); } };

  const toggleSort = (key: 'name' | 'cities') => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  const sortArrow = (key: string) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');
  const visible = (() => {
    const q = search.trim().toLowerCase();
    const list = communities.filter((c) => !q || c.name.toLowerCase().includes(q) || c.cities.some((ci) => ci.name.toLowerCase().includes(q)));
    const dir = sort.dir === 'asc' ? 1 : -1;
    const keyOf = (c: Community): string | number => (sort.key === 'cities' ? c.cities.length : c.name.toLowerCase());
    return [...list].sort((a, b) => (keyOf(a) < keyOf(b) ? -dir : keyOf(a) > keyOf(b) ? dir : 0));
  })();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-3 flex flex-wrap gap-2 items-center">
        <Input placeholder="Search community or city name…" className="flex-1 min-w-[180px]"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="outline" onClick={() => toggleSort('name')} className={sort.key === 'name' ? 'bg-brand-50 text-brand-700' : ''}>Name{sortArrow('name')}</Button>
        <Button variant="outline" onClick={() => toggleSort('cities')} className={sort.key === 'cities' ? 'bg-brand-50 text-brand-700' : ''}>City count{sortArrow('cities')}</Button>
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
          <Input required placeholder="Community name"
            value={newComm.name} onChange={(e) => setNewComm({ ...newComm, name: e.target.value })} />
          <Textarea placeholder="Description" rows={3}
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
  const [community, setCommunity] = useState<Community | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [cityModal, setCityModal] = useState(false);
  const [newCity, setNewCity] = useState({ name: '', description: '' });
  const [userModal, setUserModal] = useState(false);

  const load = () => {
    api.get<{ community: Community }>(`/communities/${communityId}`).then((r) => setCommunity(r.data.community)).catch(() => setNotFound(true));
    api.get<{ users: User[] }>('/users').then((r) => setMembers(r.data.users.filter((u) => u.community?._id === communityId)));
  };
  useEffect(() => { load(); }, [communityId]);

  if (notFound) return <p className="text-slate-400">Community not found or not accessible.</p>;
  if (!community || !user) return null;

  const addCity = async (e: FormEvent) => {
    e.preventDefault();
    await api.post(`/communities/${communityId}/cities`, newCity);
    setNewCity({ name: '', description: '' }); setCityModal(false); load();
  };

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
          <Input required placeholder="City name"
            value={newCity.name} onChange={(e) => setNewCity({ ...newCity, name: e.target.value })} />
          <Textarea placeholder="Description" rows={3}
            value={newCity.description} onChange={(e) => setNewCity({ ...newCity, description: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">Add city</Button>
            <Button type="button" variant="ghost" onClick={() => setCityModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <AddUserModal open={userModal} onClose={() => setUserModal(false)} onCreated={load}
        communities={[community]} lockCommunity={communityId} />
    </div>
  );
}

// ---------------- city detail ----------------

function CityDetail() {
  const { communityId, cityId } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [userModal, setUserModal] = useState(false);

  const load = () => {
    api.get<{ community: Community }>(`/communities/${communityId}`).then((r) => setCommunity(r.data.community)).catch(() => setNotFound(true));
    api.get<{ users: User[] }>('/users').then((r) => setMembers(r.data.users.filter((u) => u.city?._id === cityId)));
  };
  useEffect(() => { load(); }, [communityId, cityId]);

  if (notFound) return <p className="text-slate-400">Not found.</p>;
  if (!community || !user) return null;
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
  const [users, setUsers] = useState<User[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userModal, setUserModal] = useState(false);
  const nav = useNavigate();

  const load = () => api.get<{ users: User[] }>('/users').then((r) => setUsers(r.data.users));
  useEffect(() => {
    load();
    api.get<{ communities: Community[] }>('/communities').then((r) => setCommunities(r.data.communities));
  }, []);

  const remove = async (e: MouseEvent, id: string) => { e.stopPropagation(); if (confirm('Remove this user?')) { await api.delete(`/users/${id}`); load(); } };

  const ctrl = useTableControls<User>({
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

  if (!user) return null;

  const columns: ColumnDef<User>[] = [
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

  const filters: ToolbarFilter[] = [
    { key: 'role', allLabel: 'All roles', options: (Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
    ...(global ? [{ key: 'community', allLabel: 'All communities', options: communities.map((c) => ({ value: c._id, label: c.name })) }] : []),
  ];

  return (
    <div>
      <TableCard>
        <TableToolbar query={ctrl.query} setQuery={ctrl.setQuery} filterValues={ctrl.filterValues} setFilter={ctrl.setFilter}
          searchPlaceholder="Search name or email…" filters={filters}
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
  const [member, setMember] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get<{ users: User[] }>('/users').then((r) => {
      const found = r.data.users.find((u) => u._id === memberId);
      if (found) setMember(found); else setNotFound(true);
    });
  }, [memberId]);

  if (notFound) return <p className="text-slate-400">Member not found or not accessible.</p>;
  if (!member) return null;

  const crumbs: Crumb[] = [
    global ? { label: 'Users', to: '/admin/users' } : { label: 'Communities', to: '/admin/communities' },
    ...(member.community ? [{ label: member.community.name, to: `/admin/communities/${member.community._id}` }] : []),
    { label: member.name },
  ];

  return (
    <div>
      <Crumbs items={crumbs} />
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
