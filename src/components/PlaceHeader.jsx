const h = window.React.createElement;

export function PlaceHeader({ place, isSaved = false, onClose, onSave }) {
  return h(
    "header",
    { className: "place-page-toolbar" },
    h("button", { className: "place-page-icon-button", type: "button", "aria-label": "장소 상세 닫기", onClick: onClose }, "x"),
    h("p", null, place.name || "장소 상세"),
    onSave
      ? h(
          "button",
          {
            className: isSaved ? "place-page-icon-button active" : "place-page-icon-button",
            type: "button",
            "aria-label": `${place.name || "장소"} 저장`,
            "aria-pressed": isSaved,
            onClick: () => onSave(place),
          },
          "♡"
        )
      : h("span", { className: "place-page-toolbar-spacer", "aria-hidden": "true" })
  );
}

export function getPlaceDescription(place = {}) {
  const category = place.categoryPath || place.categoryName || place.type || "장소";
  const address = place.address ? `${place.address}에 있는 ` : "";
  const distance = place.distance ? ` 현재 위치에서 약 ${Math.round(Number(place.distance))}m 떨어져 있습니다.` : "";
  const phone = place.phone ? ` 문의 전화는 ${place.phone}입니다.` : "";

  return place.description || place.reviewText || place.summary || `카카오 장소 검색에서 확인한 ${address}${category}입니다.${distance}${phone}`;
}

export function getPlaceRating(place = {}) {
  const rating = Number(place.rating || place.googleRating || place.localRating || 0);
  return Number.isFinite(rating) && rating > 0 ? rating : 0;
}

export function getPlaceReviewCount(place = {}) {
  return Number(place.reviewCount || place.googleReviewCount || place.localReviewCount || 0);
}

export function getPlaceRecommendationScore(place = {}) {
  const rawScore = Number(place.recommendationScore || place.score || 0);
  if (!rawScore) return 0;

  const score = rawScore <= 1 ? rawScore * 100 : rawScore <= 5 ? rawScore * 20 : rawScore;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getPlaceTags(place = {}) {
  const sourceTags = Array.isArray(place.tags) ? place.tags : [];
  const text = `${place.categoryPath || ""} ${place.categoryName || ""} ${place.type || ""} ${place.summary || ""} ${place.description || ""}`;
  const inferredTags = [
    /카페|cafe|CE7/i.test(text) ? "공부" : "",
    /조용|quiet|공부/i.test(text) ? "조용함" : "",
    place.aiReason || place.recommendationScore ? "학생추천" : "",
    /음식|맛집|식당|FD6/i.test(text) ? "맛집" : "",
  ];

  return [...sourceTags, ...inferredTags]
    .map((tag) => String(tag || "").replace(/^#/, "").trim())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.indexOf(tag) === index)
    .slice(0, 4);
}
