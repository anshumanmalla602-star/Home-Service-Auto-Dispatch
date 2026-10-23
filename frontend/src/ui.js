// Shared small UI helpers used across portals.

export const STATUS_LABEL = {
  pending: 'Pending', assigned: 'Assigned', on_the_way: 'On the Way',
  in_progress: 'In Progress', completed: 'Completed',
  cancelled: 'Cancelled', reassigned: 'Reassigning',
};
export const PRIORITY_LABEL = { emergency: 'Emergency', high: 'High', normal: 'Normal', low: 'Low' };
export const AVAIL_LABEL = { online: 'Online', available: 'Available', on_job: 'On Job', offline: 'Offline' };

export function statusBadge(status) {
  const map = {
    pending: 'bg-amber-100 text-amber-800', assigned: 'bg-indigo-100 text-indigo-800',
    on_the_way: 'bg-blue-100 text-blue-800', in_progress: 'bg-violet-100 text-violet-800',
    completed: 'bg-green-100 text-green-800', cancelled: 'bg-slate-200 text-slate-600',
    reassigned: 'bg-rose-100 text-rose-800',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}
export function priorityBadge(priority) {
  const map = { emergency: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', normal: 'bg-blue-100 text-blue-700', low: 'bg-slate-200 text-slate-600' };
  return map[priority] || 'bg-slate-100 text-slate-600';
}
export function availBadge(status) {
  const map = { available: 'bg-green-100 text-green-700', online: 'bg-blue-100 text-blue-700', on_job: 'bg-amber-100 text-amber-800', offline: 'bg-slate-200 text-slate-600' };
  return map[status] || 'bg-slate-100 text-slate-600';
}

export function fmtDuration(sec) {
  if (sec == null) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
export function fmtKm(km) {
  if (km == null) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${Number(km).toFixed(1)} km`;
}
export function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Tiny toast (no external lib)
export function toast(message, type = 'info') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  const color = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  el.className = `${color} text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs animate-pulse`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}