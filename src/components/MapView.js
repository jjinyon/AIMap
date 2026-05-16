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
  const placeMarkersRef = useRef([]);
  const searchMarkersRef = useRef([]);
  const routeLineRef = useRef(null);
  const selectedPlaceRouteRef = useRef(null);

  useEffect(() => {
    if (!window.L || !mapEl.current || mapRef.current) return;

    mapRef.current = L.map(mapEl.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([location.lat, location.lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    setTimeout(() => mapRef.current?.invalidateSize(), 0);
  }, [location.lat, location.lng]);

  useEffect(() => {
    if (!mapRef.current) return;

    const point = [location.lat, location.lng];

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(point);
      return;
    }

    userMarkerRef.current = L.circleMarker(point, {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#2f80ed",
      fillOpacity: 0.95,
    })
      .bindPopup("현재 위치")
      .addTo(mapRef.current);
  }, [location]);

  useEffect(() => {
    if (!mapRef.current) return;

    placeMarkersRef.current.forEach((marker) => marker.remove());
    placeMarkersRef.current = places.map((place) => {
      const marker = L.marker([place.lat, place.lng])
        .bindPopup(
          `<strong>${place.name}</strong><br />${place.type}<br />${place.reason}`
        )
        .addTo(mapRef.current);

      marker.on("click", () => onSelectPlace(place.id, true));
      return marker;
    });

    const points = [
      [location.lat, location.lng],
      ...places.map((place) => [place.lat, place.lng]),
    ];

    if (points.length > 1 && searchResults.length === 0) {
      mapRef.current.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
    }
  }, [location, places, onSelectPlace, searchResults.length]);

  useEffect(() => {
    if (!mapRef.current) return;

    searchMarkersRef.current.forEach((marker) => marker.remove());
    searchMarkersRef.current = searchResults.map((result) => {
      const marker = L.marker([result.lat, result.lng])
        .bindPopup(`<strong>${result.name}</strong><br />${result.address || "검색한 장소"}`)
        .addTo(mapRef.current);

      marker.on("click", () => onSelectSearchResult?.(result));
      return marker;
    });

    if (selectedSearchResult) {
      const point = [selectedSearchResult.lat, selectedSearchResult.lng];
      mapRef.current.setView(point, 16);

      const marker = searchMarkersRef.current.find((item) => {
        const latLng = item.getLatLng();
        return latLng.lat === selectedSearchResult.lat && latLng.lng === selectedSearchResult.lng;
      });
      marker?.openPopup();
      return;
    }

    if (searchResults.length > 1) {
      const bounds = searchResults.map((result) => [result.lat, result.lng]);
      mapRef.current.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
    }
  }, [searchResults, selectedSearchResult, onSelectSearchResult]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (!routePath.length) return;

    routeLineRef.current = L.polyline(routePath, {
      color: "#1d4ed8",
      weight: 6,
      opacity: 0.9,
    }).addTo(mapRef.current);

    mapRef.current.fitBounds(routePath, {
      paddingTopLeft: [26, 104],
      paddingBottomRight: [26, 86],
      maxZoom: 16,
    });
  }, [routePath]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedPlaceRouteRef.current) {
      selectedPlaceRouteRef.current.remove();
      selectedPlaceRouteRef.current = null;
    }

    if (!selectedPlace) return;

    const start = [location.lat, location.lng];
    const end = [selectedPlace.lat, selectedPlace.lng];
    const mid = [
      (start[0] + end[0]) / 2 + 0.0008,
      (start[1] + end[1]) / 2 - 0.0006,
    ];

    selectedPlaceRouteRef.current = L.polyline([start, mid, end], {
      color: "#f97316",
      weight: 5,
      opacity: 0.86,
      dashArray: "8 10",
    }).addTo(mapRef.current);

    mapRef.current.fitBounds([start, end], { padding: [48, 48], maxZoom: 16 });

    const marker = placeMarkersRef.current.find((item) => {
      const latLng = item.getLatLng();
      return latLng.lat === selectedPlace.lat && latLng.lng === selectedPlace.lng;
    });
    marker?.openPopup();
  }, [location, selectedPlace]);

  return h("div", { className: "map-card" }, h("div", { ref: mapEl, id: "map" }));
}
