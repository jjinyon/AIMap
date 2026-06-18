import { getTourApiStory } from "../publicApi/tourismService.js";
import { getWikipediaStory } from "../publicApi/wikipediaService.js";
import { loadReviews, summarizeReviews } from "./reviewSummaryService.js";
import { getRegionStories, inferRegion } from "./regionStoryService.js";

const CARD_ORDER = ["region_origin", "legend", "history", "culture", "place_story", "local_review", "visit_tip"];
const REVIEW_MIN_COUNT = 2;

export async function generateStoryCards({ location = {}, place = null, reviews = null, context = {} } = {}) {
  const regionStories = await getRegionStories(location, context);
  const cards = regionStories.map(regionStoryToCard);
  const selectedPlace = place || context.place || context.nearbyStoryPlace || null;

  if (selectedPlace) {
    const placeStory = await getPlaceStory(selectedPlace, context);
    if (placeStory) cards.push(placeStory);

    const localReviewStory = await getLocalReviewStory(selectedPlace, reviews, context);
    if (localReviewStory) cards.push(localReviewStory);

    const visitTip = getVisitTipStory(selectedPlace, location);
    if (visitTip) cards.push(visitTip);
  } else {
    const regionVisitTip = getRegionVisitTip(location);
    if (regionVisitTip) cards.push(regionVisitTip);
  }

  return sortStoryCards(dedupeCards(cards));
}

export async function getPlaceStory(place = {}, context = {}) {
  const externalStory =
    (await getTourApiStory(place, context.tourism).catch(() => null)) ||
    (await getWikipediaStory(place, context.wikipedia).catch(() => null));

  if (externalStory?.script) {
    return makeCard({
      id: `place-story-${safeId(place.id || place.name)}-${externalStory.source || "external"}`,
      type: "place_story",
      title: `${normalizePlaceName(place)} 이야기`,
      summary: externalStory.title || `${normalizePlaceName(place)}에 대해 확인된 자료를 바탕으로 만든 이야기`,
      script: externalStory.script,
      sourceType: externalStory.source || "external_source",
      sourceName: externalStory.sourceName,
      sourceUrl: externalStory.sourceUrl,
    });
  }

  const name = normalizePlaceName(place);
  const category = place.categoryName || place.type || place.category || "장소";
  const factualParts = [
    makeReviewBasedPlaceStorySeed(place, context),
    place.audioStoryHint,
    place.description,
    place.summary,
    place.address ? `${name}의 주소는 ${place.address}입니다.` : "",
    category ? `분류상으로는 ${category}에 가까운 장소입니다.` : "",
  ].filter(Boolean);

  if (!factualParts.length) return null;

  const script = [
    `${name}을 그냥 목적지로만 지나치면 조금 아쉽습니다.`,
    ...factualParts.slice(0, 3),
    "지금 보이는 정보는 확인된 장소 정보와 방문자 반응을 바탕으로 엮은 짧은 오디오 카드입니다.",
  ].join(" ");

  return makeCard({
    id: `place-story-${safeId(place.id || place.name)}`,
    type: "place_story",
    title: `${name} 이야기`,
    summary: factualParts[0],
    script,
    sourceType: "place_data",
    sourceName: "장소 정보",
    sourceUrl: place.url || "",
  });
}

function makeReviewBasedPlaceStorySeed(place = {}, context = {}) {
  const reviews = [
    ...(Array.isArray(place.generatedLocalReviews) ? place.generatedLocalReviews : []),
    ...(Array.isArray(context.generatedLocalReviews) ? context.generatedLocalReviews : []),
  ].filter((review) => review.text || review.content);

  if (reviews.length < 2) return "";

  const name = normalizePlaceName(place);
  const snippets = reviews
    .slice(0, 2)
    .map((review) => review.text || review.content)
    .join(" ");
  return `${name}에 대한 로컬 리뷰를 보면 이런 표현들이 눈에 띕니다. ${snippets}`;
}

export async function getLocalReviewStory(place = {}, reviews = null, context = {}) {
  const reviewList = Array.isArray(reviews) ? reviews : await loadReviews(place, context.reviews).catch(() => []);
  const normalizedReviews = reviewList
    .map((review) => ({
      rating: Number(review.rating || 0),
      text: review.text || review.content || "",
      authorName: review.authorName || review.userNickname || "",
    }))
    .filter((review) => review.text);

  if (normalizedReviews.length < REVIEW_MIN_COUNT) return null;

  const summary = summarizeReviews(normalizedReviews, place);
  if (!summary?.script) return null;

  return makeCard({
    id: `local-review-${safeId(place.id || place.name)}`,
    type: "local_review",
    title: `방문자들이 말한 ${normalizePlaceName(place)}`,
    summary: summary.vibe || "방문자 리뷰에서 자주 언급된 분위기와 장점을 요약했습니다.",
    script: summary.script,
    sourceType: "local_review_summary",
    sourceName: "방문자 리뷰 요약",
    sourceUrl: place.url || "",
  });
}

