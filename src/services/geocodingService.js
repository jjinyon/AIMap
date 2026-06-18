import { isNearKyunghee, kyungheeMockPlaces } from "../data/kyungheeReviewMockData.js";

export async function searchPlaces(query, location) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  await waitForKakaoMaps();

  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places();
    const options = {
      size: 15,
      sort: kakao.maps.services.SortBy.ACCURACY,
    };

    if (location?.lat && location?.lng) {
      options.location = new kakao.maps.LatLng(location.lat, location.lng);
    }

    places.keywordSearch(
      trimmedQuery,
      (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve(data.map(normalizeKakaoPlace));
          return;
        }

        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }

        reject(new Error("장소 검색에 실패했습니다."));
      },
      options
    );
  });
}

const nearbyCategoryCodes = ["FD6", "CE7", "AT4", "CT1"];

export async function fetchNearbyReviewPlaces(location) {
  if (!location?.lat || !location?.lng) return [];

  const kyungheePlaces = isNearKyunghee(location) ? makeKyungheePlacesForLocation(location) : [];

  try {
    await waitForKakaoMaps();
  } catch (error) {
    if (kyungheePlaces.length) return kyungheePlaces;
    throw error;
  }

  const results = await Promise.all(
    nearbyCategoryCodes.map((code) => searchNearbyCategory(code, location).catch(() => []))
  );

  return sortNearbyPlaces(dedupePlaces([...kyungheePlaces, ...results.flat()]))
    .slice(0, 10)
    .map((place, index) => ({
      ...place,
      kakaoPlaceId: place.id,
      id: place.id?.startsWith("kyunghee-place-") ? place.id : `nearby-review-${place.id || index}`,
      ratingLabel: place.distance ? `${place.distance}m` : "주변",
      summary: makePlaceSummary(place),
      aiReason: makePlaceReason(place),
      reviewText: makePlaceDescription(place),
      description: makePlaceDescription(place),
    }));
}

function makeKyungheePlacesForLocation(location) {
  return kyungheeMockPlaces.map((place) => ({
    ...place,
    distance: Math.round(getDistanceKm(location, place) * 1000),
  }));
}

function searchNearbyCategory(categoryCode, location) {
  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places();

    places.categorySearch(
      categoryCode,
      (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve(data.map(normalizeKakaoPlace));
          return;
        }

        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }

        reject(new Error("Failed to load nearby places."));
      },
      {
        location: new kakao.maps.LatLng(location.lat, location.lng),
        radius: 1200,
        size: 8,
        sort: kakao.maps.services.SortBy.DISTANCE,
      }
    );
  });
}

function normalizeKakaoPlace(place) {
  return {
    id: place.id,
    name: place.place_name || "검색 결과",
    address: place.road_address_name || place.address_name || "",
    lat: Number(place.y),
    lng: Number(place.x),
    type: place.category_group_name || place.category_name || "장소",
    category: place.category_group_code || "",
    categoryName: place.category_group_name || "",
    categoryPath: place.category_name || "",
    distance: Number(place.distance || 0),
    phone: place.phone || "",
    url: place.place_url || "",
  };
}

function dedupePlaces(places) {
  const seen = new Set();

  return places.filter((place) => {
    const key = place.id || `${place.name}-${place.address}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function sortNearbyPlaces(places) {
  return [...places].sort((a, b) => {
    const distanceDiff = Number(a.distance || 0) - Number(b.distance || 0);
    if (distanceDiff !== 0) return distanceDiff;

    return String(a.name).localeCompare(String(b.name), "ko-KR");
  });
}

function makePlaceSummary(place) {
  const distance = place.distance ? `${place.distance}m` : "가까운 거리";
  return `${place.type || "장소"} · 현재 위치에서 약 ${distance}`;
}

function makePlaceReason(place) {
  return place.address || "현재 위치 주변에서 찾은 실제 장소입니다.";
}

function makePlaceDescription(place) {
  const parts = [
    place.type ? `${place.type} 카테고리의 실제 주변 장소입니다.` : "현재 위치 주변의 실제 장소입니다.",
    place.address ? `주소: ${place.address}` : "",
    place.distance ? `현재 위치에서 약 ${place.distance}m 떨어져 있습니다.` : "",
    place.phone ? `전화: ${place.phone}` : "",
  ].filter(Boolean);

  return parts.join(" ");
}

function getDistanceKm(a, b) {
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

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function waitForKakaoMaps() {
  if (window.kakao?.maps?.services) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (window.kakao?.maps?.services) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt > 8000) {
        clearInterval(timer);
        reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
      }
    }, 80);
  });
}
