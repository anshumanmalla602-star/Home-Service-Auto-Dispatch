
import { useEffect, useState } from 'react';
import Layout from '../Layout';
import api from '../api';
import { connectSocket } from '../socket';
import { toast, STATUS_LABEL } from '../ui';
import RequestForm from '../components/RequestForm';
import TrackingCard from '../components/TrackingCard';
import RequestList from '../components/RequestList';

export default function Customer() {
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      const [cats, reqs] = await Promise.all([
        api.get('/customer/categories'),
        api.get('/customer/requests'),
      ]);

      setCategories(cats);
      setRequests(reqs);

      const active = reqs.find((r) =>
        ['assigned', 'on_the_way', 'in_progress'].includes(r.status)
      );

      setTracking((prev) => {
        if (!active) return null;

        // Preserve the latest live tracking information when refreshing.
        if (prev?.id === active.id) {
          return { ...active, live: prev.live };
        }

        return active;
      });
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

  // Real-time dispatch and tracking updates.
  useEffect(() => {
    const socket = connectSocket();

    if (!socket) return;

    const handleRequestUpdate = (d) => {
      toast(
        `${STATUS_LABEL[d.status] || d.status}${
          d.technician ? ' — ' + d.technician.name : ''
        }`,
        d.status === 'completed' ? 'success' : 'info'
      );

      load();
    };

    const handleTrackingUpdate = (d) => {
      setTracking((prev) =>
        prev && prev.id === d.requestId
          ? { ...prev, live: d }
          : prev
      );
    };

    socket.on('request:update', handleRequestUpdate);
    socket.on('request:tracking', handleTrackingUpdate);

    return () => {
      socket.off('request:update', handleRequestUpdate);
      socket.off('request:tracking', handleTrackingUpdate);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = requests.filter((r) =>
    ['pending', 'assigned', 'on_the_way', 'in_progress'].includes(r.status)
  ).length;

  const completedCount = requests.filter(
    (r) => r.status === 'completed'
  ).length;

  const cancelledCount = requests.filter(
    (r) => r.status === 'cancelled'
  ).length;

  const stats = [
    {
      label: 'Total Requests',
      value: requests.length,
      icon: '📋',
      color: 'blue',
      description: 'All service requests',
    },
    {
      label: 'Active Requests',
      value: activeCount,
      icon: '⚡',
      color: 'violet',
      description: 'Pending or in progress',
    },
    {
      label: 'Completed',
      value: completedCount,
      icon: '✓',
      color: 'emerald',
      description: 'Successfully completed',
    },
    {
      label: 'Cancelled',
      value: cancelledCount,
      icon: '↗',
      color: 'amber',
      description: 'Cancelled requests',
    },
  ];

  const statColors = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  };

  const panel =
    'min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm';

  return (
    <Layout
      title="Customer Portal"
      subtitle="Raise a service request and track your technician in real time"
    >
      <div className="min-w-0 space-y-5 pb-6 sm:space-y-6">

        {/* Welcome banner */}
        <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7 lg:p-8">

          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full border-[30px] border-white/10 sm:-right-4 sm:h-80 sm:w-80" />

          <div className="pointer-events-none absolute -bottom-24 right-1/4 -z-10 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Your service dashboard
              </div>

              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                How can we help you today?
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                Request trusted home services, follow your technician's
                progress, and manage all your bookings in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              <svg
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 7v5h-5" />
                <path d="M4 17v-5h5" />
                <path d="M5.6 9A7 7 0 0 1 18 6l2 6" />
                <path d="M18.4 15A7 7 0 0 1 6 18l-2-6" />
              </svg>

              {refreshing ? 'Refreshing...' : 'Refresh dashboard'}
            </button>
          </div>
        </section>

        {/* Statistics */}
        <section
          aria-label="Your service statistics"
          className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${panel} group p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ${
                    statColors[stat.color]
                  }`}
                >
                  {stat.icon}
                </span>

                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Overview
                </span>
              </div>

              <div className="mt-4">
                <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {loading ? '—' : stat.value}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {stat.label}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {stat.description}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Main dashboard content */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-3">

          {/* New request form */}
          <section className={`${panel} min-w-0 overflow-hidden xl:col-span-1`}>
            <div className="border-b border-slate-100 bg-gradient-to-r from-white to-blue-50/60 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg text-blue-700">
                  +
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-800">
                    New service request
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Tell us what service you need.
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-0 p-4 sm:p-5">
              <RequestForm
                categories={categories}
                onCreated={load}
              />
            </div>
          </section>

          {/* Tracking and request history */}
          <div className="min-w-0 space-y-5 xl:col-span-2">

            {/* Live tracking */}
            {tracking && (
              <section className={`${panel} min-w-0 overflow-hidden`}>
                <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 to-white p-4 sm:p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                    📍
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800">
                        Live technician tracking
                      </h3>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Follow the progress of your current service request.
                    </p>
                  </div>
                </div>

                <div className="min-w-0 p-3 sm:p-5">
                  <TrackingCard request={tracking} />
                </div>
              </section>
            )}

            {/* Request history */}
            <section className={`${panel} min-w-0 overflow-hidden`}>
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-lg">
                    📑
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-800">
                      My service requests
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      View and manage your previous bookings.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {loading ? 'Loading...' : `${requests.length} total`}
                </span>
              </div>

              <div className="min-w-0 p-3 sm:p-5">
                {loading ? (
                  <div className="space-y-3 py-3" aria-label="Loading requests">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="animate-pulse rounded-xl border border-slate-100 p-4"
                      >
                        <div className="h-4 w-1/3 rounded bg-slate-100" />
                        <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
                        <div className="mt-3 h-8 w-24 rounded-lg bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <RequestList
                    requests={requests}
                    onChanged={load}
                  />
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer note */}
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            Need a home service? Create a request to get started.
          </p>

          <p className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Service management available
          </p>
        </div>
      </div>
    </Layout>
  );
}
