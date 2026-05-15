import { MapView } from "../components/MapView.js";
import { useCurrentLocation } from "../hooks/useCurrentLocation.js";

const h = window.React.createElement;

const navItems = [
  { label: "오디오", icon: "audio" },
  { label: "길찾기", icon: "arrow" },
  { label: "지도", icon: "map", active: true },
  { label: "리뷰", icon: "chat" },
  { label: "회원", icon: "user" },
];

export function Home() {
  const { location } = useCurrentLocation();

  return h(
    "main",
    { className: "app-shell" },
    h(
      "section",
      { className: "phone-frame", "aria-label": "앱 첫 화면" },
      h("div", { className: "phone-camera", "aria-hidden": "true" }),
      h(
        "div",
        { className: "phone-screen" },
        h(
          "div",
          { className: "search-bar" },
          h("input", {
            "aria-label": "위치 검색",
            placeholder: "어디로 떠나볼까요?",
            type: "search",
          }),
          h(
            "button",
            { className: "search-button", type: "button", "aria-label": "검색" },
            h(Icon, { name: "search" })
          )
        ),
        h(
          "div",
          { className: "map-tools", "aria-hidden": "true" },
          h("span", null, "+"),
          h("span", null, "-")
        ),
        h(MapView, {
          location,
          places: [],
          selectedPlace: null,
          onSelectPlace: () => {},
        }),
        h(BottomNav)
      )
    )
  );
}

function BottomNav() {
  return h(
    "nav",
    { className: "bottom-nav", "aria-label": "하단 아이콘 메뉴" },
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
    audio: [
      h("path", { key: "1", d: "M4 12v4a4 4 0 0 0 4 4" }),
      h("path", { key: "2", d: "M20 12v4a4 4 0 0 1-4 4" }),
      h("path", { key: "3", d: "M8 12V8a4 4 0 0 1 8 0v4" }),
      h("path", { key: "4", d: "M9 20h6" }),
    ],
    arrow: [h("path", { key: "1", d: "M12 3 4 21l8-4 8 4-8-18z" })],
    map: [
      h("path", { key: "1", d: "m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6z" }),
      h("path", { key: "2", d: "M9 4v14" }),
      h("path", { key: "3", d: "M15 6v14" }),
    ],
    chat: [
      h("path", { key: "1", d: "M4 5h16v11H8l-4 4V5z" }),
      h("path", { key: "2", d: "M8 9h8" }),
      h("path", { key: "3", d: "M8 13h5" }),
    ],
    user: [
      h("circle", { key: "1", cx: 12, cy: 8, r: 4 }),
      h("path", { key: "2", d: "M4 21a8 8 0 0 1 16 0" }),
    ],
    search: [
      h("circle", { key: "1", cx: 11, cy: 11, r: 7 }),
      h("path", { key: "2", d: "m16.5 16.5 4 4" }),
    ],
  };

  return h("svg", common, icons[name]);
}
