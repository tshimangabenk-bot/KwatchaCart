import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestOtp, setToken, signup, verifyOtp } from '../auth';
import { AuthShell, Field, PrimaryButton } from '../components/AuthShell';

export function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'otp'>('form');

  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token, message } = await signup({ shopName, phone, password });
      setToken(token); // provisional session; verification unlocks selling
      setInfo(message);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await verifyOtp(phone, code.trim());
      setToken(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify code.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await requestOtp(phone);
      setInfo('A new code was sent to your WhatsApp.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend code.');
    }
  }

  if (step === 'otp') {
    return (
      <AuthShell title="Verify your WhatsApp" subtitle={`We sent a 6-digit code to ${phone}`}>
        <form onSubmit={submitOtp} className="space-y-4">
          <Field
            label="Verification code"
            type="tel"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={setCode}
          />
          {info && <p className="text-base text-green-700">{info}</p>}
          {error && <p className="text-lg font-medium text-red-600">{error}</p>}
          <PrimaryButton disabled={busy}>{busy ? 'Verifying…' : 'Verify & continue'}</PrimaryButton>
        </form>
        <button onClick={resend} className="mt-4 w-full text-center text-lg font-semibold text-green-600">
          Resend code
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          Tip: you can also just reply to the WhatsApp message with the code.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Open your shop" subtitle="Sell on WhatsApp, get paid with Mobile Money">
      <form onSubmit={submitForm} className="space-y-4">
        <Field label="Shop name" placeholder="Mary Kamwala Stall" value={shopName} onChange={setShopName} />
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
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={setPassword}
        />
        {error && <p className="text-lg font-medium text-red-600">{error}</p>}
        <PrimaryButton disabled={busy}>{busy ? 'Creating…' : 'Create shop'}</PrimaryButton>
      </form>
      <p className="mt-6 text-center text-lg text-gray-600">
        Already have a shop?{' '}
        <Link to="/login" className="font-bold text-green-600">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
