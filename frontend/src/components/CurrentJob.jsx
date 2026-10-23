import { useState } from 'react';
import api from '../api';
import { toast, statusBadge, priorityBadge, fmtDuration, fmtKm, STATUS_LABEL } from '../ui';

export default function CurrentJob({ job, onAction }) {
  const [busy, setBusy] = useState(false);

  const act = async (action, label) => {
    setBusy(true);
    try {
      await api.post(`/technician/jobs/${job.id}/${action}`);
      toast(`${label} — status updated`, 'success');
      onAction();
    } catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-800">Request #{job.id}</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(job.status)}`}>{STATUS_LABEL[job.status]}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${priorityBadge(job.priority)}`}>{job.priority}</span>
          </div>
          <p className="text-sm text-slate-600 mt-1">{job.title || job.category_label}</p>
          <p className="text-xs text-slate-400 mt-1">{job.description || job.category_label}</p>
          <p className="text-xs text-slate-400 mt-1">📍 {job.address || 'Customer location on map'}</p>
          <p className="text-xs text-slate-400 mt-1">
            ETA <b>{fmtDuration(job.eta_seconds)}</b> · {fmtKm(job.distance_km)} · Lat {Number(job.latitude).toFixed(4)}, Lng {Number(job.longitude).toFixed(4)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {job.status === 'assigned' && (
          <>
            <button onClick={() => act('accept', 'Job accepted')} disabled={busy}
              className="rounded-lg bg-green-600 hover:bg-green-700 text-white px-5 py-2 text-sm font-semibold disabled:opacity-60">
              ✓ Accept Job
            </button>
            <button onClick={() => act('decline', 'Job declined')} disabled={busy}
              className="rounded-lg border border-red-200 text-red-600 px-5 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-60">
              ✕ Decline
            </button>
          </>
        )}
        {job.status === 'on_the_way' && (
          <button onClick={() => act('start', 'Work started')} disabled={busy}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-sm font-semibold disabled:opacity-60">
            ▶ Arrived — Start Work
          </button>
        )}
        {job.status === 'in_progress' && (
          <button onClick={() => act('complete', 'Job completed')} disabled={busy}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-sm font-semibold disabled:opacity-60">
            ✅ Complete Job
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex gap-1 text-xs">
          {['assigned', 'on_the_way', 'in_progress', 'completed'].map((s, i) => {
            const idx = ['assigned', 'on_the_way', 'in_progress', 'completed'].indexOf(job.status);
            return (
              <div key={s} className={`flex-1 rounded px-1 py-1.5 text-center ${i <= idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {['Assigned', 'En route', 'Working', 'Done'][i]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}