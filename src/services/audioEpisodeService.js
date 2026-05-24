import { currentLocationAudioEpisodes } from "../data/audioEpisodeData.js";

const DEFAULT_RADIUS_KM = 3;
const KAKAO_MATCH_BOOST = 0.35;

export function getEpisodesNearLocation(location, kakaoPlaces = [], options = {}) {
  if (!location?.lat || !location?.lng) return [];

  const radiusScale = Number(options.radiusScale || 1);
  const scoredEpisodes = currentLocationAudioEpisodes
    .map((episode) => scoreEpisodeForLocation(episode, location, kakaoPlaces, radiusScale))
    .filter((episode) => episode.isNearby)
    .sort((a, b) => {
      if (b.locationScore !== a.locationScore) return b.locationScore - a.locationScore;
      return a.distanceKm - b.distanceKm;
    });

  return scoredEpisodes;
}

export function scoreEpisodeForLocation(episode, location, kakaoPlaces = [], radiusScale = 1) {
  const distanceKm = getDistanceKm(location, episode.coordinates);
  const radiusKm = (episode.radiusKm || DEFAULT_RADIUS_KM) * radiusScale;
  const distanceScore = Math.max(0, 1 - distanceKm / radiusKm);
  const kakaoScore = hasMatchingKakaoPlace(episode, kakaoPlaces) ? KAKAO_MATCH_BOOST : 0;
  const isNearby = distanceKm <= radiusKm || kakaoScore > 0;

  return {
    ...episode,
    distanceKm: round(distanceKm),
    locationScore: round(distanceScore + kakaoScore),
    isNearby,
  };
}

export function hasMatchingKakaoPlace(episode, kakaoPlaces = []) {
  const keywords = (episode.matchKeywords || []).map(normalizeText).filter(Boolean);
  if (keywords.length === 0) return false;

  return kakaoPlaces.some((place) => {
    const searchable = normalizeText(
      [place.name, place.address, place.type, place.category].filter(Boolean).join(" ")
    );

    return keywords.some((keyword) => searchable.includes(keyword));
  });
}

export function getDistanceKm(a, b) {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return Number.POSITIVE_INFINITY;

  const earthRadiusKm = 6371;
  const dLat = toRadians(Number(b.lat) - Number(a.lat));
  const dLng = toRadians(Number(b.lng) - Number(a.lng));
  const lat1 = toRadians(Number(a.lat));
  const lat2 = toRadians(Number(b.lat));
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function normalizeText(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
