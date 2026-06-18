const h = window.React.createElement;

export function PlaceActions({ onRoute }) {
  return h(
    "div",
    { className: "place-page-actions" },
    h("button", { className: "place-page-action primary", type: "button", onClick: onRoute }, "추천 경로 보기")
  );
}
