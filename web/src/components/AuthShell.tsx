import { Link } from 'react-router-dom';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-md px-6 py-12">
        <Link to="/" className="flex items-center gap-2 text-green-700">
          <span className="text-3xl">🛒</span>
          <span className="text-2xl font-black tracking-tight">KwatchaCart</span>
        </Link>
        <h1 className="mt-10 text-4xl font-black text-gray-900">{title}</h1>
        {subtitle && <p className="mt-2 text-lg text-gray-600">{subtitle}</p>}
        <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  inputMode,
  autoComplete,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'text' | 'tel';
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-lg font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border-2 border-gray-200 p-4 text-xl focus:border-green-500 focus:outline-none"
      />
    </label>
  );
}

export function PrimaryButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-2xl bg-green-600 py-4 text-2xl font-black text-white shadow-lg shadow-green-600/30 transition active:scale-[0.99] active:bg-green-700 disabled:opacity-60"
    >
      {children}
    </button>
  );
}
