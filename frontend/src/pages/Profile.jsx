
import { useEffect, useState } from 'react';
import Layout from '../Layout';
import api from '../api';
import { toast } from '../ui';
import Sidebar from '../components/Sidebar';

export default function Profile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/customer/profile');

      setData(res);
      setForm({
        name: res.name || '',
        phone: res.phone || '',
        address: res.address || '',
        emergencyContact: res.emergency_contact || '',
      });
    } catch (e) {
      try {
        const res = await api.get('/technician/profile');

        setData({
          ...res,
          name: res.name,
          email: res.email,
          phone: res.phone,
          skill_category: res.skill_category,
          jobs_completed: res.jobs_completed,
          rating: res.rating,
          availability_status: res.availability_status,
        });

        setForm({
          name: res.name || '',
          phone: res.phone || '',
        });
      } catch (e2) {
        toast(e2.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const save = async (e) => {
    e.preventDefault();

    setBusy(true);

    try {
      if (data?.skill_category) {
        await api.put('/technician/profile', {
          name: form.name,
          phone: form.phone,
        });
      } else {
        await api.put('/customer/profile', {
          name: form.name,
          phone: form.phone,
          address: form.address,
          emergencyContact: form.emergencyContact,
        });
      }

      toast('Profile updated successfully', 'success');
      setEditMode(false);
      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const initials = data?.name
    ? data.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const isTechnician = Boolean(data?.skill_category);

  const inputClass =
    'w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

  const fieldClass = 'space-y-2';

  const labelClass = 'block text-sm font-semibold text-slate-700';

  if (loading) {
    return (
      <Layout title="My Profile" subtitle="Loading your account details">
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-200" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-40 max-w-full rounded bg-slate-200" />
                <div className="h-4 w-56 max-w-full rounded bg-slate-100" />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-24 rounded-2xl bg-slate-100" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout title="My Profile" subtitle="Manage your account details">
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-500">
              !
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-800">
              Unable to load profile
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              We couldn't retrieve your account details. Please try again.
            </p>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="My Profile"
      subtitle="View and update your account details"
    >
      <Sidebar />

      <div className="min-w-0 px-3 py-5 sm:px-5 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Profile header */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-lg shadow-blue-950/10 sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-24 right-20 h-56 w-56 rounded-full border border-white/10" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-bold shadow-inner sm:h-20 sm:w-20 sm:text-2xl">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                    Account Overview
                  </p>

                  <h2 className="mt-1 break-words text-xl font-bold sm:text-2xl">
                    {data.name || 'User'}
                  </h2>

                  <p className="mt-1 break-all text-sm text-blue-100/80">
                    {data.email || 'No email available'}
                  </p>

                  <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium capitalize text-blue-50">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {data.role || (isTechnician ? 'Technician' : 'Customer')}
                  </span>
                </div>
              </div>

              {!editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/30 sm:w-auto"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 20h9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>
          </section>

          {/* Profile details / edit form */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editMode ? 'Edit your details' : 'Personal Information'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editMode
                    ? 'Keep your account information up to date.'
                    : 'Your account information and contact details.'}
                </p>
              </div>

              {!editMode && (
                <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Profile Details
                </span>
              )}
            </div>

            <div className="p-5 sm:p-7">
              {editMode ? (
                <form onSubmit={save} className="space-y-6">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className={fieldClass}>
                      <label htmlFor="name" className={labelClass}>
                        Full Name <span className="text-red-500">*</span>
                      </label>

                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={form.name || ''}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className={inputClass}
                        required
                      />
                    </div>

                    <div className={fieldClass}>
                      <label htmlFor="phone" className={labelClass}>
                        Phone Number
                      </label>

                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone || ''}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                        className={inputClass}
                      />
                    </div>

                    {!isTechnician && (
                      <>
                        <div className={`${fieldClass} sm:col-span-2`}>
                          <label htmlFor="address" className={labelClass}>
                            Address
                          </label>

                          <textarea
                            id="address"
                            name="address"
                            rows={3}
                            autoComplete="street-address"
                            value={form.address || ''}
                            onChange={handleChange}
                            placeholder="Enter your complete address"
                            className={`${inputClass} resize-y`}
                          />
                        </div>

                        <div className={fieldClass + ' sm:col-span-2'}>
                          <label
                            htmlFor="emergencyContact"
                            className={labelClass}
                          >
                            Emergency Contact
                          </label>

                          <input
                            id="emergencyContact"
                            name="emergencyContact"
                            type="tel"
                            value={form.emergencyContact || ''}
                            onChange={handleChange}
                            placeholder="Enter emergency contact number"
                            className={inputClass}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditMode(false);
                        setForm({
                          name: data.name || '',
                          phone: data.phone || '',
                          address: data.address || '',
                          emergencyContact: data.emergency_contact || '',
                        });
                      }}
                      disabled={busy}
                      className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                              d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
                            />
                          </svg>
                          Saving Changes...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoCard
                    label="Email Address"
                    value={data.email}
                    icon={<MailIcon />}
                  />

                  <InfoCard
                    label="Phone Number"
                    value={data.phone}
                    icon={<PhoneIcon />}
                  />

                  <InfoCard
                    label="Account Role"
                    value={
                      data.role ||
                      (isTechnician ? 'Technician' : 'Customer')
                    }
                    capitalize
                    icon={<UserIcon />}
                  />

                  {!isTechnician && (
                    <InfoCard
                      label="Address"
                      value={data.address}
                      icon={<LocationIcon />}
                    />
                  )}

                  {!isTechnician && (
                    <InfoCard
                      label="Emergency Contact"
                      value={data.emergency_contact}
                      icon={<EmergencyIcon />}
                    />
                  )}

                  {isTechnician && (
                    <>
                      <InfoCard
                        label="Skill Category"
                        value={data.skill_category}
                        icon={<ToolIcon />}
                      />

                      <InfoCard
                        label="Availability"
                        value={data.availability_status}
                        capitalize
                        icon={<StatusIcon />}
                        badge
                      />

                      <InfoCard
                        label="Jobs Completed"
                        value={data.jobs_completed ?? 0}
                        icon={<BriefcaseIcon />}
                      />

                      <InfoCard
                        label="Customer Rating"
                        value={`⭐ ${
                          Number(data.rating || 0).toFixed(1)
                        } / 5`}
                        icon={<StarIcon />}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Account security note */}
          {!editMode && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ShieldIcon />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Keep your profile up to date
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Make sure your contact details are correct so you can receive
                  important service updates and coordinate with your technician.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function InfoCard({ label, value, icon, capitalize = false, badge = false }) {
  const displayValue =
    value === null || value === undefined || value === ''
      ? 'Not provided'
      : value;

  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-blue-100 hover:bg-blue-50/40 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        {badge ? (
          <span className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold capitalize text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="break-words">
              {displayValue}
            </span>
          </span>
        ) : (
          <p
            className={`mt-2 break-words text-sm font-semibold text-slate-800 ${
              capitalize ? 'capitalize' : ''
            }`}
          >
            {displayValue}
          </p>
        )}
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="M7 3h3l2 5-2 1.5a15 15 0 0 0 4.5 4.5L16 12l5 2v3c0 1.1-.9 2-2 2C10.7 19 5 13.3 5 5c0-1.1.9-2 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function EmergencyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="m14 7 3-3a5 5 0 0 1-6 6L5 16a2.1 2.1 0 0 0 3 3l6-6a5 5 0 0 1 6-6l-3 3-3-3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
