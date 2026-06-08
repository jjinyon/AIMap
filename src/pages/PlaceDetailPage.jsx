import { MapView } from "../components/MapView.js";
import { PlaceDetailPanel } from "../components/PlaceDetailPanel.jsx";

const h = window.React.createElement;

export function PlaceDetailPage({
  place,
  location,
  reviews = [],
  reviewStatus = "",
  routeStatus = "",
  nearbyStatus = "",
  recommendedPlaces = [],
  savedPlaceIds,
  isSaved = false,
  onClose,
  onSave,
  onStory,
  onRoute,
  onSelectRecommended,
  onToggleSave,
  reviewForm = null,
}) {
  if (!place) return null;

  return h(
    "section",
    { className: "place-page", "aria-label": `${place.name} 장소 상세 페이지` },
    h(
      "div",
      { className: "place-page-map" },
      h(MapView, {
        location,
        places: [],
        selectedPlace: place,
        onSelectPlace: null,
        searchResults: [place],
        selectedSearchResult: place,
        onSelectSearchResult: null,
        routePath: [],
      })
    ),
    h(PlaceDetailPanel, {
      place,
      reviews,
      reviewStatus,
      routeStatus,
      nearbyStatus,
      recommendedPlaces,
      savedPlaceIds,
      isSaved,
      onClose,
      onSave,
      onStory,
      onRoute,
      onSelectRecommended,
      onToggleSave,
      reviewForm,
    })
  );
}
