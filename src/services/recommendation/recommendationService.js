import { fetchReviewMetricsForKakaoPlaces } from "../placeReviewMetricsService.js";

export const DEFAULT_RECOMMENDATION_WEIGHTS = {
  distance: 0.45,
  review: 0.7,
  local: 1,
  preference: 2.8,
  weather: 1,
  time: 0.55,
  crowd: 0.65,
};

export const DEFAULT_NORMALIZATION_LIMITS = {
  maxRating: 5,
  maxReviewCount: 500,
  maxDistanceKm: 5,
  minTemperature: -10,
  maxTemperature: 35,
};

export const DEFAULT_REVIEW_BLEND_BETA = 0.7;

const CATEGORY_ALIASES = {
  FD6: "food",
  CE7: "cafe",
  CT1: "culture",
  AT4: "culture",
  PK6: "park",
  MT1: "shopping",
  fd6: "food",
  ce7: "cafe",
  ct1: "culture",
  at4: "culture",
  pk6: "park",
  mt1: "shopping",
  food: "food",
  cafe: "cafe",
  culture: "culture",
  park: "park",
  shopping: "shopping",
  photo: "photo_spot",
  photo_spot: "photo_spot",
  convenience: "convenience",
};

const PLACE_TYPE_BY_CATEGORY = {
  food: "indoor",
  cafe: "indoor",
  culture: "indoor",
  convenience: "indoor",
  park: "outdoor",
  shopping: "indoor",
  photo_spot: "outdoor",
};

const MOOD_KEYWORDS = {
  quiet: ["조용", "한적", "도서관", "서점", "카페", "공원", "산책", "quiet"],
  lively: ["활기", "시장", "번화", "축제", "광장", "맛집", "shopping", "food"],
  nature: ["자연", "공원", "숲", "호수", "정원", "산", "둘레길", "park"],
  history: ["역사", "문화재", "궁", "성", "박물관", "전통", "heritage", "culture"],
  trendy: ["트렌디", "핫플", "카페", "편집샵", "쇼핑", "사진", "cafe", "shopping"],
  value: ["가성비", "시장", "분식", "맛집", "푸드", "food"],
};

const COMPANION_KEYWORDS = {
  solo: ["혼자", "조용", "산책", "카페", "도서관", "solo"],
  friend: ["친구", "맛집", "카페", "쇼핑", "사진", "활기", "food", "cafe", "shopping"],
  couple: ["연인", "데이트", "전망", "사진", "카페", "공원", "trendy"],
  family: ["가족", "공원", "문화", "박물관", "전시", "체험", "park", "culture"],
};

const AUDIO_INTEREST_KEYWORDS = {
  history: ["역사", "문화재", "전통", "heritage"],
  culture: ["문화", "전시", "미술관", "박물관", "공연", "culture"],
  food: ["맛집", "음식", "식당", "카페", "food", "cafe"],
  legend: ["전설", "설화", "이야기", "마을", "지역"],
  architecture: ["건축", "건물", "궁", "성당", "캠퍼스", "architecture"],
  campus: ["대학", "대학교", "캠퍼스", "대학가", "campus"],
};

const WEATHER_RULES = {
  rain: { indoor: 1, outdoor: 0.2, mixed: 0.6 },
  snow: { indoor: 0.95, outdoor: 0.25, mixed: 0.6 },
  storm: { indoor: 1, outdoor: 0.1, mixed: 0.45 },
  hot: { indoor: 0.9, outdoor: 0.35, mixed: 0.6 },
  cold: { indoor: 0.9, outdoor: 0.35, mixed: 0.6 },
  clear: { indoor: 0.75, outdoor: 1, mixed: 0.9 },
  clouds: { indoor: 0.8, outdoor: 0.85, mixed: 0.85 },
  default: { indoor: 0.75, outdoor: 0.75, mixed: 0.75 },
};

const TIME_RULES = {
  morning: { cafe: 0.95, food: 0.65, culture: 0.65, park: 0.8, convenience: 0.7 },
  lunch: { cafe: 0.75, food: 1, culture: 0.65, park: 0.7, convenience: 0.75 },
  afternoon: { cafe: 1, food: 0.7, culture: 0.9, park: 0.85, convenience: 0.65 },
  evening: { cafe: 0.75, food: 0.95, culture: 1, park: 0.65, convenience: 0.7 },
  night: { cafe: 0.45, food: 0.7, culture: 0.55, park: 0.3, convenience: 0.85 },
};

