import {
  getPlaceRating,
  getPlaceRecommendationScore,
  getPlaceReviewCount,
  getPlaceTags,
} from "./PlaceHeader.jsx";

const h = window.React.createElement;

export function PlaceSummary({ place }) {
  const rating = getPlaceRating(place);
  const reviewCount = getPlaceReviewCount(place);
  const score = getPlaceRecommendationScore(place);
  const tags = getPlaceTags(place);
  const distance = Number(place.distance || 0);

  return h(
    "section",
    { className: "place-summary" },
    h("p", { className: "place-summary-category" }, place.categoryPath || place.categoryName || place.type || "장소"),
    h("h1", null, place.name || "이름 없는 장소"),
    rating
      ? h(
          "p",
          { className: "place-summary-rating" },
          h("span", { "aria-hidden": "true" }, "★★★★★"),
          ` ${rating.toFixed(1)}${reviewCount ? ` (${reviewCount})` : ""}`
        )
      : h("p", { className: "place-page-empty" }, "평점 정보가 아직 없습니다."),
    distance ? h("p", { className: "place-summary-distance" }, `📍 ${Math.round(distance)}m`) : null,
    score ? h("p", { className: "place-summary-score" }, `추천도 ${score}점`) : null,
    tags.length
      ? h(
          "div",
          { className: "place-summary-tags" },
          tags.map((tag) => h("span", { key: tag }, `#${tag}`))
        )
      : h("p", { className: "place-page-empty" }, "아직 정리된 태그가 없습니다.")
  );
}
