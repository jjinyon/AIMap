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
    places.find((place) => place.id === selectedPlaceId) || places[0] || null;

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
    if (!selectedPlace) return;
    setSelectedPlaceId(selectedPlace.id);
    speakPlace(selectedPlace);
  };

  return h(
    "main",
    { className: "app-shell" },
    h(
      "section",
      { className: "story-panel", "aria-label": "서비스 소개" },
      h("p", { className: "eyebrow" }, "DESIGN THINKING PROTOTYPE"),
      h("h1", null, "지금 내 주변, 세 번 안에 고르기"),
      h(
        "p",
        null,
        "현재 위치와 기분을 바탕으로 갈 만한 장소를 빠르게 좁혀주는 모바일 추천 프로토타입입니다."
      ),
      h(
        "div",
        { className: "story-metrics", "aria-label": "핵심 기능" },
        h(Metric, { value: "01", label: "위치 확인" }),
        h(Metric, { value: "02", label: "취향 필터" }),
        h(Metric, { value: "03", label: "길 안내" })
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
            h("span", { className: "status-pill" }, "AI PLACE"),
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
                className: "icon-button refresh",
                type: "button",
                title: "현재 위치 새로고침",
                "aria-label": "현재 위치 새로고침",
                onClick: refresh,
              },
              "↻"
            )
          )
        ),
        appStatus &&
          h("div", { className: "app-status", role: "status" }, appStatus),
        h(
          "section",
          { className: "location-card" },
          h("span", { className: `status-dot ${status.tone}` }),
          h(
            "div",
            null,
            h("strong", null, location.label),
            h("p", null, status.message)
          )
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
            label: "어디로 갈까요?",
            value: category,
            options: categoryOptions,
            onChange: (value) => {
              setCategory(value);
              setSelectedPlaceId(null);
            },
          }),
          h(SegmentedControl, {
            label: "오늘 분위기",
            value: mood,
            options: moodOptions,
            onChange: (value) => {
              setMood(value);
              setSelectedPlaceId(null);
            },
          })
        ),
        h(
          "section",
          { className: "summary-panel", "aria-label": "선택 장소 요약" },
          selectedPlace
            ? h(SelectedSummary, { place: selectedPlace })
            : h("p", null, "추천 장소를 선택하면 이동 요약이 표시됩니다.")
        ),
        h(
          "div",
          { className: "action-row" },
          h(
            "button",
            { type: "button", onClick: refresh },
            "다시 추천"
          ),
          h(
            "button",
            { className: "secondary", type: "button", onClick: speakSelected },
            "음성 안내"
          )
        ),
        h(
          "section",
          { className: "place-list", "aria-label": "추천 장소 목록" },
          places.map((place, index) =>
            h(PlaceCard, {
              key: place.id,
              place,
              index,
              active: place.id === selectedPlace?.id,
              onClick: () => selectPlace(place.id, true),
            })
          )
        )
      )
    )
  );
}

function Metric({ value, label }) {
  return h(
    "span",
    { className: "metric" },
    h("strong", null, value),
    h("small", null, label)
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

function SelectedSummary({ place }) {
  return h(
    "div",
    null,
    h("span", null, "추천 경로"),
    h("strong", null, place.name),
    h(
      "p",
      null,
      `${formatDistance(place.distance)} 거리의 ${place.type}입니다. ${place.reason}`
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
