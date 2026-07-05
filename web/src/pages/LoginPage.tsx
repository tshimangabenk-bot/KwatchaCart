import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, setToken } from '../auth';
import { AuthShell, Field, PrimaryButton } from '../components/AuthShell';

export function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await login({ phone, password });
      setToken(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your shop">
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="WhatsApp number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="097 123 4567"
          value={phone}
          onChange={setPhone}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={setPassword}
        />
        {error && <p className="text-lg font-medium text-red-600">{error}</p>}
        <PrimaryButton disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</PrimaryButton>
      </form>
      <p className="mt-6 text-center text-lg text-gray-600">
        New here?{' '}
        <Link to="/signup" className="font-bold text-green-600">
          Create a shop
        </Link>
      </p>
    </AuthShell>
  );
}
