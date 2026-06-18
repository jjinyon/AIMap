import { getMockPlaceStory } from "../data/placeStoryMockData.js";
import { getPlaceDescription } from "./PlaceHeader.jsx";

const h = window.React.createElement;

export function PlaceStorySection({ place }) {
  const placeStory = getMockPlaceStory(place);

  return h(
    "div",
    { className: "place-page-section-group" },
    h(InfoSection, { title: "장소 소개" }, h("p", null, getPlaceDescription(place))),
    h(
      InfoSection,
      { title: "AI 장소 이야기" },
      h("strong", null, placeStory.title),
      h("p", null, placeStory.story),
      h(
        "ul",
        { className: "place-story-review-list" },
        placeStory.reviewHighlights.map((highlight) => h("li", { key: highlight }, highlight))
      ),
      h("p", { className: "place-page-empty" }, `source: ${placeStory.sourceName}`)
    ),
    h(
      InfoSection,
      { title: "영업시간" },
      h(EmptyOrText, {
        value: place.openingHours || place.businessHours,
        empty: "영업시간 정보가 아직 없습니다.",
      })
    ),
    h(
      InfoSection,
      { title: "주소" },
      h(EmptyOrText, { value: place.address, empty: "주소 정보가 아직 없습니다." })
    ),
    h(
      InfoSection,
      { title: "전화번호" },
      h(EmptyOrText, { value: place.phone, empty: "전화번호 정보가 아직 없습니다." })
    )
  );
}

export function InfoSection({ title, children }) {
  return h("section", { className: "place-page-section" }, h("h2", null, title), children);
}

function EmptyOrText({ value, empty }) {
  return value ? h("p", null, value) : h("p", { className: "place-page-empty" }, empty);
}
