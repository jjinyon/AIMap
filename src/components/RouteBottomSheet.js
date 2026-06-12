import { MapView } from "./MapView.js";

const { useEffect, useRef, useState } = window.React;
const h = window.React.createElement;

const SHEET_HEIGHTS = {
  collapsed: 38,
  half: 62,
  expanded: 90,
};

export function RouteBottomSheet({
  routes = [],
  selectedRoute = null,
  location,
  destination = null,
  routePath = [],
  routeSegments = [],
  status = "",
  onSelectRoute,
  onClose,
  onBackToList,
}) {
  const [sheetState, setSheetState] = useState(selectedRoute ? "expanded" : "half");
  const sheetRef = useRef(null);
  const dragRef = useRef({ startY: 0, startHeight: SHEET_HEIGHTS.half, dragging: false });
  const isDetail = Boolean(selectedRoute);

  useEffect(() => {
    setSheetState(selectedRoute ? "expanded" : "half");
  }, [selectedRoute?.id]);

  const startDrag = (event) => {
    const point = getPointerPoint(event);
    dragRef.current = {
      startY: point.clientY,
      startHeight: SHEET_HEIGHTS[sheetState],
      dragging: true,
    };

    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
  };

  const moveDrag = (event) => {
    if (!dragRef.current.dragging) return;

    const point = getPointerPoint(event);
    const screenHeight = window.innerHeight || 1;
    const deltaPercent = ((dragRef.current.startY - point.clientY) / screenHeight) * 100;
    const nextHeight = clamp(dragRef.current.startHeight + deltaPercent, SHEET_HEIGHTS.collapsed, SHEET_HEIGHTS.expanded);

    sheetRef.current?.style.setProperty("--route-sheet-height", `${nextHeight}dvh`);
  };

  const endDrag = (event) => {
    if (!dragRef.current.dragging) return;

    const point = getPointerPoint(event);
    const screenHeight = window.innerHeight || 1;
    const deltaPercent = ((dragRef.current.startY - point.clientY) / screenHeight) * 100;
    const finalHeight = dragRef.current.startHeight + deltaPercent;
    const nextState = finalHeight > 76 ? "expanded" : finalHeight < 50 ? "collapsed" : "half";

    dragRef.current.dragging = false;
    setSheetState(nextState);
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", endDrag);
  };

  const sheetStyle = { "--route-sheet-height": `${SHEET_HEIGHTS[sheetState]}dvh` };

  return h(
    "section",
    {
      className: `route-bottom-sheet ${isDetail ? "is-detail" : "is-list"} ${sheetState}`,
      ref: sheetRef,
      style: sheetStyle,
      "aria-label": isDetail ? "추천 경로 상세" : "추천 경로 목록",
    },
    h(
      "div",
      {
        className: "route-sheet-drag-area",
        onPointerDown: startDrag,
      },
      h("div", { className: "route-sheet-handle", "aria-hidden": "true" })
    ),
    isDetail
      ? h(RouteDetail, { route: selectedRoute, location, destination, routePath, routeSegments, onClose, onBackToList })
      : h(RouteList, { routes, status, onSelectRoute, onClose })
  );
}

