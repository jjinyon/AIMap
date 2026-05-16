import { MapView } from "../components/MapView.js";
import { useCurrentLocation } from "../hooks/useCurrentLocation.js";
import { searchPlaces } from "../services/geocodingService.js";
import { findRoute, formatRouteSummary } from "../services/routingService.js";

const { useState } = window.React;
const h = window.React.createElement;

const navItems = [
  { id: "audio", label: "오디오", icon: "headphones" },
  { id: "route", label: "길찾기", icon: "cursor" },
  { id: "map", label: "지도", icon: "foldedMap" },
  { id: "chat", label: "대화", icon: "message" },
  { id: "account", label: "내 정보", icon: "profile" },
];

const audioOptions = [
  { label: "현재 지역", tone: "warm" },
  { label: "목적지", tone: "green" },
  { label: "경로기반", tone: "blue" },
];

export function Home({ appStatus }) {
  const { location } = useCurrentLocation();
  const [screen, setScreen] = useState("map");

  const openNav = (itemId) => {
    if (itemId === "audio") {
      setScreen("audio");
      return;
    }

    if (itemId === "account") {
      setScreen("signup");
      return;
    }

    setScreen("map");
  };

  return h(
    "main",
    { className: "app-shell" },
    h(
      "section",
      { className: "phone-frame", "aria-label": "AI 장소 추천 앱" },
      h("div", { className: "phone-camera", "aria-hidden": "true" }),
      h(
        "div",
        { className: "phone-screen" },
        renderScreen(screen, location, appStatus, setScreen),
        h(BottomNav, {
          activeId: screen === "audio" ? "audio" : screen === "map" ? "map" : "account",
          onSelect: openNav,
        })
      )
    )
  );
}

function renderScreen(screen, location, appStatus, setScreen) {
  if (screen === "audio") {
    return h(AudioScreen);
  }

  if (screen === "settings") {
    return h(SettingsScreen, { onBack: () => setScreen("signup") });
  }

  if (screen === "signup") {
    return h(SignupScreen, { onOpenSettings: () => setScreen("settings") });
  }

  return h(MapScreen, { location, appStatus });
}

function MapScreen({ location, appStatus }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeStatus, setRouteStatus] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const selectDestination = async (destination) => {
    setSelectedSearchResult(destination);
    setRoutePath([]);
    setRouteStatus("경로를 찾는 중입니다.");

    try {
      const route = await findRoute(location, destination);
      setRoutePath(route.points);
      setRouteStatus(formatRouteSummary(route));
    } catch {
      setRouteStatus("현재 위치에서 목적지까지의 경로를 찾지 못했습니다.");
    }
  };

  const submitSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchStatus("");
      setRouteStatus("");
      setSearchResults([]);
      setSelectedSearchResult(null);
      setRoutePath([]);
      return;
    }

    setIsSearching(true);
    setSearchStatus("장소를 검색하는 중입니다.");

    try {
      const results = await searchPlaces(trimmedQuery, location);
      setSearchResults(results);
      setSearchStatus(results.length ? `${results.length}개의 장소를 찾았습니다.` : "검색 결과가 없습니다.");
      if (results[0]) {
        await selectDestination(results[0]);
      } else {
        setSelectedSearchResult(null);
        setRoutePath([]);
        setRouteStatus("");
      }
    } catch {
      setSearchStatus("검색에 실패했습니다. 잠시 후 다시 시도하세요.");
      setRouteStatus("");
      setSearchResults([]);
      setSelectedSearchResult(null);
      setRoutePath([]);
    } finally {
      setIsSearching(false);
    }
  };

  return h(
    "div",
    { className: "screen-layer map-screen" },
    h(MapView, {
      location,
      places: [],
      selectedPlace: null,
      onSelectPlace: () => {},
      searchResults,
      selectedSearchResult,
      onSelectSearchResult: selectDestination,
      routePath,
    }),
    h(
      "div",
      { className: "persistent-ui" },
      h("div", { className: "top-pills", "aria-hidden": "true" }, [
        h("span", { key: "1" }, "내 위치"),
        h("span", { key: "2" }, "주변 탐색"),
        h("span", { key: "3" }, "AI 추천"),
      ]),
      h(SearchBar, {
        value: query,
        isSearching,
        onChange: setQuery,
        onSubmit: submitSearch,
      }),
      h(SearchResults, {
        results: searchResults,
        status: routeStatus || searchStatus,
        selectedId: selectedSearchResult?.id,
        onSelect: selectDestination,
      }),
      h(MapActions)
    ),
    appStatus ? h("p", { className: "app-status", role: "status" }, appStatus) : null
  );
}

