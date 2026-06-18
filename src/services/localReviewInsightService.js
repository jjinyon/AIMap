const KYUNGHEE_CENTER = { lat: 37.2414, lng: 127.0811 };
const KYUNGHEE_DEMO_RADIUS_KM = 3;
const MAX_SAMPLE_REVIEWS = 8;

const CATEGORY_PROFILES = {
  food: {
    labels: ["식사", "점심", "저녁"],
    positives: ["학교에서 이동하기 편하고 식사 만족도가 괜찮아요.", "메뉴 선택지가 무난해서 친구들이랑 가기 좋습니다.", "수업 전후로 들르기 편한 위치라 재방문하기 좋아요."],
    mixed: ["피크 시간에는 조금 붐비지만 회전은 나쁘지 않은 편이에요.", "맛은 무난하고 위치 장점이 큰 곳입니다.", "가격대와 양은 메뉴마다 체감이 조금 달라요."],
    lower: ["위치는 좋은데 붐비는 시간에는 대기가 신경 쓰일 수 있어요.", "가볍게 먹기엔 괜찮지만 특별한 맛을 기대하면 아쉬울 수 있습니다."],
  },
  cafe: {
    labels: ["카페", "공부", "대화"],
    positives: ["캠퍼스 근처에서 잠깐 쉬거나 과제하기 좋은 분위기예요.", "음료가 안정적이고 좌석 이용이 편하다는 인상이 있습니다.", "친구 기다릴 때 들르기 좋고 접근성이 좋아요."],
    mixed: ["자리 상황은 시간대에 따라 차이가 있지만 위치가 편해요.", "조용한 날에는 공부하기 좋고, 점심 이후에는 조금 북적입니다.", "음료는 무난하고 좌석 분위기가 장점입니다."],
    lower: ["붐비는 시간에는 오래 머물기 어렵고 좌석 운이 필요해요.", "가까운 장점은 있지만 조용한 공간을 기대하면 아쉬울 수 있어요."],
  },
  convenience: {
    labels: ["편의", "간식", "생활"],
    positives: ["학교 생활 중 급하게 필요한 물건을 사기 편해요.", "동선이 좋아서 간식이나 음료 사러 들르기 좋습니다.", "주변 학생들이 자주 이용하는 생활형 장소예요."],
    mixed: ["상품 구색은 무난하고 시간대에 따라 계산 줄이 생겨요.", "가까워서 편하지만 점심 전후에는 사람이 몰리는 편입니다."],
    lower: ["편하긴 한데 붐비는 시간에는 조금 답답할 수 있어요.", "기본적인 이용은 괜찮지만 특별한 장점은 위치 쪽에 가까워요."],
  },
  culture: {
    labels: ["산책", "문화", "방문"],
    positives: ["캠퍼스 주변을 둘러볼 때 같이 들르기 좋은 장소예요.", "분위기가 편하고 짧게 머물러도 만족감이 있습니다.", "학교 근처 동선과 이어져서 가볍게 방문하기 좋아요."],
    mixed: ["목적을 두고 가기보다는 근처에 있을 때 들르기 좋은 편이에요.", "날씨와 시간대에 따라 만족도가 조금 달라집니다."],
    lower: ["기대가 크면 평범하게 느껴질 수 있지만 접근성은 괜찮아요.", "짧게 둘러보기엔 괜찮고 오래 머물 곳으로는 조금 아쉬워요."],
  },
  local: {
    labels: ["근처", "동네", "생활"],
    positives: ["학교 주변 생활권에서 자연스럽게 이용하기 좋은 곳입니다.", "위치가 편하고 동네 이용자 반응이 안정적인 편이에요.", "큰 기대 없이 들렀을 때 만족도가 괜찮은 장소예요."],
    mixed: ["장점은 접근성이고, 만족도는 이용 목적에 따라 갈릴 수 있어요.", "무난하게 이용하기 좋지만 시간대에 따라 분위기가 달라집니다."],
    lower: ["가까운 장점은 있지만 서비스나 분위기는 평범하게 느껴질 수 있어요.", "필요할 때 들르는 곳으로는 괜찮지만 일부 아쉬움도 있습니다."],
  },
};