// S_i = w_dD_i + w_rR_i + w_lL_i + w_pP_i + w_wW_i + w_tT_i + w_cC_i
// 각 하위 점수 함수는 독립적으로 테스트할 수 있도록 export합니다.
export function calculateRecommendationScore(
  place,
  context = {},
  weights = DEFAULT_RECOMMENDATION_WEIGHTS,
  normalizationLimits = DEFAULT_NORMALIZATION_LIMITS
) {
  const normalizedInput = normalizeRecommendationInput(place, context, weights, normalizationLimits);
  const { place: normalizedPlace, context: normalizedContext, weights: normalizedWeights } = normalizedInput;
  const components = {
    distance: calculateDistanceScore(normalizedPlace.distanceKm, normalizedInput.limits),
    review: calculateHybridReviewScore(
      normalizedPlace.googleRating,
      normalizedPlace.googleReviewCount,
      normalizedPlace.localRating,
      normalizedPlace.localReviewCount,
      normalizedContext.reviewBeta,
      normalizedInput.limits
    ),
    local: calculateLocalScore(normalizedPlace.localReviewCount, normalizedPlace.reviewCount),
    preference: calculatePreferenceScore(normalizedContext.userPreference, normalizedPlace),
    weather: calculateWeatherScore(normalizedContext.weather, normalizedPlace.placeType),
    time: calculateTimeScore(normalizedContext.currentTime, normalizedPlace),
    crowd: calculateCrowdScore(normalizedPlace.normalizedMetrics.crowdLevel),
  };

  const score =
    normalizedWeights.distance * components.distance +
    normalizedWeights.review * components.review +
    normalizedWeights.local * components.local +
    normalizedWeights.preference * components.preference +
    normalizedWeights.weather * components.weather +
    normalizedWeights.time * components.time +
    normalizedWeights.crowd * components.crowd;

  return {
    ...normalizedPlace,
    recommendationScore: roundScore(score),
    recommendationComponents: components,
    recommendationInput: normalizedInput,
  };
}

// 장소 리스트를 점수순으로 정렬하고 기본 상위 10개를 반환합니다.
// 원본 배열을 변경하지 않아 React state나 캐시 데이터와 충돌하지 않습니다.
function isParkingPlace(place = {}) {
  const category = normalizeCategory(place.category || place.categoryCode || place.type);
  const categoryPath = String(
    [place.categoryPath, place.categoryName, place.type, ...(place.tags || [])].filter(Boolean).join(" ")
  );

  return category === "parking" || /주차|parking/.test(categoryPath);
}

export function recommendPlaces(places, context = {}, options = {}) {
  const filteredPlaces = places.filter((place) => !isParkingPlace(place));
  const limit = Number.isFinite(options.limit) ? options.limit : 10;
  const weights = { ...DEFAULT_RECOMMENDATION_WEIGHTS, ...(options.weights || {}) };
  const recommendationContext = {
    ...context,
    reviewBeta: options.reviewBeta ?? context.reviewBeta,
  };
  const normalizationLimits = {
    ...DEFAULT_NORMALIZATION_LIMITS,
    ...(options.normalizationLimits || {}),
  };

  return sortRecommendedPlaces(
    filteredPlaces.map((place) => calculateRecommendationScore(place, recommendationContext, weights, normalizationLimits))
  ).slice(0, limit);
}

export function sortRecommendedPlaces(scoredPlaces) {
  return [...scoredPlaces].sort((a, b) => {
    if (b.recommendationScore !== a.recommendationScore) {
      return b.recommendationScore - a.recommendationScore;
    }

    // 동점이면 가까운 장소를 먼저 보여 주어 모바일 이동 비용을 줄입니다.
    return a.distanceKm - b.distanceKm;
  });
}

