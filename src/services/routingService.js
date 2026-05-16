export async function findRoute(start, destination) {
  if (!start || !destination) return null;

  const startLng = Number(start.lng);
  const startLat = Number(start.lat);
  const endLng = Number(destination.lng);
  const endLat = Number(destination.lat);

  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });

  const response = await fetch(
    `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?${params.toString()}`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error("경로를 찾지 못했습니다.");
  }

  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) {
    throw new Error("경로를 찾지 못했습니다.");
  }

  return {
    distance: route.distance,
    duration: route.duration,
    points: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

export function formatRouteSummary(route) {
  if (!route) return "";

  const distance =
    route.distance >= 1000
      ? `${(route.distance / 1000).toFixed(1)}km`
      : `${Math.round(route.distance)}m`;
  const minutes = Math.max(1, Math.round(route.duration / 60));

  return `목적지까지 ${distance}, 약 ${minutes}분`;
}
