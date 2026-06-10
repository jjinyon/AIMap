const { useEffect, useRef } = window.React;
const h = window.React.createElement;

export function MapView({
  location,
  places,
  selectedPlace,
  onSelectPlace,
  searchResults = [],
  routePath = [],
  isTrackingLocation = true,
  onTrackingChange,
  routePlaces = [],
}) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userInfoRef = useRef(null);
  const openInfoRef = useRef(null);
  const placeMarkersRef = useRef([]);
  const searchMarkersRef = useRef([]);
  const routeLineRef = useRef(null);
  const routePlaceLineRef = useRef(null);
  const routePlaceMarkersRef = useRef([]);
  const selectedPlaceRouteRef = useRef(null);
  const dragListenerRef = useRef(null);

  useEffect(() => {
    if (!window.kakao?.maps || !mapEl.current || mapRef.current) return;

    const center = toLatLng(location);
    mapRef.current = new kakao.maps.Map(mapEl.current, {
      center,
      level: 4,
    });

    userInfoRef.current = new kakao.maps.InfoWindow({
      content: '<div style="padding:6px 8px;font-size:12px;font-weight:700;">현재 위치</div>',
    });

    kakao.maps.event.addListener(mapRef.current, "click", closeInfoWindow);
    
    // 지도 드래그 감지
    dragListenerRef.current = kakao.maps.event.addListener(mapRef.current, "dragend", () => {
      onTrackingChange?.(false);
    });

    setTimeout(() => mapRef.current?.relayout(), 0);
  }, [location.lat, location.lng]);

  useEffect(() => {
    if (!mapRef.current) return;

    const center = toLatLng(location);
    
    // isTrackingLocation이 true일 때만 자동으로 지도를 중심으로 이동
    if (isTrackingLocation) {
      mapRef.current.setCenter(center);
    }

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(center);
      return;
    }

    userMarkerRef.current = new kakao.maps.Marker({
      map: mapRef.current,
      position: center,
      title: "현재 위치",
      image: getMarkerImage("current"),
    });

    kakao.maps.event.addListener(userMarkerRef.current, "click", () => {
      openInfoWindow(userInfoRef.current, userMarkerRef.current);
    });
  }, [location, isTrackingLocation]);

  useEffect(() => {
    if (!mapRef.current) return;

    closeInfoWindow();
    clearMarkers(placeMarkersRef.current);
    placeMarkersRef.current = places.map((place) => {
      const marker = createMarker(place, place.name, place.markerKind);
      const infoWindow = createInfoWindow(
        `<strong>${escapeHtml(place.name)}</strong><br />${escapeHtml(place.type)}<br />${escapeHtml(place.reason)}`
      );

      kakao.maps.event.addListener(marker, "click", () => {
        openInfoWindow(infoWindow, marker);
        onSelectPlace?.(place);
      });

      return marker;
    });

    if (places.length > 0 && searchResults.length === 0) {
      fitPlaces([location, ...places]);
    }
  }, [location, places, onSelectPlace, searchResults.length]);

  useEffect(() => {
    if (!mapRef.current) return;

    closeInfoWindow();
    clearMarkers(searchMarkersRef.current);
    searchMarkersRef.current = searchResults.map((result) => {
      const marker = createMarker(result, result.name, "destination");
      const infoWindow = createInfoWindow(
        `<strong>${escapeHtml(result.name)}</strong><br />${escapeHtml(result.address || "검색한 장소")}`
      );

      kakao.maps.event.addListener(marker, "click", () => {
        openInfoWindow(infoWindow, marker);
        onSelectPlace?.(result);
      });

      return marker;
    });

    if (selectedPlace && searchResults.some((result) => result.id === selectedPlace.id)) {
      const point = toLatLng(selectedPlace);
      mapRef.current.setCenter(point);
      mapRef.current.setLevel(3);

      return;
    }

    if (searchResults.length > 1) {
      fitPlaces(searchResults);
    }
  }, [searchResults, selectedPlace, onSelectPlace]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    if (!routePath.length) return;

    closeInfoWindow();
    const path = routePath.map(([lat, lng]) => new kakao.maps.LatLng(lat, lng));
    routeLineRef.current = new kakao.maps.Polyline({
      map: mapRef.current,
      path,
      strokeWeight: 6,
      strokeColor: "#1d4ed8",
      strokeOpacity: 0.92,
      strokeStyle: "solid",
    });

    fitLatLngs(path);
  }, [routePath]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (routePlaceLineRef.current) {
      routePlaceLineRef.current.setMap(null);
      routePlaceLineRef.current = null;
    }
    if (selectedPlaceRouteRef.current) {
      selectedPlaceRouteRef.current.setMap(null);
      selectedPlaceRouteRef.current = null;
    }
    clearMarkers(routePlaceMarkersRef.current);
    routePlaceMarkersRef.current = [];

    const validPlaces = routePlaces.filter(hasCoordinate);
    if (!validPlaces.length) return;

    closeInfoWindow();
    const path = validPlaces.map(toLatLng);
    routePlaceLineRef.current = new kakao.maps.Polyline({
      map: mapRef.current,
      path,
      strokeWeight: 6,
      strokeColor: "#16a34a",
      strokeOpacity: 0.9,
      strokeStyle: "solid",
    });

    routePlaceMarkersRef.current = validPlaces.map((place, index) => {
      const markerKind = index === 0 ? "routeStart" : index === validPlaces.length - 1 ? "routeEnd" : "routeMiddle";
      const marker = createMarker(place, place.name, markerKind);
      const infoWindow = createInfoWindow(
        `<strong>${escapeHtml(`${index + 1}. ${place.name}`)}</strong><br />${escapeHtml(place.category || "장소")}`
      );

      kakao.maps.event.addListener(marker, "click", () => openInfoWindow(infoWindow, marker));
      return marker;
    });

    fitLatLngs(path);
  }, [routePlaces]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedPlaceRouteRef.current) {
      selectedPlaceRouteRef.current.setMap(null);
      selectedPlaceRouteRef.current = null;
    }

    if (!selectedPlace || routePlaces.length) return;

    const start = toLatLng(location);
    const end = toLatLng(selectedPlace);
    const mid = new kakao.maps.LatLng(
      (location.lat + selectedPlace.lat) / 2 + 0.0008,
      (location.lng + selectedPlace.lng) / 2 - 0.0006
    );

    selectedPlaceRouteRef.current = new kakao.maps.Polyline({
      map: mapRef.current,
      path: [start, mid, end],
      strokeWeight: 5,
      strokeColor: "#f97316",
      strokeOpacity: 0.86,
      strokeStyle: "shortdash",
    });

    fitLatLngs([start, end]);
  }, [location, selectedPlace, routePlaces.length]);

  function createMarker(place, title, markerKind = "default") {
    return new kakao.maps.Marker({
      map: mapRef.current,
      position: toLatLng(place),
      title,
      image: getMarkerImage(markerKind),
    });
  }

  function openInfoWindow(infoWindow, marker) {
    closeInfoWindow();
    infoWindow?.open(mapRef.current, marker);
    openInfoRef.current = infoWindow;
  }

  function closeInfoWindow() {
    openInfoRef.current?.close();
    openInfoRef.current = null;
  }

  function fitPlaces(items) {
    fitLatLngs(items.map(toLatLng));
  }

  function fitLatLngs(points) {
    if (!points.length) return;

    const bounds = new kakao.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    mapRef.current.setBounds(bounds);
  }

  return h("div", { className: "map-card" }, h("div", { ref: mapEl, className: "map-canvas" }));
}

