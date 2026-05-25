export const DEFAULT_RECOMMENDATION_WEIGHTS = {
  distance: 1.2,
  review: 0.8,
  local: 1.4,
  preference: 1.6,
  weather: 1,
  time: 0.7,
  crowd: 0.9,
};

export const DEFAULT_NORMALIZATION_LIMITS = {
  maxRating: 5,
  maxReviewCount: 500,
  maxDistanceKm: 5,
  minTemperature: -10,
  maxTemperature: 35,
};

const CATEGORY_ALIASES = {
  FD6: "food",
  CE7: "cafe",
  CT1: "culture",
  AT4: "culture",
  PK6: "park",
  fd6: "food",
  ce7: "cafe",
  ct1: "culture",
  at4: "culture",
  pk6: "park",
  food: "food",
  cafe: "cafe",
  culture: "culture",
  park: "park",
  convenience: "convenience",
};

const PLACE_TYPE_BY_CATEGORY = {
  food: "indoor",
  cafe: "indoor",
  culture: "indoor",
  convenience: "indoor",
  park: "outdoor",
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
    review: calculateReviewScore(normalizedPlace.rating, normalizedPlace.reviewCount, normalizedInput.limits),
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
export function recommendPlaces(places, context = {}, options = {}) {
  const limit = Number.isFinite(options.limit) ? options.limit : 10;
  const weights = { ...DEFAULT_RECOMMENDATION_WEIGHTS, ...(options.weights || {}) };
  const normalizationLimits = {
    ...DEFAULT_NORMALIZATION_LIMITS,
    ...(options.normalizationLimits || {}),
  };

  return sortRecommendedPlaces(
    places.map((place) => calculateRecommendationScore(place, context, weights, normalizationLimits))
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
  const category = normalizeCategory(kakaoPlace.category_group_code || kakaoPlace.category_group_name);
  const lat = Number(kakaoPlace.y ?? kakaoPlace.lat);
  const lng = Number(kakaoPlace.x ?? kakaoPlace.lng);

  return normalizePlace(
    {
      id: kakaoPlace.id,
      name: kakaoPlace.place_name || kakaoPlace.name,
      address: kakaoPlace.road_address_name || kakaoPlace.address_name || kakaoPlace.address,
      category,
      placeType: PLACE_TYPE_BY_CATEGORY[category] || "mixed",
      tags: [kakaoPlace.category_name, kakaoPlace.category_group_name].filter(Boolean),
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

export function calculateLocalScore(localReviewCount = 0, totalReviewCount = 0) {
  const total = clampMin(totalReviewCount, 0);
  if (total === 0) return 0;

  return roundScore(clamp(clampMin(localReviewCount, 0) / total, 0, 1));
}

export function calculatePreferenceScore(userPreference = {}, place) {
  const preferredCategories = new Set(toArray(userPreference.categories).map(normalizeCategory));
  const preferredTags = new Set(toArray(userPreference.tags).map(normalizeToken));
  const placeCategory = normalizeCategory(place.category);
  const placeTags = toArray(place.tags).map(normalizeToken);

  let score = 0;
  if (preferredCategories.has(placeCategory)) score += 0.65;

  const matchedTags = placeTags.filter((tag) => preferredTags.has(tag)).length;
  if (preferredTags.size > 0) {
    score += Math.min(0.35, (matchedTags / preferredTags.size) * 0.35);
  }

  return roundScore(clamp(score, 0, 1));
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
  const rating = clamp(Number(place.rating) || 0, 0, limits.maxRating);
  const reviewCount = clampMin(Number(place.reviewCount) || 0, 0);
  const localReviewCount = clamp(Number(place.localReviewCount) || 0, 0, reviewCount);
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
    localReviewCount,
    crowdLevel,
    normalizedMetrics: {
      distance: normalizeLinear(distanceKm, 0, limits.maxDistanceKm),
      rating: normalizeLinear(rating, 0, limits.maxRating),
      reviewCount: normalizeLog(reviewCount, limits.maxReviewCount),
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

function roundScore(value) {
  return Math.round(value * 10000) / 10000;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
