const CATEGORY_REVIEW_TEMPLATES = {
  food: [
    "동네 사람들이 식사 시간대에 자주 찾는 편이고, 회전이 빠른 점이 장점으로 언급됩니다.",
    "가볍게 한 끼 해결하기 좋다는 반응이 많고, 위치 접근성이 좋은 편입니다.",
  ],
  cafe: [
    "조용히 쉬어가기 좋고 주변 산책 동선과 이어서 방문하기 좋다는 이야기가 많습니다.",
    "좌석 분위기와 머무르기 편한 점이 자주 언급됩니다.",
  ],
  culture: [
    "지역의 분위기를 이해하기 좋은 장소로 언급되며, 주변 길과 함께 둘러보기 좋습니다.",
    "전시나 역사적 맥락보다 주변 동선과 함께 경험할 때 만족도가 높다는 반응이 있습니다.",
  ],
  park: [
    "가볍게 걷기 좋고 사진을 남기기 좋은 지점이 있다는 반응이 많습니다.",
    "주민들이 산책 동선으로 이용하기 좋은 장소로 언급됩니다.",
  ],
  local: [
    "관광지처럼 강한 목적지라기보다 동네 분위기를 느끼기 좋은 장소라는 반응이 있습니다.",
    "주변 골목이나 상권과 함께 보면 지역성이 더 잘 느껴진다는 이야기가 많습니다.",
  ],
};

export function generateLocalReviewsForPlace(place = {}, options = {}) {
  if (!isReviewablePlace(place)) return [];

  const category = normalizeCategory(place);
  const templates = CATEGORY_REVIEW_TEMPLATES[category] || CATEGORY_REVIEW_TEMPLATES.local;
  const placeName = place.name || place.place_name || "이 장소";
  const neighborhood = extractNeighborhood(place.address || place.road_address_name || place.address_name || "");
  const seed = hashString(`${place.id || placeName}-${place.address || ""}`);
  const count = options.count || 2 + (seed % 3);

  return Array.from({ length: count }, (_, index) => ({
    id: `generated-local-${place.id || seed}-${index}`,
    rating: 4 + ((seed + index) % 2),
    text: `${placeName}${getTopicParticle(placeName)} ${templates[(seed + index) % templates.length]}${neighborhood ? ` ${neighborhood} 근처를 자주 오가는 사람들이 참고하기 좋습니다.` : ""}`,
    authorName: neighborhood ? `${neighborhood} 주민` : "로컬 방문자",
    generated: true,
    localResident: Boolean(neighborhood),
  }));
}

function getTopicParticle(value = "") {
  const last = String(value).trim().charCodeAt(String(value).trim().length - 1);
  if (!Number.isFinite(last) || last < 0xac00 || last > 0xd7a3) return "은";
  return (last - 0xac00) % 28 === 0 ? "는" : "은";
}

export function getGeneratedLocalReviewStats(place = {}) {
  const reviews = generateLocalReviewsForPlace(place);
  if (!reviews.length) {
    return {
      localRating: 0,
      localReviewCount: 0,
      generatedLocalReviews: [],
      localScore: 0.5,
    };
  }

  const localRating = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;

  return {
    localRating: Math.round(localRating * 10) / 10,
    localReviewCount: reviews.length,
    generatedLocalReviews: reviews,
    localScore: Math.min(1, 0.58 + reviews.length * 0.08),
  };
}

export function extractNeighborhood(address = "") {
  const tokens = String(address).split(/\s+/).filter(Boolean);
  return [...tokens].reverse().find((token) => /동$|읍$|면$|리$|가$/.test(token)) || "";
}

export function isAdjacentNeighborhood(userNeighborhood = "", placeAddress = "") {
  const userArea = parseLocalArea(userNeighborhood);
  const placeArea = parseLocalArea(placeAddress);

  if (userArea.neighborhood && placeArea.neighborhood && userArea.neighborhood === placeArea.neighborhood) {
    return true;
  }

  return Boolean(
    userArea.district &&
      placeArea.district &&
      userArea.district === placeArea.district &&
      (!userArea.province || !placeArea.province || userArea.province === placeArea.province)
  );
}

function parseLocalArea(value = "") {
  const tokens = String(value).split(/\s+/).filter(Boolean);
  const district = tokens.find((token) => /구$|군$/.test(token)) || tokens.find((token) => /시$/.test(token) && !/특별시$|광역시$|특별자치시$/.test(token)) || "";

  return {
    province: tokens.find((token) => /도$|특별시$|광역시$|특별자치시$|특별자치도$/.test(token)) || "",
    district,
    neighborhood: [...tokens].reverse().find((token) => /동$|읍$|면$|리$|가$/.test(token)) || "",
  };
}

function isReviewablePlace(place = {}) {
  const text = `${place.name || ""} ${place.category || ""} ${place.categoryName || ""} ${place.categoryPath || ""} ${place.type || ""}`;
  return /FD6|CE7|AT4|CT1|PK6|음식|식당|맛집|카페|문화|관광|공원|시장|거리|상점|편의/.test(text);
}

function normalizeCategory(place = {}) {
  const text = `${place.category || ""} ${place.categoryName || ""} ${place.categoryPath || ""} ${place.type || ""}`;
  if (/FD6|음식|식당|맛집|분식|한식|중식|일식/.test(text)) return "food";
  if (/CE7|카페|커피/.test(text)) return "cafe";
  if (/CT1|AT4|문화|관광|미술관|박물관|전시|공연|궁|성|문/.test(text)) return "culture";
  if (/PK6|공원|산책|해변|정원/.test(text)) return "park";
  return "local";
}

function hashString(value = "") {
  return String(value)
    .split("")
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}
