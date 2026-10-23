
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../ui';
import api from '../api';

const LockIcon = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

const EyeIcon = ({ visible }) =>
  visible ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9 7-.2 1.2-1 2.5-2.2 3.7" />
      <path d="M6.6 6.6C4.5 8 3.3 10 3 12c.3 2.5 4 7 9 7 1.1 0 2.2-.2 3.2-.6" />
    </svg>
  );

export default function ForgotPassword() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();

  const submitEmail = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast('Please enter your email', 'error');
      return;
    }

    setBusy(true);

    try {
      const res = await api.forgotPassword(email.trim());

      toast(res.message, 'success');

      if (res.resetToken) {
        setToken(res.resetToken);
      }

      setStep('reset');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();

    if (!token.trim() || !password || !confirmPassword) {
      toast('All fields are required', 'error');
      return;
    }

    if (password !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }

    setBusy(true);

    try {
      await api.resetPassword(token.trim(), password);

      toast('Password reset successful! Please sign in.', 'success');
      setStep('done');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-4 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60';

  const renderPasswordField = ({
    id,
    label,
    value,
    onChange,
    visible,
    toggle,
    placeholder,
  }) => (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          minLength={id === 'new-password' ? 6 : undefined}
          autoComplete="new-password"
          placeholder={placeholder}
          disabled={busy}
          className={inputClass}
        />

        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <EyeIcon visible={visible} />
        </button>
      </div>
    </div>
  );

  const Brand = () => (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
        <LockIcon size={25} />
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          DispatchHub
        </h1>
        <p className="text-xs text-slate-500 sm:text-sm">
          Emergency Home Services
        </p>
      </div>
    </div>
  );

  const BackToLogin = () => (
    <button
      type="button"
      onClick={() => navigate('/login')}
      className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-800"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h12" />
      </svg>
      Back to sign in
    </button>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">

      {/* Background decorations */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-slate-200/70 lg:grid-cols-2">

        {/* Desktop information panel */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-10 text-white lg:flex xl:p-12">
          <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full border-[35px] border-white/10" />

          <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[45px] border-white/10" />

          <div className="relative z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <LockIcon size={29} />
            </div>

            <h2 className="mt-8 text-3xl font-bold tracking-tight xl:text-4xl">
              Account recovery,
              <br />
              made simple.
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-7 text-blue-100 xl:text-base">
              Forgot your password? Follow a few simple steps to regain
              access to your DispatchHub account.
            </p>

            <div className="mt-10 space-y-6">
              {[
                {
                  number: '01',
                  title: 'Verify your email',
                  text: 'Start with your registered email address.',
                },
                {
                  number: '02',
                  title: 'Create a new password',
                  text: 'Choose a password you have not used before.',
                },
                {
                  number: '03',
                  title: 'Sign in securely',
                  text: 'Return to your account with your new credentials.',
                },
              ].map((item) => (
                <div key={item.number} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-sm font-bold text-blue-100">
                    {item.number}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-blue-200">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 mt-12 text-xs text-blue-200">
            DispatchHub · Secure account recovery
          </p>
        </aside>

        {/* Main panel */}
        <main className="flex min-w-0 flex-col justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
          <Brand />

          {/* Step indicator */}
          {step !== 'done' && (
            <div className="mt-8 flex items-center gap-2">
              {[
                { key: 'email', label: 'Verify email' },
                { key: 'reset', label: 'Reset password' },
              ].map((item, index) => {
                const active = step === item.key;
                const complete = step === 'reset' && index === 0;

                return (
                  <div
                    key={item.key}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        active
                          ? 'bg-blue-600 text-white'
                          : complete
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {complete ? '✓' : index + 1}
                    </div>

                    <span
                      className={`truncate text-[11px] font-semibold sm:text-xs ${
                        active
                          ? 'text-blue-700'
                          : complete
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.label}
                    </span>

                    {index === 0 && (
                      <div
                        className={`h-px min-w-2 flex-1 ${
                          complete ? 'bg-emerald-300' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Email step */}
          {step === 'email' && (
            <section className="mt-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <MailIcon />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Forgot password?
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter your registered email address to begin the password
                recovery process.
              </p>

              <form onSubmit={submitEmail} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <MailIcon />
                    </span>

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={busy}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-12 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send reset link
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm text-slate-500">
                  Remember your password?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-semibold text-blue-600 transition hover:text-blue-800"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </section>
          )}

          {/* Reset password step */}
          {step === 'reset' && (
            <section className="mt-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                <LockIcon />
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Reset your password
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter your reset token and choose a new password for your
                account.
              </p>

              <form onSubmit={submitReset} className="mt-7 space-y-5">
                <div>
                  <label
                    htmlFor="reset-token"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Reset token
                  </label>

                  <input
                    id="reset-token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    disabled={busy}
                    placeholder="Paste your reset token"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Use the reset token provided by your password recovery
                    flow.
                  </p>
                </div>

                {renderPasswordField({
                  id: 'new-password',
                  label: 'New password',
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  visible: showPassword,
                  toggle: () => setShowPassword((prev) => !prev),
                  placeholder: 'Enter a new password',
                })}

                {renderPasswordField({
                  id: 'confirm-password',
                  label: 'Confirm new password',
                  value: confirmPassword,
                  onChange: (e) => setConfirmPassword(e.target.value),
                  visible: showConfirm,
                  toggle: () => setShowConfirm((prev) => !prev),
                  placeholder: 'Re-enter your new password',
                })}

                {confirmPassword && (
                  <p
                    className={`text-xs font-medium ${
                      password === confirmPassword
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    }`}
                  >
                    {password === confirmPassword
                      ? '✓ Passwords match'
                      : 'Passwords do not match'}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Resetting password...
                    </>
                  ) : (
                    'Reset password'
                  )}
                </button>
              </form>

              <div className="mt-7 border-t border-slate-100 pt-6">
                <BackToLogin />
              </div>
            </section>
          )}

          {/* Success step */}
          {step === 'done' && (
            <section className="mt-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="38"
                  height="38"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>

              <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Password updated
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                You're all set!
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                Your password has been reset successfully. You can now sign
                in using your new password.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25"
              >
                Sign in to DispatchHub
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </section>
          )}

          <p className="mt-9 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} DispatchHub. All rights reserved.
          </p>
        </main>
      </div>
    </div>
  );
}
