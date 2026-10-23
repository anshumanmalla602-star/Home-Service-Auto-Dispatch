/**
 * Geo helpers: great-circle distance (haversine) and driving-time estimates
 * used by the auto-dispatch routing logic.
 */

const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Travelling-distance estimate: 1.28x straight-line is a common road-network
 * approximation (circuity factor), then converted to seconds using avg speed.
 */
function estimateDriveKm(lat1, lng1, lat2, lng2) {
  return haversineKm(lat1, lng1, lat2, lng2) * 1.28;
}

/**
 * Estimated travel time in seconds given an average vehicle speed (km/h).
 */
function travelTimeSeconds(distanceKm, avgSpeedKmh) {
  if (!avgSpeedKmh || avgSpeedKmh <= 0) avgSpeedKmh = 30;
  return Math.round((distanceKm / avgSpeedKmh) * 3600);
}

/**
 * Human readable duration from seconds, e.g. "12 min".
 */
function formatDuration(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * Human readable distance, e.g. "3.4 km".
 */
function formatDistance(km) {
  if (km == null) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

module.exports = {
  EARTH_RADIUS_KM,
  haversineKm,
  estimateDriveKm,
  travelTimeSeconds,
  formatDuration,
  formatDistance,
};