// Kakao Places API 응답과 내부 장소 모델을 같은 입력 형태로 맞춥니다.
// Kakao에는 리뷰/혼잡도 값이 없으므로 extraMetrics로 서버 리뷰 통계를 병합할 수 있습니다.
export function normalizeKakaoPlaceForRecommendation(kakaoPlace, userLocation, extraMetrics = {}) {
  const kakaoCategoryCode = kakaoPlace.categoryCode || kakaoPlace.category_group_code || kakaoPlace.category || "";
  const kakaoCategoryName = kakaoPlace.categoryName || kakaoPlace.category_group_name || "";
  const kakaoCategoryPath = kakaoPlace.categoryPath || kakaoPlace.category_name || "";
  const category = normalizeCategory(kakaoCategoryCode || kakaoCategoryName);
  const lat = Number(kakaoPlace.y ?? kakaoPlace.lat);
  const lng = Number(kakaoPlace.x ?? kakaoPlace.lng);

  return normalizePlace(
    {
      ...kakaoPlace,
      id: kakaoPlace.id,
      name: kakaoPlace.place_name || kakaoPlace.name,
      address: kakaoPlace.road_address_name || kakaoPlace.address_name || kakaoPlace.address,
      category,
      categoryCode: kakaoCategoryCode,
      categoryName: kakaoCategoryName,
      categoryPath: kakaoCategoryPath,
      placeType: PLACE_TYPE_BY_CATEGORY[category] || "mixed",
      tags: [kakaoCategoryPath, kakaoCategoryName].filter(Boolean),
      lat,
      lng,
      distanceKm: kakaoPlace.distance ? Number(kakaoPlace.distance) / 1000 : undefined,
      phone: kakaoPlace.phone,
      url: kakaoPlace.place_url,
      ...extraMetrics,
    },
    userLocation
  );
}

export function recommendKakaoPlaces(kakaoPlaces, context = {}, metricsByPlaceId = {}, options = {}) {
  const places = kakaoPlaces.map((place) =>
    normalizeKakaoPlaceForRecommendation(place, context.userLocation, metricsByPlaceId[place.id] || {})
  );

  return recommendPlaces(places, context, options);
}

export async function recommendKakaoPlacesWithReviewData(kakaoPlaces, context = {}, options = {}) {
  const limit = Number.isFinite(options.limit) ? options.limit : 10;
  const candidates = kakaoPlaces.slice(0, options.metricsLimit || Math.max(limit, 6));
  const metricsByPlaceId = await fetchReviewMetricsForKakaoPlaces(candidates, options.metrics);

  return recommendKakaoPlaces(kakaoPlaces, context, metricsByPlaceId, options);
}

export function calculateDistanceScore(distanceKm = 0, normalizationLimits = DEFAULT_NORMALIZATION_LIMITS) {
  const limits = normalizeNormalizationLimits(normalizationLimits);
  const normalizedDistance = normalizeLinear(clampMin(distanceKm, 0), 0, limits.maxDistanceKm);
  return roundScore(1 - normalizedDistance);
}

export function calculateReviewScore(rating = 0, reviewCount = 0, normalizationLimits = DEFAULT_NORMALIZATION_LIMITS) {
  const limits = normalizeNormalizationLimits(normalizationLimits);
  const ratingScore = normalizeLinear(rating, 0, limits.maxRating);
  const reviewCountScore = normalizeLog(reviewCount, limits.maxReviewCount);

  return roundScore(ratingScore * reviewCountScore);
}

export function calculateHybridReviewScore(
  googleRating = 0,
  googleReviewCount = 0,
  localRating = 0,
  localReviewCount = 0,
  beta = DEFAULT_REVIEW_BLEND_BETA,
  normalizationLimits = DEFAULT_NORMALIZATION_LIMITS
) {
  const safeBeta = clamp(Number.isFinite(Number(beta)) ? Number(beta) : DEFAULT_REVIEW_BLEND_BETA, 0, 1);
  const googleScore = calculateReviewScore(googleRating, googleReviewCount, normalizationLimits);
  const localScore = calculateReviewScore(localRating, localReviewCount, normalizationLimits);

  if (googleReviewCount <= 0 && localReviewCount > 0) return localScore;
  if (localReviewCount <= 0 && googleReviewCount > 0) return googleScore;

  return roundScore(safeBeta * googleScore + (1 - safeBeta) * localScore);
}

export function calculateLocalScore(localReviewCount = 0, totalReviewCount = 0) {
  const total = clampMin(totalReviewCount, 0);
  if (total === 0) return 0;

  return roundScore(clamp(clampMin(localReviewCount, 0) / total, 0, 1));
}

