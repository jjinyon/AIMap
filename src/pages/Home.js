import { MapView } from "../components/MapView.js";
import { useCurrentLocation } from "../hooks/useCurrentLocation.js";

const h = window.React.createElement;

const navItems = [
  { label: "음성 안내", icon: "headphones" },
  { label: "길찾기", icon: "cursor" },
  { label: "지도", icon: "foldedMap", active: true },
  { label: "대화", icon: "message" },
  { label: "내 정보", icon: "profile" },
];

export function Home({ appStatus }) {
  const { location } = useCurrentLocation();

  return h(
    "main",
    { className: "app-shell" },
    h(
      "section",
      { className: "phone-frame", "aria-label": "지도 첫 화면" },
      h("div", { className: "phone-camera", "aria-hidden": "true" }),
      h(
        "div",
        { className: "phone-screen" },
        h(MapView, {
          location,
          places: [],
          selectedPlace: null,
          onSelectPlace: () => {},
        }),
        h(
          "div",
          { className: "persistent-ui" },
          h("div", { className: "top-pills", "aria-hidden": "true" }, [
            h("span", { key: "1" }, "내 위치"),
            h("span", { key: "2" }, "주변 탐색"),
            h("span", { key: "3" }, "AI 추천"),
          ]),
          h(SearchBar),
          h(MapActions),
          h(BottomNav)
        ),
        appStatus
          ? h("p", { className: "app-status", role: "status" }, appStatus)
          : null
      )
    )
  );
}

function SearchBar() {
  return h(
    "form",
    {
      className: "search-bar",
      role: "search",
      onSubmit: (event) => event.preventDefault(),
    },
    h("input", {
      "aria-label": "위치 검색",
      placeholder: "어디로 떠나볼까요?",
      type: "search",
    }),
    h(
      "button",
      { className: "search-button", type: "submit", "aria-label": "검색" },
      h(Icon, { name: "search" })
    )
  );
}

function MapActions() {
  return h(
    "div",
    { className: "map-actions", "aria-label": "지도 도구" },
    h(
      "button",
      { type: "button", "aria-label": "현재 위치 보기" },
      h(Icon, { name: "target" })
    ),
    h(
      "button",
      { type: "button", "aria-label": "지도 레이어" },
      h(Icon, { name: "layers" })
    )
  );
}

function BottomNav() {
  return h(
    "nav",
    { className: "bottom-nav", "aria-label": "하단 메뉴" },
    navItems.map((item) =>
      h(
        "button",
        {
          key: item.label,
          className: item.active ? "active" : "",
          type: "button",
          "aria-label": item.label,
        },
        h(Icon, { name: item.icon })
      )
    )
  );
}

function Icon({ name }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  };

  const icons = {
    headphones: [
      h("path", { key: "1", d: "M4 14v3a4 4 0 0 0 4 4" }),
      h("path", { key: "2", d: "M20 14v3a4 4 0 0 1-4 4" }),
      h("path", { key: "3", d: "M7 14V9a5 5 0 0 1 10 0v5" }),
      h("path", { key: "4", d: "M9 21h6" }),
    ],
    cursor: [
      h("path", { key: "1", d: "M12 3 4 21l8-4 8 4-8-18z" }),
      h("path", { key: "2", d: "M12 3v14" }),
    ],
    foldedMap: [
      h("path", { key: "1", d: "m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6z" }),
      h("path", { key: "2", d: "M9 4v14" }),
      h("path", { key: "3", d: "M15 6v14" }),
    ],
    message: [
      h("path", { key: "1", d: "M4 5h16v11H8l-4 4V5z" }),
      h("path", { key: "2", d: "M8 9h8" }),
      h("path", { key: "3", d: "M8 13h5" }),
    ],
    profile: [
      h("circle", { key: "1", cx: 12, cy: 8, r: 4 }),
      h("path", { key: "2", d: "M4 21a8 8 0 0 1 16 0" }),
    ],
    search: [
      h("circle", { key: "1", cx: 11, cy: 11, r: 7 }),
      h("path", { key: "2", d: "m16.5 16.5 4 4" }),
    ],
    target: [
      h("circle", { key: "1", cx: 12, cy: 12, r: 7 }),
      h("circle", { key: "2", cx: 12, cy: 12, r: 2 }),
      h("path", { key: "3", d: "M12 3v2" }),
      h("path", { key: "4", d: "M12 19v2" }),
      h("path", { key: "5", d: "M3 12h2" }),
      h("path", { key: "6", d: "M19 12h2" }),
    ],
    layers: [
      h("path", { key: "1", d: "m12 3 9 5-9 5-9-5 9-5z" }),
      h("path", { key: "2", d: "m3 12 9 5 9-5" }),
      h("path", { key: "3", d: "m3 16 9 5 9-5" }),
    ],
  };

  return h("svg", common, icons[name]);
}