function regionStoryToCard(story = {}) {
  return makeCard({
    id: `${story.regionId}-${story.storyType}`,
    type: story.type,
    title: story.title,
    summary: makeSummary(story.content),
    script: story.content,
    sourceType: story.sourceType || "region_story_db",
    sourceName: story.sourceName || `${story.regionName} 지역 스토리`,
    sourceUrl: story.sourceUrl || "",
    distanceKm: story.distanceKm,
  });
}

function getVisitTipStory(place = {}, location = {}) {
  const name = normalizePlaceName(place);
  const tips = [];

  if (place.distance) tips.push(`현재 위치에서 약 ${Math.max(1, Math.round(Number(place.distance)))}미터 거리에 있습니다.`);
  if (place.address) tips.push(`주소는 ${place.address}입니다.`);
  if (/FD6|음식|식당|맛집|카페|CE7/i.test(`${place.category || ""} ${place.categoryName || ""} ${place.type || ""}`)) {
    tips.push("식당이나 카페라면 수업 직후와 식사 시간대에 분위기가 크게 달라질 수 있습니다. 조금 여유롭게 듣고 싶다면 붐비는 시간을 살짝 비켜 가 보세요.");
  } else {
    tips.push("주변 경로와 동선을 함께 보는 장소라면, 바로 도착하기보다 한 블록 정도 천천히 걸으며 분위기를 들어보는 편이 좋습니다.");
  }

  if (!tips.length && !location?.lat) return null;

  return makeCard({
    id: `visit-tip-${safeId(place.id || name)}`,
    type: "visit_tip",
    title: `${name} 방문 팁`,
    summary: tips[0],
    script: tips.join(" "),
    sourceType: "derived_context",
    sourceName: "현재 위치와 장소 정보",
    sourceUrl: place.url || "",
  });
}

function getRegionVisitTip(location = {}) {
  const region = inferRegion(location);
  if (!region) return null;

  return makeCard({
    id: `${region.regionId}-visit-tip`,
    type: "visit_tip",
    title: `${region.regionName}에서 듣는 순서`,
    summary: "지명, 역사, 문화 카드 순서로 들으면 지역의 인상이 더 자연스럽게 이어집니다.",
    script: `${region.regionName}에 있다면 먼저 지명이나 역사 카드를 들어보세요. 그 다음 문화 카드와 방문 팁을 들으면, 지금 걷고 있는 길과 주변 장소가 조금 더 입체적으로 보입니다.`,
    sourceType: "derived_context",
    sourceName: "현재 위치 기반 안내",
  });
}

function sortStoryCards(cards = []) {
  return [...cards].sort((a, b) => CARD_ORDER.indexOf(a.type) - CARD_ORDER.indexOf(b.type));
}

function dedupeCards(cards = []) {
  const seen = new Set();
  return cards.filter((card) => {
    if (!card?.id || seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

function makeCard(card = {}) {
  const script = String(card.script || "").trim();
  return {
    id: card.id,
    type: card.type,
    title: card.title || "지역 이야기",
    summary: card.summary || makeSummary(script),
    script,
    narrationScript: makeNarrationScript(card.title, script),
    sourceType: card.sourceType || "unknown",
    durationSeconds: estimateDurationSeconds(script),
    sourceName: card.sourceName || getSourceName(card.sourceType),
    sourceUrl: card.sourceUrl || "",
    distanceKm: card.distanceKm || 0,
  };
}

function makeNarrationScript(title = "", script = "") {
  const cleanScript = String(script || "").replace(/\s+/g, " ").trim();
  if (!cleanScript) return "";

  return [
    "잠깐만요. 지금 들려드릴 이야기는",
    title ? `${title}입니다.` : "이 장소에 관한 짧은 이야기입니다.",
    cleanScript,
    "이제 주변을 한 번 둘러보세요. 방금 들은 문장이 풍경에서 하나쯤 보일지도 모릅니다.",
  ].join(" ");
}

function estimateDurationSeconds(script = "") {
  const textLength = String(script).replace(/\s+/g, "").length;
  return Math.max(18, Math.round(textLength / 4.7));
}

function makeSummary(content = "") {
  const normalized = String(content).replace(/\s+/g, " ").trim();
  if (normalized.length <= 58) return normalized;
  return `${normalized.slice(0, 58)}...`;
}

function normalizePlaceName(place = {}) {
  return String(place.name || place.place_name || "선택한 장소").trim();
}

function safeId(value = "") {
  return String(value || "story")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSourceName(sourceType = "") {
  if (sourceType === "region_story_db") return "지역 스토리 DB";
  if (sourceType === "local_review_summary") return "방문자 리뷰 요약";
  if (sourceType === "derived_context") return "현재 위치 기반 안내";
  if (sourceType === "place_data") return "장소 정보";
  if (sourceType === "tour-api") return "한국관광공사";
  if (sourceType === "wikipedia") return "Wikipedia";
  return "AIMap";
}
