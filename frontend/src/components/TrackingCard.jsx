import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { statusBadge, priorityBadge, fmtDuration, fmtKm, STATUS_LABEL } from '../ui';

const techIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});
const homeIcon = new L.DivIcon({
  className: '',
  html: '<div style="background:#2563eb;border-radius:50% 50% 50% 0;width:22px;height:22px;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
  iconSize: [22, 22], iconAnchor: [11, 22],
});

const STEPS = ['assigned', 'on_the_way', 'in_progress', 'completed'];
const STEP_LABEL = ['Assigned', 'En route', 'Working', 'Done'];

export default function TrackingCard({ request }) {
  const pos = { lat: Number(request.latitude), lng: Number(request.longitude) };
  const techPos = (request.live && request.live.technicianLat != null)
    ? { lat: request.live.technicianLat, lng: request.live.technicianLng }
    : (request.technician_lat != null ? { lat: Number(request.technician_lat), lng: Number(request.technician_lng) } : null);
  const idx = STEPS.indexOf(request.status);
  const live = request.live;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">🛰️ Live Tracking — Request #{request.id}</h2>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(request.status)}`}>{STATUS_LABEL[request.status]}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="h-72">
          <MapContainer center={[pos.lat, pos.lng]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <Marker position={[pos.lat, pos.lng]} icon={homeIcon}><Popup>Your location</Popup></Marker>
            {techPos && (
              <Marker position={[techPos.lat, techPos.lng]} icon={techIcon}>
                <Popup>Technician: {request.technician_name}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Technician</span><span className="font-semibold">{request.technician_name || 'Assigning…'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">ETA</span>
            <span className="font-semibold text-blue-600">{live ? fmtDuration(live.etaSeconds) : fmtDuration(request.eta_seconds)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Distance remaining</span>
            <span>{live ? fmtKm(live.remainingDistanceKm) : fmtKm(request.distance_km)}</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-500">Priority</span>
            <span className={`px-2 rounded-full text-xs font-semibold ${priorityBadge(request.priority)}`}>{request.priority}</span></div>
          <div className="pt-3">
            <div className="text-xs font-semibold text-slate-400 mb-2">JOURNEY</div>
            <div className="flex gap-1 text-xs">
              {STEPS.map((s, i) => (
                <div key={s} className={`flex-1 rounded px-1 py-1.5 text-center ${i <= idx ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {STEP_LABEL[i]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}