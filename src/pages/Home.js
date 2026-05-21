import { MapView } from "../components/MapView.js";
import { useCurrentLocation } from "../hooks/useCurrentLocation.js";
import { reviewMockData } from "../data/reviewMockData.js";
import { getCurrentUser, loginUser, logoutUser, signupUser } from "../services/authService.js";
import { fetchNearbyReviewPlaces, searchPlaces } from "../services/geocodingService.js";
import { createPlaceReview, fetchPlaceReviews } from "../services/reviewService.js";
import { findRoute, formatRouteSummary } from "../services/routingService.js";

const { useEffect, useState } = window.React;
const h = window.React.createElement;

const navItems = [
  { id: "audio", label: "오디오", icon: "headphones" },
  { id: "route", label: "길찾기", icon: "cursor" },
  { id: "review", label: "리뷰", icon: "message" },
  { id: "map", label: "지도", icon: "foldedMap" },
  { id: "account", label: "내 정보", icon: "profile" },
];

const audioOptions = [
  { label: "현재 지역", tone: "warm" },
  { label: "목적지", tone: "green" },
  { label: "경로기반", tone: "blue" },
];

const routeOptions = [
  "\ube60\ub974\uac8c",
  "\uacc4\ub2e8 X",
  "\uc9c0\uc5ed \ub9cc\ub07d",
  "\ud37c\uc2a4\ub110",
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

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const { user } = await getCurrentUser();
        if (ignore) return;

        setAuthUser(user);
        setScreen("review");
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
    setScreen("review");
  };

  const logout = async () => {
    await logoutUser();
    setAuthUser(null);
    setScreen("auth");
  };

  const openNav = (itemId) => {
    if (isAuthLoading) return;

    if (!authUser) {
      setScreen("auth");
      return;
    }

    if (itemId === "audio") {
      setScreen("audio");
      return;
    }

    if (itemId === "route") {
      setScreen("route");
      return;
    }

    if (itemId === "review") {
      setScreen("review");
      return;
    }

    if (itemId === "account") {
      setScreen("account");
      return;
    }

    setScreen("map");
  };

  const shouldShowBottomNav = Boolean(authUser) && !isAuthLoading;

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
          setScreen,
        }),
        shouldShowBottomNav
          ? h(BottomNav, {
              activeId: screen === "audio" ? "audio" : screen === "route" ? "route" : screen === "review" ? "review" : screen === "map" ? "map" : "account",
              onSelect: openNav,
            })
          : null
      )
    )
  );
}

function renderScreen(screen, { appStatus, authUser, isAuthLoading, location, onAuthenticated, onLogout, setScreen }) {
  if (isAuthLoading) {
    return h(LoadingScreen);
  }

  if (!authUser) {
    return h(AuthScreen, { onAuthenticated });
  }

  if (screen === "audio") {
    return h(AudioScreen);
  }

  if (screen === "settings") {
    return h(SettingsScreen, { onBack: () => setScreen("account") });
  }

  if (screen === "account") {
    return h(AccountScreen, {
      user: authUser,
      onOpenSettings: () => setScreen("settings"),
      onLogout,
    });
  }

  if (screen === "review") {
    return h(ReviewScreen, { location, user: authUser });
  }

  return h(MapScreen, { location, appStatus, isRouteMode: screen === "route" });
}

