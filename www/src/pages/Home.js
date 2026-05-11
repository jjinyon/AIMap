import { MapView } from "../components/MapView.js";
import { useCurrentLocation } from "../hooks/useCurrentLocation.js";
import {
  buildPlaces,
  categoryOptions,
  formatDistance,
  moodOptions,
} from "../services/mapService.js";

const { useCallback, useMemo, useState } = window.React;
const h = window.React.createElement;

export function Home({ appStatus, canInstall, onInstall }) {
  const { location, status, locate } = useCurrentLocation();
  const [category, setCategory] = useState("all");
  const [mood, setMood] = useState("balanced");
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);

  const places = useMemo(
    () => buildPlaces(location, category, mood),
    [location, category, mood]
  );
  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) || null;

  const selectPlace = useCallback(
    (placeId, shouldSpeak = false) => {
      const place = places.find((item) => item.id === placeId);
      if (!place) return;

      setSelectedPlaceId(placeId);

      if (shouldSpeak) {
        speakPlace(place);
      }
    },
    [places]
  );

  const refresh = () => {
    setSelectedPlaceId(null);
    locate();
  };

  const speakSelected = () => {
    const place = selectedPlace || places[0];
    if (!place) return;
    setSelectedPlaceId(place.id);
    speakPlace(place);
  };

  const routeText = selectedPlace
    ? `${selectedPlace.name}까지 약 ${formatDistance(
        selectedPlace.distance
      )}. 지도에 간단 경로를 표시했습니다.`
    : "장소를 선택하면 간단 경로가 표시됩니다.";

  return h(
    "main",
    { className: "showcase" },
    h(
      "section",
      { className: "showcase-copy", "aria-label": "프로젝트 소개" },
      h("p", { className: "eyebrow" }, "REACT MOBILE APP"),
      h("h1", null, "AI 장소 추천"),
      h(
        "p",
        null,
        "팀 시연과 모바일 앱 전환을 염두에 둔 React 기반 위치 추천 화면입니다."
      ),
      h(
        "div",
        { className: "demo-points" },
        h("span", null, "PWA 설치 가능"),
        h("span", null, "위치 권한 대응"),
        h("span", null, "지도 경로 표시")
      )
    ),
    h(
      "section",
      { className: "phone-frame", "aria-label": "모바일 앱 미리보기" },
      h("div", { className: "phone-speaker" }),
      h(
        "div",
        { className: "phone-screen" },
        h(
          "header",
          { className: "mobile-topbar" },
          h(
            "div",
            null,
            h("span", { className: "status-pill" }, "AI MAP"),
            h("h2", null, "주변 추천")
          ),
          h(
            "div",
            { className: "topbar-actions" },
            canInstall &&
              h(
                "button",
                {
                  className: "icon-button",
                  type: "button",
                  title: "앱 설치",
                  "aria-label": "앱 설치",
                  onClick: onInstall,
                },
                "+"
              ),
            h(
              "button",
              {
                className: "icon-button",
                type: "button",
                title: "현재 위치",
                "aria-label": "현재 위치",
                onClick: refresh,
              },
              "◎"
            )
          )
        ),
        appStatus &&
          h("div", { className: "app-status", role: "status" }, appStatus),
        h(
          "section",
          { className: "location-card" },
          h("span", { className: `status-dot ${status.tone}` }),
          h("p", null, status.message)
        ),
        h(MapView, {
          location,
          places,
          selectedPlace,
          onSelectPlace: selectPlace,
        }),
        h(
          "section",
          { className: "controls-card", "aria-label": "추천 조건" },
          h(SegmentedControl, {
            label: "추천 유형",
            value: category,
            options: categoryOptions,
            onChange: (value) => {
              setCategory(value);
              setSelectedPlaceId(null);
            },
          }),
          h(SegmentedControl, {
            label: "분위기",
            value: mood,
            options: moodOptions,
            onChange: (value) => {
              setMood(value);
              setSelectedPlaceId(null);
            },
          })
        ),
        h(
          "div",
          { className: "action-row" },
          h(
            "button",
            { type: "button", onClick: refresh },
            "새로고침"
          ),
          h(
            "button",
            { className: "secondary", type: "button", onClick: speakSelected },
            "음성 안내"
          )
        ),
        h("div", { className: "route-summary" }, routeText),
        h(
          "section",
          { className: "place-list", "aria-label": "추천 장소 목록" },
          places.map((place, index) =>
            h(PlaceCard, {
              key: place.id,
              place,
              index,
              active: place.id === selectedPlaceId,
              onClick: () => selectPlace(place.id, true),
            })
          )
        )
      )
    )
  );
}

function SegmentedControl({ label, value, options, onChange }) {
  return h(
    "div",
    { className: "segmented-group" },
    h("p", null, label),
    h(
      "div",
      { className: "segmented-control" },
      options.map((option) =>
        h(
          "button",
          {
            key: option.value,
            className: option.value === value ? "active" : "",
            type: "button",
            onClick: () => onChange(option.value),
          },
          option.label
        )
      )
    )
  );
}

function PlaceCard({ place, index, active, onClick }) {
  return h(
    "button",
    {
      className: `place-card ${active ? "active" : ""}`,
      type: "button",
      onClick,
    },
    h("span", { className: "rank" }, index + 1),
    h(
      "span",
      { className: "place-main" },
      h("strong", null, place.name),
      h(
        "small",
        null,
        `${place.type} · ${formatDistance(place.distance)} · 평점 ${place.rating}`
      ),
      h("em", null, place.reason)
    )
  );
}

function speakPlace(place) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const message = `${place.name}을 추천합니다. 현재 위치에서 약 ${formatDistance(
    place.distance
  )} 거리입니다. ${place.reason}`;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "ko-KR";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}
