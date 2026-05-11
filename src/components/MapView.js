const { useEffect, useRef } = window.React;

export function MapView({ location, places, selectedPlace, onSelectPlace }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const placeMarkersRef = useRef([]);
  const routeLineRef = useRef(null);

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

    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
  }, [location.lat, location.lng]);

  useEffect(() => {
    if (!mapRef.current) return;

    const point = [location.lat, location.lng];
    mapRef.current.setView(point, 15);

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(point);
      return;
    }

    userMarkerRef.current = L.circleMarker(point, {
      radius: 9,
      color: "#0f766e",
      weight: 3,
      fillColor: "#14b8a6",
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

    if (points.length > 1) {
      mapRef.current.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
    }
  }, [location, places, onSelectPlace]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (!selectedPlace) return;

    const start = [location.lat, location.lng];
    const end = [selectedPlace.lat, selectedPlace.lng];
    const mid = [
      (start[0] + end[0]) / 2 + 0.0008,
      (start[1] + end[1]) / 2 - 0.0006,
    ];

    routeLineRef.current = L.polyline([start, mid, end], {
      color: "#ef4444",
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

const h = window.React.createElement;