export function calculatePreferenceScore(userPreference = {}, place) {
  const preferredCategories = new Set(toArray(userPreference.categories).map(normalizeCategory));
  const placeCategory = normalizeCategory(place.category);
  const hasCategoryPreference = preferredCategories.size > 0;
  const categoryScore = !hasCategoryPreference ? 0.5 : preferredCategories.has(placeCategory) ? 1 : 0;
  const moodScore = calculateKeywordPreferenceMatch(userPreference.moods, place, MOOD_KEYWORDS);
  const companionScore = calculateCompanionMatch(userPreference.companion, place);
  const audioInterestScore = calculateKeywordPreferenceMatch(
    userPreference.audioInterests,
    place,
    AUDIO_INTEREST_KEYWORDS
  );

  const score = hasCategoryPreference
    ? 0.72 * categoryScore + 0.14 * moodScore + 0.08 * companionScore + 0.06 * audioInterestScore
    : 0.35 * categoryScore + 0.35 * moodScore + 0.2 * companionScore + 0.1 * audioInterestScore;

  return roundScore(clamp(score, 0, 1));
}

function calculateKeywordPreferenceMatch(preferences = [], place, keywordMap) {
  const selected = toArray(preferences).map(normalizeToken).filter(Boolean);
  if (!selected.length) return 0;

  const placeText = getSearchablePlaceText(place);
  const matched = selected.filter((preference) =>
    toArray(keywordMap[preference]).some((keyword) => placeText.includes(normalizeToken(keyword)))
  ).length;

  return roundScore(clamp(matched / selected.length, 0, 1));
}

function calculateCompanionMatch(companion, place) {
  const normalizedCompanion = normalizeToken(companion);
  if (!normalizedCompanion) return 0;

  const placeText = getSearchablePlaceText(place);
  const keywords = toArray(COMPANION_KEYWORDS[normalizedCompanion]);
  return keywords.some((keyword) => placeText.includes(normalizeToken(keyword))) ? 1 : 0;
}

export function calculateWeatherScore(weather = {}, placeType = "mixed") {
  const condition = normalizeWeatherCondition(weather);
  const type = placeType || "mixed";
  const rule = WEATHER_RULES[condition] || WEATHER_RULES.default;

  return roundScore(rule[type] ?? rule.mixed ?? WEATHER_RULES.default.mixed);
}

export function calculateTimeScore(currentTime = new Date(), place) {
  const bucket = getTimeBucket(currentTime);
  const category = normalizeCategory(place.category);
  const rule = TIME_RULES[bucket] || TIME_RULES.afternoon;

  return roundScore(rule[category] ?? 0.6);
}

export function calculateCrowdScore(crowdLevel = 0.5) {
  return roundScore(1 - clamp(Number(crowdLevel) || 0, 0, 1));
}

export function normalizeRecommendationInput(
  place,
  context = {},
  weights = DEFAULT_RECOMMENDATION_WEIGHTS,
  normalizationLimits = DEFAULT_NORMALIZATION_LIMITS
) {
  const limits = normalizeNormalizationLimits(normalizationLimits);
  const normalizedContext = normalizeRecommendationContext(context, limits);

  return {
    place: normalizePlace(place, normalizedContext.userLocation, limits),
    context: normalizedContext,
    weights: normalizeRecommendationWeights(weights),
    limits,
  };
}

