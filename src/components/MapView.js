const { useEffect, useRef } = window.React;
const h = window.React.createElement;

export function MapView({
  location,
  places,
  selectedPlace,
  onSelectPlace,
  searchResults = [],
  selectedSearchResult,
  onSelectSearchResult,
  routePath = [],
}) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userInfoRef = useRef(null);
  const placeMarkersRef = useRef([]);
  const searchMarkersRef = useRef([]);
  const routeLineRef = useRef(null);
  const selectedPlaceRouteRef = useRef(null);

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

    setTimeout(() => mapRef.current?.relayout(), 0);
  }, [location.lat, location.lng]);

  useEffect(() => {
    if (!mapRef.current) return;

    const center = toLatLng(location);

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(center);
      return;
    }

    userMarkerRef.current = new kakao.maps.Marker({
      map: mapRef.current,
      position: center,
      title: "현재 위치",
    });

    kakao.maps.event.addListener(userMarkerRef.current, "click", () => {
      userInfoRef.current?.open(mapRef.current, userMarkerRef.current);
    });
  }, [location]);

  useEffect(() => {
    if (!mapRef.current) return;

    clearMarkers(placeMarkersRef.current);
    placeMarkersRef.current = places.map((place) => {
      const marker = createMarker(place, place.name);
      const infoWindow = createInfoWindow(
        `<strong>${escapeHtml(place.name)}</strong><br />${escapeHtml(place.type)}<br />${escapeHtml(place.reason)}`
      );

      kakao.maps.event.addListener(marker, "click", () => {
        infoWindow.open(mapRef.current, marker);
        onSelectPlace(place.id, true);
      });

      return marker;
    });

    if (places.length > 0 && searchResults.length === 0) {
      fitPlaces([location, ...places]);
    }
  }, [location, places, onSelectPlace, searchResults.length]);

  useEffect(() => {
    if (!mapRef.current) return;

    clearMarkers(searchMarkersRef.current);
    searchMarkersRef.current = searchResults.map((result) => {
      const marker = createMarker(result, result.name);
      const infoWindow = createInfoWindow(
        `<strong>${escapeHtml(result.name)}</strong><br />${escapeHtml(result.address || "검색한 장소")}`
      );

      kakao.maps.event.addListener(marker, "click", () => {
        infoWindow.open(mapRef.current, marker);
        onSelectSearchResult?.(result);
      });

      return marker;
    });

    if (selectedSearchResult) {
      const point = toLatLng(selectedSearchResult);
      mapRef.current.setCenter(point);
      mapRef.current.setLevel(3);

      const marker = searchMarkersRef.current.find((item) => {
        const position = item.getPosition();
        return (
          position.getLat() === selectedSearchResult.lat &&
          position.getLng() === selectedSearchResult.lng
        );
      });
      marker && createInfoWindow(
        `<strong>${escapeHtml(selectedSearchResult.name)}</strong><br />${escapeHtml(
          selectedSearchResult.address || "검색한 장소"
        )}`
      ).open(mapRef.current, marker);
      return;
    }

    if (searchResults.length > 1) {
      fitPlaces(searchResults);
    }
  }, [searchResults, selectedSearchResult, onSelectSearchResult]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    if (!routePath.length) return;

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

    if (selectedPlaceRouteRef.current) {
      selectedPlaceRouteRef.current.setMap(null);
      selectedPlaceRouteRef.current = null;
    }

    if (!selectedPlace) return;

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
  }, [location, selectedPlace]);

  function createMarker(place, title) {
    return new kakao.maps.Marker({
      map: mapRef.current,
      position: toLatLng(place),
      title,
    });
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

  return h("div", { className: "map-card" }, h("div", { ref: mapEl, id: "map" }));
}

function toLatLng(item) {
  return new kakao.maps.LatLng(Number(item.lat), Number(item.lng));
}

function createInfoWindow(content) {
  return new kakao.maps.InfoWindow({
    content: `<div style="padding:7px 9px;font-size:12px;line-height:1.4;max-width:180px;">${content}</div>`,
  });
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
