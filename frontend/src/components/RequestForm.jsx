import { useState } from 'react';
import api from '../api';
import { toast } from '../ui';

const DEFAULT_POS = { lat: 20.301, lng: 85.795 };

export default function RequestForm({ categories, onCreated }) {
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [priority, setPriority] = useState('emergency');
  const [pos, setPos] = useState(DEFAULT_POS);
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const locateMe = () => {
    if (!navigator.geolocation) { toast('Geolocation not supported', 'error'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }); toast('Location set from GPS', 'success'); },
      () => toast('Could not get GPS — using manual entry', 'error')
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!categoryId) { toast('Please select a service category', 'error'); return; }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('categoryId', categoryId);
      form.append('latitude', pos.lat);
      form.append('longitude', pos.lng);
      form.append('title', title);
      form.append('description', description);
      form.append('address', address);
      form.append('priority', priority);
      if (image) form.append('image', image);
      const res = await api.postForm('/customer/requests', form);
      toast(`Request #${res.request.id} raised — dispatching now`, 'success');
      setTitle(''); setDescription(''); setAddress(''); setImage(null);
      onCreated();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-fit">
      <h2 className="font-semibold text-slate-800 mb-4">🚨 Raise Emergency Request</h2>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">Service Category *</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Burst water pipe" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Describe the issue…" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="House / street / locality" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Latitude</label>
            <input type="number" step="any" value={pos.lat} onChange={(e) => setPos({ ...pos, lat: +e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Longitude</label>
            <input type="number" step="any" value={pos.lng} onChange={(e) => setPos({ ...pos, lng: +e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <button type="button" onClick={locateMe} className="w-full rounded-lg border border-blue-200 text-blue-600 text-sm font-medium py-2 hover:bg-blue-50">📍 Use my GPS location</button>
        <div>
          <label className="text-xs font-semibold text-slate-500">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="emergency">🚨 Emergency</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">Photo (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])}
            className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-600" />
        </div>
        <button type="submit" disabled={submitting}
          className="w-full rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 text-sm disabled:opacity-60">
          {submitting ? 'Dispatching…' : '🚨 Request Emergency Service'}
        </button>
      </form>
    </div>
  );
}