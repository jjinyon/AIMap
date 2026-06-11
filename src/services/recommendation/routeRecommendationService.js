import { recommendPlaces } from "./recommendationService.js";

export const ROUTE_TEMPLATES = [
  ["culture", "food", "park", "cafe"],
  ["cafe", "culture", "food", "local"],
  ["park", "culture", "food", "cafe"],
  ["local", "food", "culture", "cafe"],
  ["culture", "local", "food"],
  ["food", "park", "cafe"],
];

const DEFAULT_ROUTE_OPTIONS = {
  maxRoutes: 3,
  minPlaces: 3,
  maxPlaces: 5,
  candidateLimit: 30,
  candidatesPerCategory: 6,
  maxCombinationsPerTemplate: 240,
  maxTotalDistanceKm: 8,
  walkingKmPerHour: 4,
  stopDurationMinutes: 35,
};

const ROUTE_SCORE_WEIGHTS = {
  averagePlaceScore: 0.35,
  categoryDiversityScore: 0.25,
  routeDistanceScore: 0.25,
  localExperienceScore: 0.15,
};

const CATEGORY_ALIASES = {
  FD6: "food",
  CE7: "cafe",
  CT1: "culture",
  AT4: "culture",
  PK6: "park",
  MT1: "local",
  fd6: "food",
  ce7: "cafe",
  ct1: "culture",
  at4: "culture",
  pk6: "park",
  mt1: "local",
  food: "food",
  restaurant: "food",
  meal: "food",
  cafe: "cafe",
  coffee: "cafe",
  culture: "culture",
  cultural: "culture",
  museum: "culture",
  gallery: "culture",
  performance: "culture",
  park: "park",
  nature: "park",
  beach: "park",
  local: "local",
  market: "local",
  attraction: "local",
  shopping: "local",
  photo: "local",
  photo_spot: "local",
};

const CATEGORY_LABELS = {
  food: "식사",
  cafe: "카페",
  culture: "문화공간",
  park: "산책",
  local: "로컬 명소",
};

const LOCAL_KEYWORDS = [
  "local",
  "tradition",
  "traditional",
  "history",
  "historic",
  "market",
  "hidden",
  "neighborhood",
  "heritage",
  "village",
  "street",
  "로컬",
  "전통",
  "역사",
  "시장",
  "골목",
  "동네",
  "마을",
  "숨은",
  "명소",
];

export function recommendLocalExperienceRoutes(options = {}) {
  const routeOptions = normalizeRouteOptions(options);
  const relaxedRouteOptions = normalizeRouteOptions({ ...options, minPlaces: 2 });
  const candidatePlaces = prepareCandidatePlaces(routeOptions);
  const routeTemplates = normalizeRouteTemplates(routeOptions.routeTemplates || ROUTE_TEMPLATES, routeOptions);
  const routes = generateRouteCandidates(candidatePlaces, routeTemplates, routeOptions);
  const recommendedRoutes = routes
    .map((route) => buildRecommendedRoute(route, routeOptions))
    .filter((route) => route.totalScore > 0)
    .sort(sortRecommendedRoutes)
    .slice(0, routeOptions.maxRoutes);

  if (recommendedRoutes.length) return recommendedRoutes;

  const flexibleRoutes = generateFlexibleFoodRoutes(candidatePlaces, relaxedRouteOptions)
    .map((route) => buildRecommendedRoute(route, relaxedRouteOptions))
    .filter((route) => route.totalScore > 0)
    .sort(sortRecommendedRoutes)
    .slice(0, relaxedRouteOptions.maxRoutes);

  if (flexibleRoutes.length) return flexibleRoutes;

  return generateFallbackRouteCandidates(candidatePlaces, relaxedRouteOptions)
    .map((route) => buildRecommendedRoute(route, relaxedRouteOptions))
    .filter((route) => route.totalScore > 0)
    .sort(sortRecommendedRoutes)
    .slice(0, relaxedRouteOptions.maxRoutes);
}

