import { MapView } from "../components/MapView.js";
import { RouteBottomSheet } from "../components/RouteBottomSheet.js";
import { PlaceDetailPage } from "./PlaceDetailPage.jsx";
import { SignupPage } from "./SignupPage.js";
import { useCurrentLocation } from "../hooks/useCurrentLocation.js";
import { audioGenreFilters } from "../data/audioEpisodeData.js";
import { reviewMockData } from "../data/reviewMockData.js";
import { getCurrentUser, loginUser, logoutUser } from "../services/authService.js";
import { getEpisodesNearLocation } from "../services/audioEpisodeService.js";
import { fetchNearbyReviewPlaces, searchPlaces } from "../services/geocodingService.js";
import { createPlaceReview, fetchPlaceReviews } from "../services/reviewService.js";
import { findRoute, formatRouteSummary } from "../services/routingService.js";
import { recommendKakaoPlacesWithReviewData, recommendLocalExperienceRoutes } from "../services/recommendation/index.js";
import { loadCurrentPlaceAudioStories } from "../services/audio/triggerService.js";
import { generateLocalReviewsForPlace, getGeneratedLocalReviewStats } from "../services/localReviewInsightService.js";
import { isPlaceSaved, loadSavedPlaces, toggleSavedPlace } from "../services/savedPlaceService.js";
import { cityOptions } from "../services/userProfileService.js";
import {
  canSpeak,
  isPaused,
  loadVoices,
  pauseAudio,
  resumeAudio,
  selectNarrationVoice,
  speakStory,
  stopAudio as stopSpeechAudio,
} from "../services/audio/ttsService.js";

const { useEffect, useRef, useState } = window.React;
const h = window.React.createElement;

const navItems = [
  { id: "audio", label: "오디오", icon: "headphones" },
  { id: "review", label: "리뷰", icon: "message" },
  { id: "map", label: "지도", icon: "foldedMap" },
];

const audioOptions = [
  { label: "현재 지역", tone: "warm" },
  { label: "목적지", tone: "green" },
  { label: "경로기반", tone: "blue" },
];

const routeOptions = [
  { id: "fast", label: "빠르게" },
  { id: "stairs", label: "계단 X" },
  { id: "local", label: "지역 만끽" },
  { id: "personal", label: "퍼스널" },
];

const koreaCityOptions = cityOptions;

export function Home({ appStatus }) {
  const { location, status: locationStatus, locate } = useCurrentLocation();
  const [authUser, setAuthUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [screen, setScreen] = useState("auth");
  const [screenHistory, setScreenHistory] = useState([]);
  const [mapCanGoBack, setMapCanGoBack] = useState(false);
  const [mapBackSignal, setMapBackSignal] = useState(0);
  const [audioCanGoBack, setAudioCanGoBack] = useState(false);
  const [audioBackSignal, setAudioBackSignal] = useState(0);
  const [reviewCanGoBack, setReviewCanGoBack] = useState(false);
  const [reviewBackSignal, setReviewBackSignal] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const { user } = await getCurrentUser();
        if (ignore) return;

        setAuthUser(user);
        setScreen("map");
        setScreenHistory([]);
      } catch {
        if (ignore) return;

        setAuthUser(null);
        setScreen("auth");
      } finally {
        if (!ignore) setIsAuthLoading(false);
      }
    }

    loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  const completeAuth = (user) => {
    setAuthUser(user);
    setScreen("map");
    setScreenHistory([]);
  };

  const logout = async () => {
    await logoutUser();
    setAuthUser(null);
    setScreen("auth");
    setScreenHistory([]);
  };

  const navigateTo = (nextScreen) => {
    if (nextScreen === screen) return;

    setScreenHistory((history) => [...history, screen].slice(-12));
    setScreen(nextScreen);
  };

  const openNav = (itemId) => {
    if (isAuthLoading) return;

    if (!authUser) {
      setScreen("auth");
      return;
    }

    if (itemId === "audio") {
      navigateTo("audio");
      return;
    }

    if (itemId === "review") {
      navigateTo("review");
      return;
    }

    navigateTo("map");
  };

  const openAccount = () => {
    if (!authUser || isAuthLoading) return;
    navigateTo("account");
  };

  const goBack = () => {
    if (!authUser || isAuthLoading) return;

    if (screen === "map" && mapCanGoBack) {
      setMapBackSignal((signal) => signal + 1);
      return;
    }

    if (screen === "audio" && audioCanGoBack) {
      setAudioBackSignal((signal) => signal + 1);
      return;
    }

    if (screen === "review" && reviewCanGoBack) {
      setReviewBackSignal((signal) => signal + 1);
      return;
    }

    const previous = screenHistory[screenHistory.length - 1] || "map";
    setScreenHistory((history) => history.slice(0, -1));
    setScreen(previous);
  };

  useEffect(() => {
    if (screen !== "map") setMapCanGoBack(false);
    if (screen !== "audio") setAudioCanGoBack(false);
    if (screen !== "review") setReviewCanGoBack(false);
  }, [screen]);

  const shouldShowBottomNav = Boolean(authUser) && !isAuthLoading;
  const shouldShowTopNav = shouldShowBottomNav;

  return h(
    "main",
    { className: "app-shell" },
    h(
      "section",
      { className: "phone-frame", "aria-label": "AI 장소 추천 앱" },
      h("div", { className: "phone-camera", "aria-hidden": "true" }),
      h(
        "div",
        { className: "phone-screen" },
        renderScreen(screen, {
          appStatus,
          authUser,
          isAuthLoading,
          location,
          locationStatus,
          onRequestLocation: locate,
          onAuthenticated: completeAuth,
          onLogout: logout,
          setScreen: navigateTo,
          mapBackSignal,
          onMapBackStateChange: setMapCanGoBack,
          audioBackSignal,
          onAudioBackStateChange: setAudioCanGoBack,
          reviewBackSignal,
          onReviewBackStateChange: setReviewCanGoBack,
        }),
        shouldShowTopNav
          ? h(TopNav, {
              title: getScreenTitle(screen),
              onBack: goBack,
              onSettings: openAccount,
            })
          : null,
        shouldShowBottomNav
          ? h(BottomNav, {
              activeId: screen === "audio" ? "audio" : screen === "review" ? "review" : screen === "map" ? "map" : "",
              onSelect: openNav,
            })
          : null
      )
    )
  );
}

function renderScreen(screen, { appStatus, authUser, isAuthLoading, location, locationStatus, onRequestLocation, onAuthenticated, onLogout, setScreen, mapBackSignal, onMapBackStateChange, audioBackSignal, onAudioBackStateChange, reviewBackSignal, onReviewBackStateChange }) {
  if (isAuthLoading) {
    return h(LoadingScreen);
  }

  if (!authUser) {
    return h(AuthScreen, { onAuthenticated });
  }

  const hasResolvedLocation = Boolean(location?.lat && location?.lng && !location.isFallback);
  if (!hasResolvedLocation && ["audio", "review", "map"].includes(screen)) {
    return h(MapScreen, { location, locationStatus, onRequestLocation, appStatus, user: authUser, backSignal: mapBackSignal, onBackStateChange: onMapBackStateChange });
  }

  if (screen === "audio") {
    return h(AudioScreen, { location, user: authUser, backSignal: audioBackSignal, onBackStateChange: onAudioBackStateChange });
  }

  if (screen === "settings") {
    return h(SettingsScreen, { onBack: () => setScreen("account") });
  }

  if (screen === "account") {
    return h(AccountScreen, {
      user: authUser,
      onLogout,
    });
  }

  if (screen === "review") {
    return h(ReviewScreen, {
      location,
      user: authUser,
      backSignal: reviewBackSignal,
      onBackStateChange: onReviewBackStateChange,
    });
  }

  return h(MapScreen, { location, locationStatus, onRequestLocation, appStatus, user: authUser, backSignal: mapBackSignal, onBackStateChange: onMapBackStateChange });
}

function getScreenTitle(screen) {
  const titles = {
    audio: "오디오",
    review: "리뷰",
    map: "지도",
    account: "프로필",
    settings: "설정",
  };

  return titles[screen] || "지도";
}

function formatRecommendedPlace(place) {
  const placeWithReviewMetrics = applyDemoReviewMetrics(place);
  const reviewCount = Number(placeWithReviewMetrics.reviewCount || 0);
  const rating = Number(placeWithReviewMetrics.rating || placeWithReviewMetrics.googleRating || placeWithReviewMetrics.localRating || 0);
  const ratingLabel = reviewCount
    ? `★ ${rating.toFixed(1)} (${reviewCount})`
    : placeWithReviewMetrics.ratingLabel || (placeWithReviewMetrics.distance ? `${placeWithReviewMetrics.distance}m` : "");

  return {
    ...placeWithReviewMetrics,
    categoryCode: placeWithReviewMetrics.categoryCode || placeWithReviewMetrics.kakaoCategoryCode || placeWithReviewMetrics.category,
    ratingLabel,
    aiReason:
      place.aiReason ||
      (place.localReviewCount
        ? `로컬 리뷰 ${place.localReviewCount}개 기반 추천`
        : place.googleReviewCount
        ? `Google ${place.googleReviewCount} reviews + local ${place.localReviewCount || 0}`
        : place.summary || place.address || ""),
  };
}

function applyDemoReviewMetrics(place = {}) {
  const generatedStats = getGeneratedLocalReviewStats(place);
  const existingGeneratedReviews = Array.isArray(place.generatedLocalReviews) ? place.generatedLocalReviews : [];
  const generatedReviews = existingGeneratedReviews.length ? existingGeneratedReviews : generatedStats.generatedLocalReviews;
  const alreadyHasGeneratedMetrics = existingGeneratedReviews.length > 0;
  const generatedLocalCount = alreadyHasGeneratedMetrics ? 0 : Number(generatedStats.localReviewCount || 0);
  const generatedLocalRating = alreadyHasGeneratedMetrics ? 0 : Number(generatedStats.localRating || 0);
  const baseLocalCount = Number(place.localReviewCount || 0);
  const baseReviewCount = Number(place.reviewCount || place.googleReviewCount || 0);
  const localReviewCount = baseLocalCount + generatedLocalCount;
  const reviewCount = Math.max(baseReviewCount + generatedLocalCount, localReviewCount);
  const baseLocalRating = Number(place.localRating || (baseLocalCount ? place.rating : 0) || 0);
  const localRating = weightedRating(baseLocalRating, baseLocalCount, generatedLocalRating, generatedLocalCount);
  const baseRating = Number(place.rating || place.googleRating || baseLocalRating || 0);
  const rating = localRating
    ? weightedRating(baseRating, Math.max(baseReviewCount - baseLocalCount, 0), localRating, localReviewCount)
    : baseRating;

  return {
    ...place,
    rating: rating || baseRating,
    reviewCount,
    localRating: localRating || baseLocalRating,
    localReviewCount,
    generatedLocalReviews: generatedReviews,
  };
}

function weightedRating(aRating, aCount, bRating, bCount) {
  const total = Number(aCount || 0) + Number(bCount || 0);
  if (!total) return Number(aRating || bRating || 0);

  return Math.round(((Number(aRating || 0) * Number(aCount || 0) + Number(bRating || 0) * Number(bCount || 0)) / total) * 10) / 10;
}

const REVIEW_SEARCH_HISTORY_KEY = "ai-place-review-search-history";

function loadReviewSearchHistory() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(REVIEW_SEARCH_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.keyword).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveReviewSearchHistory(keyword) {
  const trimmedKeyword = String(keyword || "").trim();
  if (!trimmedKeyword) return loadReviewSearchHistory();

  const today = new Date();
  const item = {
    id: `history-${hashSearchKeyword(trimmedKeyword)}-${today.toISOString().slice(0, 10)}`,
    keyword: trimmedKeyword,
    date: `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`,
    createdAt: today.toISOString(),
  };
  const nextHistory = [
    item,
    ...loadReviewSearchHistory().filter((historyItem) => historyItem.keyword !== trimmedKeyword),
  ].slice(0, 8);
  writeReviewSearchHistory(nextHistory);
  return nextHistory;
}

function removeReviewSearchHistory(historyId) {
  const nextHistory = loadReviewSearchHistory().filter((item) => item.id !== historyId);
  writeReviewSearchHistory(nextHistory);
  return nextHistory;
}

