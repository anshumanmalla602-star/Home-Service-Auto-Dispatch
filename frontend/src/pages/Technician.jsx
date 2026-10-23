
import { useEffect, useRef, useState } from 'react';
import Layout from '../Layout';
import api from '../api';
import { connectSocket } from '../socket';
import {
  toast,
  statusBadge,
  fmtDuration,
  fmtKm,
  fmtTime,
  STATUS_LABEL,
  AVAIL_LABEL,
  availBadge,
} from '../ui';
import CurrentJob from '../components/CurrentJob';

export default function Technician() {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const socketRef = useRef(null);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const [p, j, h] = await Promise.all([
        api.get('/technician/profile'),
        api.get('/technician/jobs/current'),
        api.get('/technician/jobs/history'),
      ]);

      setProfile(p);
      setJobs(j);
      setHistory(h);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Real-time job notifications and GPS updates
  useEffect(() => {
    const socket = connectSocket();

    if (!socket) return;

    socketRef.current = socket;

    const handleJobAssigned = (job) => {
      setIncoming(job);

      toast(
        `🚨 New job assigned — ${job.category}. Accept within ${job.acceptDeadlineSec}s!`,
        'info'
      );

      load();
    };

    socket.on('job:assigned', handleJobAssigned);

    const sendPing = () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          socket.emit('location:update', {
            lat: +latitude.toFixed(6),
            lng: +longitude.toFixed(6),
          });
        },
        () => {
          // GPS permission or location unavailable
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000,
        }
      );
    };

    sendPing();

    const interval = setInterval(sendPing, 5000);

    return () => {
      clearInterval(interval);
      socket.off('job:assigned', handleJobAssigned);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const setAvailability = async (status) => {
    try {
      await api.put('/technician/availability', { status });

      toast(
        `You are now ${AVAIL_LABEL[status] || status}`,
        'success'
      );

      await load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const accept = async (id) => {
    if (!id || actionBusy) return;

    setActionBusy(true);

    try {
      await api.post(`/technician/jobs/${id}/accept`);

      toast('Job accepted — head to the customer!', 'success');
      setIncoming(null);

      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const decline = async (id) => {
    if (!id || actionBusy) return;

    setActionBusy(true);

    try {
      await api.post(`/technician/jobs/${id}/decline`);

      toast('Job declined — dispatch will reassign', 'info');
      setIncoming(null);

      await load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const isBusy = profile?.availability_status === 'on_job';
  const isAvailable = profile?.availability_status === 'available';

  const activeCount = jobs.length;
  const completedCount = Number(profile?.jobs_completed || 0);
  const rating = Number(profile?.rating || 0);

  const buttonClass =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50';

  if (loading) {
    return (
      <Layout
        title="Technician Portal"
        subtitle="Your jobs and availability at a glance"
      >
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>

          <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Technician Portal"
      subtitle="Manage your availability, accept jobs, and keep customers updated"
    >
      <div className="min-w-0 px-3 py-5 sm:px-5 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Welcome banner */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 p-5 text-white shadow-lg shadow-blue-950/10 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-28 right-24 h-64 w-64 rounded-full border border-white/10" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isAvailable
                        ? 'bg-emerald-400'
                        : isBusy
                        ? 'bg-amber-400'
                        : 'bg-slate-400'
                    }`}
                  />
                  {AVAIL_LABEL[profile?.availability_status] ||
                    profile?.availability_status ||
                    'Status unavailable'}
                </div>

                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  Welcome back{profile?.name ? `, ${profile.name}` : ''}!
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/80 sm:text-base">
                  Stay available for new service requests, manage your active
                  jobs, and deliver excellent customer service.
                </p>
              </div>

              <button
                type="button"
                onClick={() => load(true)}
                disabled={refreshing}
                className={`${buttonClass} shrink-0 border border-white/20 bg-white/10 text-white hover:bg-white/20 focus:ring-white/20`}
              >
                <svg
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    d="M20 7v5h-5M4 17v-5h5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
              </button>
            </div>
          </section>

          {/* Summary cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Availability"
              value={
                AVAIL_LABEL[profile?.availability_status] ||
                profile?.availability_status ||
                'Unknown'
              }
              description="Your current work status"
              icon={<AvailabilityIcon />}
              color="blue"
            />

            <StatCard
              label="Active Jobs"
              value={activeCount}
              description="Jobs currently assigned"
              icon={<JobsIcon />}
              color="violet"
            />

            <StatCard
              label="Jobs Completed"
              value={completedCount}
              description="Total completed services"
              icon={<CompletedIcon />}
              color="emerald"
            />

            <StatCard
              label="Customer Rating"
              value={`${rating.toFixed(1)} / 5`}
              description="Your average rating"
              icon={<RatingIcon />}
              color="amber"
            />
          </section>

          {/* Main dashboard grid */}
          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">

            {/* Sidebar content */}
            <aside className="min-w-0 space-y-6 xl:col-span-1">

              {/* Availability card */}
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Availability
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Manage your work status.
                    </p>
                  </div>

                  {profile && (
                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${availBadge(
                        profile.availability_status
                      )}`}
                    >
                      {AVAIL_LABEL[profile.availability_status] ||
                        profile.availability_status}
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-4">
                  <ProfileDetail
                    label="Skill Category"
                    value={profile?.skill_category || 'Not specified'}
                  />

                  <ProfileDetail
                    label="Technician Rating"
                    value={`⭐ ${rating.toFixed(1)} / 5`}
                  />

                  <ProfileDetail
                    label="Completed Jobs"
                    value={completedCount}
                  />
                </div>

                {isBusy && (
                  <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm leading-5 text-amber-800">
                    You are currently working on a job. Complete it before
                    changing your availability.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setAvailability(isAvailable ? 'offline' : 'available')
                  }
                  disabled={isBusy || !profile}
                  className={`${buttonClass} mt-5 w-full ${
                    isAvailable
                      ? 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-200'
                  }`}
                >
                  <AvailabilityIcon />
                  {isAvailable ? 'Go Offline' : 'Go Available'}
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                  When available, you can receive new service assignments.
                </p>
              </section>

              {/* Job history */}
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Job History
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Your recent service records
                    </p>
                  </div>

                  <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">
                    {history.length}
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                      <HistoryIcon />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      No job history yet
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Your completed service records will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[440px] space-y-3 overflow-y-auto p-4 sm:p-5">
                    {history.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-slate-100 p-4 transition hover:border-blue-100 hover:bg-blue-50/30"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="break-words text-sm font-semibold text-slate-800">
                              {item.title || item.category_label}
                            </h4>

                            <p className="mt-1 text-xs text-slate-400">
                              {fmtTime(item.requested_at)}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(
                              item.status
                            )}`}
                          >
                            {STATUS_LABEL[item.status] || item.status}
                          </span>
                        </div>

                        {item.feedback_rating && (
                          <div className="mt-3 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
                            <span aria-hidden="true">★</span>
                            Customer rating: {item.feedback_rating}/5
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </aside>

            {/* Jobs section */}
            <main className="min-w-0 space-y-6 xl:col-span-2">

              {/* Section heading */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Your Jobs
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Manage incoming assignments and active service requests.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {jobs.length} active {jobs.length === 1 ? 'job' : 'jobs'}
                </span>
              </div>

              {/* Incoming job notification */}
              {incoming && (
                <section className="overflow-hidden rounded-3xl border-2 border-amber-300 bg-white shadow-lg shadow-amber-900/5">
                  <div className="flex items-center gap-3 bg-amber-50 px-5 py-4 sm:px-6">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <BellIcon />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">
                        New Job Assigned
                      </h3>

                      <p className="mt-1 text-xs text-amber-800">
                        Respond before the acceptance deadline.
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                      Action Required
                    </span>
                  </div>

                  <div className="p-5 sm:p-6">
                    <h4 className="break-words text-lg font-bold text-slate-900">
                      {incoming.title || incoming.category}
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      {incoming.category}
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <JobInfo
                        label="Priority"
                        value={incoming.priority || 'Normal'}
                        icon={<PriorityIcon />}
                        capitalize
                      />

                      <JobInfo
                        label="Estimated Arrival"
                        value={fmtDuration(incoming.etaSeconds)}
                        icon={<ClockIcon />}
                      />

                      <JobInfo
                        label="Distance"
                        value={`${fmtKm(incoming.distanceKm)} away`}
                        icon={<LocationIcon />}
                      />

                      <JobInfo
                        label="Customer Location"
                        value={
                          incoming.address || 'Customer location provided'
                        }
                        icon={<LocationIcon />}
                      />
                    </div>

                    <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                      <p className="text-sm font-semibold text-amber-900">
                        ⏱ Acceptance deadline
                      </p>

                      <p className="mt-1 text-sm text-amber-800">
                        You have{' '}
                        <strong>
                          {incoming.acceptDeadlineSec ?? 'limited'} seconds
                        </strong>{' '}
                        to accept this job before it is reassigned.
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => accept(incoming.requestId)}
                        disabled={actionBusy}
                        className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-200`}
                      >
                        {actionBusy ? (
                          'Processing...'
                        ) : (
                          <>
                            <CheckIcon />
                            Accept Job
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => decline(incoming.requestId)}
                        disabled={actionBusy}
                        className={`${buttonClass} border border-red-200 bg-white text-red-600 hover:bg-red-50 focus:ring-red-100`}
                      >
                        <CloseIcon />
                        Decline Job
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* No active jobs */}
              {jobs.length === 0 && !incoming && (
                <section className="rounded-3xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm sm:px-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <ToolsIllustration />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    No active jobs right now
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    {isAvailable
                      ? 'You are available to receive service requests. New assignments will appear here.'
                      : 'Switch your status to available when you are ready to receive new service assignments.'}
                  </p>

                  {!isAvailable && !isBusy && (
                    <button
                      type="button"
                      onClick={() => setAvailability('available')}
                      className={`${buttonClass} mt-6 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200`}
                    >
                      <AvailabilityIcon />
                      Go Available
                    </button>
                  )}

                  <div className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-3 border-t border-slate-100 pt-6 text-left sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-emerald-600">
                        <CheckIcon />
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Stay available
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Receive eligible job assignments.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-blue-600">
                        <LocationIcon />
                      </span>

                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          Enable location
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Allow location access for GPS updates.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Active jobs */}
              {jobs.map((job) => (
                <CurrentJob
                  key={job.id}
                  job={job}
                  onAction={load}
                />
              ))}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, description, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-3 break-words text-2xl font-bold capitalize tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${colors[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ProfileDetail({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="break-words text-right text-sm font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function JobInfo({ label, value, icon, capitalize = false }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="mt-0.5 shrink-0 text-slate-500">{icon}</div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{label}</p>

        <p
          className={`mt-1 break-words text-sm font-semibold text-slate-800 ${
            capitalize ? 'capitalize' : ''
          }`}
        >
          {value ?? '—'}
        </p>
      </div>
    </div>
  );
}

function AvailabilityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function JobsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V4h8v3M3 12h18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CompletedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RatingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PriorityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M12 3 2.8 20h18.4L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function ToolsIllustration() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8" aria-hidden="true">
      <path d="m14 7 3-3a5 5 0 0 1-6 6L5 16a2.1 2.1 0 0 0 3 3l6-6a5 5 0 0 1 6-6l-3 3-3-3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