export function generateRouteCandidates(candidatePlaces = [], routeTemplates = ROUTE_TEMPLATES, options = {}) {
  const routeOptions = normalizeRouteOptions(options);
  const places = normalizeCandidatePlaces(candidatePlaces)
    .filter(hasUsableCoordinate)
    .sort((a, b) => getPlaceScore(b) - getPlaceScore(a));
  const placesByCategory = groupPlacesByCategory(places, routeOptions.candidatesPerCategory);
  const candidates = [];

  normalizeRouteTemplates(routeTemplates, routeOptions).forEach((template) => {
    const categoryBuckets = template.map((category) => placesByCategory[category] || []);
    if (categoryBuckets.some((bucket) => bucket.length === 0)) return;

    const combinations = buildCombinations(categoryBuckets, routeOptions.maxCombinationsPerTemplate);
    combinations.forEach((route) => {
      const normalizedRoute = normalizeRouteOrder(route, routeOptions);
      if (isValidRoute(normalizedRoute, routeOptions)) {
        candidates.push(normalizedRoute);
      }
    });
  });

  return dedupeRoutes(candidates);
}

export function calculateRouteScore(route = [], options = {}) {
  if (!isValidRoute(route, normalizeRouteOptions(options))) {
    return {
      totalScore: 0,
      averagePlaceScore: 0,
      categoryDiversityScore: 0,
      routeDistanceScore: 0,
      localExperienceScore: 0,
    };
  }

  const averagePlaceScore = calculateAveragePlaceScore(route);
  const categoryDiversityScore = calculateCategoryDiversityScore(route);
  const routeDistanceScore = calculateRouteDistanceScore(route, options);
  const localExperienceScore = calculateLocalExperienceScore(route);
  const repeatedCategoryPenalty = calculateRepeatedCategoryPenalty(route);
  const score =
    ROUTE_SCORE_WEIGHTS.averagePlaceScore * averagePlaceScore +
    ROUTE_SCORE_WEIGHTS.categoryDiversityScore * categoryDiversityScore +
    ROUTE_SCORE_WEIGHTS.routeDistanceScore * routeDistanceScore +
    ROUTE_SCORE_WEIGHTS.localExperienceScore * localExperienceScore;

  return {
    totalScore: roundScore(clamp(score * repeatedCategoryPenalty, 0, 1)),
    averagePlaceScore: roundScore(averagePlaceScore),
    categoryDiversityScore: roundScore(categoryDiversityScore),
    routeDistanceScore: roundScore(routeDistanceScore),
    localExperienceScore: roundScore(localExperienceScore),
  };
}

export function calculateCategoryDiversityScore(route = []) {
  const categories = route.map(getPlaceCategory).filter(Boolean);
  if (!categories.length) return 0;

  return roundScore(new Set(categories).size / categories.length);
}

export function calculateRouteDistanceScore(route = [], options = {}) {
  const routeOptions = normalizeRouteOptions(options);
  const travelPoints = buildTravelPoints(route, routeOptions);
  if (travelPoints.length < 2) return 1;

  const legScores = [];
  let totalDistanceKm = 0;

  for (let i = 0; i < travelPoints.length - 1; i += 1) {
    const distanceKm = getDistanceKm(travelPoints[i], travelPoints[i + 1]);
    totalDistanceKm += distanceKm;
    legScores.push(calculateLegDistanceScore(distanceKm));
  }

  const averageLegScore = average(legScores);
  const totalDistancePenalty =
    totalDistanceKm <= routeOptions.maxTotalDistanceKm
      ? 1
      : clamp(routeOptions.maxTotalDistanceKm / totalDistanceKm, 0.45, 1);

  return roundScore(averageLegScore * totalDistancePenalty);
}

export function calculateLocalExperienceScore(route = []) {
  if (!route.length) return 0.5;

  return roundScore(average(route.map(calculatePlaceLocalExperienceScore)));
}

