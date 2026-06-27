import { useEffect, useState, type FormEvent } from 'react';
import api, { ROLE_LABELS } from '../api';
import { useAuth } from '../auth';
import { Button, Input, SelectField, Label } from '../components/common';
import type { Role } from '../types';

interface DevAccount {
  _id: string;
  name: string;
  email: string;
  role: Role;
  community?: { _id: string; name: string } | null;
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('member@test.com');
  const [password, setPassword] = useState('test');
  const [accounts, setAccounts] = useState<DevAccount[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ accounts: DevAccount[] }>('/auth/dev-accounts')
      .then((r) => setAccounts(r.data.accounts)).catch(() => {});
  }, []);

  const submit = async (e?: FormEvent) => {
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
  const pick = async (acctEmail: string) => {
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
          <Label className="block text-xs font-semibold text-amber-800 mb-1">
            ⚡ Dev quick-login (pick a seeded account)
          </Label>
          <SelectField
            className="bg-white"
            value=""
            placeholder="— Select a test user —"
            onChange={(v) => v && pick(v)}
            options={accounts.map((a) => ({
              value: a.email,
              label: `${ROLE_LABELS[a.role]} — ${a.name}${a.community ? ` (${a.community.name})` : ''} [${a.email}]`,
            }))}
          />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="block text-xs font-medium text-slate-600 mb-1">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label className="block text-xs font-medium text-slate-600 mb-1">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
