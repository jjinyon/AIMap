const WALKING_SPEED_METERS_PER_SECOND = 1.25;

export async function findRoute(start, destination, waypoints = []) {
  if (!start || !destination) return null;

  if (waypoints.length) return findSegmentedRoute(start, destination, waypoints);

  return requestRoute(start, destination);
}

async function requestRoute(start, destination, waypoints = []) {
  const startLng = Number(start.lng);
  const startLat = Number(start.lat);
  const endLng = Number(destination.lng);
  const endLat = Number(destination.lat);

  // Build waypoints query string (lat,lng|lat,lng|...)
  const waypointsQuery = waypoints
    .filter(wp => Number.isFinite(wp.lat) && Number.isFinite(wp.lng))
    .map(wp => `${Number(wp.lat)},${Number(wp.lng)}`)
    .join("|");

  const params = new URLSearchParams({
    origin: `${startLat},${startLng}`,
    destination: `${endLat},${endLng}`,
    mode: "walking",
  });
  
  if (waypointsQuery) {
    params.set("waypoints", waypointsQuery);
  }

  const response = await fetch(
    `/api/directions?${params.toString()}`,
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error("경로를 찾지 못했습니다.");

  const payload = await response.json();
  const route = payload.route;
  if (!route) throw new Error(payload.message || "경로를 찾지 못했습니다.");
  const points = Array.isArray(route.points) ? route.points : [];
  if (points.length < 2) throw new Error("경로를 찾지 못했습니다.");

  return {
    distance: route.distance,
    duration: route.duration || getWalkingDurationSeconds(route.distance),
    points,
  };
}

async function findSegmentedRoute(start, destination, waypoints = []) {
  const stops = [start, ...waypoints.filter(hasCoordinate), destination].filter(hasCoordinate);
  if (stops.length < 2) throw new Error("Route coordinates are invalid.");

  const points = [];
  let distance = 0;
  let duration = 0;

  for (let index = 0; index < stops.length - 1; index += 1) {
    const from = stops[index];
    const to = stops[index + 1];

    const segment = await requestRoute(from, to);
    appendSegmentPoints(points, segment.points);
    distance += Number(segment.distance || 0);
    duration += Number(segment.duration || 0);
  }

  if (points.length < 2) throw new Error("경로를 찾지 못했습니다.");

  return {
    distance,
    duration,
    points,
    segmented: true,
  };
}

function appendSegmentPoints(target, segmentPoints = []) {
  segmentPoints.forEach((point, index) => {
    if (index === 0 && target.length && isSamePoint(target[target.length - 1], point)) return;
    target.push(point);
  });
}

function hasCoordinate(item = {}) {
  return Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng));
}

function isSamePoint(a = [], b = []) {
  return Number(a[0]) === Number(b[0]) && Number(a[1]) === Number(b[1]);
}

export function formatRouteSummary(route) {
  if (!route) return "";

  const distance =
    route.distance >= 1000
      ? `${(route.distance / 1000).toFixed(1)}km`
      : `${Math.round(route.distance)}m`;
  const minutes = Math.max(1, Math.round(route.duration / 60));

  return `도보 ${distance}, 약 ${minutes}분`;
}

function getWalkingDurationSeconds(distanceMeters) {
  return Math.max(60, Number(distanceMeters || 0) / WALKING_SPEED_METERS_PER_SECOND);
}