export function getDistanceKm(placeA = {}, placeB = {}) {
  const a = normalizeCoordinate(placeA);
  const b = normalizeCoordinate(placeB);
  if (!a || !b) return 0;

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

export function createRouteTitle(route = []) {
  const categories = route.map(getPlaceCategory);
  const uniqueCategories = [...new Set(categories)];
  const hasLocal = uniqueCategories.includes("local") || calculateLocalExperienceScore(route) >= 0.7;
  const firstLocalName = route.find((place) => isLocalPlace(place))?.name;
  const regionName = getRegionName(route);

  if (hasLocal && regionName) return `${regionName} 로컬 감성 산책 코스`;
  if (firstLocalName) return `${firstLocalName}부터 즐기는 로컬 코스`;
  if (uniqueCategories.includes("cafe") && uniqueCategories.includes("culture")) {
    return "카페와 문화공간을 함께 즐기는 코스";
  }
  if (uniqueCategories.includes("food") && uniqueCategories.includes("park")) {
    return "식사와 산책 중심의 여유 코스";
  }
  if (uniqueCategories.includes("culture") && uniqueCategories.includes("local")) {
    return "문화와 동네 명소를 잇는 코스";
  }

  return `${uniqueCategories.map((category) => CATEGORY_LABELS[category] || "장소").join(", ")} 코스`;
}

export function createRouteDescription(route = []) {
  const names = route.map((place) => place.name).filter(Boolean);
  const labels = [...new Set(route.map(getPlaceCategory))]
    .map((category) => CATEGORY_LABELS[category] || "장소")
    .join(", ");

  if (!names.length) return "추천 장소를 자연스러운 이동 순서로 묶은 지역 만끽 경로입니다.";

  return `${names[0]}에서 시작해 ${names[names.length - 1]}까지 이어지는 ${route.length}곳 코스입니다. ${labels}을 적절히 섞어 이동 부담과 지역 경험의 균형을 맞췄습니다.`;
}

function buildRecommendedRoute(route, options) {
  const score = calculateRouteScore(route, options);
  const estimatedDistanceKm = calculateEstimatedDistanceKm(route, options);

  return {
    id: createRouteId(route),
    title: createRouteTitle(route),
    description: createRouteDescription(route),
    totalScore: score.totalScore,
    estimatedDistanceKm: roundDistance(estimatedDistanceKm),
    estimatedDurationMinutes: calculateEstimatedDurationMinutes(route, estimatedDistanceKm, options),
    places: route.map(formatRoutePlace),
    scoreBreakdown: {
      averagePlaceScore: score.averagePlaceScore,
      categoryDiversityScore: score.categoryDiversityScore,
      routeDistanceScore: score.routeDistanceScore,
      localExperienceScore: score.localExperienceScore,
    },
  };
}

function prepareCandidatePlaces(options) {
  const rawCandidates = Array.isArray(options.candidatePlaces) ? options.candidatePlaces : [];
  if (!rawCandidates.length) return [];

  const alreadyScored = rawCandidates.some((place) => Number.isFinite(Number(place.recommendationScore || place.score)));
  if (alreadyScored) {
    return normalizeCandidatePlaces(rawCandidates)
      .sort((a, b) => getPlaceScore(b) - getPlaceScore(a))
      .slice(0, options.candidateLimit);
  }

  return recommendPlaces(rawCandidates, options.context || {}, {
    ...(options.recommendationOptions || {}),
    limit: options.candidateLimit,
    weights: {
      ...((options.recommendationOptions || {}).weights || {}),
      distance: 0,
    },
  });
}

function normalizeCandidatePlaces(places = []) {
  return places.map((place) => {
    const lat = toFiniteNumber(place.lat ?? place.y, undefined);
    const lng = toFiniteNumber(place.lng ?? place.x, undefined);
    const normalizedCategory = getPlaceCategory(place);
    const score = normalizePlaceScore(place);

    return {
      ...place,
      id: String(place.id || place.kakaoPlaceId || place.placeId || `${place.name || "place"}-${lat || 0}-${lng || 0}`),
      name: place.name || place.place_name || "이름 없는 장소",
      category: normalizedCategory,
      normalizedCategory,
      lat,
      lng,
      score,
      recommendationScore: score,
      tags: toArray(place.tags),
    };
  });
}

function normalizeRouteOptions(options = {}) {
  const minPlaces = clamp(Math.floor(toFiniteNumber(options.minPlaces, DEFAULT_ROUTE_OPTIONS.minPlaces)), 2, 5);
  const maxPlaces = clamp(Math.floor(toFiniteNumber(options.maxPlaces, DEFAULT_ROUTE_OPTIONS.maxPlaces)), minPlaces, 5);

  return {
    ...DEFAULT_ROUTE_OPTIONS,
    ...options,
    maxRoutes: clamp(Math.floor(toFiniteNumber(options.maxRoutes, DEFAULT_ROUTE_OPTIONS.maxRoutes)), 1, 10),
    minPlaces,
    maxPlaces,
    candidateLimit: clamp(Math.floor(toFiniteNumber(options.candidateLimit, DEFAULT_ROUTE_OPTIONS.candidateLimit)), 3, 80),
    candidatesPerCategory: clamp(
      Math.floor(toFiniteNumber(options.candidatesPerCategory, DEFAULT_ROUTE_OPTIONS.candidatesPerCategory)),
      2,
      12
    ),
    maxCombinationsPerTemplate: clamp(
      Math.floor(toFiniteNumber(options.maxCombinationsPerTemplate, DEFAULT_ROUTE_OPTIONS.maxCombinationsPerTemplate)),
      20,
      2000
    ),
    maxTotalDistanceKm: clamp(toFiniteNumber(options.maxTotalDistanceKm, DEFAULT_ROUTE_OPTIONS.maxTotalDistanceKm), 1, 50),
    userLocation: normalizeCoordinate(options.userLocation),
    destination: normalizeCoordinate(options.destination),
  };
}

function normalizeRouteTemplates(routeTemplates, options) {
  return toArray(routeTemplates)
    .map((template) => toArray(template).map(normalizeCategory).filter(Boolean))
    .filter((template) => template.length >= options.minPlaces)
    .map((template) => template.slice(0, options.maxPlaces));
}

function groupPlacesByCategory(places, limit) {
  return places.reduce((groups, place) => {
    const categories = getMatchingCategories(place);
    categories.forEach((category) => {
      if (!groups[category]) groups[category] = [];
      if (!groups[category].some((item) => item.id === place.id) && groups[category].length < limit) {
        groups[category].push(place);
      }
    });
    return groups;
  }, {});
}

function getMatchingCategories(place) {
  const category = getPlaceCategory(place);
  const categories = new Set([category]);

  if (isLocalPlace(place)) categories.add("local");
  if (category === "beach" || category === "nature") categories.add("park");
  if (category === "attraction" || category === "market" || category === "shopping") categories.add("local");

  return [...categories].filter((item) => ROUTE_TEMPLATES.flat().includes(item));
}

function buildCombinations(buckets, maxCombinations) {
  const results = [];

  function visit(index, selected) {
    if (results.length >= maxCombinations) return;
    if (index >= buckets.length) {
      results.push(selected);
      return;
    }

    buckets[index].forEach((place) => {
      if (!selected.some((item) => item.id === place.id)) {
        visit(index + 1, [...selected, place]);
      }
    });
  }

  visit(0, []);
  return results;
}

function generateFlexibleFoodRoutes(candidatePlaces = [], options = {}) {
  const routeOptions = normalizeRouteOptions({ ...options, minPlaces: 2 });
  const places = normalizeCandidatePlaces(candidatePlaces)
    .filter(hasUsableCoordinate)
    .sort((a, b) => compareFallbackPlaces(a, b, routeOptions));
  const placesByCategory = groupPlacesByCategory(places, routeOptions.candidatesPerCategory);
  const foodPlaces = placesByCategory.food || [];
  if (!foodPlaces.length) return [];

  const routes = foodPlaces
    .slice(0, routeOptions.maxRoutes * 2)
    .map((foodPlace, index) => {
      const selected = [foodPlace];
      const preferredCategories = getFlexiblePreferredCategories(placesByCategory, index);

      preferredCategories.forEach((category) => {
        if (selected.length >= routeOptions.maxPlaces) return;
        const nextPlace = findUnusedPlace(placesByCategory[category] || [], selected);
        if (nextPlace) selected.push(nextPlace);
      });

      if (selected.length < routeOptions.minPlaces) {
        places.forEach((place) => {
          if (selected.length >= routeOptions.maxPlaces) return;
          if (!selected.some((item) => item.id === place.id)) selected.push(place);
        });
      }

      return selected.length >= routeOptions.minPlaces
        ? normalizeRouteOrder(selected, routeOptions)
        : [];
    })
    .filter((route) => route.length >= routeOptions.minPlaces);

  return dedupeRoutes(routes).slice(0, routeOptions.maxRoutes);
}

function getFlexiblePreferredCategories(placesByCategory, offset = 0) {
  const priorityCategories = ["culture", "park"].filter((category) => placesByCategory[category]?.length);
  const optionalCategories = ["cafe", "local"].filter((category) => placesByCategory[category]?.length);
  const categories = [...priorityCategories, ...optionalCategories];

  return categories.slice(offset % Math.max(categories.length, 1)).concat(categories.slice(0, offset % Math.max(categories.length, 1)));
}

function findUnusedPlace(places = [], selected = []) {
  return places.find((place) => !selected.some((item) => item.id === place.id));
}

function generateFallbackRouteCandidates(candidatePlaces = [], options = {}) {
  const routeOptions = normalizeRouteOptions({ ...options, minPlaces: 2 });
  const places = normalizeCandidatePlaces(candidatePlaces)
    .filter(hasUsableCoordinate)
    .sort((a, b) => compareFallbackPlaces(a, b, routeOptions));
  const foodPlaces = places.filter((place) => getPlaceCategory(place) === "food");
  const minPlaces = Math.min(routeOptions.minPlaces, places.length);
  const routeSize = Math.min(routeOptions.maxPlaces, places.length);

  if (places.length < 2 || minPlaces < 2 || !foodPlaces.length) return [];

  const routes = [];
  for (let offset = 0; offset < places.length && routes.length < routeOptions.maxRoutes; offset += 1) {
    const selected = selectDiversePlaces(places.slice(offset).concat(places.slice(0, offset)), routeSize);
    const route = ensureFoodPlace(selected, foodPlaces, routeSize);
    if (route.length >= minPlaces && hasFoodCategory(route)) {
      routes.push(normalizeRouteOrder(route, routeOptions));
    }
  }

  return dedupeRoutes(routes);
}

function compareFallbackPlaces(a, b, options) {
  if (options.userLocation) {
    const distanceDiff = getDistanceKm(options.userLocation, a) - getDistanceKm(options.userLocation, b);
    if (distanceDiff !== 0) return distanceDiff;
  }

  return getPlaceScore(b) - getPlaceScore(a);
}

function selectDiversePlaces(places, limit) {
  const selected = [];
  const categoryCounts = {};

  places.forEach((place) => {
    if (selected.length >= limit) return;

    const category = getPlaceCategory(place);
    const count = categoryCounts[category] || 0;
    if (count >= 2) return;

    selected.push(place);
    categoryCounts[category] = count + 1;
  });

  if (selected.length >= 2) return selected;

  places.forEach((place) => {
    if (selected.length >= limit) return;
    if (!selected.some((item) => item.id === place.id)) selected.push(place);
  });

  return selected;
}

function ensureFoodPlace(route = [], foodPlaces = [], limit = route.length) {
  if (hasFoodCategory(route)) return route;

  const foodPlace = foodPlaces.find((place) => !route.some((item) => item.id === place.id));
  if (!foodPlace) return route;

  if (route.length < limit) return [foodPlace, ...route];

  return [foodPlace, ...route.slice(1)];
}

function hasFoodCategory(route = []) {
  return route.some((place) => getPlaceCategory(place) === "food");
}

function normalizeRouteOrder(route, options) {
  if (!options.userLocation || route.length < 3) return route;

  const firstIndex = route.reduce(
    (best, place, index) => {
      const distanceKm = getDistanceKm(options.userLocation, place);
      return distanceKm < best.distanceKm ? { index, distanceKm } : best;
    },
    { index: 0, distanceKm: Number.POSITIVE_INFINITY }
  ).index;

  if (firstIndex === 0) return route;

  return [...route.slice(firstIndex), ...route.slice(0, firstIndex)];
}

function isValidRoute(route, options) {
  if (!Array.isArray(route) || route.length < options.minPlaces || route.length > options.maxPlaces) return false;
  if (new Set(route.map((place) => place.id)).size !== route.length) return false;

  const counts = countCategories(route);
  if (Object.values(counts).some((count) => count >= 3)) return false;

  return route.every(hasUsableCoordinate);
}

function dedupeRoutes(routes) {
  const seen = new Set();

  return routes.filter((route) => {
    const key = route.map((place) => place.id).join(">");
    const reverseKey = [...route].reverse().map((place) => place.id).join(">");
    if (seen.has(key) || seen.has(reverseKey)) return false;
    seen.add(key);
    return true;
  });
}

function calculateAveragePlaceScore(route) {
  if (!route.length) return 0;
  return roundScore(average(route.map(getPlaceScore)));
}

function calculateLegDistanceScore(distanceKm) {
  if (distanceKm <= 0.5) return 1;
  if (distanceKm <= 1.5) return 0.85;
  if (distanceKm <= 3) return 0.6;
  if (distanceKm <= 5) return 0.35;
  return 0.1;
}

function calculatePlaceLocalExperienceScore(place = {}) {
  if (Number.isFinite(Number(place.localScore))) return clamp(Number(place.localScore), 0, 1);
  if (place.isLocal) return 1;
  if (Number.isFinite(Number(place.culturalValue))) return normalizeFlexibleScore(place.culturalValue);
  if (Number.isFinite(Number(place.localRank))) return clamp(1 - (Number(place.localRank) - 1) / 20, 0.2, 1);

  const localReviewCount = Number(place.localReviewCount);
  const reviewCount = Number(place.reviewCount || place.googleReviewCount || 0);
  const reviewSignal =
    Number.isFinite(localReviewCount) && localReviewCount > 0
      ? clamp(reviewCount > 0 ? localReviewCount / reviewCount : localReviewCount / 50, 0.55, 1)
      : undefined;
  const keywordSignal = isLocalPlace(place) ? 0.85 : undefined;
  const signals = [reviewSignal, keywordSignal].filter((value) => Number.isFinite(value));

  return signals.length ? roundScore(average(signals)) : 0.5;
}

function calculateRepeatedCategoryPenalty(route) {
  const counts = countCategories(route);
  if (Object.values(counts).some((count) => count >= 3)) return 0.25;
  if (Object.values(counts).some((count) => count === 2)) return 0.9;
  return 1;
}

function calculateEstimatedDistanceKm(route, options) {
  const points = buildTravelPoints(route, normalizeRouteOptions(options));
  let total = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    total += getDistanceKm(points[i], points[i + 1]);
  }

  return total;
}

