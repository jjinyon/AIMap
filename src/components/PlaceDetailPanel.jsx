import { PlaceActions } from "./PlaceActions.jsx";
import { PlaceHeader } from "./PlaceHeader.jsx";
import { PlaceRecommendationSection } from "./PlaceRecommendationSection.jsx";
import { PlaceReviewSection } from "./PlaceReviewSection.jsx";
import { PlaceStorySection } from "./PlaceStorySection.jsx";
import { PlaceSummary } from "./PlaceSummary.jsx";

const { useEffect, useRef, useState } = window.React;
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
  const sheetRef = useRef(null);
  const handleRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const sheetHeightRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);
  const boundsRef = useRef({ collapsed: 0, expanded: 0, min: 120, max: 0 });

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const parentHeight = sheet.parentElement?.offsetHeight || window.innerHeight;
    const bottomNav = document.querySelector(".bottom-nav");
    const navHeight = bottomNav?.offsetHeight || 58;
    const collapsedHeight = Math.max(120, Math.round(parentHeight * 0.35));
    const expandedHeight = Math.max(collapsedHeight, parentHeight - navHeight);

    boundsRef.current = {
      collapsed: collapsedHeight,
      expanded: expandedHeight,
      min: 0,
      max: expandedHeight,
    };

    sheetHeightRef.current = collapsedHeight;
    setSheetHeight(collapsedHeight);
  }, [place]);

  useEffect(() => {
    const sheet = sheetRef.current;
    const handle = handleRef.current;
    if (!sheet || !handle) return;

    function startDrag(clientY) {
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartYRef.current = clientY;
      dragStartHeightRef.current = sheet.offsetHeight;
    }

    function handlePointerDown(e) {
      if (e.target !== handle && !handle.contains(e.target)) return;
      e.preventDefault();
      startDrag(e.clientY);
      handle.setPointerCapture?.(e.pointerId);
    }

    function handleTouchStart(e) {
      if (e.target !== handle && !handle.contains(e.target)) return;
      e.preventDefault();
      startDrag(e.touches[0].clientY);
    }

    function handleMouseDown(e) {
      if (e.target !== handle && !handle.contains(e.target)) return;
      e.preventDefault();
      startDrag(e.clientY);
    }

    function updateHeight(clientY) {
      const { min, max } = boundsRef.current;
      const deltaY = dragStartYRef.current - clientY;
      const newHeight = Math.max(min, Math.min(max, dragStartHeightRef.current + deltaY));
      sheetHeightRef.current = newHeight;
      setSheetHeight(newHeight);
    }

    function handlePointerMove(e) {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      updateHeight(e.clientY);
    }

    function handleTouchMove(e) {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      updateHeight(e.touches[0].clientY);
    }

    function handleMouseMove(e) {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      updateHeight(e.clientY);
    }

    function endDrag(e) {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      dragStartYRef.current = 0;
      dragStartHeightRef.current = 0;
      handle.releasePointerCapture?.(e?.pointerId);

      const { collapsed, expanded } = boundsRef.current;
      const currentHeight = sheetHeightRef.current;
      const closeThreshold = Math.max(60, Math.round(collapsed * 0.25));
      if (currentHeight <= closeThreshold) {
        onClose?.();
        return;
      }

      const mid = (collapsed + expanded) / 2;
      const finalHeight = currentHeight >= mid ? expanded : collapsed;
      sheetHeightRef.current = finalHeight;
      setSheetHeight(finalHeight);
    }

    handle.addEventListener("pointerdown", handlePointerDown, false);
    handle.addEventListener("touchstart", handleTouchStart, { passive: false });
    handle.addEventListener("mousedown", handleMouseDown, false);

    document.addEventListener("pointermove", handlePointerMove, false);
    document.addEventListener("pointerup", endDrag, false);
    document.addEventListener("pointercancel", endDrag, false);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", endDrag, false);
    document.addEventListener("mousemove", handleMouseMove, false);
    document.addEventListener("mouseup", endDrag, false);

    return () => {
      handle.removeEventListener("pointerdown", handlePointerDown);
      handle.removeEventListener("touchstart", handleTouchStart);
      handle.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", endDrag);
      document.removeEventListener("pointercancel", endDrag);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", endDrag);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", endDrag);
    };
  }, [onClose]);

  if (!place) return null;

  const sheetStyle = {
    height: `${sheetHeight}px`,
    transition: isDragging ? "none" : "height 180ms ease",
  };

  return h(
    "article",
    { className: "place-page-sheet", ref: sheetRef, style: sheetStyle },
    h("div", { 
      className: "place-page-handle", 
      ref: handleRef,
      "aria-hidden": "true"
    }),
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
