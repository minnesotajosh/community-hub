import { useEffect, useState } from 'react';
import api, { ROLE_LABELS } from '../api';
import { useAuth } from '../auth';
import { Button } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('member@test.com');
  const [password, setPassword] = useState('test');
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/auth/dev-accounts').then((r) => setAccounts(r.data.accounts)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e?.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
    } catch {
      setError('Invalid credentials');
    } finally {
      setBusy(false);
    }
  };

  // Dev convenience: pick account -> fill + auto-login
  const pick = async (acctEmail) => {
    setEmail(acctEmail);
    setPassword('test');
    setError(''); setBusy(true);
    try {
      await login(acctEmail, 'test');
    } catch {
      setError('Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-brand-700">Civic Hub</h1>
        <p className="text-slate-500 text-sm mb-6">Community concerns & forums</p>

        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <label className="block text-xs font-semibold text-amber-800 mb-1">
            ⚡ Dev quick-login (pick a seeded account)
          </label>
          <select
            className="w-full border rounded px-2 py-2 text-sm bg-white"
            defaultValue=""
            onChange={(e) => e.target.value && pick(e.target.value)}
          >
            <option value="">— Select a test user —</option>
            {accounts.map((a) => (
              <option key={a._id} value={a.email}>
                {ROLE_LABELS[a.role]} — {a.name}
                {a.community ? ` (${a.community.name})` : ''} [{a.email}]
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input className="w-full border rounded px-3 py-2 text-sm"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
            <input type="password" className="w-full border rounded px-3 py-2 text-sm"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