function AudioScreen() {
  return h(
    "div",
    { className: "screen-layer audio-screen" },
    h(
      "header",
      { className: "audio-header" },
      h("div", { className: "audio-wave", "aria-hidden": "true" }, [
        h("span", { key: "1" }),
        h("span", { key: "2" }),
        h("span", { key: "3" }),
        h("span", { key: "4" }),
        h("span", { key: "5" }),
      ]),
      h("h1", null, "어떤 곳의 이야기를 듣고 싶으신가요?")
    ),
    h(
      "section",
      { className: "audio-options", "aria-label": "오디오 선택지" },
      audioOptions.map((option) =>
        h(
          "button",
          {
            key: option.label,
            className: `audio-option ${option.tone}`,
            type: "button",
          },
          option.label
        )
      )
    )
  );
}

function SignupScreen({ onOpenSettings }) {
  return h(
    "div",
    { className: "screen-layer panel-screen signup-screen" },
    h(
      "header",
      { className: "panel-header" },
      h("span", { className: "header-caption" }, "회원"),
      h(
        "button",
        {
          className: "icon-button",
          type: "button",
          "aria-label": "설정 열기",
          onClick: onOpenSettings,
        },
        h(Icon, { name: "settings" })
      )
    ),
    h(
      "section",
      { className: "profile-card", "aria-label": "회원가입" },
      h("div", { className: "coffee-avatar", "aria-hidden": "true" }),
      h("button", { className: "avatar-add", type: "button", "aria-label": "프로필 사진 추가" }, "+"),
      h("h1", null, "회원가입"),
      h(ProfileField, { label: "이름", value: "이름을 입력하세요" }),
      h(ProfileField, { label: "닉네임", value: "닉네임을 입력하세요" }),
      h(ProfileField, { label: "이메일", value: "you@example.com", icon: "mail" }),
      h(ProfileField, { label: "비밀번호", value: "비밀번호를 입력하세요", icon: "lock" }),
      h("button", { className: "primary-action", type: "button" }, "가입하기")
    )
  );
}

function SettingsScreen({ onBack }) {
  return h(
    "div",
    { className: "screen-layer panel-screen settings-screen" },
    h(
      "header",
      { className: "panel-header" },
      h(
        "button",
        {
          className: "icon-button",
          type: "button",
          "aria-label": "회원가입 화면으로 돌아가기",
          onClick: onBack,
        },
        h(Icon, { name: "chevronLeft" })
      ),
      h("h1", null, "설정"),
      h("span", { className: "header-spacer", "aria-hidden": "true" })
    ),
    h(
      "section",
      { className: "settings-list", "aria-label": "앱 설정" },
      h(SettingsRow, { label: "내 정보", enabled: true }),
      h(SettingsRow, { label: "내 지도", enabled: true }),
      h(SettingsRow, { label: "알림", enabled: false }),
      h(SettingsRow, { label: "AI 추천", enabled: true }),
      h(SettingsDivider),
      h("p", { className: "settings-section-title" }, "도움말"),
      h(SimpleRow, { icon: "helpCircle", label: "앱 가이드" }),
      h(SimpleRow, { icon: "shield", label: "개인정보 보호" }),
      h(SettingsDivider),
      h("p", { className: "settings-section-title" }, "기타"),
      h(SimpleRow, { icon: "info", label: "앱 정보" })
    )
  );
}

function SearchBar({ value, isSearching, onChange, onSubmit }) {
  return h(
    "form",
    {
      className: "search-bar",
      role: "search",
      onSubmit: (event) => {
        event.preventDefault();
        onSubmit();
      },
    },
    h("input", {
      "aria-label": "위치 검색",
      placeholder: "장소를 검색하세요",
      type: "search",
      value,
      onChange: (event) => onChange(event.target.value),
    }),
    h(
      "button",
      {
        className: "search-button",
        type: "submit",
        "aria-label": "검색",
        disabled: isSearching,
      },
      h(Icon, { name: "search" })
    )
  );
}

