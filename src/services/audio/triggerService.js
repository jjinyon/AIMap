import { fetchNearbyReviewPlaces } from "../geocodingService.js";
import { recommendKakaoPlacesWithReviewData } from "../recommendation/index.js";
import { getAudioEpisodesFromStoryCards } from "./audioBookService.js";

export async function loadCurrentPlaceAudioStories(location, context = {}, options = {}) {
  if (!location?.lat || !location?.lng) return [];

  const kakaoPlaces = await fetchNearbyReviewPlaces(location).catch(() => []);
  const enrichedLocation = enrichLocationWithNearbyPlaces(location, kakaoPlaces);
  const regionHints = makeRegionHints(enrichedLocation, kakaoPlaces);

  if (!kakaoPlaces.length) {
    return getAudioEpisodesFromStoryCards({
      location: enrichedLocation,
      context: { ...context, location: enrichedLocation, regionHints },
    });
  }

  const recommendedPlaces = await recommendKakaoPlacesWithReviewData(
    kakaoPlaces,
    { ...context, userLocation: enrichedLocation },
    {
      limit: options.placeLimit || 5,
      metricsLimit: options.metricsLimit || 8,
      metrics: options.metrics,
    }
  ).catch(() => kakaoPlaces.slice(0, options.placeLimit || 5));

  const storyPlaces = buildStoryPlaces(enrichedLocation, recommendedPlaces.length ? recommendedPlaces : kakaoPlaces);
  const selectedPlace = storyPlaces.find((place) => place?.name) || null;

  return getAudioEpisodesFromStoryCards({
    location: enrichedLocation,
    place: selectedPlace,
    context: { ...context, location: enrichedLocation, place: selectedPlace, regionHints },
  });
}

function enrichLocationWithNearbyPlaces(location = {}, places = []) {
  const nearestPlaceWithAddress = places
    .filter((place) => place?.address)
    .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0))[0];

  if (!nearestPlaceWithAddress) return location;

  return {
    ...location,
    address: location.address || nearestPlaceWithAddress.address,
    regionName: location.regionName || makeAreaTitle(nearestPlaceWithAddress.address),
  };
}

function makeRegionHints(location = {}, places = []) {
  const hints = [location.label, location.address, location.regionName];

  places.slice(0, 8).forEach((place) => {
    hints.push(place.name, place.address, place.categoryName, place.categoryPath, place.type);
  });

  return hints.filter(Boolean);
}

function buildStoryPlaces(location, places = []) {
  const knownArea = findKnownArea(location);
  const localPlaces = places
    .filter(isStoryWorthyPlace)
    .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0));
  const nearestPlace = places
    .filter((place) => place?.name)
    .sort((a, b) => Number(a.distance || 0) - Number(b.distance || 0))[0];

  return dedupePlaces([nearestPlace, ...localPlaces, knownArea, makeCurrentLocationPlace(location)].filter(Boolean));
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

  if (/대학|캠퍼스|공원|해수욕장|미술관|박물관|도서관|문화|광장|시장|역사|전망|산책|관광|궁|성|문|정|루|연|사|절|향교|서원|고택|유적/.test(`${name} ${category}`)) {
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
  const neighborhood = [...tokens].reverse().find((token) => /동$|읍$|면$|리$|가$/.test(token));
  const district = [...tokens].reverse().find((token) => /구$|군$|시$/.test(token));
  const area = neighborhood || district;

  return area ? `${area} 주변 이야기` : "현재 위치 주변 이야기";
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
