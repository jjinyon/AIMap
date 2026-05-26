const DEFAULT_BATCH_SIZE = 10;

export async function fetchGoogleReviewMetricsForPlaces(places, options = {}) {
  const limitedPlaces = places
    .filter((place) => place?.id && place?.name)
    .slice(0, options.limit || DEFAULT_BATCH_SIZE)
    .map((place) => ({
      placeId: place.id,
      kakaoPlaceId: place.kakaoPlaceId || place.id,
      name: place.name,
      address: place.address || place.road_address_name || place.address_name || "",
      lat: place.lat,
      lng: place.lng,
    }));

  if (!limitedPlaces.length) return {};

  const response = await fetch(options.endpoint || "/api/google-places/review-metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ places: limitedPlaces }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Failed to load Google Places review metrics.");
  }

  return payload.metricsByKakaoPlaceId || {};
}
