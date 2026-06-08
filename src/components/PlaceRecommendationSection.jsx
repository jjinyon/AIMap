import { InfoSection } from "./PlaceStorySection.jsx";

const h = window.React.createElement;

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
                  "button",
                  { className: "place-recommendation-main", type: "button", onClick: () => onSelectRecommended?.(item) },
                  h("strong", null, item.name),
                  h("span", null, item.aiReason || item.summary || item.address || "관련 장소")
                ),
                onToggleSave
                  ? h(
                      "button",
                      {
                        className: savedPlaceIds?.has(item.kakaoPlaceId || item.id) ? "place-recommendation-save active" : "place-recommendation-save",
                        type: "button",
                        "aria-label": `${item.name} 저장`,
                        onClick: () => onToggleSave(item),
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