export function normalizePlace(place = {}, userLocation, normalizationLimits = DEFAULT_NORMALIZATION_LIMITS) {
  const limits = normalizeNormalizationLimits(normalizationLimits);
  const category = normalizeCategory(place.category || place.categoryCode || place.type);
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const hasCoordinate = Number.isFinite(lat) && Number.isFinite(lng);
  const distanceKm = clampMin(
    Number.isFinite(Number(place.distanceKm))
      ? Number(place.distanceKm)
      : hasCoordinate && userLocation?.lat && userLocation?.lng
        ? getDistanceKm(userLocation, { lat, lng })
        : Number(place.distance || 0) / 1000,
    0
  );
  const rawReviewCount = clampMin(Number(place.reviewCount) || 0, 0);
  const rawLocalReviewCount = clampMin(Number(place.localReviewCount) || 0, 0);
  const googleRating = clamp(Number(place.googleRating ?? place.rating) || 0, 0, limits.maxRating);
  const googleReviewCount = clampMin(Number(place.googleReviewCount ?? place.reviewCount) || 0, 0);
  const localRating = clamp(Number(place.localRating ?? (rawLocalReviewCount ? place.rating : 0)) || 0, 0, limits.maxRating);
  const localReviewCount = clamp(rawLocalReviewCount, 0, rawReviewCount || Number.MAX_SAFE_INTEGER);
  const reviewCount = clampMin(Number(place.reviewCount) || googleReviewCount + localReviewCount, 0);
  const rating = clamp(
    Number(place.rating) ||
      weightedAverageRating(googleRating, googleReviewCount, localRating, localReviewCount) ||
      googleRating ||
      localRating,
    0,
    limits.maxRating
  );
  const crowdLevel = clamp(Number(place.crowdLevel ?? 0.5), 0, 1);

  return {
    ...place,
    id: place.id || `${place.name}-${lat || 0}-${lng || 0}`,
    name: place.name || "이름 없는 장소",
    category,
    placeType: place.placeType || PLACE_TYPE_BY_CATEGORY[category] || "mixed",
    tags: toArray(place.tags),
    lat,
    lng,
    distanceKm,
    rating,
    reviewCount,
    googleRating,
    googleReviewCount,
    localRating,
    localReviewCount,
    crowdLevel,
    normalizedMetrics: {
      distance: normalizeLinear(distanceKm, 0, limits.maxDistanceKm),
      rating: normalizeLinear(rating, 0, limits.maxRating),
      reviewCount: normalizeLog(reviewCount, limits.maxReviewCount),
      googleReview: calculateReviewScore(googleRating, googleReviewCount, limits),
      localReview: calculateReviewScore(localRating, localReviewCount, limits),
      localReviewRatio: reviewCount === 0 ? 0 : roundScore(localReviewCount / reviewCount),
      crowdLevel,
    },
  };
}

export function normalizeRecommendationContext(context = {}, normalizationLimits = DEFAULT_NORMALIZATION_LIMITS) {
  const limits = normalizeNormalizationLimits(normalizationLimits);
  const weather = normalizeWeatherResponse(context.weather || {});

  return {
    ...context,
    userLocation: normalizeLocation(context.userLocation),
    userPreference: normalizeUserPreference(context.userPreference),
    weather: {
      ...weather,
      precipitationProbability: clamp(weather.precipitationProbability, 0, 1),
      normalizedTemperature: normalizeLinear(weather.temperature, limits.minTemperature, limits.maxTemperature),
    },
    currentTime: normalizeCurrentTime(context.currentTime),
    reviewBeta: clamp(
      Number.isFinite(Number(context.reviewBeta)) ? Number(context.reviewBeta) : DEFAULT_REVIEW_BLEND_BETA,
      0,
      1
    ),
  };
}

export function normalizeRecommendationWeights(weights = DEFAULT_RECOMMENDATION_WEIGHTS) {
  return Object.fromEntries(
    Object.entries(DEFAULT_RECOMMENDATION_WEIGHTS).map(([key, fallback]) => {
      const value = Number(weights[key]);
      return [key, Number.isFinite(value) && value >= 0 ? value : fallback];
    })
  );
}

// 날씨 API 연동용 어댑터입니다. 클라이언트에 API 키를 직접 두지 말고
// /api/weather 같은 백엔드 프록시에서 실제 OpenWeather, 기상청 API 등을 호출하는 구성을 권장합니다.
export async function fetchWeatherContext(location, options = {}) {
  if (!location?.lat || !location?.lng) {
    throw new Error("날씨 조회에는 lat, lng 위치 정보가 필요합니다.");
  }

  const fetcher = options.fetcher || fetch;
  const endpoint = options.endpoint || "/api/weather";
  const params = new URLSearchParams({
    lat: String(location.lat),
    lng: String(location.lng),
  });

  const response = await fetcher(`${endpoint}?${params.toString()}`);
  if (!response.ok) {
    throw new Error("날씨 정보를 불러오지 못했습니다.");
  }

  return normalizeWeatherResponse(await response.json());
}

export function normalizeWeatherResponse(payload = {}) {
  const firstWeather = Array.isArray(payload.weather) ? payload.weather[0] : payload.weather;

  return {
    condition: payload.condition || firstWeather?.main || firstWeather?.description || "default",
    temperature: toFiniteNumber(payload.temperature ?? payload.main?.temp, 20),
    precipitationProbability: toFiniteNumber(payload.precipitationProbability ?? payload.pop, 0),
  };
}