function writeReviewSearchHistory(history) {
  try {
    window.localStorage?.setItem(REVIEW_SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore private browsing or storage quota failures.
  }
}

function hashSearchKeyword(value = "") {
  return String(value)
    .split("")
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
    .toString(36);
}

function mergeDemoReviews(place = {}, reviews = []) {
  const generatedReviews = Array.isArray(place.generatedLocalReviews) && place.generatedLocalReviews.length
    ? place.generatedLocalReviews
    : generateLocalReviewsForPlace(place);
  const seen = new Set(reviews.map((review) => review.id));
  const normalizedGeneratedReviews = generatedReviews
    .map((review, index) => ({
      userNickname: review.userNickname || review.authorName || "국제캠퍼스 방문자",
      userCity: review.userCity || "경기 용인시 기흥구",
      userNeighborhood: review.userNeighborhood || review.userCity || "",
      isLocalResident: Boolean(review.isLocalResident ?? review.localResident),
      content: review.content || review.text || "",
      createdAt: review.createdAt || new Date().toISOString(),
      source: "demo-generated",
      isSynthetic: true,
      ...review,
      id: review.id || `demo-review-${place.id || place.name || "place"}-${index}`,
      placeId: review.placeId || place.id || "",
      placeName: review.placeName || place.name || "",
      placeAddress: review.placeAddress || place.address || "",
    }))
    .filter((review) => review.content && !seen.has(review.id));

  return [...reviews, ...normalizedGeneratedReviews];
}

const ROUTE_CORRIDOR_SAMPLE_COUNT = 3;

function sampleRouteCorridor(routePoints = [], sampleCount = ROUTE_CORRIDOR_SAMPLE_COUNT) {
  if (!Array.isArray(routePoints) || routePoints.length < 2) return [];

  const lastIndex = routePoints.length - 1;

  return Array.from({ length: sampleCount }, (_, index) => {
    const ratio = (index + 1) / (sampleCount + 1);
    const point = routePoints[Math.max(0, Math.min(lastIndex, Math.round(lastIndex * ratio)))] || [];
    const lat = Number(point[0]);
    const lng = Number(point[1]);

    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }).filter(Boolean);
}

function getPlaceIdentity(place = {}) {
  return String(place.kakaoPlaceId || place.placeId || place.id || `${place.name || ""}-${place.address || ""}`);
}

function isSamePlace(a = {}, b = {}) {
  const aKey = getPlaceIdentity(a);
  const bKey = getPlaceIdentity(b);
  if (aKey && bKey && aKey === bKey) return true;

  return Boolean(a.name && b.name && a.name === b.name && a.address && b.address && a.address === b.address);
}

function dedupeCandidatePlaces(places = [], destination) {
  const seen = new Set();

  return places.filter((place) => {
    if (!place?.lat || !place?.lng) return false;
    if (destination && isSamePlace(place, destination)) return false;

    const key = getPlaceIdentity(place);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function buildLocalRoutes(candidatePlaces, location, destination, user) {
  return recommendLocalExperienceRoutes({
    candidatePlaces,
    userLocation: location,
    destination,
    maxRoutes: 3,
    minPlaces: 3,
    maxPlaces: 5,
    context: { userLocation: location, userPreference: user?.preferences },
  });
}

function MapScreen({ location, locationStatus, onRequestLocation, appStatus, user, backSignal = 0, onBackStateChange }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [destinationRecommendedPlaces, setDestinationRecommendedPlaces] = useState([]);
  const [destinationRecommendationStatus, setDestinationRecommendationStatus] = useState("");
  const [destinationReviews, setDestinationReviews] = useState([]);
  const [destinationReviewStatus, setDestinationReviewStatus] = useState("");
  const [routePath, setRoutePath] = useState([]);
  const [routeSegments, setRouteSegments] = useState([]);
  const [routeStatus, setRouteStatus] = useState("");
  const [localRoutes, setLocalRoutes] = useState([]);
  const [selectedLocalRoute, setSelectedLocalRoute] = useState(null);
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  const [routeModeActive, setRouteModeActive] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeRouteOption, setActiveRouteOption] = useState("");
  const [recommendationMode, setRecommendationMode] = useState(true);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [recommendedPlaces, setRecommendedPlaces] = useState([]);
  const [mapCenter, setMapCenter] = useState(
    location?.lat && location?.lng && !location.isFallback ? location : null
  );
  const [mapBounds, setMapBounds] = useState(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [bottomSheetState, setBottomSheetState] = useState("collapsed");
  const [savedPlaces, setSavedPlaces] = useState(() => loadSavedPlaces());
  const lastBackSignalRef = useRef(backSignal);
  const hasResolvedLocation = Boolean(location?.lat && location?.lng && !location.isFallback);

  useEffect(() => {
    if (!mapCenter && hasResolvedLocation) {
      setMapCenter({ lat: location.lat, lng: location.lng });
    }
  }, [hasResolvedLocation, location, mapCenter]);
  const hasDestination = Boolean(selectedPlace);
  const savedPlaceIds = new Set(savedPlaces.map((place) => place.kakaoPlaceId || place.id));
  const isDestinationSaved = selectedPlace ? isPlaceSaved(selectedPlace, savedPlaces) : false;
  const destinationRecommendedMapPlaces = destinationRecommendedPlaces.map((place) => ({
    ...place,
    markerKind: "recommended",
    reason: place.aiReason || place.summary || place.address || "",
  }));
  const recommendedMapPlaces = recommendationMode
    ? recommendedPlaces.map((place) => ({
        ...place,
        markerKind: "recommended",
        reason: place.aiReason || place.summary || place.address || "",
      }))
    : [];
  const savedMapPlaces = showSavedPlaces
    ? savedPlaces.map((place) => ({
        ...place,
        markerKind: "saved",
        reason: "저장한 장소입니다.",
      }))
    : [];
  const visibleMapPlaces = hasDestination
    ? routeModeActive
      ? []
      : selectedLocalRoute
      ? []
      : destinationRecommendedMapPlaces
    : [...recommendedMapPlaces, ...savedMapPlaces];
  const selectedRoutePlaces = selectedLocalRoute?.places || [];

  useEffect(() => {
    onBackStateChange?.(
      Boolean(routeSheetOpen || routeModeActive || selectedPlace || showSearchResults || query.trim())
    );
  }, [onBackStateChange, query, routeModeActive, routeSheetOpen, selectedPlace, showSearchResults]);

  useEffect(() => {
    if (lastBackSignalRef.current === backSignal) return;

    lastBackSignalRef.current = backSignal;

    if (routeSheetOpen) {
      setRouteSheetOpen(false);
      return;
    }

    if (routeModeActive) {
      setRouteModeActive(false);
      setRoutePath([]);
      setRouteSegments([]);
      setActiveRouteOption("");
      setRouteStatus("");
      closeLocalRoutes();
      return;
    }

    if (selectedPlace) {
      closeDestinationDetail();
      return;
    }

    if (showSearchResults) {
      closeSearchResults();
      return;
    }

    if (query.trim()) {
      setQuery("");
      setSearchStatus("");
      setSearchResults([]);
    }
  }, [backSignal, query, routeModeActive, routeSheetOpen, selectedPlace, showSearchResults]);

  useEffect(() => {
    let ignore = false;

    async function loadRecommendedPlaces() {
      if (!recommendationMode || !hasResolvedLocation || !mapCenter?.lat || !mapCenter?.lng) {
        if (!ignore) setRecommendedPlaces([]);
        return;
      }

      try {
        const places = await fetchNearbyReviewPlaces(mapCenter);
        const recommended = await recommendKakaoPlacesWithReviewData(
          places,
          { userLocation: mapCenter, userPreference: user?.preferences },
          { limit: 10, metricsLimit: 10 }
        );
        if (!ignore) setRecommendedPlaces(recommended.map(formatRecommendedPlace));
      } catch {
        if (!ignore) setRecommendedPlaces([]);
      }
    }

    loadRecommendedPlaces();

    return () => {
      ignore = true;
    };
  }, [recommendationMode, hasResolvedLocation, mapCenter?.lat, mapCenter?.lng, user?.id]);

  useEffect(() => {
    let ignore = false;

    async function loadDestinationRecommendedPlaces() {
      if (!selectedPlace?.lat || !selectedPlace?.lng) {
        setDestinationRecommendedPlaces([]);
        setDestinationRecommendationStatus("");
        return;
      }

      setDestinationRecommendedPlaces([]);
      setDestinationRecommendationStatus(`${selectedPlace.name} 주변 추천 장소를 찾는 중입니다.`);

      try {
        const places = await fetchNearbyReviewPlaces(selectedPlace);
        const selectedKey = String(selectedPlace.kakaoPlaceId || selectedPlace.id || "");
        const nearbyPlaces = places.filter((place) => {
          const key = String(place.kakaoPlaceId || place.id || "");
          return key && key !== selectedKey;
        });
        const recommended = await recommendKakaoPlacesWithReviewData(
          nearbyPlaces,
          { userLocation: selectedPlace, userPreference: user?.preferences },
          { limit: 8, metricsLimit: 8 }
        );

        if (ignore) return;

        const formattedPlaces = recommended.map(formatRecommendedPlace);
        setDestinationRecommendedPlaces(formattedPlaces);
        setDestinationRecommendationStatus(
          formattedPlaces.length
            ? `${selectedPlace.name} 주변 추천 장소 ${formattedPlaces.length}곳입니다.`
            : `${selectedPlace.name} 주변에서 추천할 장소를 찾지 못했습니다.`
        );
      } catch {
        if (!ignore) {
          setDestinationRecommendedPlaces([]);
          setDestinationRecommendationStatus("검색한 장소 주변 추천을 불러오지 못했습니다.");
        }
      }
    }

    loadDestinationRecommendedPlaces();

    return () => {
      ignore = true;
    };
  }, [selectedPlace?.id, selectedPlace?.lat, selectedPlace?.lng, user?.id]);

  useEffect(() => {
    let ignore = false;

    async function loadDestinationReviews() {
      if (!selectedPlace?.id) {
        setDestinationReviews([]);
        setDestinationReviewStatus("");
        return;
      }

      setDestinationReviewStatus("리뷰를 불러오는 중입니다.");

      try {
        const { reviews } = await fetchPlaceReviews(selectedPlace.id);
        if (ignore) return;

        setDestinationReviews(mergeDemoReviews(selectedPlace, reviews || []));
        setDestinationReviewStatus("");
      } catch (error) {
        if (!ignore) {
          const demoReviews = mergeDemoReviews(selectedPlace, []);
          setDestinationReviews(demoReviews);
          setDestinationReviewStatus(demoReviews.length ? "" : error.message);
        }
      }
    }

    loadDestinationReviews();

    return () => {
      ignore = true;
    };
  }, [selectedPlace?.id]);

  const selectDestination = (destination) => {
    const destinationWithReviewMetrics = formatRecommendedPlace(destination);
    setSelectedPlace(destinationWithReviewMetrics);
    setDestinationReviews([]);
    setDestinationReviewStatus("");
    setMapCenter({ lat: destinationWithReviewMetrics.lat, lng: destinationWithReviewMetrics.lng });
    setBottomSheetState("collapsed");
    closeLocalRoutes();
    setRouteModeActive(false);
    setRoutePath([]);
    setRouteSegments([]);
    setActiveRouteOption("");
    setRouteStatus("경로 옵션을 선택해 주세요.");
    setSaveStatus("");
  };

  const closeDestinationDetail = () => {
    setIsTrackingLocation(false);
    setSelectedPlace(null);
    setDestinationRecommendedPlaces([]);
    setDestinationRecommendationStatus("");
    setDestinationReviews([]);
    setDestinationReviewStatus("");
    setRoutePath([]);
    setRouteSegments([]);
    setRouteStatus("");
    setActiveRouteOption("");
    setRouteModeActive(false);
    setBottomSheetState("collapsed");
    closeLocalRoutes();
  };

  const closeSearchResults = () => {
    setIsTrackingLocation(false);
    setShowSearchResults(false);
  };

  const closeLocalRoutes = () => {
    setRouteSheetOpen(false);
    setLocalRoutes([]);
    setSelectedLocalRoute(null);
  };

  const toggleSaved = (place) => {
    const wasSaved = isPlaceSaved(place, savedPlaces);
    const nextPlaces = toggleSavedPlace(place, savedPlaces);
    setSavedPlaces(nextPlaces);
    setShowSavedPlaces(true);
    const message = wasSaved ? "저장한 장소에서 삭제했습니다." : "나만의 장소로 저장했습니다.";
    if (selectedPlace?.id === place.id) {
      setRouteStatus(message);
      return;
    }

    setSaveStatus(message);
  };

  const findFastRoute = async () => {
    if (!selectedPlace || !hasResolvedLocation) return;

    setRoutePath([]);
    setRouteSegments([]);
    setRouteSheetOpen(false);
    setSelectedLocalRoute(null);
    setLocalRoutes([]);
    setRouteModeActive(true);
    setActiveRouteOption("fast");
    setRouteStatus("가장 빠른 도보 경로를 찾는 중입니다.");

    try {
      const route = await findRoute(location, selectedPlace);
      setRoutePath(route.points);
      setRouteSegments(route.segments || []);
      setRouteStatus(formatRouteSummary(route));
    } catch {
      setRouteStatus("현재 위치에서 목적지까지의 도보 경로를 찾지 못했습니다.");
    }
  };

  const openRouteMode = () => {
    if (!selectedPlace || !hasResolvedLocation) return;

    setRouteModeActive(true);
    findFastRoute();
  };

  const selectLocalRoute = async (route) => {
    if (!route || !selectedPlace || !hasResolvedLocation) return;

    setSelectedLocalRoute(route);
    setRouteSheetOpen(true);
    setRouteStatus(`${route.title} 경로를 계산하는 중입니다.`);

    try {
      const calculatedRoute = await findRoute(location, selectedPlace, route.places || []);
      setRoutePath(calculatedRoute.points);
      setRouteSegments(calculatedRoute.segments || []);
      setRouteStatus(calculatedRoute.segmented ? `${route.title} 도보 경로를 표시했습니다.` : route.title);
    } catch (error) {
      setRoutePath([]);
    setRouteSegments([]);
      setRouteStatus(`경로 계산에 실패했습니다: ${error.message}`);
    }
  };

  const openLocalExperienceRoutes = async () => {
    if (!hasResolvedLocation) {
      setRouteStatus("현재 위치를 확인한 뒤 경로를 추천할 수 있습니다.");
      return;
    }

    setRouteSheetOpen(false);
    setSelectedLocalRoute(null);
    setLocalRoutes([]);
    setRouteModeActive(true);
    setActiveRouteOption("local");
    setRoutePath([]);
    setRouteSegments([]);
    setRouteStatus("최단 경로 주변의 추천 장소를 찾는 중입니다.");

    try {
      let baseRoute = null;

      if (hasDestination) {
        try {
          baseRoute = await findRoute(location, selectedPlace);
          setRoutePath(baseRoute.points);
          setRouteSegments(baseRoute.segments || []);
        } catch {
          setRoutePath([]);
          setRouteSegments([]);
        }
      }

      const candidatePlaces = await loadLocalRouteCandidatePlaces(baseRoute);
      setRouteStatus("지역 만끽 경로를 추천하는 중입니다.");

      let routes = buildLocalRoutes(candidatePlaces, location, hasDestination ? selectedPlace : undefined, user);

      setLocalRoutes(routes);
      if (!routes.length) {
        setRouteStatus("추천 경로를 만들 수 있는 후보 장소가 부족합니다.");
        return;
      }

      const selectedRoute = routes[0];
      await selectLocalRoute(selectedRoute);
    } catch {
      setLocalRoutes([]);
      setRouteStatus("추천 경로를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const loadLocalRouteCandidatePlaces = async (baseRoute = null) => {
    const seedPlaces = [...recommendedPlaces, ...destinationRecommendedPlaces];
    const samplePoints = hasDestination && baseRoute?.points?.length ? sampleRouteCorridor(baseRoute.points, 4) : [];
    const lookupPoints = [
      location,
      hasDestination ? selectedPlace : null,
      ...samplePoints,
    ].filter((point) => point?.lat && point?.lng);

    const nearbyGroups = await Promise.all(
      lookupPoints.map((point) =>
        fetchNearbyReviewPlaces(point, {
          radius: 1800,
          limit: 18,
          pageCount: 2,
          size: 12,
        }).catch(() => [])
      )
    );
    const rawCandidates = dedupeCandidatePlaces([...seedPlaces, ...nearbyGroups.flat()], selectedPlace);
    if (!rawCandidates.length) return [];

    const recommendedCandidates = await recommendKakaoPlacesWithReviewData(
      rawCandidates,
      { userLocation: location, userPreference: user?.preferences },
      { limit: 24, metricsLimit: 18 }
    ).catch(() => rawCandidates);

    return dedupeCandidatePlaces(recommendedCandidates.map(formatRecommendedPlace), selectedPlace);
  };

  const submitSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchStatus("");
      setRouteStatus("");
      setSearchResults([]);
      setShowSearchResults(false);
      setSelectedPlace(null);
      setRoutePath([]);
    setRouteSegments([]);
      setActiveRouteOption("");
      return;
    }

    setIsSearching(true);
    setSearchStatus("목적지를 검색하는 중입니다.");

    try {
      const results = await searchPlaces(trimmedQuery, location);
      setSearchResults(results);
      setSearchStatus(results.length ? `${results.length}개의 장소를 찾았습니다. 장소를 선택하거나 하트로 저장하세요.` : "검색 결과가 없습니다.");
      setSaveStatus("");
      setShowSearchResults(true);
      setSelectedPlace(null);
      setRoutePath([]);
    setRouteSegments([]);
      setRouteStatus("");
      setActiveRouteOption("");
    } catch {
      setSearchStatus("검색에 실패했습니다. 잠시 후 다시 시도하세요.");
      setSaveStatus("");
      setRouteStatus("");
      setSearchResults([]);
      setSelectedPlace(null);
      setRoutePath([]);
    setRouteSegments([]);
      setActiveRouteOption("");
    } finally {
      setIsSearching(false);
    }
  };

  if (!hasResolvedLocation) {
    return h(
      "div",
      { className: "screen-layer map-screen" },
      h(LocationRequiredPanel, {
        status: locationStatus,
        onRequestLocation,
      }),
      appStatus ? h("p", { className: "app-status", role: "status" }, appStatus) : null
    );
  }

  return h(
    "div",
    { className: "screen-layer map-screen" },
    h(MapView, {
      location,
      mapCenter,
      mapBounds,
      places: visibleMapPlaces,
      selectedPlace,
      onSelectPlace: selectDestination,
      searchResults,
      routePath,
      routeSegments,
      isTrackingLocation,
      onTrackingChange: () => setIsTrackingLocation(false),
      onMapCenterChange: (center) => {
        if (!center) return;
        if (mapCenter?.lat === center.lat && mapCenter?.lng === center.lng) return;
        setMapCenter(center);
      },
      onMapBoundsChange: setMapBounds,
      routePlaces: selectedRoutePlaces,
    }),
    h(
      "div",
      { className: hasDestination ? "persistent-ui route-search-mode" : "persistent-ui map-browse-mode" },
      h(SearchBar, {
        value: query,
        isSearching,
        onChange: setQuery,
        onSubmit: submitSearch,
      }),
      hasDestination && routeModeActive
        ? h(RouteOptionStrip, {
            activeId: activeRouteOption,
            onSelect: (optionId) => {
              if (optionId === "fast") {
                findFastRoute();
                return;
              }

              if (optionId === "local") {
                openLocalExperienceRoutes();
                return;
              }

              setActiveRouteOption(optionId);
              setRoutePath([]);
    setRouteSegments([]);
              setRouteStatus("이 경로 옵션은 준비 중입니다.");
            },
          })
        : hasDestination
        ? null
        : h(MapPlaceToggles, {
            showRecommendedPlaces: recommendationMode,
            showSavedPlaces,
            onToggleRecommended: () => setRecommendationMode((value) => !value),
            onToggleSaved: () => setShowSavedPlaces((value) => !value),
          }),
      hasDestination && !routeModeActive
        ? h(PlaceDetailPage, {
            place: selectedPlace,
            location,
            reviews: destinationReviews,
            reviewStatus: destinationReviewStatus,
            recommendedPlaces: destinationRecommendedPlaces,
            routeStatus,
            nearbyStatus: destinationRecommendationStatus,
            savedPlaceIds,
            isSaved: isDestinationSaved,
            onClose: closeDestinationDetail,
            onSave: toggleSaved,
            onStory: (place) => setRouteStatus(`${place.name} 장소 이야기를 준비 중입니다.`),
            onRoute: openRouteMode,
            onSelectRecommended: selectDestination,
            onToggleSave: toggleSaved,
            bottomSheetState,
            onBottomSheetStateChange: setBottomSheetState,
          })
        : showSearchResults
        ? h(SearchResults, {
            results: searchResults,
            status: saveStatus || searchStatus,
            selectedId: selectedPlace?.id,
            savedPlaceIds,
            onSelect: (result) => {
              selectDestination(result);
              setShowSearchResults(false);
            },
            onToggleSave: toggleSaved,
            onClose: closeSearchResults,
          })
        : null,
      h(MapActions, {
        onFocusLocation: () => {
          if (location?.lat && location?.lng) {
            setMapCenter({ lat: location.lat, lng: location.lng });
            setIsTrackingLocation(true);
          }
        },
      })
    ),
    appStatus ? h("p", { className: "app-status", role: "status" }, appStatus) : null,
    routeSheetOpen
      ? h(RouteBottomSheet, {
          routes: localRoutes,
          selectedRoute: selectedLocalRoute,
          location,
          destination: selectedPlace,
          routePath,
          routeSegments,
          status: routeStatus,
          onSelectRoute: selectLocalRoute,
          onBackToList: () => setSelectedLocalRoute(null),
          onClose: closeLocalRoutes,
        })
      : null
  );
}

function LocationRequiredPanel({ status, onRequestLocation }) {
  const message = status?.message || "현재 위치를 확인하는 중입니다.";
  const isLoading = status?.tone === "loading";

  return h(
    "section",
    { className: "location-required-panel", "aria-label": "현재 위치 확인" },
    h("div", { className: "location-required-marker", "aria-hidden": "true" }, h(Icon, { name: "target" })),
    h("h2", null, isLoading ? "현재 위치 확인 중" : "위치 권한이 필요합니다"),
    h("p", null, message),
    h(
      "button",
      { className: "primary-action", type: "button", onClick: onRequestLocation },
      isLoading ? "다시 확인하기" : "현재 위치 허용하기"
    )
  );
}

function AudioScreen({ location, user, backSignal = 0, onBackStateChange }) {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [status, setStatus] = useState("");
  const lastBackSignalRef = useRef(backSignal);
  const locationLabel = location?.label || "\uD604\uC7AC \uC704\uCE58";
  const visibleGenres = audioGenreFilters.filter((genre) =>
    episodes.some((episode) => episode.genre === genre)
  );
  const firstEpisode = episodes[0];

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  useEffect(() => {
    loadVoices().then(() => selectNarrationVoice());
  }, []);

  useEffect(() => {
    onBackStateChange?.(Boolean(selectedEpisode));
  }, [onBackStateChange, selectedEpisode]);

  useEffect(() => {
    if (lastBackSignalRef.current === backSignal) return;

    lastBackSignalRef.current = backSignal;
    if (selectedEpisode) closeDetail();
  }, [backSignal, selectedEpisode]);

  useEffect(() => {
    let ignore = false;

    async function loadLocationEpisodes() {
      setIsLoadingEpisodes(true);
      setStatus("\uD604\uC7AC \uC704\uCE58 \uC8FC\uBCC0\uC758 \uC9C0\uC5ED \uC774\uC57C\uAE30\uB97C \uCC3E\uB294 \uC911\uC785\uB2C8\uB2E4.");

      try {
        const nearbyEpisodes = window.kakao?.maps?.services
          ? await loadCurrentPlaceAudioStories(
              location,
              {
                currentTime: new Date(),
                userPreference: user?.preferences,
              },
              { storyLimit: 7, placeLimit: 5 }
            )
          : [];

        if (ignore) return;

        const fallbackEpisodes = nearbyEpisodes.length ? nearbyEpisodes : getEpisodesNearLocation(location, []);
        setEpisodes(fallbackEpisodes);
        setStatus(
          fallbackEpisodes.length
            ? ""
            : "\uD604\uC7AC \uC704\uCE58 \uC8FC\uBCC0\uC5D0\uC11C \uB4E4\uB824\uC904 \uC9C0\uC5ED \uC2A4\uD1A0\uB9AC \uCE74\uB4DC\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."
        );
      } finally {
        if (!ignore) setIsLoadingEpisodes(false);
      }
    }

    loadLocationEpisodes();

    return () => {
      ignore = true;
    };
  }, [location.lat, location.lng, user?.id]);

  const playEpisode = (episode) => {
    if (!canSpeak()) {
      setStatus("\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C\uB294 \uC624\uB514\uC624 \uB0AD\uB3C5\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
      return;
    }

    speakStory(episode, {
      onEnd: () => setIsPlaying(false),
      onError: () => {
        setIsPlaying(false);
        setStatus("\uC624\uB514\uC624 \uC7AC\uC0DD \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
      },
    });

    setSelectedEpisode(episode);
    setIsPlaying(true);
    setStatus("");
  };

  const togglePlay = () => {
    if (!selectedEpisode) return;

    if (isPlaying) {
      pauseAudio();
      setIsPlaying(false);
      return;
    }

    if (isPaused()) {
      resumeAudio();
      setIsPlaying(true);
      return;
    }

    playEpisode(selectedEpisode);
  };

  const closeDetail = () => {
    stopAudio();
    setSelectedEpisode(null);
    setIsPlaying(false);
  };

  if (selectedEpisode) {
    return h(
      "div",
      { className: "screen-layer audio-screen audio-detail-screen" },
      h("button", { className: "audio-title-button", type: "button", onClick: closeDetail }, "<" + selectedEpisode.title + ">"),
      h(AudioHeroWave),
      h(
        "button",
        {
          className: isPlaying ? "audio-main-control is-playing" : "audio-main-control",
          type: "button",
          "aria-label": isPlaying ? "\uC624\uB514\uC624 \uC77C\uC2DC\uC815\uC9C0" : "\uC624\uB514\uC624 \uC7AC\uC0DD",
          onClick: togglePlay,
        },
        h("span", null)
      ),
      h(
        "article",
        { className: "audio-story-card" },
        selectedEpisode.summary ? h("strong", null, selectedEpisode.summary) : null,
        h("p", null, selectedEpisode.script),
        h("small", null, "\uC608\uC0C1 " + (selectedEpisode.durationSeconds || 0) + "\uCD08 \u00B7 " + selectedEpisode.genre),
        selectedEpisode.sourceUrl
          ? h(
              "a",
              {
                href: selectedEpisode.sourceUrl,
                target: "_blank",
                rel: "noreferrer",
              },
              "\uCD9C\uCC98: " + selectedEpisode.sourceName
            )
          : h("span", { className: "audio-source-label" }, "\uCD9C\uCC98: " + selectedEpisode.sourceName)
      ),
      status ? h("p", { className: "audio-status", role: "status" }, status) : null
    );
  }

  return h(
    "div",
    { className: "screen-layer audio-screen audio-library-screen" },
    h("p", { className: "audio-location-label" }, locationLabel),
    h("h1", { className: "audio-section-title" }, "\uC9C0\uC5ED \uC2A4\uD1A0\uB9AC \uCE74\uB4DC"),
    h(
      "section",
      { className: "episode-card-grid", "aria-label": "\uC9C0\uC5ED \uC2A4\uD1A0\uB9AC \uCE74\uB4DC" },
      isLoadingEpisodes
        ? h("p", { className: "audio-empty-state" }, "\uC8FC\uBCC0 \uC774\uC57C\uAE30\uB97C \uCC3E\uB294 \uC911")
        : episodes.length
          ? episodes.map((episode) =>
              h(
                "button",
                {
                  key: episode.id,
                  className: "episode-card " + episode.tone,
                  type: "button",
                  onClick: () => playEpisode(episode),
                },
                [
                  ...episode.shortTitle.split("\n").map((line) => h("span", { key: line }, line)),
                  h("small", { key: "meta" }, episode.genre + " \u00B7 " + (episode.durationSeconds || 0) + "\uCD08"),
                ]
              )
            )
          : h("p", { className: "audio-empty-state" }, "\uC8FC\uBCC0 \uC2A4\uD1A0\uB9AC \uCE74\uB4DC \uC5C6\uC74C")
    ),
    h("h2", { className: "audio-genre-title" }, "\uCE74\uB4DC \uC885\uB958"),
    h(
      "section",
      { className: "audio-genre-grid", "aria-label": "\uCE74\uB4DC \uC885\uB958" },
      (visibleGenres.length ? visibleGenres : audioGenreFilters).map((genre) =>
        h("button", { key: genre, className: "audio-genre-chip " + genre, type: "button" }, genre)
      )
    ),
    firstEpisode
      ? h(
          "section",
          { className: "audio-mini-player", "aria-label": "\uD604\uC7AC \uC624\uB514\uC624" },
          h(AudioMiniIcon),
          h("strong", null, firstEpisode.title),
          h(
            "button",
            {
              className: "mini-play-button",
              type: "button",
              "aria-label": firstEpisode.title + " \uC7AC\uC0DD",
              onClick: () => playEpisode(firstEpisode),
            },
            h("span", null)
          ),
          h("button", { className: "mini-pause-button", type: "button", "aria-label": "\uC77C\uC2DC\uC815\uC9C0", onClick: stopAudio }, [
            h("span", { key: "1" }),
            h("span", { key: "2" }),
          ])
        )
      : null,
    status ? h("p", { className: "audio-status", role: "status" }, status) : null
  );
}

function stopAudio() {
  stopSpeechAudio();
}

function AudioMiniIcon() {
  return h("span", { className: "audio-mini-icon", "aria-hidden": "true" }, [
    h("i", { key: "1" }),
    h("i", { key: "2" }),
    h("i", { key: "3" }),
    h("i", { key: "4" }),
  ]);
}

function AudioHeroWave() {
  return h("div", { className: "audio-hero-wave", "aria-hidden": "true" }, [
    h("span", { key: "1" }),
    h("span", { key: "2" }),
    h("span", { key: "3" }),
    h("span", { key: "4" }),
    h("span", { key: "5" }),
  ]);
}

function LegacyAudioScreen() {
  return h(
    "div",
    { className: "screen-layer audio-screen" },
    h(
      "header",
      { className: "audio-header" },
      h("div", { className: "audio-wave", "aria-hidden": "true" }, [
        h("span", { key: "1" }),
        h("span", { key: "2" }),
        h("span", { key: "3" }),
        h("span", { key: "4" }),
        h("span", { key: "5" }),
      ]),
      h("h1", null, "어떤 곳의 이야기를 듣고 싶으신가요?")
    ),
    h(
      "section",
      { className: "audio-options", "aria-label": "오디오 선택지" },
      audioOptions.map((option) =>
        h(
          "button",
          {
            key: option.label,
            className: `audio-option ${option.tone}`,
            type: "button",
          },
          option.label
        )
      )
    )
  );
}

function ReviewScreen({ location, user, backSignal = 0, onBackStateChange }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("recommended");
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [searchResultPlaces, setSearchResultPlaces] = useState([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [isSearchingReviews, setIsSearchingReviews] = useState(false);
  const [searchModeLabel, setSearchModeLabel] = useState("");
  const [searchHistory, setSearchHistory] = useState(loadReviewSearchHistory);
  const [reviewAudienceFilter, setReviewAudienceFilter] = useState("local");
  const [nearbyStatus, setNearbyStatus] = useState("현재 위치 주변 장소를 찾고 있습니다.");
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [reviewsByPlace, setReviewsByPlace] = useState({});
  const [reviewStatus, setReviewStatus] = useState("");
  const lastBackSignalRef = useRef(backSignal);

  useEffect(() => {
    let ignore = false;

    async function loadNearbyPlaces() {
      setNearbyStatus("현재 위치 주변 장소를 찾고 있습니다.");

      try {
        const places = await fetchNearbyReviewPlaces(location);
        const recommended = await recommendKakaoPlacesWithReviewData(
          places,
          { userLocation: location, userPreference: user?.preferences },
          { limit: 10, metricsLimit: 10 }
        );
        if (ignore) return;

        setNearbyPlaces(recommended.map(formatRecommendedPlace));
        setNearbyStatus(recommended.length ? "" : "주변에서 보여줄 장소를 찾지 못했습니다.");
        setSelectedPlaceId(null);
      } catch {
        if (ignore) return;

        setNearbyPlaces([]);
        setNearbyStatus("주변 장소를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setSelectedPlaceId(null);
      }
    }

    loadNearbyPlaces();

    return () => {
      ignore = true;
    };
  }, [location.lat, location.lng, user?.id]);

  const showResults = view === "results";
  const showHistory = view === "history";
  const visiblePlaces = showResults
    ? searchResultPlaces.map((place) => applyReviewAudienceMetrics(place, reviewAudienceFilter))
    : nearbyPlaces.length
      ? nearbyPlaces
      : reviewMockData.recommendedPlaces;
  const selectedPlace = visiblePlaces.find((place) => place.id === selectedPlaceId);
  const selectedReviews = selectedPlaceId ? reviewsByPlace[selectedPlaceId] || [] : [];

  useEffect(() => {
    onBackStateChange?.(view !== "recommended" || Boolean(selectedPlaceId));
  }, [onBackStateChange, selectedPlaceId, view]);

  useEffect(() => {
    if (lastBackSignalRef.current === backSignal) return;

    lastBackSignalRef.current = backSignal;

    if (selectedPlaceId) {
      setSelectedPlaceId(null);
      return;
    }

    if (view === "results") {
      setView("history");
      return;
    }

    if (view === "history") {
      setView("recommended");
      setQuery("");
    }
  }, [backSignal, selectedPlaceId, view]);

  useEffect(() => {
    let ignore = false;

    async function loadReviews() {
      if (!selectedPlaceId) {
        setReviewStatus("");
        return;
      }

      setReviewStatus("리뷰를 불러오는 중입니다.");

      try {
        const { reviews } = await fetchPlaceReviews(selectedPlaceId);
        if (ignore) return;

        setReviewsByPlace((current) => ({ ...current, [selectedPlaceId]: mergeDemoReviews(selectedPlace, reviews || []) }));
        setReviewStatus("");
      } catch (error) {
        if (!ignore) {
          const demoReviews = mergeDemoReviews(selectedPlace, []);
          setReviewsByPlace((current) => ({ ...current, [selectedPlaceId]: demoReviews }));
          setReviewStatus(demoReviews.length ? "" : error.message);
        }
      }
    }

    loadReviews();

    return () => {
      ignore = true;
    };
  }, [selectedPlaceId, selectedPlace]);

  const runReviewSearch = async (keyword) => {
    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      setView("history");
      setSearchResultPlaces([]);
      setSearchStatus("");
      setSearchModeLabel("");
      setSelectedPlaceId(null);
      return;
    }

    setIsSearchingReviews(true);
    setSearchStatus("리뷰를 볼 장소를 검색하는 중입니다.");
    setSearchModeLabel("");
    setView("results");
    setSelectedPlaceId(null);
    setSearchHistory(saveReviewSearchHistory(trimmedKeyword));

    try {
      const outcome = await resolveReviewSearch(trimmedKeyword, location, user);
      setSearchResultPlaces(outcome.places);
      setSearchStatus(outcome.message);
      setSearchModeLabel(outcome.modeLabel);
      setSelectedPlaceId(outcome.autoSelectId || null);
    } catch {
      setSearchResultPlaces([]);
      setSearchStatus("검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setSearchModeLabel("");
      setSelectedPlaceId(null);
    } finally {
      setIsSearchingReviews(false);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    runReviewSearch(query);
  };

  const selectHistory = (historyItem) => {
    setQuery(historyItem.keyword);
    runReviewSearch(historyItem.keyword);
  };

  const submitPlaceReview = async ({ rating, content }) => {
    if (!selectedPlace) return;

    setReviewStatus("");
    const { review } = await createPlaceReview({
      placeId: selectedPlace.id,
      placeName: selectedPlace.name,
      placeAddress: selectedPlace.address || "",
      rating,
      content,
    });
    setReviewsByPlace((current) => ({
      ...current,
      [selectedPlace.id]: [review, ...(current[selectedPlace.id] || [])],
    }));
  };

  if (selectedPlace) {
    return h(
      "div",
      { className: "screen-layer review-screen review-detail-screen" },
      h(ReviewPlaceDetailPage, {
        place: selectedPlace,
        reviews: selectedReviews,
        reviewStatus,
        onClose: () => setSelectedPlaceId(null),
        reviewForm: h(ReviewComposer, {
          place: selectedPlace,
          user,
          reviews: selectedReviews,
          status: reviewStatus,
          onSubmit: submitPlaceReview,
        }),
      })
    );
  }

  return h(
    "div",
    { className: "screen-layer review-screen" },
    h(
      "form",
      { className: "review-search", role: "search", onSubmit: submitSearch },
      h("input", {
        "aria-label": "리뷰 장소 검색",
        placeholder: "장소, 가게명 검색",
        type: "search",
        value: query,
        disabled: isSearchingReviews,
        onFocus: () => {
          if (!query.trim() && view === "recommended") setView("history");
        },
        onChange: (event) => setQuery(event.target.value),
      }),
      h("button", { type: "submit", "aria-label": "검색", disabled: isSearchingReviews }, h(Icon, { name: "search" }))
    ),
    h(
      "div",
      { className: "review-body" },
      showHistory
        ? h(ReviewHistoryList, {
            history: searchHistory,
            onSelect: selectHistory,
            onRemove: (historyItem) => setSearchHistory(removeReviewSearchHistory(historyItem.id)),
          })
        : [
            showResults
              ? h(ReviewAudienceTabs, {
                  key: "audience",
                  activeFilter: reviewAudienceFilter,
                  onSelect: setReviewAudienceFilter,
                })
              : null,
            showResults
              ? searchModeLabel
                ? h("p", { key: "mode", className: "review-status", role: "status" }, searchModeLabel)
                : null
              : h("h1", { key: "title", className: "review-section-title" }, "현재 위치에서 인기 있는 장소"),
            showResults && searchStatus
              ? h("p", { key: "search-status", className: "review-status", role: "status" }, searchStatus)
              : null,
            !showResults && nearbyStatus
              ? h("p", { key: "status", className: "review-status", role: "status" }, nearbyStatus)
              : null,
            h(ReviewPlaceList, {
              key: "places",
              places: visiblePlaces,
              showReviewText: showResults,
              selectedPlaceId,
              onSelect: (place) => {
                setSelectedPlaceId(selectedPlaceId === place.id ? null : place.id);
              },
            }),
          ]
    ),
    selectedPlace
      ? h(PlaceDetailPage, {
          place: selectedPlace,
          location,
          reviews: selectedReviews,
          reviewStatus,
          onClose: () => setSelectedPlaceId(null),
          onStory: (place) => setReviewStatus(`${place.name} 장소 이야기를 준비 중입니다.`),
          onRoute: (place) => setReviewStatus(`${place.name} 추천 경로를 지도에서 확인해 주세요.`),
          reviewForm: h(ReviewComposer, {
            place: selectedPlace,
            user,
            reviews: selectedReviews,
            status: reviewStatus,
            onSubmit: submitPlaceReview,
          }),
        })
      : null
  );
}

async function resolveReviewSearch(query, location, user) {
  const rawResults = await searchPlaces(query, location);
  const categoryIntent = getSearchCategoryIntent(query);
  const anchorQuery = categoryIntent ? stripCategoryIntent(query) : query;
  const anchorResults =
    categoryIntent && normalizeSearchToken(anchorQuery) !== normalizeSearchToken(query)
      ? await searchPlaces(anchorQuery, location).catch(() => [])
      : rawResults;

  if (!rawResults.length && !anchorResults.length) {
    return {
      places: [],
      autoSelectId: "",
      modeLabel: "검색 결과",
      message: `"${query}" 검색 결과가 없습니다.`,
    };
  }

  const anchorPlace =
    findAnchorPlace(anchorQuery, anchorResults.length ? anchorResults : rawResults) ||
    findAnchorPlace(query, rawResults) ||
    anchorResults[0] ||
    rawResults[0];
  const shouldSearchAroundAnchor = Boolean(categoryIntent && anchorPlace);
  const directPlace = shouldSearchAroundAnchor || isLocationOnlyQuery(query, rawResults) ? null : findDirectBusinessMatch(query, rawResults);
  if (directPlace) {
    const recommended = await recommendKakaoPlacesWithReviewData(
      [directPlace],
      { userLocation: location, userPreference: user?.preferences },
      { limit: 1, metricsLimit: 1 }
    );
    const places = (recommended.length ? recommended : [directPlace]).map(formatReviewSearchPlace);
    const firstPlace = places[0];

    return {
      places,
      autoSelectId: firstPlace?.id || "",
      modeLabel: `가게 검색: ${firstPlace?.name || directPlace.name}`,
      message: firstPlace ? "해당 가게의 리뷰를 바로 열었습니다." : "가게 리뷰를 찾지 못했습니다.",
    };
  }

  const nearbyPlaces = await fetchNearbyReviewPlaces(anchorPlace, {
    radius: 1000,
    limit: 200,
    pageCount: 3,
    size: 15,
  });
  const nearbyBusinesses = nearbyPlaces
    .filter((place) => !isSamePlace(place, anchorPlace))
    .filter((place) => !categoryIntent || doesPlaceMatchCategoryIntent(place, categoryIntent));
  const recommended = await recommendKakaoPlacesWithReviewData(
    nearbyBusinesses,
    { userLocation: anchorPlace, userPreference: user?.preferences },
    {
      limit: nearbyBusinesses.length,
      metricsLimit: Math.min(nearbyBusinesses.length, 60),
      normalizationLimits: { maxDistanceKm: 1 },
      weights: { distance: 1.1, preference: 1.8 },
    }
  );
  const places = recommended.map(formatReviewSearchPlace);

  return {
    places,
    autoSelectId: "",
    modeLabel: `장소 검색: ${anchorPlace.name} 주변 가게`,
    message: places.length
      ? `${anchorPlace.name} 주변에서 리뷰를 볼 수 있는 가게 ${places.length}곳을 찾았습니다.`
      : `${anchorPlace.name} 주변에서 보여줄 가게를 찾지 못했습니다.`,
  };
}

function isLocationOnlyQuery(query, results) {
  const normalizedQuery = normalizeSearchToken(query);
  const hasExactAnchor = results.some(
    (place) => isAnchorSearchPlace(place) && normalizeSearchToken(place.name) === normalizedQuery
  );

  return hasExactAnchor || getBusinessIntentTokens(query).length === 0;
}

const CATEGORY_INTENT_KEYWORDS = {
  food: new Set(["밥", "음식점", "식당", "밥집", "맛집", "분식", "한식", "중식", "일식", "양식", "고기", "치킨", "피자"]),
  cafe: new Set(["카페", "커피", "디저트", "베이커리"]),
  drink: new Set(["술", "술집", "주점", "바", "호프", "맥주", "이자카야", "포차", "와인", "bar"]),
  convenience: new Set(["편의점", "마트", "상점", "매장"]),
};

function getSearchIntentTokens(query = "") {
  const spacedTokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  const compact = normalizeSearchToken(query);
  const embeddedTokens = Object.values(CATEGORY_INTENT_KEYWORDS)
    .flatMap((keywords) => [...keywords])
    .filter((keyword) => keyword.length > 1 && compact.includes(normalizeSearchToken(keyword)));

  return [...new Set([...spacedTokens, ...embeddedTokens].map(normalizeSearchToken).filter(Boolean))];
}

function hasAnyKeyword(text = "", keywords = new Set()) {
  const normalizedText = normalizeSearchText(text);
  const tokens = normalizedText.split(/\s+/);

  return [...keywords].some((keyword) => {
    const normalizedKeyword = normalizeSearchToken(keyword);
    if (!normalizedKeyword) return false;
    if (normalizedKeyword === "바") return tokens.includes("바");
    if (normalizedKeyword === "술") return tokens.includes("술");
    return normalizeSearchToken(normalizedText).includes(normalizedKeyword);
  });
}

function getSearchCategoryIntent(query = "") {
  const tokens = getSearchIntentTokens(query);
  if (tokens.some((token) => CATEGORY_INTENT_KEYWORDS.drink.has(token))) return "drink";
  if (tokens.some((token) => CATEGORY_INTENT_KEYWORDS.cafe.has(token))) return "cafe";
  if (tokens.some((token) => CATEGORY_INTENT_KEYWORDS.food.has(token))) return "food";
  if (tokens.some((token) => CATEGORY_INTENT_KEYWORDS.convenience.has(token))) return "convenience";
  return "";
}

function stripCategoryIntent(query = "") {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => !getSearchCategoryIntent(token))
    .join(" ")
    .trim() || query;
}

function doesPlaceMatchCategoryIntent(place = {}, intent = "") {
  const code = String(place.categoryCode || place.kakaoCategoryCode || place.category || "").toUpperCase();
  const tone = getKakaoCategoryMeta(place).tone;

  if (intent === "drink") return tone === "drink";
  if (intent === "cafe") return tone === "cafe" || code === "CE7";
  if (intent === "food") return tone === "food" || (code === "FD6" && !["cafe", "drink"].includes(tone));
  if (intent === "convenience") return ["convenience", "mart"].includes(tone) || ["CS2", "MT1"].includes(code);
  return true;
}

function getCategoryIntentLabel(intent = "") {
  const labels = {
    drink: "술집",
    cafe: "카페",
    food: "음식점",
    convenience: "생활 편의점",
  };

  return labels[intent] || "가게";
}

function formatReviewSearchPlace(place) {
  return formatRecommendedPlace({
    ...place,
    kakaoPlaceId: place.kakaoPlaceId || place.id,
    summary: place.summary || place.address || place.categoryPath || place.type || "",
    reviewText:
      place.reviewText ||
      place.description ||
      [place.address, place.phone ? `전화: ${place.phone}` : "", place.url ? "상세 정보가 있는 실제 검색 결과입니다." : ""]
        .filter(Boolean)
        .join(" "),
  });
}

function applyReviewAudienceMetrics(place = {}, audience = "local") {
  const placeWithMetrics = applyDemoReviewMetrics(place);
  const reviews = Array.isArray(placeWithMetrics.generatedLocalReviews) && placeWithMetrics.generatedLocalReviews.length
    ? placeWithMetrics.generatedLocalReviews
    : generateLocalReviewsForPlace(placeWithMetrics);
  const filteredReviews = reviews.filter((review) =>
    audience === "local" ? Boolean(review.isLocalResident ?? review.localResident) : !Boolean(review.isLocalResident ?? review.localResident)
  );
  const fallbackCount =
    audience === "local"
      ? Number(placeWithMetrics.localReviewCount || 0)
      : Math.max(0, Number(placeWithMetrics.reviewCount || 0) - Number(placeWithMetrics.localReviewCount || 0));
  const fallbackRating =
    audience === "local"
      ? Number(placeWithMetrics.localRating || placeWithMetrics.rating || 0)
      : Number(placeWithMetrics.googleRating || placeWithMetrics.rating || 0);
  const reviewCount = filteredReviews.length || fallbackCount;
  const rating = filteredReviews.length
    ? filteredReviews.reduce((total, review) => total + Number(review.rating || 0), 0) / filteredReviews.length
    : fallbackRating;
  const sampleReview = filteredReviews[0];
  const audienceLabel = audience === "local" ? "토박이" : "타지인";

  return {
    ...placeWithMetrics,
    rating,
    reviewCount,
    ratingLabel: reviewCount ? `★ ${rating.toFixed(1)} (${formatCompactCount(reviewCount)})` : `${audienceLabel} 리뷰 없음`,
    reviewText: sampleReview?.content || sampleReview?.text || placeWithMetrics.reviewText || placeWithMetrics.summary,
    summary: sampleReview?.content || sampleReview?.text || placeWithMetrics.summary,
    aiReason: `${audienceLabel} 리뷰 ${formatCompactCount(reviewCount)}개 기준`,
  };
}

function formatCompactCount(value) {
  const count = Number(value || 0);
  if (count >= 10000) return `${Math.round(count / 1000) / 10}만+`;
  if (count >= 1000) return `${Math.round(count / 100) / 10}천+`;
  return String(Math.round(count));
}

function findDirectBusinessMatch(query, results) {
  const businessResults = results.filter(isReviewableBusinessPlace);
  if (!businessResults.length) return null;

  const normalizedQuery = normalizeSearchToken(query);
  const intentTokens = getBusinessIntentTokens(query);

  return (
    businessResults.find((place) => {
      const normalizedName = normalizeSearchToken(place.name);
      if (!normalizedName) return false;

      if (normalizedName === normalizedQuery || normalizedName.includes(normalizedQuery)) return true;
      if (normalizedQuery.includes(normalizedName) && normalizedName.length >= 2) return true;

      return intentTokens.some((token) => normalizedName.includes(token));
    }) || null
  );
}

function findAnchorPlace(query, results) {
  const normalizedQuery = normalizeSearchToken(query);

  return (
    results.find((place) => isAnchorSearchPlace(place) && normalizeSearchToken(place.name) === normalizedQuery) ||
    results.find(isAnchorSearchPlace) ||
    results.find((place) => !isReviewableBusinessPlace(place)) ||
    null
  );
}

function isAnchorSearchPlace(place = {}) {
  const code = String(place.categoryCode || place.kakaoCategoryCode || place.category || "").toUpperCase();
  const name = normalizeSearchText(place.name);
  const categoryText = normalizeSearchText([place.categoryPath, place.categoryName, place.type].filter(Boolean).join(" "));

  if (["SW8", "AT4", "CT1"].includes(code)) return true;
  if (/지하철|전철|정류장|터미널|공항|관광명소|문화시설/.test(categoryText)) return true;
  return /(?:역|동|읍|면|리|구|시|군|거리|공원|광장|해수욕장|시장)$/.test(name);
}

function isReviewableBusinessPlace(place = {}) {
  if (isAnchorSearchPlace(place)) return false;

  const code = String(place.categoryCode || place.kakaoCategoryCode || place.category || "").toUpperCase();
  const text = normalizeSearchText([place.categoryPath, place.categoryName, place.type, place.name].filter(Boolean).join(" "));
  const businessCodes = new Set(["FD6", "CE7", "AD5", "CS2", "MT1", "PK6", "OL7", "BK9", "HP8", "PM9"]);

  return businessCodes.has(code) || /음식점|카페|술집|주점|숙박|편의점|마트|상점|매장|병원|약국|은행|주차장/.test(text);
}

function getBusinessIntentTokens(query) {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((token) => normalizeSearchToken(token))
    .filter((token) => token.length >= 2)
    .filter((token) => !/역$|동$|구$|시$|군$|읍$|면$|리$|로$|길$/.test(token))
    .filter((token) => !["근처", "주변", "맛집", "카페", "가게", "리뷰", "장소"].includes(token));
}

function normalizeSearchText(value = "") {
  return String(value).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function normalizeSearchToken(value = "") {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function ReviewComposer({ place, user, reviews, status, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReview = async (event) => {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setSubmitStatus("리뷰 내용을 입력해 주세요.");
      return;
    }

    setSubmitStatus("");
    setIsSubmitting(true);

    try {
      await onSubmit({ rating, content: trimmedContent });
      setContent("");
      setRating(5);
      setSubmitStatus("리뷰가 등록되었습니다.");
    } catch (error) {
      setSubmitStatus(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return h(
    "section",
    { className: "review-composer", "aria-label": `${place.name} 리뷰 작성` },
    h(
      "header",
      { className: "review-composer-header" },
      h("div", null, h("strong", null, place.name), h("span", null, user.city || "지역 미설정")),
      h("span", { className: "review-count" }, `${reviews.length}개 리뷰`)
    ),
    h(
      "form",
      { className: "review-form", onSubmit: submitReview },
      h(
        "label",
        null,
        h("span", null, "별점"),
        h(
          "select",
          {
            value: rating,
            onChange: (event) => setRating(Number(event.target.value)),
          },
          [5, 4, 3, 2, 1].map((score) => h("option", { key: score, value: score }, `${score}점`))
        )
      ),
      h(
        "label",
        null,
        h("span", null, "리뷰"),
        h("textarea", {
          value: content,
          maxLength: 500,
          placeholder: "이 장소에 대한 경험을 적어 주세요.",
          onChange: (event) => setContent(event.target.value),
        })
      ),
      h("button", { className: "primary-action", type: "submit", disabled: isSubmitting }, isSubmitting ? "등록 중..." : "리뷰 작성"),
      submitStatus ? h("p", { className: "review-status", role: "status" }, submitStatus) : null
    ),
    status ? h("p", { className: "review-status", role: "status" }, status) : null,
    h(
      "div",
      { className: "written-review-list" },
      reviews.length
        ? reviews.map((review) => h(WrittenReview, { key: review.id, review }))
        : h("p", { className: "empty-review" }, "아직 작성된 리뷰가 없습니다.")
    )
  );
}

function ReviewPlaceDetailPage({ place, reviews = [], reviewStatus = "", onClose, reviewForm = null }) {
  const rating = Number(place.rating || place.localRating || place.googleRating || 0);
  const reviewCount = Number(place.reviewCount || place.localReviewCount || place.googleReviewCount || 0);

  return h(
    "article",
    { className: "review-full-detail" },
    h(
      "header",
      { className: "review-full-detail-header" },
      h("button", { type: "button", className: "place-page-icon-button", "aria-label": "이전 화면", onClick: onClose }, "x"),
      h("strong", null, place.name || "장소 상세"),
      h("span", { "aria-hidden": "true" })
    ),
    h(
      "section",
      { className: "review-full-summary" },
      h("p", { className: "review-full-category" }, place.categoryPath || place.categoryName || place.type || "장소"),
      h("h1", null, place.name || "장소 상세"),
      rating ? h("p", { className: "review-full-rating" }, `★ ${rating.toFixed(1)} (${formatCompactCount(reviewCount)})`) : null,
      place.distance ? h("p", { className: "review-full-distance" }, `${Math.round(Number(place.distance))}m`) : null,
      place.address ? h("p", { className: "review-full-address" }, place.address) : null,
      place.phone ? h("p", { className: "review-full-phone" }, `전화번호 ${place.phone}`) : null
    ),
    h(
      "section",
      { className: "review-full-section" },
      h("h2", null, "리뷰 요약"),
      h("p", null, makeReviewDetailSummary(place, reviews))
    ),
    h(
      "section",
      { className: "review-full-section" },
      h("h2", null, "토박이 / 타지인 반응"),
      h(ReviewAudienceSummary, { reviews })
    ),
    h(
      "section",
      { className: "review-full-section" },
      h("h2", null, "리뷰 목록"),
      reviews.length
        ? h(
            "div",
            { className: "review-full-list" },
            reviews.map((review) => h(ReviewFullItem, { key: review.id, review }))
          )
        : h("p", { className: "place-page-empty" }, reviewStatus || "아직 표시할 리뷰가 없습니다.")
    ),
    reviewForm
  );
}

function ReviewAudienceSummary({ reviews = [] }) {
  const localStats = summarizeAudienceReviews(reviews, true);
  const visitorStats = summarizeAudienceReviews(reviews, false);

  return h(
    "div",
    { className: "review-audience-summary" },
    h("div", null, h("strong", null, "토박이"), h("span", null, formatAudienceStats(localStats))),
    h("div", null, h("strong", null, "타지인"), h("span", null, formatAudienceStats(visitorStats)))
  );
}

function ReviewFullItem({ review }) {
  return h(
    "article",
    { className: "review-full-item" },
    h(
      "div",
      { className: "review-full-item-meta" },
      h("strong", null, review.userNickname || "방문자"),
      h("em", null, review.isLocalResident ? "토박이" : "타지인"),
      h("b", null, `★ ${review.rating || "-"}`)
    ),
    h("p", null, review.content || review.text || "")
  );
}

function makeReviewDetailSummary(place, reviews) {
  if (reviews.length) {
    const average = reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length;
    const localCount = reviews.filter((review) => review.isLocalResident).length;
    return `표시된 리뷰 ${reviews.length}개 기준 평균 ${average.toFixed(1)}점입니다. 토박이 리뷰 ${localCount}개와 타지인 리뷰 ${reviews.length - localCount}개를 함께 반영했습니다.`;
  }

  return place.reviewText || place.summary || "리뷰 기반 요약을 준비 중입니다.";
}

function summarizeAudienceReviews(reviews, isLocal) {
  const filtered = reviews.filter((review) => Boolean(review.isLocalResident) === isLocal);
  const average = filtered.length
    ? filtered.reduce((total, review) => total + Number(review.rating || 0), 0) / filtered.length
    : 0;

  return { count: filtered.length, rating: average };
}

function formatAudienceStats(stats) {
  return stats.count ? `★ ${stats.rating.toFixed(1)} (${formatCompactCount(stats.count)})` : "리뷰 없음";
}

function WrittenReview({ review }) {
  const dateLabel = new Date(review.createdAt).toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });

  return h(
    "article",
    { className: "written-review" },
    h(
      "div",
      { className: "written-review-meta" },
      h("strong", null, review.userNickname),
      h("span", null, review.userCity ? `${review.userCity} ? ${dateLabel}` : dateLabel),
      review.isLocalResident ? h("em", { className: "local-resident-badge" }, "토박이") : null,
      h("b", null, `★${review.rating}`)
    ),
    h("p", null, review.content)
  );
}

function ReviewHistoryList({ history, onSelect, onRemove }) {
  return h(
    "section",
    { className: "review-history", "aria-label": "검색 기록" },
    history.length
      ? history.map((item) =>
      h(
        "button",
        {
          key: item.id,
          className: "review-history-row",
          type: "button",
          onClick: () => onSelect(item),
        },
        h("span", null, item.keyword),
        h("time", null, item.date),
        h(
          "span",
          {
            className: "history-remove",
            "aria-label": "검색 기록 삭제",
            role: "button",
            onClick: (event) => {
              event.stopPropagation();
              onRemove?.(item);
            },
          },
          "\u00d7"
        )
      )
    )
      : h("p", { className: "review-status" }, "아직 검색 기록이 없습니다.")
  );
}

function ReviewAudienceTabs({ activeFilter, onSelect }) {
  const tabs = [
    { id: "local", label: "토박이" },
    { id: "visitor", label: "타지인" },
  ];

  return h(
    "div",
    { className: "review-filters", "aria-label": "리뷰 작성자 유형" },
    tabs.map((tab) =>
      h(
        "button",
        {
          key: tab.id,
          className: tab.id === activeFilter ? "review-filter active" : "review-filter",
          type: "button",
          onClick: () => onSelect(tab.id),
        },
        tab.label
      )
    )
  );
}

function ReviewFilterBar({ filters, activeFilter, onSelect }) {
  return h(
    "div",
    { className: "review-filters", "aria-label": "리뷰 필터" },
    filters.map((filter) =>
      h(
        "button",
        {
          key: filter,
          className: filter === activeFilter ? "review-filter active" : "review-filter",
          type: "button",
          onClick: () => onSelect(filter),
        },
        filter
      )
    )
  );
}

function ReviewPlaceList({ places, showReviewText, selectedPlaceId, onSelect }) {
  return h(
    "section",
    { className: "review-place-list", "aria-label": "리뷰 장소 목록" },
    places.map((place) =>
      h(ReviewPlaceRow, {
        key: place.id,
        place,
        showReviewText,
        isSelected: selectedPlaceId === place.id,
        onSelect,
      })
    )
  );
}

function ReviewPlaceRow({ place, showReviewText, isSelected, onSelect }) {
  return h(
    "button",
    {
      className: isSelected ? "review-place-row is-selected" : "review-place-row",
      type: "button",
      onClick: () => onSelect?.(place),
    },
    h(CategoryBadge, { place }),
    h(
      "div",
      { className: "review-place-copy" },
      h(
        "div",
        { className: "review-place-heading" },
        h("strong", null, place.name),
        h(
          "span",
          { className: "review-rating" },
          place.ratingLabel || `★ ${place.rating} (${place.reviewCount})`
        )
      ),
      h("p", null, showReviewText ? place.reviewText : place.summary),
      !showReviewText && place.aiReason ? h("small", null, place.aiReason) : null
    )
  );
}

function CategoryBadge({ place }) {
  const meta = getKakaoCategoryMeta(place);

  return h(
    "div",
    {
      className: `review-thumb category-${meta.tone}`,
      "aria-label": meta.label,
      title: `${meta.label}${meta.source ? ` · ${meta.source}` : ""}`,
    },
    h(CategoryIcon, { name: meta.icon }),
    h("span", null, meta.label)
  );
}

function getKakaoCategoryMeta(place = {}) {
  const categoryCode = String(place.categoryCode || place.kakaoCategoryCode || place.category || "").toUpperCase();
  const categoryPath = String([place.categoryPath, place.categoryName, place.type, ...(place.tags || [])].filter(Boolean).join(" "));
  const categorySource = place.categoryPath || place.categoryName || place.type || place.category || "";

  if (/술집|주점|호프|포차|바\b|와인|맥주|이자카야/.test(categoryPath)) {
    return { label: "술집", icon: "drink", tone: "drink", source: categorySource };
  }

  const categories = {
    FD6: { label: "음식점", icon: "food", tone: "food" },
    CE7: { label: "카페", icon: "cafe", tone: "cafe" },
    AT4: { label: "관광", icon: "attraction", tone: "attraction" },
    CT1: { label: "문화", icon: "culture", tone: "culture" },
    AD5: { label: "숙박", icon: "lodging", tone: "lodging" },
    PK6: { label: "주차", icon: "parking", tone: "parking" },
    CS2: { label: "편의점", icon: "shopping", tone: "convenience" },
    MT1: { label: "마트", icon: "shopping", tone: "convenience" },
    SW8: { label: "지하철", icon: "transit", tone: "transit" },
  };

  if (/문화재|유적|궁|성곽|사찰|절\b/.test(categoryPath)) {
    return { label: "문화재", icon: "heritage", tone: "heritage", source: categorySource };
  }

  Object.assign(categories, {
    FOOD: { label: "음식", icon: "food", tone: "food" },
    CAFE: { label: "카페", icon: "cafe", tone: "cafe" },
    CULTURE: { label: "문화", icon: "culture", tone: "culture" },
    PARK: { label: "공원", icon: "park", tone: "park" },
    CONVENIENCE: { label: "편의", icon: "shopping", tone: "convenience" },
  });

  Object.assign(categories, {
    MT1: { label: "mart", icon: "cart", tone: "mart" },
    PS3: { label: "school", icon: "school", tone: "school" },
    SC4: { label: "school", icon: "school", tone: "school" },
    AC5: { label: "academy", icon: "school", tone: "school" },
    OL7: { label: "gas", icon: "gas", tone: "gas" },
    BK9: { label: "bank", icon: "bank", tone: "bank" },
    HP8: { label: "hospital", icon: "medical", tone: "medical" },
    PM9: { label: "pharmacy", icon: "pharmacy", tone: "pharmacy" },
  });

  const meta = categories[categoryCode] || { label: place.categoryName || place.type || "장소", icon: "place", tone: "place" };
  return { ...inferCategoryMeta(categoryPath, meta), source: categorySource };
}

function inferCategoryMeta(text = "", fallback) {
  const value = String(text).toLowerCase();

  if (/카페|커피|cafe|coffee/.test(value)) return { label: "카페", icon: "cafe", tone: "cafe" };
  if (/음식|맛집|식당|한식|중식|일식|양식|분식|restaurant|food/.test(value)) return { label: "음식", icon: "food", tone: "food" };
  if (/술집|주점|호프|bar|pub/.test(value)) return { label: "술집", icon: "drink", tone: "drink" };
  if (/관광|명소|여행|attraction|tour/.test(value)) return { label: "관광", icon: "attraction", tone: "attraction" };
  if (/문화|공연|전시|museum|culture|theater/.test(value)) return { label: "문화", icon: "culture", tone: "culture" };
  if (/공원|park/.test(value)) return { label: "공원", icon: "park", tone: "park" };
  if (/숙박|호텔|hotel|lodging/.test(value)) return { label: "숙박", icon: "lodging", tone: "lodging" };
  if (/주차|parking/.test(value)) return { label: "주차", icon: "parking", tone: "parking" };
  if (/편의점|convenience/.test(value)) return { label: "편의", icon: "shopping", tone: "convenience" };
  if (/마트|market|mart/.test(value)) return { label: "마트", icon: "cart", tone: "mart" };
  if (/지하철|버스|교통|subway|transit|station/.test(value)) return { label: "교통", icon: "transit", tone: "transit" };
  if (/학교|학원|school|academy/.test(value)) return { label: "학교", icon: "school", tone: "school" };
  if (/병원|hospital|medical/.test(value)) return { label: "병원", icon: "medical", tone: "medical" };
  if (/약국|pharmacy/.test(value)) return { label: "약국", icon: "pharmacy", tone: "pharmacy" };
  if (/은행|bank/.test(value)) return { label: "은행", icon: "bank", tone: "bank" };
  if (/주유|gas/.test(value)) return { label: "주유", icon: "gas", tone: "gas" };

  return fallback;
}

function CategoryIcon({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  };
  const icons = {
    food: [h("path", { key: "1", d: "M7 3v8" }), h("path", { key: "2", d: "M4 3v5a3 3 0 0 0 6 0V3" }), h("path", { key: "3", d: "M7 11v10" }), h("path", { key: "4", d: "M17 3v18" }), h("path", { key: "5", d: "M14 7h6" })],
    drink: [h("path", { key: "1", d: "M6 3h12l-1 7a5 5 0 0 1-10 0L6 3z" }), h("path", { key: "2", d: "M12 15v6" }), h("path", { key: "3", d: "M8 21h8" })],
    cafe: [h("path", { key: "1", d: "M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z" }), h("path", { key: "2", d: "M16 10h2a2 2 0 0 1 0 4h-2" }), h("path", { key: "3", d: "M7 3v2" }), h("path", { key: "4", d: "M11 3v2" })],
    attraction: [h("path", { key: "1", d: "M4 20h16" }), h("path", { key: "2", d: "m5 20 5-12 4 7 2-4 3 9" }), h("path", { key: "3", d: "M14 5h5l-2 2 2 2h-5V5z" })],
    culture: [h("path", { key: "1", d: "M4 20h16" }), h("path", { key: "2", d: "M6 9h12" }), h("path", { key: "3", d: "M12 4 4 9h16l-8-5z" }), h("path", { key: "4", d: "M7 9v8" }), h("path", { key: "5", d: "M12 9v8" }), h("path", { key: "6", d: "M17 9v8" })],
    heritage: [h("path", { key: "1", d: "M4 20h16" }), h("path", { key: "2", d: "M6 11h12" }), h("path", { key: "3", d: "M8 11V7l4-3 4 3v4" }), h("path", { key: "4", d: "M9 20v-5h6v5" })],
    park: [h("path", { key: "1", d: "M12 21V9" }), h("path", { key: "2", d: "M8 13a4 4 0 1 1 8 0" }), h("path", { key: "3", d: "M6 17h12" }), h("path", { key: "4", d: "m9 21 3-4 3 4" })],
    lodging: [h("path", { key: "1", d: "M4 11V5" }), h("path", { key: "2", d: "M4 16h16" }), h("path", { key: "3", d: "M4 21v-8h16v8" }), h("path", { key: "4", d: "M7 13v-2h4v2" })],
    parking: [h("path", { key: "1", d: "M8 21V3h6a5 5 0 0 1 0 10H8" })],
    shopping: [h("path", { key: "1", d: "M6 8h12l-1 13H7L6 8z" }), h("path", { key: "2", d: "M9 8a3 3 0 0 1 6 0" })],
    cart: [h("circle", { key: "1", cx: 9, cy: 20, r: 1 }), h("circle", { key: "2", cx: 17, cy: 20, r: 1 }), h("path", { key: "3", d: "M3 4h2l2 11h11l2-7H7" })],
    school: [h("path", { key: "1", d: "M4 10 12 5l8 5-8 5-8-5z" }), h("path", { key: "2", d: "M7 13v4c2 2 8 2 10 0v-4" }), h("path", { key: "3", d: "M20 10v5" })],
    gas: [h("path", { key: "1", d: "M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" }), h("path", { key: "2", d: "M4 21h12" }), h("path", { key: "3", d: "M8 7h4" }), h("path", { key: "4", d: "M15 8h2l2 3v7a2 2 0 0 0 4 0v-6" })],
    bank: [h("path", { key: "1", d: "M3 21h18" }), h("path", { key: "2", d: "M5 10h14" }), h("path", { key: "3", d: "M12 3 4 8h16l-8-5z" }), h("path", { key: "4", d: "M7 10v7" }), h("path", { key: "5", d: "M12 10v7" }), h("path", { key: "6", d: "M17 10v7" })],
    medical: [h("path", { key: "1", d: "M12 3v18" }), h("path", { key: "2", d: "M3 12h18" }), h("rect", { key: "3", x: 5, y: 5, width: 14, height: 14, rx: 3 })],
    pharmacy: [h("path", { key: "1", d: "M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4z" })],
    transit: [h("rect", { key: "1", x: 6, y: 3, width: 12, height: 15, rx: 3 }), h("path", { key: "2", d: "M8 21h8" }), h("path", { key: "3", d: "M9 7h6" }), h("path", { key: "4", d: "M9 13h.01" }), h("path", { key: "5", d: "M15 13h.01" })],
    place: [h("path", { key: "1", d: "M12 21s7-6.2 7-12A7 7 0 1 0 5 9c0 5.8 7 12 7 12z" }), h("circle", { key: "2", cx: 12, cy: 9, r: 2 })],
  };

  return h("svg", common, icons[name] || icons.place);
}

function LoadingScreen() {
  return h(
    "div",
    { className: "screen-layer panel-screen auth-screen" },
    h("section", { className: "auth-card" }, h("h1", null, "세션 확인 중"), h("p", null, "로그인 상태를 불러오고 있습니다."))
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("signup");
  const [nickname, setNickname] = useState("");
  const [city, setCity] = useState(koreaCityOptions[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signup";

  if (isSignup) {
    return h(
      "div",
      { className: "screen-layer panel-screen auth-screen" },
      h(
        "header",
        { className: "panel-header" },
        h("span", { className: "header-spacer", "aria-hidden": "true" }),
        h("h1", null, "회원가입"),
        h("span", { className: "header-spacer", "aria-hidden": "true" })
      ),
      h(SignupPage, {
        onSignupComplete: onAuthenticated,
        onShowLogin: () => {
          setMode("login");
          setStatus("");
        },
      })
    );
  }

  const submitAuth = async (event) => {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      const payload = isSignup
        ? await signupUser({ nickname, email, password, city })
        : await loginUser({ email, password });
      onAuthenticated(payload.user);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return h(
    "div",
    { className: "screen-layer panel-screen auth-screen" },
    h(
      "header",
      { className: "panel-header" },
      h("span", { className: "header-spacer", "aria-hidden": "true" }),
      h("h1", null, isSignup ? "회원가입" : "로그인"),
      h("span", { className: "header-spacer", "aria-hidden": "true" })
    ),
    h(
      "form",
      { className: "auth-card", onSubmit: submitAuth },
      h("div", { className: "coffee-avatar", "aria-hidden": "true" }),
      isSignup
        ? h(AuthField, {
            label: "닉네임",
            value: nickname,
            placeholder: "닉네임을 입력하세요",
            onChange: setNickname,
          })
        : null,
      isSignup
        ? h(AuthSelectField, {
            label: "지역(시)",
            value: city,
            options: koreaCityOptions,
            onChange: setCity,
          })
        : null,
      h(AuthField, {
        label: "이메일",
        value: email,
        placeholder: "you@example.com",
        type: "email",
        icon: "mail",
        onChange: setEmail,
      }),
      h(AuthField, {
        label: "비밀번호",
        value: password,
        placeholder: "6자 이상 입력하세요",
        type: "password",
        icon: "lock",
        onChange: setPassword,
      }),
      status ? h("p", { className: "auth-status", role: "alert" }, status) : null,
      h(
        "button",
        { className: "primary-action", type: "submit", disabled: isSubmitting },
        isSubmitting ? "처리 중..." : isSignup ? "이메일로 가입하기" : "로그인"
      ),
      h(
        "button",
        {
          className: "text-action",
          type: "button",
          onClick: () => {
            setMode(isSignup ? "login" : "signup");
            setStatus("");
          },
        },
        isSignup ? "이미 계정이 있나요? 로그인" : "처음인가요? 회원가입"
      )
    )
  );
}

function AccountScreen({ user, onLogout }) {
  const [status, setStatus] = useState("");

  const submitLogout = async () => {
    setStatus("");

    try {
      await onLogout();
    } catch {
      setStatus("로그아웃에 실패했습니다.");
    }
  };

  return h(
    "div",
    { className: "screen-layer panel-screen account-screen" },
    h(
      "section",
      { className: "profile-card", "aria-label": "사용자 정보" },
      h("div", { className: "coffee-avatar", "aria-hidden": "true" }),
      h("h1", null, `${user.nickname}님`),
      h("p", { className: "account-email" }, user.email),
      user.city ? h("p", { className: "account-city" }, user.city) : null,
      h("button", { className: "primary-action", type: "button", onClick: submitLogout }, "로그아웃"),
      status ? h("p", { className: "auth-status", role: "alert" }, status) : null
    )
  );
}

function SignupScreen({ onOpenSettings, onSignupComplete }) {
  return h(
    "div",
    { className: "screen-layer panel-screen signup-screen" },
    h(
      "header",
      { className: "panel-header" },
      h("span", { className: "header-caption" }, "회원"),
      h(
        "button",
        {
          className: "icon-button",
          type: "button",
          "aria-label": "설정 열기",
          onClick: onOpenSettings,
        },
        h(Icon, { name: "settings" })
      )
    ),
    h(
      "section",
      { className: "profile-card", "aria-label": "회원가입" },
      h("div", { className: "coffee-avatar", "aria-hidden": "true" }),
      h("button", { className: "avatar-add", type: "button", "aria-label": "프로필 사진 추가" }, "+"),
      h("h1", null, "회원가입"),
      h(ProfileField, { label: "이름", value: "이름을 입력하세요" }),
      h(ProfileField, { label: "닉네임", value: "닉네임을 입력하세요" }),
      h(ProfileField, { label: "이메일", value: "you@example.com", icon: "mail" }),
      h(ProfileField, { label: "비밀번호", value: "비밀번호를 입력하세요", icon: "lock" }),
      h("button", { className: "primary-action", type: "button", onClick: onSignupComplete }, "가입하기")
    )
  );
}

function SettingsScreen({ onBack }) {
  return h(
    "div",
    { className: "screen-layer panel-screen settings-screen" },
    h(
      "header",
      { className: "panel-header" },
      h(
        "button",
        {
          className: "icon-button",
          type: "button",
          "aria-label": "회원가입 화면으로 돌아가기",
          onClick: onBack,
        },
        h(Icon, { name: "chevronLeft" })
      ),
      h("h1", null, "설정"),
      h("span", { className: "header-spacer", "aria-hidden": "true" })
    ),
    h(
      "section",
      { className: "settings-list", "aria-label": "앱 설정" },
      h(SettingsRow, { label: "내 정보", enabled: true }),
      h(SettingsRow, { label: "내 지도", enabled: true }),
      h(SettingsRow, { label: "알림", enabled: false }),
      h(SettingsRow, { label: "AI 추천", enabled: true }),
      h(SettingsDivider),
      h("p", { className: "settings-section-title" }, "도움말"),
      h(SimpleRow, { icon: "helpCircle", label: "앱 가이드" }),
      h(SimpleRow, { icon: "shield", label: "개인정보 보호" }),
      h(SettingsDivider),
      h("p", { className: "settings-section-title" }, "기타"),
      h(SimpleRow, { icon: "info", label: "앱 정보" })
    )
  );
}

function SearchBar({ value, isSearching, onChange, onSubmit }) {
  return h(
    "form",
    {
      className: "search-bar",
      role: "search",
      onSubmit: (event) => {
        event.preventDefault();
        onSubmit();
      },
    },
    h("input", {
      "aria-label": "위치 검색",
      placeholder: "목적지를 검색하세요",
      type: "search",
      value,
      onChange: (event) => onChange(event.target.value),
    }),
    h(
      "button",
      {
        className: "search-button",
        type: "submit",
        "aria-label": "검색",
        disabled: isSearching,
      },
      h(Icon, { name: "search" })
    )
  );
}

function SearchResults({ results, status, selectedId, savedPlaceIds, onSelect, onToggleSave, onClose }) {
  if (!status && results.length === 0) return null;

  return h(
    "section",
    { className: "search-results", "aria-label": "장소 검색 결과" },
    h(
      "div",
      { className: "search-results-header" },
      h("p", { className: "search-status" }, status),
      onClose
        ? h(
            "button",
            {
              className: "search-results-close",
              type: "button",
              "aria-label": "검색 결과 닫기",
              onClick: onClose,
            },
            "×"
          )
        : null
    ),
    results.map((result) =>
      h(
        "div",
        {
          key: result.id,
          className: result.id === selectedId ? "search-result-row active" : "search-result-row",
        },
        h(
          "button",
          {
            className: "search-result",
            type: "button",
            onClick: () => onSelect(result),
          },
          h("strong", null, result.name),
          h("span", null, result.address || "주소 정보 없음")
        ),
        onToggleSave
          ? h(
              "button",
              {
                className: savedPlaceIds?.has(result.kakaoPlaceId || result.id)
                  ? "search-save-button active"
                  : "search-save-button",
                type: "button",
                "aria-label": `${result.name} 저장`,
                "aria-pressed": savedPlaceIds?.has(result.kakaoPlaceId || result.id) || false,
                onClick: () => onToggleSave(result),
              },
              h(Icon, { name: "heart" })
            )
          : null
      )
    )
  );
}

function RouteOptionStrip({ activeId, onSelect }) {
  return h(
    "section",
    { className: "route-option-strip", "aria-label": "경로 옵션" },
    routeOptions.map((option) =>
      h(
        "button",
        {
          key: option.id,
          className: option.id === activeId ? "route-option active" : "route-option",
          type: "button",
          onClick: () => onSelect(option.id),
        },
        option.label
      )
    )
  );
}

function MapPlaceToggles({ showRecommendedPlaces, showSavedPlaces, onToggleRecommended, onToggleSaved }) {
  return h(
    "section",
    { className: "map-place-toggles", "aria-label": "지도 장소 표시" },
    h(
      "button",
      {
        className: showRecommendedPlaces ? "map-toggle-button active" : "map-toggle-button",
        type: "button",
        "aria-label": "추천 장소 표시",
        "aria-pressed": showRecommendedPlaces,
        onClick: onToggleRecommended,
      },
      h(Icon, { name: "star" })
    ),
    h(
      "button",
      {
        className: showSavedPlaces ? "map-toggle-button active saved" : "map-toggle-button saved",
        type: "button",
        "aria-label": "저장 장소 표시",
        "aria-pressed": showSavedPlaces,
        onClick: onToggleSaved,
      },
      h(Icon, { name: "heart" })
    )
  );
}

function TopNav({ title, onBack, onSettings }) {
  return h(
    "header",
    { className: "top-nav", "aria-label": "상단 메뉴" },
    h(
      "button",
      {
        className: "top-nav-button",
        type: "button",
        "aria-label": "뒤로가기",
        onClick: onBack,
      },
      h(Icon, { name: "chevronLeft" })
    ),
    h("h1", null, title),
    h(
      "button",
      {
        className: "top-nav-button",
        type: "button",
        "aria-label": "프로필 열기",
        onClick: onSettings,
      },
      h(Icon, { name: "settings" })
    )
  );
}

function MapActions({ onFocusLocation }) {
  return h(
    "div",
    { className: "map-actions", "aria-label": "지도 도구" },
    h("button", { 
      type: "button", 
      "aria-label": "현재 위치 보기",
      onClick: onFocusLocation,
    }, h(Icon, { name: "target" }))
  );
}

function BottomNav({ activeId, onSelect }) {
  return h(
    "nav",
    { className: "bottom-nav", "aria-label": "하단 메뉴" },
    navItems.map((item) =>
      h(
        "button",
        {
          key: item.id,
          className: item.id === activeId ? "active" : "",
          type: "button",
          "aria-label": item.label,
          onClick: () => onSelect(item.id),
        },
        h(Icon, { name: item.icon })
      )
    )
  );
}

function AuthField({ label, value, placeholder, type = "text", icon, onChange }) {
  return h(
    "label",
    { className: "profile-field" },
    h("span", null, label),
    h(
      "div",
      { className: "field-control" },
      h("input", {
        value,
        placeholder,
        type,
        required: true,
        onChange: (event) => onChange(event.target.value),
      }),
      icon ? h(Icon, { name: icon }) : null
    )
  );
}

function AuthSelectField({ label, value, options, onChange }) {
  return h(
    "label",
    { className: "profile-field" },
    h("span", null, label),
    h(
      "div",
      { className: "field-control select-control" },
      h(
        "select",
        {
          value,
          required: true,
          onChange: (event) => onChange(event.target.value),
        },
        options.map((option) => h("option", { key: option, value: option }, option))
      )
    )
  );
}

function ProfileField({ label, value, icon }) {
  return h(
    "label",
    { className: "profile-field" },
    h("span", null, label),
    h(
      "div",
      { className: "field-control" },
      h("input", {
        defaultValue: "",
        placeholder: value,
        type: icon === "lock" ? "password" : "text",
      }),
      icon ? h(Icon, { name: icon }) : null
    )
  );
}

function SettingsRow({ label, enabled }) {
  return h(
    "div",
    { className: "settings-row" },
    h("span", null, label),
    h(
      "button",
      {
        className: enabled ? "switch is-on" : "switch",
        type: "button",
        "aria-label": `${label} ${enabled ? "켜짐" : "꺼짐"}`,
      },
      h("span", null)
    )
  );
}

function SimpleRow({ icon, label }) {
  return h("button", { className: "simple-row", type: "button" }, h(Icon, { name: icon }), h("span", null, label));
}

function SettingsDivider() {
  return h("hr", { className: "settings-divider" });
}

function Icon({ name }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  };

  const imageIcons = {
    headphones: "/icons/audio.svg",
    foldedMap: "/icons/map.svg",
    message: "/icons/review.svg",
    settings: "/icons/settings.svg",
    profile: "/icons/profile.svg",
  };

  if (imageIcons[name]) {
    return h("img", { className: "icon-image", src: imageIcons[name], alt: "" });
  }

  const icons = {
    headphones: [
      h("path", { key: "1", d: "M4 14v3a4 4 0 0 0 4 4" }),
      h("path", { key: "2", d: "M20 14v3a4 4 0 0 1-4 4" }),
      h("path", { key: "3", d: "M7 14V9a5 5 0 0 1 10 0v5" }),
      h("path", { key: "4", d: "M9 21h6" }),
    ],
    cursor: [
      h("path", { key: "1", d: "M12 3 4 21l8-4 8 4-8-18z" }),
      h("path", { key: "2", d: "M12 3v14" }),
    ],
    foldedMap: [
      h("path", { key: "1", d: "m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6z" }),
      h("path", { key: "2", d: "M9 4v14" }),
      h("path", { key: "3", d: "M15 6v14" }),
    ],
    message: [
      h("path", { key: "1", d: "M4 5h16v11H8l-4 4V5z" }),
      h("path", { key: "2", d: "M8 9h8" }),
      h("path", { key: "3", d: "M8 13h5" }),
    ],
    profile: [
      h("circle", { key: "1", cx: 12, cy: 8, r: 4 }),
      h("path", { key: "2", d: "M4 21a8 8 0 0 1 16 0" }),
    ],
    search: [
      h("circle", { key: "1", cx: 11, cy: 11, r: 7 }),
      h("path", { key: "2", d: "m16.5 16.5 4 4" }),
    ],
    target: [
      h("circle", { key: "1", cx: 12, cy: 12, r: 7 }),
      h("circle", { key: "2", cx: 12, cy: 12, r: 2 }),
      h("path", { key: "3", d: "M12 3v2" }),
      h("path", { key: "4", d: "M12 19v2" }),
      h("path", { key: "5", d: "M3 12h2" }),
      h("path", { key: "6", d: "M19 12h2" }),
    ],
    layers: [
      h("path", { key: "1", d: "m12 3 9 5-9 5-9-5 9-5z" }),
      h("path", { key: "2", d: "m3 12 9 5 9-5" }),
      h("path", { key: "3", d: "m3 16 9 5 9-5" }),
    ],
    star: [
      h("path", { key: "1", d: "m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 3z" }),
    ],
    heart: [
      h("path", { key: "1", d: "M20.8 5.9a5.1 5.1 0 0 0-7.2 0L12 7.5l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 21l8.8-7.9a5.1 5.1 0 0 0 0-7.2z" }),
    ],
    settings: [
      h("circle", { key: "1", cx: 12, cy: 12, r: 3 }),
      h("path", { key: "2", d: "M19.4 15a7.8 7.8 0 0 0 .1-1.1 7.8 7.8 0 0 0-.1-1.1l2-1.5-2-3.5-2.4 1a8.2 8.2 0 0 0-1.9-1.1L14.8 5h-4l-.4 2.7a8.2 8.2 0 0 0-1.9 1.1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1.1 7.8 7.8 0 0 0 .1 1.1l-2 1.5 2 3.5 2.4-1a8.2 8.2 0 0 0 1.9 1.1l.4 2.7h4l.4-2.7a8.2 8.2 0 0 0 1.9-1.1l2.4 1 2-3.5-2.1-1.5z" }),
    ],
    chevronLeft: [h("path", { key: "1", d: "m15 18-6-6 6-6" })],
    mail: [
      h("path", { key: "1", d: "M4 6h16v12H4z" }),
      h("path", { key: "2", d: "m4 7 8 6 8-6" }),
    ],
    lock: [
      h("rect", { key: "1", x: 5, y: 11, width: 14, height: 10, rx: 2 }),
      h("path", { key: "2", d: "M8 11V8a4 4 0 0 1 8 0v3" }),
    ],
    helpCircle: [
      h("circle", { key: "1", cx: 12, cy: 12, r: 9 }),
      h("path", { key: "2", d: "M9.5 9a2.7 2.7 0 0 1 5 1.4c0 1.9-2.5 2.1-2.5 3.6" }),
      h("path", { key: "3", d: "M12 17h.01" }),
    ],
    shield: [h("path", { key: "1", d: "M12 3 5 6v6c0 4.4 2.8 7.2 7 9 4.2-1.8 7-4.6 7-9V6l-7-3z" })],
    info: [
      h("circle", { key: "1", cx: 12, cy: 12, r: 9 }),
      h("path", { key: "2", d: "M12 11v5" }),
      h("path", { key: "3", d: "M12 8h.01" }),
    ],
  };

  return h("svg", common, icons[name]);
}
