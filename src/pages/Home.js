import { MapView } from "../components/MapView.js";
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
import { recommendKakaoPlacesWithReviewData } from "../services/recommendation/index.js";
import { loadCurrentPlaceAudioStories } from "../services/audio/triggerService.js";
import { isPlaceSaved, loadSavedPlaces, toggleSavedPlace } from "../services/savedPlaceService.js";
import {
  canSpeak,
  isPaused,
  pauseAudio,
  resumeAudio,
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

const koreaCityOptions = [
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "수원시",
  "성남시",
  "고양시",
  "용인시",
  "청주시",
  "천안시",
  "전주시",
  "포항시",
  "창원시",
  "제주시",
];

export function Home({ appStatus }) {
  const { location } = useCurrentLocation();
  const [authUser, setAuthUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [screen, setScreen] = useState("auth");
  const [previousScreen, setPreviousScreen] = useState(null);
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
        setPreviousScreen(null);
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
    setPreviousScreen(null);
  };

  const logout = async () => {
    await logoutUser();
    setAuthUser(null);
    setScreen("auth");
    setPreviousScreen(null);
  };

  const navigateTo = (nextScreen) => {
    if (nextScreen === screen) return;

    setPreviousScreen(screen);
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

    if (screen === "review" && reviewCanGoBack) {
      setReviewBackSignal((signal) => signal + 1);
      return;
    }

    const fallbackScreen = screen === "review" ? "map" : "review";
    setScreen(previousScreen || fallbackScreen);
    setPreviousScreen(null);
  };

  useEffect(() => {
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
          onAuthenticated: completeAuth,
          onLogout: logout,
          setScreen: navigateTo,
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

function renderScreen(screen, { appStatus, authUser, isAuthLoading, location, onAuthenticated, onLogout, setScreen, reviewBackSignal, onReviewBackStateChange }) {
  if (isAuthLoading) {
    return h(LoadingScreen);
  }

  if (!authUser) {
    return h(AuthScreen, { onAuthenticated });
  }

  if (screen === "audio") {
    return h(AudioScreen, { location, user: authUser });
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

  return h(MapScreen, { location, appStatus, user: authUser });
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
  const reviewCount = Number(place.reviewCount || 0);
  const rating = Number(place.rating || place.googleRating || place.localRating || 0);
  const ratingLabel = reviewCount
    ? `★ ${rating.toFixed(1)} (${reviewCount})`
    : place.ratingLabel || (place.distance ? `${place.distance}m` : "");

  return {
    ...place,
    categoryCode: place.categoryCode || place.kakaoCategoryCode || place.category,
    ratingLabel,
    aiReason:
      place.aiReason ||
      (place.googleReviewCount
        ? `Google ${place.googleReviewCount} reviews + local ${place.localReviewCount || 0}`
        : place.summary || place.address || ""),
  };
}

function MapScreen({ location, appStatus, user }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState(null);
  const [destinationRecommendedPlaces, setDestinationRecommendedPlaces] = useState([]);
  const [destinationRecommendationStatus, setDestinationRecommendationStatus] = useState("");
  const [routePath, setRoutePath] = useState([]);
  const [routeStatus, setRouteStatus] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeRouteOption, setActiveRouteOption] = useState("");
  const [showRecommendedPlaces, setShowRecommendedPlaces] = useState(true);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [recommendedPlaces, setRecommendedPlaces] = useState([]);
  const [savedPlaces, setSavedPlaces] = useState(() => loadSavedPlaces());
  const hasDestination = Boolean(selectedSearchResult);
  const savedPlaceIds = new Set(savedPlaces.map((place) => place.kakaoPlaceId || place.id));
  const isDestinationSaved = selectedSearchResult ? isPlaceSaved(selectedSearchResult, savedPlaces) : false;
  const destinationRecommendedMapPlaces = destinationRecommendedPlaces.map((place) => ({
    ...place,
    markerKind: "recommended",
    reason: place.aiReason || place.summary || place.address || "",
  }));
  const recommendedMapPlaces = showRecommendedPlaces
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
    ? destinationRecommendedMapPlaces
    : [...recommendedMapPlaces, ...savedMapPlaces];

  useEffect(() => {
    let ignore = false;

    async function loadRecommendedPlaces() {
      try {
        const places = await fetchNearbyReviewPlaces(location);
        const recommended = await recommendKakaoPlacesWithReviewData(
          places,
          { userLocation: location, userPreference: user?.preferences },
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
  }, [location.lat, location.lng, user?.id]);

  useEffect(() => {
    let ignore = false;

    async function loadDestinationRecommendedPlaces() {
      if (!selectedSearchResult?.lat || !selectedSearchResult?.lng) {
        setDestinationRecommendedPlaces([]);
        setDestinationRecommendationStatus("");
        return;
      }

      setDestinationRecommendedPlaces([]);
      setDestinationRecommendationStatus(`${selectedSearchResult.name} 주변 추천 장소를 찾는 중입니다.`);

      try {
        const places = await fetchNearbyReviewPlaces(selectedSearchResult);
        const selectedKey = String(selectedSearchResult.kakaoPlaceId || selectedSearchResult.id || "");
        const nearbyPlaces = places.filter((place) => {
          const key = String(place.kakaoPlaceId || place.id || "");
          return key && key !== selectedKey;
        });
        const recommended = await recommendKakaoPlacesWithReviewData(
          nearbyPlaces,
          { userLocation: selectedSearchResult, userPreference: user?.preferences },
          { limit: 8, metricsLimit: 8 }
        );

        if (ignore) return;

        const formattedPlaces = recommended.map(formatRecommendedPlace);
        setDestinationRecommendedPlaces(formattedPlaces);
        setDestinationRecommendationStatus(
          formattedPlaces.length
            ? `${selectedSearchResult.name} 주변 추천 장소 ${formattedPlaces.length}곳입니다.`
            : `${selectedSearchResult.name} 주변에서 추천할 장소를 찾지 못했습니다.`
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
  }, [selectedSearchResult?.id, selectedSearchResult?.lat, selectedSearchResult?.lng, user?.id]);

  const selectDestination = (destination) => {
    setSelectedSearchResult(destination);
    setRoutePath([]);
    setActiveRouteOption("");
    setRouteStatus("경로 옵션을 선택해 주세요.");
    setSaveStatus("");
  };

  const closeDestinationDetail = () => {
    setSelectedSearchResult(null);
    setDestinationRecommendedPlaces([]);
    setDestinationRecommendationStatus("");
    setRoutePath([]);
    setRouteStatus("");
    setActiveRouteOption("");
  };

  const toggleSaved = (place) => {
    const wasSaved = isPlaceSaved(place, savedPlaces);
    const nextPlaces = toggleSavedPlace(place, savedPlaces);
    setSavedPlaces(nextPlaces);
    setShowSavedPlaces(true);
    const message = wasSaved ? "저장한 장소에서 삭제했습니다." : "나만의 장소로 저장했습니다.";
    if (selectedSearchResult?.id === place.id) {
      setRouteStatus(message);
      return;
    }

    setSaveStatus(message);
  };

  const findFastRoute = async () => {
    if (!selectedSearchResult) return;

    setRoutePath([]);
    setActiveRouteOption("fast");
    setRouteStatus("가장 빠른 도보 경로를 찾는 중입니다.");

    try {
      const route = await findRoute(location, selectedSearchResult);
      setRoutePath(route.points);
      setRouteStatus(formatRouteSummary(route));
    } catch {
      setRouteStatus("현재 위치에서 목적지까지의 도보 경로를 찾지 못했습니다.");
    }
  };

  const submitSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchStatus("");
      setRouteStatus("");
      setSearchResults([]);
      setSelectedSearchResult(null);
      setRoutePath([]);
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
      setSelectedSearchResult(null);
      setRoutePath([]);
      setRouteStatus("");
      setActiveRouteOption("");
    } catch {
      setSearchStatus("검색에 실패했습니다. 잠시 후 다시 시도하세요.");
      setSaveStatus("");
      setRouteStatus("");
      setSearchResults([]);
      setSelectedSearchResult(null);
      setRoutePath([]);
      setActiveRouteOption("");
    } finally {
      setIsSearching(false);
    }
  };

  return h(
    "div",
    { className: "screen-layer map-screen" },
    h(MapView, {
      location,
      places: visibleMapPlaces,
      selectedPlace: selectedSearchResult,
      onSelectPlace: selectDestination,
      searchResults,
      selectedSearchResult,
      onSelectSearchResult: selectDestination,
      routePath,
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
      hasDestination
        ? h(RouteOptionStrip, {
            activeId: activeRouteOption,
            onSelect: (optionId) => {
              if (optionId === "fast") {
                findFastRoute();
                return;
              }

              setActiveRouteOption(optionId);
              setRoutePath([]);
              setRouteStatus("이 경로 옵션은 준비 중입니다.");
            },
          })
        : h(MapPlaceToggles, {
            showRecommendedPlaces,
            showSavedPlaces,
            onToggleRecommended: () => setShowRecommendedPlaces((value) => !value),
            onToggleSaved: () => setShowSavedPlaces((value) => !value),
          }),
      hasDestination
        ? h(PlaceDetailPage, {
            place: selectedSearchResult,
            location,
            recommendedPlaces: destinationRecommendedPlaces,
            routeStatus,
            nearbyStatus: destinationRecommendationStatus,
            savedPlaceIds,
            isSaved: isDestinationSaved,
            onClose: closeDestinationDetail,
            onSave: toggleSaved,
            onStory: (place) => setRouteStatus(`${place.name} 장소 이야기를 준비 중입니다.`),
            onRoute: findFastRoute,
            onSelectRecommended: selectDestination,
            onToggleSave: toggleSaved,
          })
        : h(SearchResults, {
            results: searchResults,
            status: saveStatus || searchStatus,
            selectedId: selectedSearchResult?.id,
            savedPlaceIds,
            onSelect: selectDestination,
            onToggleSave: toggleSaved,
          }),
      h(MapActions)
    ),
    appStatus ? h("p", { className: "app-status", role: "status" }, appStatus) : null
  );
}

function AudioScreen({ location, user }) {
  const [episodes, setEpisodes] = useState([]);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [status, setStatus] = useState("");
  const locationLabel = location?.label || "현재 위치";
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
    let ignore = false;

    async function loadLocationEpisodes() {
      setIsLoadingEpisodes(true);
      setStatus("현재 위치 주변의 설화와 역사 이야기를 찾는 중입니다.");

      try {
        const nearbyEpisodes = window.kakao?.maps?.services
          ? await loadCurrentPlaceAudioStories(
              location,
              {
                currentTime: new Date(),
                userPreference: user?.preferences,
              },
              { storyLimit: 5, placeLimit: 5 }
            )
          : [];

        if (ignore) return;

        const fallbackEpisodes = nearbyEpisodes.length ? nearbyEpisodes : getEpisodesNearLocation(location, []);
        setEpisodes(fallbackEpisodes);
        setStatus(
          fallbackEpisodes.length
            ? ""
            : "현재 위치 주변에서 들려줄 설화/역사 에피소드를 찾지 못했습니다."
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
      setStatus("이 브라우저에서는 오디오 낭독을 지원하지 않습니다.");
      return;
    }

    speakStory(episode, {
      onEnd: () => setIsPlaying(false),
      onError: () => {
        setIsPlaying(false);
        setStatus("오디오 재생 중 문제가 발생했습니다.");
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
      h("button", { className: "audio-title-button", type: "button", onClick: closeDetail }, `<${selectedEpisode.title}>`),
      h(AudioHeroWave),
      h(
        "button",
        {
          className: isPlaying ? "audio-main-control is-playing" : "audio-main-control",
          type: "button",
          "aria-label": isPlaying ? "오디오 일시정지" : "오디오 재생",
          onClick: togglePlay,
        },
        h("span", null)
      ),
      h(
        "article",
        { className: "audio-story-card" },
        h("p", null, selectedEpisode.script),
        h(
          "a",
          {
            href: selectedEpisode.sourceUrl,
            target: "_blank",
            rel: "noreferrer",
          },
          `출처: ${selectedEpisode.sourceName}`
        )
      ),
      status ? h("p", { className: "audio-status", role: "status" }, status) : null
    );
  }

  return h(
    "div",
    { className: "screen-layer audio-screen audio-library-screen" },
    h("p", { className: "audio-location-label" }, locationLabel),
    h("h1", { className: "audio-section-title" }, "추천 에피소드"),
    h(
      "section",
      { className: "episode-card-grid", "aria-label": "추천 에피소드" },
      isLoadingEpisodes
        ? h("p", { className: "audio-empty-state" }, "주변 이야기를 찾는 중")
        : episodes.length
          ? episodes.map((episode) =>
              h(
                "button",
                {
                  key: episode.id,
                  className: `episode-card ${episode.tone}`,
                  type: "button",
                  onClick: () => playEpisode(episode),
                },
                [
                  ...episode.shortTitle.split("\n").map((line) => h("span", { key: line }, line)),
                  h("small", { key: "distance" }, `${episode.distanceKm}km`),
                ]
              )
            )
          : h("p", { className: "audio-empty-state" }, "주변 에피소드 없음")
    ),
    h("h2", { className: "audio-genre-title" }, "장르별"),
    h(
      "section",
      { className: "audio-genre-grid", "aria-label": "장르별 이야기" },
      (visibleGenres.length ? visibleGenres : audioGenreFilters).map((genre) =>
        h("button", { key: genre, className: `audio-genre-chip ${genre}`, type: "button" }, genre)
      )
    ),
    firstEpisode
      ? h(
          "section",
          { className: "audio-mini-player", "aria-label": "현재 오디오" },
          h(AudioMiniIcon),
          h("strong", null, firstEpisode.title),
          h(
            "button",
            {
              className: "mini-play-button",
              type: "button",
              "aria-label": `${firstEpisode.title} 재생`,
              onClick: () => playEpisode(firstEpisode),
            },
            h("span", null)
          ),
          h("button", { className: "mini-pause-button", type: "button", "aria-label": "일시정지", onClick: stopAudio }, [
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
  const [activeFilter, setActiveFilter] = useState(reviewMockData.filters[1]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
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
    ? reviewMockData.reviewPlaces.filter((place) => place.tags.includes(activeFilter))
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

        setReviewsByPlace((current) => ({ ...current, [selectedPlaceId]: reviews }));
        setReviewStatus("");
      } catch (error) {
        if (!ignore) setReviewStatus(error.message);
      }
    }

    loadReviews();

    return () => {
      ignore = true;
    };
  }, [selectedPlaceId]);

  const submitSearch = (event) => {
    event.preventDefault();
    setView(query.trim() ? "results" : "history");
    setSelectedPlaceId(null);
  };

  const selectHistory = (historyItem) => {
    setQuery(historyItem.keyword);
    setView("results");
    setSelectedPlaceId(null);
  };

  const submitPlaceReview = async ({ rating, content }) => {
    if (!selectedPlace) return;

    setReviewStatus("");
    const { review } = await createPlaceReview({
      placeId: selectedPlace.id,
      placeName: selectedPlace.name,
      rating,
      content,
    });
    setReviewsByPlace((current) => ({
      ...current,
      [selectedPlace.id]: [review, ...(current[selectedPlace.id] || [])],
    }));
  };

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
        onFocus: () => {
          if (!query.trim() && view === "recommended") setView("history");
        },
        onChange: (event) => setQuery(event.target.value),
      }),
      h("button", { type: "submit", "aria-label": "검색" }, h(Icon, { name: "search" }))
    ),
    h(
      "div",
      { className: "review-body" },
      showHistory
        ? h(ReviewHistoryList, { history: reviewMockData.searchHistory, onSelect: selectHistory })
        : [
            showResults
              ? h(ReviewFilterBar, {
                  key: "filters",
                  filters: reviewMockData.filters,
                  activeFilter,
                  onSelect: setActiveFilter,
                })
              : h("h1", { key: "title", className: "review-section-title" }, "현재 위치에서 인기 있는 장소"),
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
      h("span", null, review.userCity ? `${review.userCity} · ${dateLabel}` : dateLabel),
      h("b", null, `★ ${review.rating}`)
    ),
    h("p", null, review.content)
  );
}

function ReviewHistoryList({ history, onSelect }) {
  return h(
    "section",
    { className: "review-history", "aria-label": "검색 기록" },
    history.map((item) =>
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
        h("span", { className: "history-remove", "aria-hidden": "true" }, "\u00d7")
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

function SearchResults({ results, status, selectedId, savedPlaceIds, onSelect, onToggleSave }) {
  if (!status && results.length === 0) return null;

  return h(
    "section",
    { className: "search-results", "aria-label": "장소 검색 결과" },
    status ? h("p", { className: "search-status" }, status) : null,
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

function MapActions() {
  return h(
    "div",
    { className: "map-actions", "aria-label": "지도 도구" },
    h("button", { type: "button", "aria-label": "현재 위치 보기" }, h(Icon, { name: "target" })),
    h("button", { type: "button", "aria-label": "지도 레이어" }, h(Icon, { name: "layers" }))
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