function RouteList({ routes, status, onSelectRoute, onClose }) {
  return h(
    "div",
    { className: "route-sheet-scroll" },
    h(
      "header",
      { className: "route-sheet-header" },
      h(
        "div",
        null,
        h("p", { className: "route-sheet-eyebrow" }, "지역 만끽 경로"),
        h("h2", null, "추천 경로")
      ),
      h("button", { className: "route-sheet-close", type: "button", onClick: onClose, "aria-label": "닫기" }, "×")
    ),
    status ? h("p", { className: "route-sheet-status", role: "status" }, status) : null,
    routes.length
      ? h(
          "div",
          { className: "route-card-list" },
          routes.map((route) =>
            h(
              "button",
              {
                key: route.id,
                className: "route-card",
                type: "button",
                onClick: () => onSelectRoute?.(route),
              },
              h("strong", null, route.title),
              h(
                "span",
                { className: "route-card-description" },
                route.description || "추천 장소를 자연스러운 순서로 묶은 코스입니다."
              ),
              h(
                "dl",
                { className: "route-card-meta" },
                h("div", null, h("dt", null, "시간"), h("dd", null, formatMinutes(route.estimatedDurationMinutes))),
                h("div", null, h("dt", null, "거리"), h("dd", null, `${formatDistance(route.estimatedDistanceKm)}km`)),
                h("div", null, h("dt", null, "장소"), h("dd", null, `${route.places?.length || 0}곳`))
              )
            )
          )
        )
      : h("p", { className: "route-sheet-empty" }, "추천 경로를 만들 수 있는 장소가 아직 부족합니다.")
  );
}

function RouteDetail({ route, location, destination, routePath = [], routeSegments = [], onClose, onBackToList }) {
  const places = route?.places || [];

  return h(
    "div",
    { className: "route-detail-layout" },
    h(
      "div",
      { className: "route-detail-map" },
      h(MapView, {
        location,
        places: [],
        selectedPlace: destination,
        routePath,
        routeSegments,
        routePlaces: places,
        showRoutePlaceLine: false,
      })
    ),
    h(
      "div",
      { className: "route-sheet-scroll route-detail-scroll" },
      h(
        "header",
        { className: "route-sheet-header" },
        h(
          "div",
          null,
          h("p", { className: "route-sheet-eyebrow" }, "선택한 코스"),
          h("h2", null, route.title)
        ),
        h(
          "div",
          { className: "route-detail-actions" },
          h("button", { className: "route-sheet-close", type: "button", onClick: onBackToList, "aria-label": "목록으로" }, "‹"),
          h("button", { className: "route-sheet-close", type: "button", onClick: onClose, "aria-label": "닫기" }, "×")
        )
      ),
      h(
        "dl",
        { className: "route-detail-summary" },
        h("div", null, h("dt", null, "예상 시간"), h("dd", null, formatMinutes(route.estimatedDurationMinutes))),
        h("div", null, h("dt", null, "총 거리"), h("dd", null, `${formatDistance(route.estimatedDistanceKm)}km`)),
        h("div", null, h("dt", null, "방문 장소"), h("dd", null, `${places.length}곳`))
      ),
      h("p", { className: "route-detail-description" }, route.description),
      h(
        "section",
        { className: "route-visit-section" },
        h("h3", null, "방문 순서"),
        h(
          "ol",
          { className: "route-visit-list" },
          places.map((place, index) =>
            h(
              "li",
              { key: place.id || `${place.name}-${index}` },
              h("span", { className: `route-step-marker ${getStepMarkerClass(index, places.length)}` }, index + 1),
              h(
                "div",
                null,
                h("strong", null, place.name),
                h("small", null, getCategoryLabel(place.category)),
                h("p", null, place.reason || "코스 흐름에 맞춰 방문하기 좋은 장소입니다.")
              )
            )
          )
        )
      )
    )
  );
}

function getStepMarkerClass(index, length) {
  if (index === 0) return "start";
  if (index === length - 1) return "end";
  return "middle";
}

function getCategoryLabel(category = "") {
  const labels = {
    food: "음식점",
    cafe: "카페",
    culture: "문화공간",
    park: "공원",
    local: "로컬 명소",
  };

  return labels[category] || category || "장소";
}

function formatMinutes(minutes = 0) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  if (safeMinutes >= 60) {
    const hours = Math.floor(safeMinutes / 60);
    const rest = safeMinutes % 60;
    return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
  }

  return `${safeMinutes}분`;
}

function formatDistance(distanceKm = 0) {
  return Math.round(Number(distanceKm || 0) * 10) / 10;
}

function getPointerPoint(event) {
  return event.touches?.[0] || event;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
