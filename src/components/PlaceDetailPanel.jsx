import { PlaceActions } from "./PlaceActions.jsx";
import { PlaceHeader } from "./PlaceHeader.jsx";
import { PlaceRecommendationSection } from "./PlaceRecommendationSection.jsx";
import { PlaceReviewSection } from "./PlaceReviewSection.jsx";
import { PlaceStorySection } from "./PlaceStorySection.jsx";
import { PlaceSummary } from "./PlaceSummary.jsx";

const h = window.React.createElement;

export function PlaceDetailPanel({
  place,
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
    "article",
    { className: "place-page-sheet" },
    h("div", { className: "place-page-handle", "aria-hidden": "true" }),
    h(
      "div",
      { className: "place-page-scroll" },
      h(PlaceHeader, { place, isSaved, onClose, onSave }),
      h(PlaceSummary, { place }),
      h(PlaceActions, {
        onStory: () => onStory?.(place),
        onRoute: () => onRoute?.(place),
      }),
      h(PlaceStorySection, { place }),
      h(PlaceReviewSection, {
        reviews,
        status: reviewStatus,
        reviewForm,
      }),
      h(PlaceRecommendationSection, {
        recommendedPlaces,
        routeStatus,
        nearbyStatus,
        savedPlaceIds,
        onSelectRecommended,
        onToggleSave,
      })
    )
  );
}
