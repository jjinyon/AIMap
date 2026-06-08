import { InfoSection } from "./PlaceStorySection.jsx";

const h = window.React.createElement;

function getCategoryIcon(category) {
  const icons = {
    food: "🍽️",
    cafe: "☕",
    culture: "🏛️",
    park: "🌳",
    shopping: "🛍️",
    photo_spot: "📸",
    convenience: "🏪",
  };
  return icons[category] || "📍";
}

function formatDistance(distanceKm = 0) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

export function PlaceRecommendationSection({
  recommendedPlaces = [],
  routeStatus = "",
  nearbyStatus = "",
  savedPlaceIds,
  onSelectRecommended,
  onToggleSave,
}) {
  return h(
    "div",
    { className: "place-page-section-group" },
    h(
      InfoSection,
      { title: "추천 장소" },
      nearbyStatus ? h("p", { className: "place-page-muted" }, nearbyStatus) : null,
      recommendedPlaces.length
        ? h(
            "div",
            { className: "place-recommendation-list" },
            recommendedPlaces.map((item) =>
              h(
                "article",
                { className: "place-recommendation-item", key: item.id },
                h(
                  "div",
                  { className: "place-recommendation-main", onClick: () => onSelectRecommended?.(item) },
                  h("div", { className: "place-recommendation-header" },
                    h("div", { className: "place-recommendation-title-section" },
                      h("div", { className: "place-recommendation-icon" }, getCategoryIcon(item.category)),
                      h("strong", null, item.name),
                    ),
                  ),
                  h("div", { className: "place-recommendation-meta" },
                    h("span", { className: "place-recommendation-category" }, item.categoryName || item.type || "장소"),
                    item.distanceKm !== undefined ? h("span", { className: "place-recommendation-distance" }, `📍 ${formatDistance(item.distanceKm)}`) : null,
                  ),
                  h("p", { className: "place-recommendation-description" }, item.aiReason || item.summary || item.address || "관련 장소")
                ),
                onToggleSave
                  ? h(
                      "button",
                      {
                        className: savedPlaceIds?.has(item.kakaoPlaceId || item.id) ? "place-recommendation-save active" : "place-recommendation-save",
                        type: "button",
                        "aria-label": `${item.name} 저장`,
                        onClick: (e) => {
                          e.stopPropagation();
                          onToggleSave(item);
                        },
                      },
                      "♡"
                    )
                  : null
              )
            )
          )
        : h("p", { className: "place-page-empty" }, "아직 추천할 관련 장소가 없습니다.")
    ),
    h(
      InfoSection,
      { title: "추천 경로" },
      h("p", { className: routeStatus ? "" : "place-page-empty" }, routeStatus || "추천 경로를 선택하면 여기에 경로 정보가 표시됩니다.")
    )
  );
}