function SearchResults({ results, status, selectedId, onSelect }) {
  if (!status && results.length === 0) return null;

  return h(
    "section",
    { className: "search-results", "aria-label": "장소 검색 결과" },
    status ? h("p", { className: "search-status" }, status) : null,
    results.map((result) =>
      h(
        "button",
        {
          key: result.id,
          className: result.id === selectedId ? "search-result active" : "search-result",
          type: "button",
          onClick: () => onSelect(result),
        },
        h("strong", null, result.name),
        h("span", null, result.address || "주소 정보 없음")
      )
    )
  );
}

function MapActions() {
  return h(
    "div",
    { className: "map-actions", "aria-label": "지도 도구" },
    h("button", { type: "button", "aria-label": "현재 위치 보기" }, h(Icon, { name: "target" })),
    h("button", { type: "button", "aria-label": "지도 레이어" }, h(Icon, { name: "layers" }))
  );
}

function BottomNav({ activeId, onSelect }) {
  return h(
    "nav",
    { className: "bottom-nav", "aria-label": "하단 메뉴" },
    navItems.map((item) =>
      h(
        "button",
        {
          key: item.id,
          className: item.id === activeId ? "active" : "",
          type: "button",
          "aria-label": item.label,
          onClick: () => onSelect(item.id),
        },
        h(Icon, { name: item.icon })
      )
    )
  );
}

function ProfileField({ label, value, icon }) {
  return h(
    "label",
    { className: "profile-field" },
    h("span", null, label),
    h(
      "div",
      { className: "field-control" },
      h("input", {
        defaultValue: "",
        placeholder: value,
        type: icon === "lock" ? "password" : "text",
      }),
      icon ? h(Icon, { name: icon }) : null
    )
  );
}

function SettingsRow({ label, enabled }) {
  return h(
    "div",
    { className: "settings-row" },
    h("span", null, label),
    h(
      "button",
      {
        className: enabled ? "switch is-on" : "switch",
        type: "button",
        "aria-label": `${label} ${enabled ? "켜짐" : "꺼짐"}`,
      },
      h("span", null)
    )
  );
}

function SimpleRow({ icon, label }) {
  return h("button", { className: "simple-row", type: "button" }, h(Icon, { name: icon }), h("span", null, label));
}

function SettingsDivider() {
  return h("hr", { className: "settings-divider" });
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
    settings: [
      h("circle", { key: "1", cx: 12, cy: 12, r: 3 }),
      h("path", { key: "2", d: "M19.4 15a7.8 7.8 0 0 0 .1-1.1 7.8 7.8 0 0 0-.1-1.1l2-1.5-2-3.5-2.4 1a8.2 8.2 0 0 0-1.9-1.1L14.8 5h-4l-.4 2.7a8.2 8.2 0 0 0-1.9 1.1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1.1 7.8 7.8 0 0 0 .1 1.1l-2 1.5 2 3.5 2.4-1a8.2 8.2 0 0 0 1.9 1.1l.4 2.7h4l.4-2.7a8.2 8.2 0 0 0 1.9-1.1l2.4 1 2-3.5-2.1-1.5z" }),
    ],
    chevronLeft: [h("path", { key: "1", d: "m15 18-6-6 6-6" })],
    mail: [
      h("path", { key: "1", d: "M4 6h16v12H4z" }),
      h("path", { key: "2", d: "m4 7 8 6 8-6" }),
    ],
    lock: [
      h("rect", { key: "1", x: 5, y: 11, width: 14, height: 10, rx: 2 }),
      h("path", { key: "2", d: "M8 11V8a4 4 0 0 1 8 0v3" }),
    ],
    helpCircle: [
      h("circle", { key: "1", cx: 12, cy: 12, r: 9 }),
      h("path", { key: "2", d: "M9.5 9a2.7 2.7 0 0 1 5 1.4c0 1.9-2.5 2.1-2.5 3.6" }),
      h("path", { key: "3", d: "M12 17h.01" }),
    ],
    shield: [h("path", { key: "1", d: "M12 3 5 6v6c0 4.4 2.8 7.2 7 9 4.2-1.8 7-4.6 7-9V6l-7-3z" })],
    info: [
      h("circle", { key: "1", cx: 12, cy: 12, r: 9 }),
      h("path", { key: "2", d: "M12 11v5" }),
      h("path", { key: "3", d: "M12 8h.01" }),
    ],
  };

  return h("svg", common, icons[name]);
}
