import { fetchGoogleReviewMetricsForPlaces } from "../googlePlacesService.js";
import { fetchPlaceReviews } from "../reviewService.js";

const KEYWORD_RULES = [
  { keyword: "야경", patterns: [/야경/, /뷰/, /전망/, /night/i, /view/i] },
  { keyword: "산책", patterns: [/산책/, /걷기/, /walk/i] },
  { keyword: "분위기", patterns: [/분위기/, /감성/, /조용/, /cozy/i, /atmosphere/i] },
  { keyword: "맛집", patterns: [/맛/, /메뉴/, /음식/, /delicious/i, /food/i] },
  { keyword: "사진", patterns: [/사진/, /포토/, /인생샷/, /photo/i] },
  { keyword: "친절", patterns: [/친절/, /서비스/, /kind/i, /service/i] },
];

export async function getReviewSummary(place, options = {}) {
  try {
    const reviews = await loadReviews(place, options);
    const summary = summarizeReviews(reviews, place);

    return summary.script ? summary : null;
  } catch {
    return null;
  }
}

export async function loadReviews(place = {}, options = {}) {
  const [googleMetrics, localPayload] = await Promise.all([
    fetchGoogleReviewMetricsForPlaces([place], options.google).catch(() => ({})),
    fetchPlaceReviews(place.id).catch(() => ({ reviews: [] })),
  ]);
  const googleReviews = Object.values(googleMetrics)[0]?.reviews || [];
  const localReviews = localPayload.reviews || [];

  return [...googleReviews.map(normalizeGoogleReview), ...localReviews.map(normalizeLocalReview)].filter(
    (review) => review.text
  );
}

export function summarizeReviews(reviews = [], place = {}) {
  if (!reviews.length) {
    return {
      source: "review-summary",
      sourceName: "Google 리뷰",
      sourceUrl: place.url || "",
      title: place.name || "현재 장소",
      script: "",
      keywords: [],
      vibe: "",
      reviewCount: 0,
    };
  }

  const keywords = extractPositiveKeywords(reviews);
  const mainKeyword = keywords[0] || inferKeywordFromPlace(place);
  const vibe = makeLocalVibeSentence(place, mainKeyword, reviews);

  return {
    source: "review-summary",
    sourceName: "Google 리뷰",
    sourceUrl: place.url || "",
    title: place.name || "현재 장소",
    script: `${vibe} 방문자 리뷰를 보면 ${keywords.slice(0, 3).join(", ") || "분위기"}에 대한 언급이 많습니다. 잠시 머물며 이 장소의 일상적인 표정을 느껴보세요.`,
    keywords,
    vibe,
    reviewCount: reviews.length,
  };
}

export function extractPositiveKeywords(reviews = []) {
  const positiveReviews = reviews.filter((review) => !review.rating || review.rating >= 4);
  const text = positiveReviews.map((review) => review.text).join(" ");

  return KEYWORD_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map(
    (rule) => rule.keyword
  );
}

export function makeLocalVibeSentence(place = {}, keyword = "", reviews = []) {
  const name = place.name || "이곳";
  const category = place.categoryName || place.type || place.category || "장소";
  const countPhrase = reviews.length >= 3 ? "여러 방문자들이" : "방문자들이";

  if (keyword === "야경") return `${name}은 현지인들이 야경 맛집으로 자주 추천하는 ${category}입니다.`;
  if (keyword === "산책") return `${name}은 ${countPhrase} 가볍게 걷기 좋다고 말하는 ${category}입니다.`;
  if (keyword === "맛집") return `${name}은 ${countPhrase} 맛과 만족감을 함께 이야기하는 ${category}입니다.`;
  if (keyword === "사진") return `${name}은 사진으로 남기기 좋은 순간이 많은 ${category}입니다.`;

  return `${name}은 ${countPhrase} 분위기가 좋다고 남긴 ${category}입니다.`;
}

function inferKeywordFromPlace(place = {}) {
  const category = `${place.categoryName || ""} ${place.categoryPath || ""} ${place.type || ""}`;
  if (/음식|식당|카페|술집/.test(category)) return "맛집";
  if (/관광|공원|해변|전망/.test(category)) return "산책";
  if (/문화|전시|공연/.test(category)) return "분위기";
  return "분위기";
}

function normalizeGoogleReview(review = {}) {
  return {
    rating: Number(review.rating || 0),
    text: review.text || "",
    authorName: review.authorName || "",
  };
}

function normalizeLocalReview(review = {}) {
  return {
    rating: Number(review.rating || 0),
    text: review.content || review.text || "",
    authorName: review.userNickname || "",
  };
}