export function getDistanceKm(a, b) {
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

function normalizeWeatherCondition(weather = {}) {
  const raw = normalizeToken(weather.condition || weather.main || weather.description || "default");
  const temperature = Number(weather.temperature);
  const precipitationProbability = Number(weather.precipitationProbability || 0);

  if (raw.includes("rain") || raw.includes("drizzle") || precipitationProbability >= 0.6) return "rain";
  if (raw.includes("snow")) return "snow";
  if (raw.includes("thunder") || raw.includes("storm")) return "storm";
  if (Number.isFinite(temperature) && temperature >= 30) return "hot";
  if (Number.isFinite(temperature) && temperature <= 3) return "cold";
  if (raw.includes("clear")) return "clear";
  if (raw.includes("cloud")) return "clouds";

  return raw || "default";
}

function getTimeBucket(currentTime) {
  const hour = parseHour(currentTime);
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

function parseHour(currentTime) {
  if (currentTime instanceof Date) return currentTime.getHours();
  if (typeof currentTime === "number") return currentTime;
  if (typeof currentTime === "string") {
    const [hour] = currentTime.split(":");
    return Number(hour);
  }

  return new Date().getHours();
}

function normalizeNormalizationLimits(limits = {}) {
  const minTemperature = toFiniteNumber(limits.minTemperature, DEFAULT_NORMALIZATION_LIMITS.minTemperature);
  const maxTemperature = toFiniteNumber(limits.maxTemperature, DEFAULT_NORMALIZATION_LIMITS.maxTemperature);

  return {
    maxRating: clampMin(toFiniteNumber(limits.maxRating, DEFAULT_NORMALIZATION_LIMITS.maxRating), 1),
    maxReviewCount: clampMin(
      toFiniteNumber(limits.maxReviewCount, DEFAULT_NORMALIZATION_LIMITS.maxReviewCount),
      1
    ),
    maxDistanceKm: clampMin(toFiniteNumber(limits.maxDistanceKm, DEFAULT_NORMALIZATION_LIMITS.maxDistanceKm), 0.1),
    minTemperature,
    maxTemperature: maxTemperature > minTemperature ? maxTemperature : minTemperature + 1,
  };
}

function normalizeLocation(location = {}) {
  const lat = Number(location.lat);
  const lng = Number(location.lng);

  return {
    ...location,
    lat: Number.isFinite(lat) ? clamp(lat, -90, 90) : undefined,
    lng: Number.isFinite(lng) ? clamp(lng, -180, 180) : undefined,
  };
}

function normalizeUserPreference(userPreference = {}) {
  return {
    ...userPreference,
    categories: toArray(userPreference.categories).map(normalizeCategory).filter(Boolean),
    moods: toArray(userPreference.moods).map(normalizeToken).filter(Boolean),
    companion: normalizeToken(userPreference.companion),
    audioInterests: toArray(userPreference.audioInterests).map(normalizeToken).filter(Boolean),
    tags: toArray(userPreference.tags).map(normalizeToken).filter(Boolean),
  };
}

function normalizeCurrentTime(currentTime = new Date()) {
  const parsedHour = parseHour(currentTime);
  const hour = Number.isFinite(parsedHour) ? clamp(Math.floor(parsedHour), 0, 23) : new Date().getHours();
  return `${String(hour).padStart(2, "0")}:00`;
}

function normalizeCategory(value = "") {
  const token = normalizeToken(value);
  return CATEGORY_ALIASES[token] || token || "unknown";
}

function normalizeToken(value = "") {
  return String(value).trim().toLowerCase();
}

function getSearchablePlaceText(place = {}) {
  return [
    place.name,
    place.category,
    place.categoryCode,
    place.categoryName,
    place.categoryPath,
    place.type,
    place.address,
    place.summary,
    place.description,
    ...(place.tags || []),
  ]
    .map(normalizeToken)
    .join(" ");
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampMin(value, min) {
  return Math.max(min, Number(value) || 0);
}

function normalizeLinear(value, min, max) {
  if (max <= min) return 0;
  return roundScore(clamp((Number(value) - min) / (max - min), 0, 1));
}

function normalizeLog(value, max) {
  const safeValue = clampMin(value, 0);
  const safeMax = clampMin(max, 1);
  return roundScore(clamp(Math.log1p(safeValue) / Math.log1p(safeMax), 0, 1));
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function weightedAverageRating(googleRating, googleReviewCount, localRating, localReviewCount) {
  const total = googleReviewCount + localReviewCount;
  if (total <= 0) return 0;

  return (googleRating * googleReviewCount + localRating * localReviewCount) / total;
}

function roundScore(value) {
  return Math.round(value * 10000) / 10000;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
