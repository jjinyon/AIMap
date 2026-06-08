const h = window.React.createElement;

export function PlaceActions({ onStory, onRoute }) {
  return h(
    "div",
    { className: "place-page-actions" },
    h("button", { className: "place-page-action", type: "button", onClick: onStory }, "장소 이야기 듣기"),
    h("button", { className: "place-page-action primary", type: "button", onClick: onRoute }, "추천 경로 보기")
  );
}
