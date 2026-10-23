
import { useEffect, useState } from 'react';
import Layout from '../Layout';
import api from '../api';
import {
  toast,
  statusBadge,
  priorityBadge,
  fmtTime,
  STATUS_LABEL,
  PRIORITY_LABEL,
} from '../ui';
import Sidebar from '../components/Sidebar';

export default function PastRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      let data = [];

      try {
        data = await api.get('/customer/requests');
      } catch {
        data = await api.get('/technician/jobs/history');
      }

      setRecords(Array.isArray(data) ? data : []);
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

  const filteredRecords = records.filter((r) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      String(r.id ?? '').toLowerCase().includes(query) ||
      String(r.title || '').toLowerCase().includes(query) ||
      String(r.category_label || '').toLowerCase().includes(query) ||
      String(r.skill_category || '').toLowerCase().includes(query) ||
      String(r.technician_name || '').toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const completedCount = records.filter(
    (r) => r.status === 'completed'
  ).length;

  const activeCount = records.filter((r) =>
    ['assigned', 'on_the_way', 'in_progress'].includes(r.status)
  ).length;

  const cancelledCount = records.filter(
    (r) => r.status === 'cancelled'
  ).length;

  const ratedRecords = records.filter(
    (r) => Number(r.feedback_rating) > 0
  );

  const averageRating = ratedRecords.length
    ? (
        ratedRecords.reduce(
          (sum, r) => sum + Number(r.feedback_rating),
          0
        ) / ratedRecords.length
      ).toFixed(1)
    : null;

  const panel =
    'min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm';

  const stats = [
    {
      label: 'Total Records',
      value: records.length,
      icon: '📋',
      color: 'blue',
    },
    {
      label: 'Completed',
      value: completedCount,
      icon: '✓',
      color: 'emerald',
    },
    {
      label: 'Active Requests',
      value: activeCount,
      icon: '⚡',
      color: 'violet',
    },
    {
      label: 'Cancelled',
      value: cancelledCount,
      icon: '↗',
      color: 'amber',
    },
  ];

  const statColors = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  };

  return (
    <Layout
      title="Past Records"
      subtitle="View and manage your service request history"
    >
      <div className="min-w-0 space-y-5 pb-8 sm:space-y-6">

        {/* Page banner */}
        <section className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 p-5 text-white shadow-lg shadow-blue-900/10 sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full border-[30px] border-white/10 sm:h-80 sm:w-80" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Service history
              </div>

              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Your past records
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
                Keep track of your service requests, check their status,
                and review your previous bookings in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing || loading}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <svg
                className={`h-4 w-4 ${
                  refreshing ? 'animate-spin' : ''
                }`}
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

              {refreshing ? 'Refreshing...' : 'Refresh records'}
            </button>
          </div>
        </section>

        {/* Sidebar */}
        <section className={`${panel} overflow-hidden p-2`}>
          <Sidebar />
        </section>

        {/* Statistics */}
        <section
          aria-label="Service history statistics"
          className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${panel} p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
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

              <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {loading ? '—' : stat.value}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-600">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        {/* Rating summary */}
        {!loading && averageRating !== null && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-xl">
                ⭐
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Your service ratings
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Average rating across rated service requests
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-2 sm:justify-end">
              <span className="text-2xl font-bold text-amber-600">
                {averageRating}
              </span>
              <span className="text-xs text-slate-500">
                / 5 · {ratedRecords.length} rated
              </span>
            </div>
          </div>
        )}

        {/* Records panel */}
        <section className={`${panel} overflow-hidden`}>
          <div className="border-b border-slate-100 p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-800">
                  Service history
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                  Search your bookings and filter by status.
                </p>
              </div>

              <span className="inline-flex w-fit items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {loading
                  ? 'Loading records...'
                  : `${filteredRecords.length} of ${records.length} records`}
              </span>
            </div>

            {/* Search and filters */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="relative min-w-0">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>

                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, category, technician..."
                  aria-label="Search service records"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter records by status"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="on_the_way">On the way</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="space-y-3 p-4 sm:p-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-xl border border-slate-100 p-4"
                >
                  <div className="h-4 w-1/3 rounded bg-slate-100" />
                  <div className="mt-3 h-3 w-2/3 rounded bg-slate-100" />
                  <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="px-5 py-14 text-center sm:py-16">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                {records.length ? '🔎' : '📜'}
              </div>

              <h3 className="mt-5 text-base font-bold text-slate-800 sm:text-lg">
                {records.length
                  ? 'No matching records'
                  : 'No past records found'}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {records.length
                  ? 'Try a different search term or status filter.'
                  : "Your service history will appear here when you have requests."}
              </p>

              {(search || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                  className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 p-3 sm:p-4 lg:hidden">
                {filteredRecords.map((r) => (
                  <article
                    key={r.id}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-400">
                          REQUEST #{r.id}
                        </p>

                        <h4 className="mt-1 break-words text-sm font-bold text-slate-800">
                          {r.title ||
                            r.category_label ||
                            'Service Request'}
                        </h4>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          statusBadge(r.status)
                        }`}
                      >
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Category
                        </p>
                        <p className="mt-1 break-words text-xs font-medium text-slate-700">
                          {r.category_label || r.skill_category || '—'}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Priority
                        </p>
                        <p className="mt-1">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              priorityBadge(r.priority)
                            }`}
                          >
                            {PRIORITY_LABEL[r.priority] || r.priority || '—'}
                          </span>
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Date
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-700">
                          {fmtTime(r.requested_at || r.requestedAt)}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Technician
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-700">
                          {r.technician_name || 'Not assigned'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs text-slate-500">
                        Customer rating
                      </span>

                      <span className="text-xs font-semibold text-slate-700">
                        {r.feedback_rating
                          ? `⭐ ${r.feedback_rating}/5`
                          : 'Not rated'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop/tablet table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      {[
                        '#',
                        'Service',
                        'Category',
                        'Status',
                        'Priority',
                        'Date',
                        'Technician',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400"
                        >
                          {heading}
                        </th>
                      ))}

                      <th className="whitespace-nowrap px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Rating
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((r) => (
                      <tr
                        key={r.id}
                        className="transition hover:bg-blue-50/40"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">
                          #{r.id}
                        </td>

                        <td className="max-w-[200px] px-5 py-4 font-semibold text-slate-800">
                          <span className="block truncate">
                            {r.title ||
                              r.category_label ||
                              'Service Request'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {r.category_label || r.skill_category || '—'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              statusBadge(r.status)
                            }`}
                          >
                            {STATUS_LABEL[r.status] || r.status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              priorityBadge(r.priority)
                            }`}
                          >
                            {PRIORITY_LABEL[r.priority] || r.priority || '—'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {fmtTime(r.requested_at || r.requestedAt)}
                        </td>

                        <td className="max-w-[160px] truncate px-5 py-4 text-slate-600">
                          {r.technician_name || '—'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-slate-600">
                          {r.feedback_rating
                            ? `⭐ ${r.feedback_rating}/5`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Footer */}
          {!loading && filteredRecords.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span>
                Showing {filteredRecords.length} of {records.length} records
              </span>
              <span>DispatchHub service history</span>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
