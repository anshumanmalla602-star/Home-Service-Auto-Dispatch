import { useState } from 'react';
import api from '../api';
import { toast, statusBadge, priorityBadge, fmtTime, STATUS_LABEL } from '../ui';

export default function RequestList({ requests, onChanged }) {
  if (!requests.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-sm text-slate-400">
        No service requests yet — raise your first emergency request.
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-800 mb-3">📋 My Requests</h2>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">{r.title || r.category_label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(r.status)}`}>{STATUS_LABEL[r.status]}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${priorityBadge(r.priority)}`}>{r.priority}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {r.category_label} · {fmtTime(r.requested_at)}
                {r.technician_name && <> · 👷 {r.technician_name}</>}
                {r.feedback_rating && <> · ⭐ {r.feedback_rating}/5</>}
              </div>
            </div>
            {r.status === 'completed' && !r.feedback_rating && <FeedbackButton id={r.id} onDone={onChanged} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedbackButton({ id, onDone }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const submit = async () => {
    try {
      await api.post(`/customer/requests/${id}/feedback`, { rating, comment });
      toast('Thank you for your feedback!', 'success');
      setOpen(false);
      onDone();
    } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="text-right shrink-0">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs rounded-lg border border-blue-200 text-blue-600 px-3 py-1.5 hover:bg-blue-50">Rate service</button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={`text-lg ${n <= rating ? 'text-amber-400' : 'text-slate-200'}`}>★</button>
            ))}
          </div>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)" className="w-40 rounded border border-slate-200 px-2 py-1 text-xs" />
          <div className="flex gap-2">
            <button onClick={submit} className="text-xs rounded bg-blue-600 text-white px-3 py-1">Submit</button>
            <button onClick={() => setOpen(false)} className="text-xs text-slate-400 px-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}