function toLatLng(item) {
  return new kakao.maps.LatLng(Number(item.lat), Number(item.lng));
}

function hasCoordinate(item = {}) {
  return Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng));
}

function createInfoWindow(content) {
  return new kakao.maps.InfoWindow({
    content: createInfoContent(content),
  });
}

function createInfoContent(content) {
  return `<div style="padding:8px 10px;font-size:12px;line-height:1.45;max-width:190px;color:#202020;">${content}</div>`;
}

function getMarkerImage(kind) {
  const options = markerOptions[kind] || markerOptions.default;
  const imageSize = new kakao.maps.Size(options.width, options.height);
  const imageOption = { offset: new kakao.maps.Point(options.anchorX, options.anchorY) };

  return new kakao.maps.MarkerImage(svgDataUrl(options.svg), imageSize, imageOption);
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function clearMarkers(markers) {
  markers.forEach((marker) => marker.setMap(null));
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const markerOptions = {
  current: {
    width: 34,
    height: 34,
    anchorX: 17,
    anchorY: 17,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="13" fill="#1f8cff" stroke="#fff" stroke-width="5"/><circle cx="17" cy="17" r="5" fill="#fff"/></svg>`,
  },
  recommended: {
    width: 42,
    height: 50,
    anchorX: 21,
    anchorY: 48,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="50" viewBox="0 0 42 50"><path d="M21 49S4 32.5 4 20a17 17 0 1 1 34 0c0 12.5-17 29-17 29z" fill="#ffd92f" stroke="#fff" stroke-width="3"/><path d="m21 10 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L21 10z" fill="#fff"/></svg>`,
  },
  saved: {
    width: 42,
    height: 50,
    anchorX: 21,
    anchorY: 48,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="50" viewBox="0 0 42 50"><path d="M21 49S4 32.5 4 20a17 17 0 1 1 34 0c0 12.5-17 29-17 29z" fill="#ff66b8" stroke="#fff" stroke-width="3"/><path d="M29.3 15.2a5.2 5.2 0 0 0-7.4 0L21 16.1l-.9-.9a5.2 5.2 0 0 0-7.4 7.4L21 30l8.3-7.4a5.2 5.2 0 0 0 0-7.4z" fill="#fff"/></svg>`,
  },
  destination: {
    width: 38,
    height: 48,
    anchorX: 19,
    anchorY: 46,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48"><path d="M19 47S3 30.8 3 18.5a16 16 0 0 1 32 0C35 30.8 19 47 19 47z" fill="#ef4444" stroke="#fff" stroke-width="3"/><circle cx="19" cy="18.5" r="6.5" fill="#fff"/></svg>`,
  },
  routeStart: {
    width: 42,
    height: 50,
    anchorX: 21,
    anchorY: 48,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="50" viewBox="0 0 42 50"><path d="M21 49S4 32.5 4 20a17 17 0 1 1 34 0c0 12.5-17 29-17 29z" fill="#16a34a" stroke="#fff" stroke-width="3"/><circle cx="21" cy="20" r="7" fill="#fff"/><path d="M18.5 20.5 20.4 22.4 24.2 17.8" fill="none" stroke="#16a34a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  routeMiddle: {
    width: 36,
    height: 44,
    anchorX: 18,
    anchorY: 42,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 43S3 28 3 17a15 15 0 1 1 30 0c0 11-15 26-15 26z" fill="#64748b" stroke="#fff" stroke-width="3"/><circle cx="18" cy="17" r="5.5" fill="#fff"/></svg>`,
  },
  routeEnd: {
    width: 42,
    height: 50,
    anchorX: 21,
    anchorY: 48,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="50" viewBox="0 0 42 50"><path d="M21 49S4 32.5 4 20a17 17 0 1 1 34 0c0 12.5-17 29-17 29z" fill="#ef4444" stroke="#fff" stroke-width="3"/><circle cx="21" cy="20" r="7" fill="#fff"/><path d="M18 17h6v6h-6z" fill="#ef4444"/></svg>`,
  },
  default: {
    width: 34,
    height: 42,
    anchorX: 17,
    anchorY: 40,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42"><path d="M17 41S3 26.9 3 16.5a14 14 0 0 1 28 0C31 26.9 17 41 17 41z" fill="#64748b" stroke="#fff" stroke-width="3"/><circle cx="17" cy="16.5" r="5" fill="#fff"/></svg>`,
  },
};
