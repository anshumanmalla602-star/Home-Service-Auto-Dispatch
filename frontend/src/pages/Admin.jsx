
import { useEffect, useRef, useState } from 'react';
import Layout from '../Layout';
import api from '../api';
import { connectSocket } from '../socket';
import {
  toast,
  statusBadge,
  priorityBadge,
  fmtDuration,
  STATUS_LABEL,
  AVAIL_LABEL,
} from '../ui';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';

const iconFor = (status) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${
      status === 'available'
        ? '#16a34a'
        : status === 'on_job'
        ? '#f59e0b'
        : '#94a3b8'
    };border-radius:50%;width:16px;height:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const panel =
  'min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md';

const sectionTitle =
  'text-base font-bold tracking-tight text-slate-800 sm:text-lg';

const KPI_ICONS = {
  'Total Requests': '📦',
  'Active Jobs': '⚡',
  Completed: '✓',
  'Techs Available': '🟢',
  'Techs On Job': '🟠',
  'Avg Response': '⏱',
};

const FILTERS = [
  { value: 'all', label: 'All requests' },
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'on_the_way', label: 'On the way' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Admin() {
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [feed, setFeed] = useState([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const feedRef = useRef([]);

  const load = async () => {
    setRefreshing(true);

    try {
      const [s, t, a] = await Promise.all([
        api.get('/admin/summary'),
        api.get('/admin/technicians'),
        api.get('/admin/analytics'),
      ]);

      setSummary(s);
      setTechnicians(t);
      setAnalytics(a);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const loadRequests = async () => {
    try {
      setRequests(await api.get(`/admin/requests?status=${filter}`));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  // Preserve live dispatch and technician updates.
  useEffect(() => {
    const socket = connectSocket();

    if (!socket) return;

    const push = (msg, type = 'info') => {
      const item = {
        msg,
        type,
        at: new Date().toLocaleTimeString(),
      };

      feedRef.current = [item, ...feedRef.current].slice(0, 12);
      setFeed(feedRef.current);
    };

    const handleDispatch = (d) =>
      push(
        `${d.type} — req #${d.requestId}${
          d.technician ? ' → ' + d.technician : ''
        }`,
        d.type === 'assigned' ? 'success' : 'warn'
      );

    const handleLocation = (d) => {
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === d.technicianId
            ? {
                ...t,
                current_lat: d.lat,
                current_lng: d.lng,
              }
            : t
        )
      );

      push(`📍 Tech #${d.technicianId} location update`);
    };

    const handleStatus = (d) => {
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === d.technicianId
            ? { ...t, availability_status: d.status }
            : t
        )
      );

      push(`🔄 ${d.name} → ${AVAIL_LABEL[d.status] || d.status}`);
    };

    socket.on('admin:dispatch', handleDispatch);
    socket.on('admin:technician_location', handleLocation);
    socket.on('admin:technician_status', handleStatus);

    return () => {
      socket.off('admin:dispatch', handleDispatch);
      socket.off('admin:technician_location', handleLocation);
      socket.off('admin:technician_status', handleStatus);
      socket.disconnect();
    };
  }, []);

  const kpiCards = summary
    ? [
        {
          label: 'Total Requests',
          value: summary.total_requests,
          color: 'blue',
          icon: KPI_ICONS['Total Requests'],
        },
        {
          label: 'Active Jobs',
          value: summary.active_requests,
          color: 'violet',
          icon: KPI_ICONS['Active Jobs'],
        },
        {
          label: 'Completed',
          value: summary.completed_requests,
          color: 'emerald',
          icon: KPI_ICONS.Completed,
        },
        {
          label: 'Techs Available',
          value: summary.technicians_available,
          color: 'green',
          icon: KPI_ICONS['Techs Available'],
        },
        {
          label: 'Techs On Job',
          value: summary.technicians_on_job,
          color: 'amber',
          icon: KPI_ICONS['Techs On Job'],
        },
        {
          label: 'Avg Response',
          value: fmtDuration(summary.avg_response_sec),
          color: 'cyan',
          icon: KPI_ICONS['Avg Response'],
        },
      ]
    : [];

  const kpiColors = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    green: 'bg-green-50 text-green-700 ring-green-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  };

  const available = technicians.filter(
    (t) => t.availability_status === 'available'
  ).length;

  const onJob = technicians.filter(
    (t) => t.availability_status === 'on_job'
  ).length;

  const offline = technicians.filter(
    (t) => t.availability_status === 'offline'
  ).length;

  const categories = analytics?.byCategory || [];
  const maxCategoryRequests = Math.max(
    1,
    ...categories.map((c) => Number(c.request_count) || 0)
  );

  const validTechnicians = technicians.filter(
    (t) =>
      t.current_lat !== null &&
      t.current_lat !== undefined &&
      t.current_lng !== null &&
      t.current_lng !== undefined &&
      Number.isFinite(Number(t.current_lat)) &&
      Number.isFinite(Number(t.current_lng)) &&
      Number(t.current_lat) >= -90 &&
      Number(t.current_lat) <= 90 &&
      Number(t.current_lng) >= -180 &&
      Number(t.current_lng) <= 180
  );

  return (
    <Layout
      title="Admin Dashboard"
      subtitle="Monitor live jobs, technician availability, and service analytics"
    >
      <div className="min-w-0 space-y-5 pb-6 sm:space-y-6">

        {/* Dashboard heading and refresh */}
        <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live operations
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Operations overview
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Track requests, monitor technicians, and review service performance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              load();
              loadRequests();
            }}
            disabled={refreshing}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
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

        {/* KPI cards */}
        <section
          aria-label="Dashboard key performance indicators"
          className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
        >
          {kpiCards.length
            ? kpiCards.map((k) => (
                <div
                  key={k.label}
                  className={`${panel} group p-4 sm:p-5`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ring-1 ${
                        kpiColors[k.color]
                      }`}
                    >
                      {k.icon}
                    </span>

                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Overview
                    </span>
                  </div>

                  <p className="mt-4 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {k.value ?? '—'}
                  </p>

                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">
                    {k.label}
                  </p>
                </div>
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`${panel} animate-pulse p-5`}
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="mt-5 h-8 w-20 rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-28 max-w-full rounded bg-slate-100" />
                </div>
              ))}
        </section>

        {/* Requests and live dispatch feed */}
        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">

          {/* Requests */}
          <section className={`${panel} min-w-0 xl:col-span-2`}>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className={sectionTitle}>Service requests</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Monitor incoming and ongoing service jobs.
                </p>
              </div>

              <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:w-auto">
                <svg
                  className="h-4 w-4 shrink-0 text-slate-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M4 6h16M7 12h10m-7 6h4" />
                </svg>

                <select
                  aria-label="Filter service requests by status"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-medium text-slate-700 outline-none sm:w-40"
                >
                  {FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="max-h-[480px] overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">Request</th>
                    <th className="whitespace-nowrap px-4 py-3">Category</th>
                    <th className="whitespace-nowrap px-4 py-3">Customer</th>
                    <th className="whitespace-nowrap px-4 py-3">Technician</th>
                    <th className="whitespace-nowrap px-4 py-3">Status</th>
                    <th className="whitespace-nowrap px-4 py-3">Priority</th>
                    <th className="whitespace-nowrap px-4 py-3">ETA</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      className="transition hover:bg-blue-50/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800 sm:px-5">
                        #{r.id}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="mr-1.5">{r.category_icon}</span>
                        {r.category_label}
                      </td>

                      <td className="max-w-[160px] truncate px-4 py-3 font-medium">
                        {r.customer_name}
                      </td>

                      <td className="max-w-[160px] truncate px-4 py-3">
                        {r.technician_name || (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-xs ${statusBadge(
                            r.status
                          )}`}
                        >
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-xs ${priorityBadge(
                            r.priority
                          )}`}
                        >
                          {r.priority}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">
                        {fmtDuration(r.eta_seconds)}
                      </td>
                    </tr>
                  ))}

                  {!requests.length && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                          📋
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No service requests found
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Try selecting another status filter.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span>{requests.length} request(s) displayed</span>
              <span>Updates based on selected status</span>
            </div>
          </section>

          {/* Live feed */}
          <section className={`${panel} min-w-0`}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div>
                <h3 className={sectionTitle}>Live dispatch feed</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Recent system events
                </p>
              </div>

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              </span>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto p-4 sm:p-5">
              {!feed.length && (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                    📡
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Waiting for events
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Dispatch and technician updates will appear here.
                  </p>
                </div>
              )}

              {feed.map((f, i) => (
                <div
                  key={`${f.at}-${i}`}
                  className={`rounded-xl border p-3 ${
                    f.type === 'success'
                      ? 'border-emerald-100 bg-emerald-50/70'
                      : f.type === 'warn'
                      ? 'border-amber-100 bg-amber-50/70'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        f.type === 'success'
                          ? 'bg-emerald-500'
                          : f.type === 'warn'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-xs font-medium leading-5 text-slate-700">
                        {f.msg}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {f.at}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Technician map and analytics */}
        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">

          {/* Map */}
          <section className={`${panel} min-w-0 overflow-hidden xl:col-span-2`}>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className={sectionTitle}>Technician locations</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Live technician positions and availability.
                </p>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-2 text-[11px] font-medium text-slate-600 sm:text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
                  Available
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  On job
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  Offline
                </span>
              </div>
            </div>

            <div className="relative h-[280px] sm:h-[360px] lg:h-[420px]">
              <MapContainer
                center={[20.296, 85.824]}
                zoom={12}
                scrollWheelZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap"
                />

                {validTechnicians.map((t) => (
                  <Marker
                    key={t.id}
                    position={[
                      Number(t.current_lat),
                      Number(t.current_lng),
                    ]}
                    icon={iconFor(t.availability_status)}
                  >
                    <Popup>
                      <div className="min-w-[160px]">
                        <p className="font-semibold">{t.name}</p>
                        <p>
                          {t.skill_category} ·{' '}
                          {AVAIL_LABEL[t.availability_status] ||
                            t.availability_status}
                        </p>
                        <p>
                          ⭐ {Number(t.rating).toFixed(1)} ·{' '}
                          {t.jobs_completed} jobs
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              <div className="absolute bottom-3 left-3 z-[400] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
                {validTechnicians.length} mapped technician(s)
              </div>
            </div>
          </section>

          {/* Analytics */}
          <section className={`${panel} min-w-0 overflow-hidden`}>
            <div className="border-b border-slate-100 p-4 sm:p-5">
              <h3 className={sectionTitle}>Service analytics</h3>
              <p className="mt-1 text-xs text-slate-500">
                Performance and utilization overview.
              </p>
            </div>

            {analytics ? (
              <div className="space-y-6 p-4 sm:p-5">
                {/* Analytics KPIs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-xl font-bold text-emerald-700 sm:text-2xl">
                      {analytics.kpi.completion_rate_pct ?? 0}%
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-emerald-700/80">
                      Completion rate
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                    <p className="text-xl font-bold text-blue-700 sm:text-2xl">
                      {analytics.kpi.dispatch_accuracy_pct ?? 0}%
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-blue-700/80">
                      Dispatch accuracy
                    </p>
                  </div>

                  <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                    <p className="text-xl font-bold text-violet-700 sm:text-2xl">
                      {analytics.kpi.avg_response_sec ?? '—'}
                      <span className="ml-1 text-xs font-medium">s</span>
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-violet-700/80">
                      Average response
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                    <p className="text-xl font-bold text-amber-700 sm:text-2xl">
                      {analytics.kpi.avg_rating ?? '—'}
                      <span className="ml-1 text-base">★</span>
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-amber-700/80">
                      Average rating
                    </p>
                  </div>
                </div>

                {/* Requests by category */}
                <div>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Requests by category
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Distribution
                    </span>
                  </div>

                  {categories.length ? (
                    <div className="space-y-4">
                      {categories.map((c) => {
                        const count = Number(c.request_count) || 0;
                        const width = Math.min(
                          100,
                          (count / maxCategoryRequests) * 100
                        );

                        return (
                          <div key={c.label}>
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate text-xs font-medium text-slate-600">
                                {c.label}
                              </span>
                              <span className="shrink-0 text-xs font-bold text-slate-800">
                                {count}
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No category data available.
                    </p>
                  )}
                </div>

                {/* Technician utilization */}
                <div>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                    Technician utilization
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-emerald-50 p-3 text-center">
                      <p className="text-xl font-bold text-emerald-700">
                        {available}
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-emerald-700">
                        Available
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-3 text-center">
                      <p className="text-xl font-bold text-amber-700">
                        {onJob}
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-amber-700">
                        On job
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 p-3 text-center">
                      <p className="text-xl font-bold text-slate-700">
                        {offline}
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-slate-500">
                        Offline
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 rounded-xl bg-slate-100" />
                  <div className="h-20 rounded-xl bg-slate-100" />
                  <div className="h-20 rounded-xl bg-slate-100" />
                  <div className="h-20 rounded-xl bg-slate-100" />
                </div>
                <div className="h-4 w-36 rounded bg-slate-100" />
                <div className="h-3 rounded bg-slate-100" />
                <div className="h-3 w-3/4 rounded bg-slate-100" />
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}