function calculateEstimatedDurationMinutes(route, estimatedDistanceKm, options) {
  const routeOptions = normalizeRouteOptions(options);
  const movingMinutes = (estimatedDistanceKm / routeOptions.walkingKmPerHour) * 60;
  const stopMinutes = route.length * routeOptions.stopDurationMinutes;

  return Math.max(15, Math.round(movingMinutes + stopMinutes));
}

function sortRecommendedRoutes(a, b) {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  return a.estimatedDistanceKm - b.estimatedDistanceKm;
}

function buildTravelPoints(route, options) {
  return [options.userLocation, ...route, options.destination].filter(Boolean);
}

function formatRoutePlace(place) {
  return {
    id: place.id,
    name: place.name,
    category: getPlaceCategory(place),
    lat: Number(place.lat),
    lng: Number(place.lng),
    score: roundScore(getPlaceScore(place)),
    reason: createPlaceReason(place),
  };
}

function createPlaceReason(place) {
  const categoryLabel = CATEGORY_LABELS[getPlaceCategory(place)] || "장소";
  const localText = isLocalPlace(place) ? "지역성이 돋보이고 " : "";
  return `${localText}${categoryLabel} 흐름에 잘 맞는 추천 장소입니다.`;
}

function createRouteId(route) {
  return `local-route-${route.map((place) => place.id).join("-")}`;
}

