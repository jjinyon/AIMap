import { getPlaceDescription } from "./PlaceHeader.jsx";

const h = window.React.createElement;

export function PlaceInfoSection({
  place,
  recommendedPlaces = [],
  routeStatus = "",
  nearbyStatus = "",
  savedPlaceIds,
  onSelectRecommended,
  onToggleSave,
}) {
  return h(
    "div",
    { className: "place-info-sections" },
    h(InfoBlock, { title: "장소 소개" }, h("p", null, getPlaceDescription(place))),
    h(InfoBlock, { title: "AI 생성 장소 이야기" }, h("p", null, makeStory(place))),
    h(InfoBlock, { title: "운영 정보" }, h(EmptyOrText, { value: place.openingHours || place.businessHours, empty: "운영시간 정보가 아직 없습니다." })),
    h(InfoBlock, { title: "주소" }, h(EmptyOrText, { value: place.address, empty: "주소 정보가 아직 없습니다." })),
    h(InfoBlock, { title: "전화번호" }, h(EmptyOrText, { value: place.phone, empty: "전화번호 정보가 아직 없습니다." })),
    h(
      InfoBlock,
      { title: "추천 장소" },
      nearbyStatus ? h("p", { className: "place-detail-muted" }, nearbyStatus) : null,
      recommendedPlaces.length
        ? h(
            "div",
            { className: "place-related-list" },
            recommendedPlaces.map((item) =>
              h(
                "article",
                { className: "place-related-item", key: item.id },
                h(
                  "button",
                  { className: "place-related-main", type: "button", onClick: () => onSelectRecommended?.(item) },
                  h("strong", null, item.name),
                  h("span", null, item.aiReason || item.summary || item.address || "관련 장소")
                ),
                onToggleSave
                  ? h(
                      "button",
                      {
                        className: savedPlaceIds?.has(item.kakaoPlaceId || item.id) ? "place-related-save active" : "place-related-save",
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
        : h("p", { className: "place-detail-empty" }, "아직 추천할 관련 장소가 없습니다.")
    ),
    h(InfoBlock, { title: "추천 경로" }, h("p", { className: routeStatus ? "" : "place-detail-empty" }, routeStatus || "추천 경로를 선택하면 여기에 경로 정보가 표시됩니다."))
  );
}

function InfoBlock({ title, children }) {
  return h("section", { className: "place-info-block" }, h("h2", null, title), children);
}

function EmptyOrText({ value, empty }) {
  return value ? h("p", null, value) : h("p", { className: "place-detail-empty" }, empty);
}

function makeStory(place = {}) {
  const name = place.name || "이 장소";
  const category = place.categoryName || place.type || "장소";
  const mood = place.summary || place.aiReason || "방문자들이 머무는 분위기와 주변 동선이 이 장소의 인상을 만듭니다.";

  return `${name}은 ${category}의 성격을 가진 장소입니다. ${mood} 실제 리뷰와 위치 정보를 바탕으로 더 풍부한 이야기를 준비할 수 있습니다.`;
}
