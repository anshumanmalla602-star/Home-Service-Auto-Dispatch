
import { useState } from 'react';
import Layout from '../Layout';
import api from '../api';
import Sidebar from '../components/Sidebar';

const PasswordIcon = ({ visible }) =>
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

const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
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

const INITIAL_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function EditPassword() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    if (message) setMessage(null);
  };

  const toggleShow = (field) => {
    if (field === 'current') setShowCurrent((prev) => !prev);
    if (field === 'new') setShowNew((prev) => !prev);
    if (field === 'confirm') setShowConfirm((prev) => !prev);
  };

  const submit = async (e) => {
    e.preventDefault();

    setMessage(null);

    if (
      !form.currentPassword ||
      !form.newPassword ||
      !form.confirmPassword
    ) {
      setMessage('All fields are required.');
      setMessageType('error');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setMessage('Your new passwords do not match.');
      setMessageType('error');
      return;
    }

    if (form.newPassword.length < 6) {
      setMessage('Your new password must be at least 6 characters.');
      setMessageType('error');
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setMessage('Your new password must differ from your current password.');
      setMessageType('error');
      return;
    }

    setBusy(true);

    try {
      await api.changePassword(
        form.currentPassword,
        form.newPassword
      );

      setMessage('Your password has been changed successfully.');
      setMessageType('success');

      setForm(INITIAL_FORM);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (e) {
      setMessage(e.message || 'Unable to update your password. Please try again.');
      setMessageType('error');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3.5 pl-4 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60';

  const renderPasswordField = ({
    name,
    label,
    placeholder,
    visible,
    field,
    autoComplete,
    hint,
  }) => (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>

      <div className="group relative">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          value={form[name]}
          onChange={handleChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={inputClass}
          disabled={busy}
          required
          minLength={name === 'newPassword' ? 6 : undefined}
        />

        <button
          type="button"
          onClick={() => toggleShow(field)}
          disabled={busy}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
        >
          <PasswordIcon visible={visible} />
        </button>
      </div>

      {hint && (
        <p className="mt-2 text-xs leading-5 text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );

  return (
    <Layout
      title="Edit Password"
      subtitle="Manage your account security and update your password"
    >
      <div className="min-w-0 space-y-5 pb-8">

        {/* Page introduction */}
        <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-20 -z-10 h-56 w-56 rounded-full border-[28px] border-white/10 sm:h-72 sm:w-72" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:h-14 sm:w-14">
              <LockIcon />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                Account settings
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Change your password
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
                Keep your DispatchHub account secure by using a strong,
                private password.
              </p>
            </div>
          </div>
        </section>

        {/* Responsive content layout */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-3">

          {/* Sidebar */}
          <aside className="min-w-0 xl:col-span-1">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
              <Sidebar />
            </div>
          </aside>

          {/* Password form */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:col-span-2">

            <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-blue-50/50 p-4 sm:p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <LockIcon />
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800 sm:text-lg">
                  Password settings
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Enter your current password and choose a new one.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8">

              {/* Status message */}
              {message && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${
                    messageType === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  <span className="mt-0.5 shrink-0 font-bold">
                    {messageType === 'success' ? '✓' : '!'}
                  </span>

                  <p className="break-words">{message}</p>
                </div>
              )}

              <form onSubmit={submit} className="space-y-5">

                {renderPasswordField({
                  name: 'currentPassword',
                  label: 'Current password',
                  placeholder: 'Enter your current password',
                  visible: showCurrent,
                  field: 'current',
                  autoComplete: 'current-password',
                })}

                <div className="h-px bg-slate-100" />

                {renderPasswordField({
                  name: 'newPassword',
                  label: 'New password',
                  placeholder: 'Create a new password',
                  visible: showNew,
                  field: 'new',
                  autoComplete: 'new-password',
                  hint: 'Use at least 6 characters. A longer, unique password is recommended.',
                })}

                {renderPasswordField({
                  name: 'confirmPassword',
                  label: 'Confirm new password',
                  placeholder: 'Re-enter your new password',
                  visible: showConfirm,
                  field: 'confirm',
                  autoComplete: 'new-password',
                })}

                {/* Password match indicator */}
                {form.confirmPassword && (
                  <p
                    className={`text-xs font-medium ${
                      form.newPassword === form.confirmPassword
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    }`}
                  >
                    {form.newPassword === form.confirmPassword
                      ? '✓ Passwords match'
                      : 'Passwords do not match'}
                  </p>
                )}

                {/* Security note */}
                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <span className="mt-0.5 text-blue-600">
                    <LockIcon />
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Keep your account secure
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-800/80">
                      Never share your password with anyone. Avoid reusing
                      passwords from other accounts.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(INITIAL_FORM);
                      setMessage(null);
                      setShowCurrent(false);
                      setShowNew(false);
                      setShowConfirm(false);
                    }}
                    disabled={busy}
                    className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    Clear fields
                  </button>

                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
                  >
                    {busy ? (
                      <>
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                          />
                        </svg>
                        Updating password...
                      </>
                    ) : (
                      <>
                        <LockIcon />
                        Update password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>

        <p className="px-2 text-center text-xs leading-5 text-slate-400">
          DispatchHub · Account security settings
        </p>
      </div>
    </Layout>
  );
}