function getPlaceScore(place = {}) {
  return clamp(Number(place.recommendationScore ?? place.score ?? place.rating ?? 0.5), 0, 1);
}

function normalizePlaceScore(place = {}) {
  const rawScore = Number(place.recommendationScore ?? place.score ?? place.rating ?? 0.5);
  if (!Number.isFinite(rawScore)) return 0.5;
  if (rawScore > 5) return clamp(rawScore / 100, 0, 1);
  if (rawScore > 1) return clamp(rawScore / 5, 0, 1);
  return clamp(rawScore, 0, 1);
}

function getPlaceCategory(place = {}) {
  return normalizeCategory(
    place.normalizedCategory ||
      place.category ||
      place.categoryCode ||
      place.kakaoCategoryCode ||
      place.categoryName ||
      place.type ||
      place.categoryPath
  );
}

function normalizeCategory(value = "") {
  const token = normalizeToken(value);
  return CATEGORY_ALIASES[token] || inferCategoryFromText(token) || token || "local";
}

function inferCategoryFromText(text = "") {
  if (/음식|식당|맛집|한식|중식|일식|양식|분식|밥|restaurant|food/.test(text)) return "food";
  if (/카페|커피|디저트|cafe|coffee/.test(text)) return "cafe";
  if (/문화|전시|공연|박물관|미술관|영화|도서|culture|museum|gallery/.test(text)) return "culture";
  if (/공원|산책|해변|숲|정원|park|beach|trail/.test(text)) return "park";
  if (/시장|골목|명소|관광|거리|마을|local|market|street|attraction/.test(text)) return "local";
  return "";
}