function MapScreen({ location, appStatus, isRouteMode = false }) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeStatus, setRouteStatus] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const selectDestination = async (destination) => {
    setSelectedSearchResult(destination);
    setRoutePath([]);
    setRouteStatus("경로를 찾는 중입니다.");

    try {
      const route = await findRoute(location, destination);
      setRoutePath(route.points);
      setRouteStatus(formatRouteSummary(route));
    } catch {
      setRouteStatus("현재 위치에서 목적지까지의 경로를 찾지 못했습니다.");
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
      return;
    }

    setIsSearching(true);
    setSearchStatus("장소를 검색하는 중입니다.");

    try {
      const results = await searchPlaces(trimmedQuery, location);
      setSearchResults(results);
      setSearchStatus(results.length ? `${results.length}개의 장소를 찾았습니다.` : "검색 결과가 없습니다.");
      if (results[0]) {
        await selectDestination(results[0]);
      } else {
        setSelectedSearchResult(null);
        setRoutePath([]);
        setRouteStatus("");
      }
    } catch {
      setSearchStatus("검색에 실패했습니다. 잠시 후 다시 시도하세요.");
      setRouteStatus("");
      setSearchResults([]);
      setSelectedSearchResult(null);
      setRoutePath([]);
    } finally {
      setIsSearching(false);
    }
  };

  return h(
    "div",
    { className: isRouteMode ? "screen-layer map-screen route-mode" : "screen-layer map-screen" },
    h(MapView, {
      location,
      places: [],
      selectedPlace: null,
      onSelectPlace: () => {},
      searchResults,
      selectedSearchResult,
      onSelectSearchResult: selectDestination,
      routePath,
    }),
    h(
      "div",
      { className: "persistent-ui" },
      isRouteMode
        ? h(
            "div",
            { className: "route-option-strip", "aria-label": "\uacbd\ub85c \uc635\uc158" },
            routeOptions.map((option) =>
              h("button", { key: option, className: "route-option", type: "button" }, option)
            )
          )
        : h("div", { className: "top-pills", "aria-hidden": "true" }, [
            h("span", { key: "1" }, "내 위치"),
            h("span", { key: "2" }, "주변 탐색"),
            h("span", { key: "3" }, "AI 추천"),
          ]),
      h(SearchBar, {
        value: query,
        isSearching,
        onChange: setQuery,
        onSubmit: submitSearch,
      }),
      h(SearchResults, {
        results: searchResults,
        status: routeStatus || searchStatus,
        selectedId: selectedSearchResult?.id,
        onSelect: selectDestination,
      }),
      h(MapActions)
    ),
    appStatus ? h("p", { className: "app-status", role: "status" }, appStatus) : null
  );
}

function AudioScreen() {
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

function ReviewScreen({ location, user }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("recommended");
  const [activeFilter, setActiveFilter] = useState(reviewMockData.filters[1]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [nearbyStatus, setNearbyStatus] = useState("현재 위치 주변 장소를 찾고 있습니다.");
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [reviewsByPlace, setReviewsByPlace] = useState({});
  const [reviewStatus, setReviewStatus] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadNearbyPlaces() {
      setNearbyStatus("현재 위치 주변 장소를 찾고 있습니다.");

      try {
        const places = await fetchNearbyReviewPlaces(location);
        if (ignore) return;

        setNearbyPlaces(places);
        setNearbyStatus(places.length ? "" : "주변에서 보여줄 장소를 찾지 못했습니다.");
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
  }, [location.lat, location.lng]);

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
            selectedPlace
              ? h(ReviewComposer, {
                  key: "composer",
                  place: selectedPlace,
                  user,
                  reviews: selectedReviews,
                  status: reviewStatus,
                  onSubmit: submitPlaceReview,
                })
              : null,
          ]
    )
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
    h("div", { className: "review-thumb", "aria-hidden": "true" }),
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
      !showReviewText && place.aiReason ? h("small", null, place.aiReason) : null,
      isSelected
        ? h(
            "div",
            { className: "review-place-detail" },
            h("p", null, place.description || place.reviewText || place.summary)
          )
        : null
    )
  );
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

function AccountScreen({ user, onOpenSettings, onLogout }) {
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
      "header",
      { className: "panel-header" },
      h("span", { className: "header-caption" }, "내 정보"),
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
      placeholder: "장소를 검색하세요",
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

function SearchResults({ results, status, selectedId, onSelect }) {
  if (!status && results.length === 0) return null;

  return h(
    "section",
    { className: "search-results", "aria-label": "장소 검색 결과" },
    status ? h("p", { className: "search-status" }, status) : null,
    results.map((result) =>
      h(
        "button",
        {
          key: result.id,
          className: result.id === selectedId ? "search-result active" : "search-result",
          type: "button",
          onClick: () => onSelect(result),
        },
        h("strong", null, result.name),
        h("span", null, result.address || "주소 정보 없음")
      )
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