export function generateLocalReviewsForPlace(place = {}, options = {}) {
  if (!isReviewablePlace(place) || !isNearKyungheeDemoArea(place)) return [];

  const profile = getCategoryProfile(place);
  const placeName = place.name || place.place_name || "이 장소";
  const rating = getDemoRating(place);
  const reviewCount = getDemoReviewCount(place);
  const seed = hashString(`${place.id || placeName}-${place.address || place.address_name || ""}`);
  const sampleCount = Math.min(MAX_SAMPLE_REVIEWS, Math.max(4, Math.round(Math.log10(reviewCount + 10) * 3)));
  const ratingPool = buildRatingPool(rating, seed);
  const localName = extractNeighborhood(place.address || place.road_address_name || place.address_name || "") || "국제캠퍼스";

  return Array.from({ length: options.count || sampleCount }, (_, index) => {
    const reviewRating = ratingPool[(seed + index) % ratingPool.length];
    const tone = reviewRating >= 5 ? "positives" : reviewRating >= 4 ? "mixed" : "lower";
    const templates = profile[tone] || profile.mixed;
    const content = makeReviewContent(placeName, templates[(seed + index) % templates.length], profile.labels, seed + index);

    return {
      id: `demo-review-${normalizeId(place.id || placeName)}-${index + 1}`,
      placeId: place.id || "",
      placeName,
      placeAddress: place.address || place.road_address_name || place.address_name || "",
      rating: reviewRating,
      content,
      text: content,
      userNickname: makeDemoNickname(localName, index, seed),
      userCity: "경기 용인시 기흥구 서천동",
      userNeighborhood: localName,
      isLocalResident: (seed + index) % 4 !== 0,
      localResident: (seed + index) % 4 !== 0,
      isSynthetic: true,
      generated: true,
      source: "demo-generated",
      sourceNote: "실제 공개 별점/리뷰 수 분포를 참고할 수 있도록 만든 시연용 생성 리뷰입니다.",
      createdAt: makeDemoDate(index, seed),
    };
  });
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

  const localRating = getDemoRating(place);
  const localReviewCount = getDemoReviewCount(place);

  return {
    localRating,
    localReviewCount,
    generatedLocalReviews: reviews,
    localScore: Math.min(1, 0.55 + Math.log10(localReviewCount + 1) * 0.16),
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

function getDemoRating(place) {
  const explicitRating = Number(place.localRating || place.naverRating || place.rating || place.googleRating);
  if (Number.isFinite(explicitRating) && explicitRating > 0) return clamp(Math.round(explicitRating * 10) / 10, 2.8, 5);

  const seed = hashString(`${place.id || ""}-${place.name || ""}`);
  const categoryBase = getCategoryKey(place) === "food" || getCategoryKey(place) === "cafe" ? 4.15 : 3.95;
  return clamp(Math.round((categoryBase + ((seed % 70) - 20) / 100) * 10) / 10, 3.2, 4.8);
}

function getDemoReviewCount(place) {
  const explicitCount = Number(place.localReviewCount || place.naverReviewCount || place.reviewCount || place.googleReviewCount);
  if (Number.isFinite(explicitCount) && explicitCount > 0) return Math.round(explicitCount);

  const seed = hashString(`${place.id || ""}-${place.name || ""}-${place.categoryPath || ""}`);
  const category = getCategoryKey(place);
  const base = category === "food" ? 140 : category === "cafe" ? 95 : category === "convenience" ? 55 : 42;
  const distancePenalty = Number(place.distance) ? Math.max(0.45, 1 - Number(place.distance) / 3200) : 0.85;
  return Math.max(12, Math.round((base + (seed % 120)) * distancePenalty));
}

function buildRatingPool(averageRating, seed) {
  if (averageRating >= 4.6) return [5, 5, 5, 5, 4, 5, 4, 5];
  if (averageRating >= 4.2) return [5, 4, 4, 5, 4, 4, 5, seed % 3 === 0 ? 3 : 4];
  if (averageRating >= 3.7) return [4, 4, 3, 5, 4, 3, 4, 4];
  return [3, 4, 3, 2, 4, 3, 3, 4];
}

function makeReviewContent(placeName, sentence, labels, seed) {
  const openers = [
    `${placeName}은`,
    `여기는`,
    `국제캠퍼스 근처에서`,
    `수업 전후로 들르기에는`,
  ];
  const closers = [
    `${labels[(seed + 1) % labels.length]} 목적이면 한 번쯤 들러볼 만합니다.`,
    "시연용 데이터지만 실제 이용 흐름과 비슷하게 느껴지도록 정리했습니다.",
    "학교 주변 동선 기준으로 보면 꽤 현실적인 선택지입니다.",
  ];

  return `${openers[seed % openers.length]} ${sentence} ${closers[(seed + 2) % closers.length]}`;
}

function makeDemoNickname(localName, index, seed) {
  const names = [`${localName} 학생`, "국제캠퍼스 재학생", "서천동 생활권", "영통 근처 방문자", "학교앞 단골"];
  return names[(seed + index) % names.length];
}

function makeDemoDate(index, seed) {
  const dayOffset = 2 + ((seed + index * 5) % 55);
  const date = new Date(Date.UTC(2026, 5, 18 - dayOffset, 9 + (index % 8), 10, 0));
  return date.toISOString();
}

function getCategoryProfile(place) {
  return CATEGORY_PROFILES[getCategoryKey(place)] || CATEGORY_PROFILES.local;
}

function getCategoryKey(place = {}) {
  const text = `${place.category || ""} ${place.categoryCode || ""} ${place.categoryName || ""} ${place.categoryPath || ""} ${place.type || ""}`;
  if (/FD6|음식|식당|맛집|분식|한식|중식|일식|양식|술집|주점/.test(text)) return "food";
  if (/CE7|카페|커피|디저트/.test(text)) return "cafe";
  if (/CS2|MT1|편의|마트|상점|매장/.test(text)) return "convenience";
  if (/CT1|AT4|문화|관광|미술관|박물관|전시|공연|공원|산책/.test(text)) return "culture";
  return "local";
}

function isReviewablePlace(place = {}) {
  const text = `${place.name || ""} ${place.category || ""} ${place.categoryCode || ""} ${place.categoryName || ""} ${place.categoryPath || ""} ${place.type || ""}`;
  return /FD6|CE7|CS2|MT1|AD5|AT4|CT1|음식|식당|맛집|분식|카페|커피|문화|관광|공원|시장|거리|상점|편의|마트|숙박|술집|주점/.test(text);
}

function isNearKyungheeDemoArea(place = {}) {
  const lat = Number(place.lat ?? place.y);
  const lng = Number(place.lng ?? place.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  return getDistanceKm(KYUNGHEE_CENTER, { lat, lng }) <= KYUNGHEE_DEMO_RADIUS_KM;
}

function parseLocalArea(value = "") {
  const tokens = String(value).split(/\s+/).filter(Boolean);
  const district = tokens.find((token) => /구$|군$/.test(token)) || tokens.find((token) => /시$/.test(token) && !/특별시|광역시|특례시/.test(token)) || "";

  return {
    province: tokens.find((token) => /도$|특별시|광역시|특례시|자치시|자치도/.test(token)) || "",
    district,
    neighborhood: [...tokens].reverse().find((token) => /동$|읍$|면$|리$|가$/.test(token)) || "",
  };
}

function normalizeId(value = "") {
  return String(value).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || hashString(value);
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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashString(value = "") {
  return String(value)
    .split("")
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}
