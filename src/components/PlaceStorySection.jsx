import { getPlaceDescription } from "./PlaceHeader.jsx";

const h = window.React.createElement;

export function PlaceStorySection({ place }) {
  return h(
    "div",
    { className: "place-page-section-group" },
    h(InfoSection, { title: "장소 소개" }, h("p", null, getPlaceDescription(place))),
    h(InfoSection, { title: "AI 장소 이야기" }, h("p", null, makeStory(place))),
    h(InfoSection, { title: "운영시간" }, h(EmptyOrText, { value: place.openingHours || place.businessHours, empty: "운영시간 정보가 아직 없습니다." })),
    h(InfoSection, { title: "주소" }, h(EmptyOrText, { value: place.address, empty: "주소 정보가 아직 없습니다." })),
    h(InfoSection, { title: "전화번호" }, h(EmptyOrText, { value: place.phone, empty: "전화번호 정보가 아직 없습니다." }))
  );
}

export function InfoSection({ title, children }) {
  return h("section", { className: "place-page-section" }, h("h2", null, title), children);
}

function EmptyOrText({ value, empty }) {
  return value ? h("p", null, value) : h("p", { className: "place-page-empty" }, empty);
}

function makeStory(place = {}) {
  const name = place.name || "이 장소";
  const category = place.categoryName || place.type || "장소";
  const mood = place.summary || place.aiReason || "방문자들이 머무는 분위기와 주변 동선이 이 장소의 인상을 만듭니다.";

  return `${name}은 ${category}의 성격을 가진 장소입니다. ${mood} 실제 리뷰와 위치 정보를 바탕으로 더 풍부한 이야기를 준비할 수 있습니다.`;
}