function isLocalPlace(place = {}) {
  if (place.isLocal) return true;

  const text = [
    place.name,
    place.category,
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

  return LOCAL_KEYWORDS.some((keyword) => text.includes(normalizeToken(keyword)));
}

function getRegionName(route) {
  const searchable = route
    .map((place) => place.region || place.district || place.address || place.roadAddress || place.addressName)
    .filter(Boolean)
    .join(" ");
  const match = searchable.match(/[가-힣A-Za-z0-9]+(?:동|구|군|시|읍|면|리|해운대|광안리|성수|연남|종로)/);

  return match?.[0] || "";
}

function countCategories(route) {
  return route.reduce((counts, place) => {
    const category = getPlaceCategory(place);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
}

function hasUsableCoordinate(place = {}) {
  return Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng));
}

function normalizeCoordinate(location = {}) {
  const lat = Number(location.lat ?? location.y);
  const lng = Number(location.lng ?? location.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;

  return { ...location, lat: clamp(lat, -90, 90), lng: clamp(lng, -180, 180) };
}

function normalizeFlexibleScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0.5;
  if (score > 5) return clamp(score / 100, 0, 1);
  if (score > 1) return clamp(score / 5, 0, 1);
  return clamp(score, 0, 1);
}

function average(values = []) {
  const safeValues = values.filter((value) => Number.isFinite(Number(value)));
  if (!safeValues.length) return 0;

  return safeValues.reduce((sum, value) => sum + Number(value), 0) / safeValues.length;
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeToken(value = "") {
  return String(value).trim().toLowerCase();
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function roundDistance(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
