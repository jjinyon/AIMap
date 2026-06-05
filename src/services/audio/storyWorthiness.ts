import type { Place, PlaceCategory } from "../../types/place";

export type StoryPlaceInput = Partial<Place> & {
  categoryName?: string;
  categoryPath?: string;
  type?: string;
};

const ALLOWED_STORY_CATEGORIES = new Set<PlaceCategory>([
  "culture",
  "park",
  "heritage",
  "attraction",
  "museum",
  "market",
  "beach",
  "temple",
  "architecture",
]);

const BLOCKED_STORY_CATEGORIES = new Set<PlaceCategory>([
  "food",
  "cafe",
  "convenience",
  "bank",
  "parking",
  "pharmacy",
  "hotel",
]);

const CULTURAL_KEYWORDS =
  /문화|공연|전시|미술관|박물관|공원|호수|광장|시장|역사|유적|기념|전통|전망|관광|해변|해수욕장|사찰|절|건축|다리|전망대|산책|둘레길|성당|교회/i;

const BLOCKED_KEYWORDS = /음식|식당|맛집|카페|커피|디저트|편의점|은행|주차|약국|호텔|숙박/i;

export interface StoryWorthinessOptions {
  minimumScore?: number;
  reviewCountCap?: number;
  culturalValueWeight?: number;
  reviewCountWeight?: number;
  keywordBonus?: number;
}

export interface StoryWorthinessResult {
  worthy: boolean;
  score: number;
  category: PlaceCategory;
  reason: "allowed" | "blocked_category" | "blocked_keyword" | "low_score";
}

export function isStoryWorthyPlace(place: StoryPlaceInput = {}, options: StoryWorthinessOptions = {}): boolean {
  return getStoryWorthiness(place, options).worthy;
}

export function getStoryWorthiness(
  place: StoryPlaceInput = {},
  options: StoryWorthinessOptions = {}
): StoryWorthinessResult {
  const category = place.category ?? "unknown";
  const searchableText = getSearchablePlaceText(place);

  if (BLOCKED_STORY_CATEGORIES.has(category)) {
    return makeResult(false, 0, category, "blocked_category");
  }

  if (BLOCKED_KEYWORDS.test(searchableText) && !ALLOWED_STORY_CATEGORIES.has(category)) {
    return makeResult(false, 0, category, "blocked_keyword");
  }

  const isAllowedCategory = ALLOWED_STORY_CATEGORIES.has(category);
  const hasCulturalKeyword = CULTURAL_KEYWORDS.test(searchableText);

  if (!isAllowedCategory && !hasCulturalKeyword) {
    return makeResult(false, 0, category, "blocked_category");
  }

  const minimumScore = options.minimumScore ?? 0.58;
  const culturalValueWeight = options.culturalValueWeight ?? 0.7;
  const reviewCountWeight = options.reviewCountWeight ?? 0.25;
  const keywordBonus = hasCulturalKeyword ? (options.keywordBonus ?? 0.05) : 0;
  const culturalValue = clamp(Number(place.culturalValue ?? 0), 0, 1);
  const reviewScore = normalizeReviewCount(place.reviewCount, options.reviewCountCap ?? 3000);
  const score = clamp(culturalValue * culturalValueWeight + reviewScore * reviewCountWeight + keywordBonus, 0, 1);

  if (score < minimumScore) {
    return makeResult(false, roundScore(score), category, "low_score");
  }

  return makeResult(true, roundScore(score), category, "allowed");
}

function getSearchablePlaceText(place: StoryPlaceInput): string {
  return [
    place.name,
    place.category,
    place.address,
    place.categoryName,
    place.categoryPath,
    place.type,
    place.kakaoCategoryCode,
    place.kakaoCategoryName,
    place.kakaoCategoryPath,
    place.audioStoryHint,
    ...(place.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeReviewCount(reviewCount = 0, cap = 3000): number {
  const safeReviewCount = Math.max(0, Number(reviewCount) || 0);
  const safeCap = Math.max(1, Number(cap) || 3000);

  return clamp(Math.log1p(safeReviewCount) / Math.log1p(safeCap), 0, 1);
}

function makeResult(
  worthy: boolean,
  score: number,
  category: PlaceCategory,
  reason: StoryWorthinessResult["reason"]
): StoryWorthinessResult {
  return { worthy, score, category, reason };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(value * 10000) / 10000;
}
