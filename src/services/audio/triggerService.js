import { fetchNearbyReviewPlaces } from "../geocodingService.js";
import { recommendKakaoPlacesWithReviewData } from "../recommendation/index.js";
import { getAudioStoriesForPlaces } from "./audioGuideService.js";

export async function loadCurrentPlaceAudioStories(location, context = {}, options = {}) {
  if (!location?.lat || !location?.lng) return [];

  const kakaoPlaces = await fetchNearbyReviewPlaces(location).catch(() => []);
  if (!kakaoPlaces.length) {
    return getAudioStoriesForPlaces([makeCurrentLocationPlace(location)], { ...context, location }, { limit: 1 });
  }

  const recommendedPlaces = await recommendKakaoPlacesWithReviewData(
    kakaoPlaces,
    { ...context, userLocation: location },
    {
      limit: options.placeLimit || 5,
      metricsLimit: options.metricsLimit || 8,
      metrics: options.metrics,
    }
  ).catch(() => kakaoPlaces.slice(0, options.placeLimit || 5));

  const storyPlaces = buildStoryPlaces(location, recommendedPlaces.length ? recommendedPlaces : kakaoPlaces);
  return getAudioStoriesForPlaces(storyPlaces, { ...context, location }, { limit: options.storyLimit || 5 });
}

function buildStoryPlaces(location, places = []) {
  const knownArea = findKnownArea(location);
  const localPlaces = places
    .filter(isStoryWorthyPlace)
    .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
  const nearestPlace = places
    .filter((place) => place?.name)
    .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0))[0];

  return dedupePlaces([knownArea, ...localPlaces, nearestPlace, makeCurrentLocationPlace(location)].filter(Boolean));
}

function makeCurrentLocationPlace(location) {
  const knownArea = findKnownArea(location);
  if (knownArea) return knownArea;

  const label = String(location.label || "").trim();
  const address = String(location.address || "").trim();
  const name = label && !isGenericLocationLabel(label) ? label : makeAreaTitle(address);

  return {
    id: `current-${location.lat}-${location.lng}`,
    name,
    address,
    categoryName: "지역 이야기",
    type: "지역 이야기",
    lat: location.lat,
    lng: location.lng,
  };
}

function isStoryWorthyPlace(place = {}) {
  const category = `${place.category || ""} ${place.categoryName || ""} ${place.categoryPath || ""} ${place.type || ""}`;
  const name = String(place.name || "");

  if (/대학교|대학|캠퍼스|공원|호수|미술관|박물관|도서관|문화|광장|시장|역사|전망|산책|관광/.test(`${name} ${category}`)) {
    return true;
  }

  return /AT4|CT1|PK6/.test(category);
}

function findKnownArea(location = {}) {
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const kyungHeeInternationalCampus = {
    id: "known-kyunghee-international-campus",
    name: "경희대학교 국제캠퍼스",
    address: "경기도 용인시 기흥구 덕영대로 1732",
    categoryName: "대학교 캠퍼스",
    type: "대학교 캠퍼스",
    lat: 37.2414,
    lng: 127.0811,
    distance: Math.round(getDistanceKm({ lat, lng }, { lat: 37.2414, lng: 127.0811 }) * 1000),
  };

  return kyungHeeInternationalCampus.distance <= 3000 ? kyungHeeInternationalCampus : null;
}

function dedupePlaces(places = []) {
  const seen = new Set();

  return places.filter((place) => {
    const key = place.id || `${place.name}-${place.address}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function isGenericLocationLabel(label = "") {
  return /^(현재\s*)?위치$|current location/i.test(label);
}

function makeAreaTitle(address = "") {
  const tokens = String(address)
    .split(/\s+/)
    .filter(Boolean);
  const neighborhood = [...tokens].reverse().find((token) => /동$|읍$|면$|가$|로$|길$/.test(token));
  const district = [...tokens].reverse().find((token) => /구$|시$|군$/.test(token));
  const area = neighborhood || district;

  return area ? `${area} 주변 이야기` : "내 주변 이야기";
}

function getDistanceKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
