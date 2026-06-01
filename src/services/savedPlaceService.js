const SAVED_PLACES_STORAGE_KEY = "ai-place-app.savedPlaces.v1";

export function loadSavedPlaces() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_PLACES_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeSavedPlace).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function savePlace(place) {
  const normalizedPlace = normalizeSavedPlace(place);
  if (!normalizedPlace) return loadSavedPlaces();

  const places = loadSavedPlaces();
  const nextPlaces = [
    normalizedPlace,
    ...places.filter((savedPlace) => getSavedPlaceKey(savedPlace) !== getSavedPlaceKey(normalizedPlace)),
  ];
  persistSavedPlaces(nextPlaces);
  return nextPlaces;
}

export function removeSavedPlace(placeOrId) {
  const targetKey =
    typeof placeOrId === "string" ? placeOrId : getSavedPlaceKey(normalizeSavedPlace(placeOrId) || placeOrId);
  const nextPlaces = loadSavedPlaces().filter((place) => getSavedPlaceKey(place) !== targetKey);
  persistSavedPlaces(nextPlaces);
  return nextPlaces;
}

export function isPlaceSaved(place, savedPlaces = loadSavedPlaces()) {
  const key = getSavedPlaceKey(normalizeSavedPlace(place) || place);
  return Boolean(key && savedPlaces.some((savedPlace) => getSavedPlaceKey(savedPlace) === key));
}

export function toggleSavedPlace(place, savedPlaces = loadSavedPlaces()) {
  return isPlaceSaved(place, savedPlaces) ? removeSavedPlace(place) : savePlace(place);
}

function persistSavedPlaces(places) {
  window.localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(places));
}

function normalizeSavedPlace(place = {}) {
  const id = place.kakaoPlaceId || place.id;
  const name = place.name || place.place_name;
  const lat = Number(place.lat ?? place.y);
  const lng = Number(place.lng ?? place.x);

  if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: String(id),
    kakaoPlaceId: String(place.kakaoPlaceId || place.id || id),
    name,
    address: place.address || place.road_address_name || place.address_name || "",
    lat,
    lng,
    type: place.type || place.categoryName || place.category_group_name || place.categoryPath || "장소",
    category: place.category || place.categoryCode || place.category_group_code || "",
    categoryName: place.categoryName || place.category_group_name || "",
    categoryPath: place.categoryPath || place.category_name || "",
    distance: Number(place.distance || 0),
    phone: place.phone || "",
    url: place.url || place.place_url || "",
    savedAt: place.savedAt || new Date().toISOString(),
  };
}

function getSavedPlaceKey(place = {}) {
  return String(place.kakaoPlaceId || place.id || "");
}
