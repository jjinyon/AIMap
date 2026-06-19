const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const dataDir = path.join(root, ".data");
const dbPath = path.join(dataDir, "auth-db.json");
const googlePlacesCachePath = path.join(dataDir, "google-places-cache.json");
const initialPort = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const googlePlacesCacheTtlMs = 1000 * 60 * 60 * 24 * 7;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname.startsWith("/api/auth/")) {
    await handleAuthRequest(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/reviews")) {
    await handleReviewRequest(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/google-places/")) {
    await handleGooglePlacesRequest(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/directions")) {
    await handleDirectionsRequest(request, response, requestUrl);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/tourism/")) {
    await handleTourismRequest(request, response, requestUrl);
    return;
  }

  const pathname = decodeURIComponent(requestUrl.pathname);
  const safePath = path
    .normalize(pathname)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]/, "");
  const filePath = path.join(root, safePath || "index.html");
  const resolvedPath = filePath.endsWith(path.sep)
    ? path.join(filePath, "index.html")
    : filePath;

  if (!resolvedPath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(resolvedPath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const ext = path.extname(resolvedPath);
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(content);
  });
});

function listen(port) {
  server.listen(port, host, () => {
    console.log(`AI 장소 추천 앱 실행 중: http://${host}:${port}/`);
    console.log("종료하려면 Ctrl+C를 누르세요.");
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    const nextPort = Number(server.address()?.port || initialPort) + 1;
    console.log(`${host}:${nextPort - 1} 포트가 사용 중이라 ${nextPort} 포트로 다시 시도합니다.`);
    listen(nextPort);
    return;
  }

  throw error;
});

listen(initialPort);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) return;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  });
}

async function handleAuthRequest(request, response, requestUrl) {
  try {
    if (request.method === "GET" && requestUrl.pathname === "/api/auth/me") {
      const user = getSessionUser(request);
      sendJson(response, user ? 200 : 401, user ? { user } : { message: "로그인이 필요합니다." });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/auth/signup") {
      const body = await readJsonBody(request);
      const db = readDb();
      const email = normalizeEmail(body.email);
      const nickname = String(body.nickname || "").trim();
      const password = String(body.password || "");
      const city = String(body.city || "").trim();

      if (!nickname || !email || password.length < 6 || !city) {
        sendJson(response, 400, { message: "닉네임, 이메일, 지역, 6자 이상 비밀번호를 입력해 주세요." });
        return;
      }

      if (db.users.some((user) => user.email === email)) {
        sendJson(response, 409, { message: "이미 가입된 이메일입니다." });
        return;
      }

      const user = {
        id: crypto.randomUUID(),
        email,
        nickname,
        city,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      const session = createSession(db, user.id);
      writeDb(db);
      sendAuthResponse(response, 201, session, { user: toPublicUser(user) });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/auth/login") {
      const body = await readJsonBody(request);
      const db = readDb();
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const user = db.users.find((item) => item.email === email);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        sendJson(response, 401, { message: "이메일 또는 비밀번호가 올바르지 않습니다." });
        return;
      }

      const session = createSession(db, user.id);
      writeDb(db);
      sendAuthResponse(response, 200, session, { user: toPublicUser(user) });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/auth/logout") {
      const db = readDb();
      const sessionId = getCookie(request, "ai_place_session");
      db.sessions = db.sessions.filter((session) => session.id !== sessionId);
      writeDb(db);
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": makeExpiredSessionCookie(),
      });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    sendJson(response, 404, { message: "API를 찾을 수 없습니다." });
  } catch (error) {
    sendJson(response, 500, { message: "서버 오류가 발생했습니다." });
  }
}

async function handleReviewRequest(request, response, requestUrl) {
  try {
    if (request.method === "GET" && requestUrl.pathname === "/api/reviews/stats") {
      const db = readDb();
      const placeIds = String(requestUrl.searchParams.get("placeIds") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      sendJson(response, 200, { statsByPlaceId: getReviewStatsByPlaceId(db.reviews, placeIds) });
      return;
    }

    const user = getSessionUser(request);

    if (!user) {
      sendJson(response, 401, { message: "로그인이 필요합니다." });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/reviews") {
      const db = readDb();
      const placeId = String(requestUrl.searchParams.get("placeId") || "").trim();
      const reviews = db.reviews
        .filter((review) => !placeId || review.placeId === placeId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map(toPublicReview);

      sendJson(response, 200, { reviews });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/reviews") {
      const body = await readJsonBody(request);
      const db = readDb();
      const placeId = String(body.placeId || "").trim();
      const placeName = String(body.placeName || "").trim();
      const placeAddress = String(body.placeAddress || "").trim();
      const userCity = String(body.userCity || user.city || "").trim();
      const userNickname = String(body.userNickname || user.nickname || "").trim();
      const content = String(body.content || "").trim();
      const rating = Number(body.rating || 0);

      if (!placeId || !placeName || !content || rating < 1 || rating > 5) {
        sendJson(response, 400, { message: "장소, 별점, 리뷰 내용을 입력해 주세요." });
        return;
      }

      const review = {
        id: crypto.randomUUID(),
        placeId,
        placeName,
        placeAddress,
        rating,
        content: content.slice(0, 500),
        userId: user.id,
        userNickname,
        userCity,
        userNeighborhood: userCity,
        isLocalResident: isAdjacentNeighborhood(userCity, placeAddress),
        createdAt: new Date().toISOString(),
      };

      db.reviews.push(review);
      writeDb(db);
      sendJson(response, 201, { review: toPublicReview(review) });
      return;
    }

    sendJson(response, 404, { message: "API를 찾을 수 없습니다." });
  } catch {
    sendJson(response, 500, { message: "서버 오류가 발생했습니다." });
  }
}

async function handleGooglePlacesRequest(request, response, requestUrl) {
  try {
    if (request.method !== "POST" || requestUrl.pathname !== "/api/google-places/review-metrics") {
      sendJson(response, 404, { message: "API not found." });
      return;
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      sendJson(response, 200, { metricsByKakaoPlaceId: {}, message: "GOOGLE_PLACES_API_KEY is not configured." });
      return;
    }

    const body = await readJsonBody(request);
    const places = Array.isArray(body.places) ? body.places.slice(0, 10) : [];
    const cache = readGooglePlacesCache();
    const metricsByKakaoPlaceId = {};

    for (const place of places) {
      const input = normalizeGooglePlaceInput(place);
      if (!input.placeId || !input.name) continue;

      const cacheKey = makeGooglePlaceCacheKey(input);
      const cached = getFreshCacheItem(cache.items[cacheKey]);

      if (cached) {
        metricsByKakaoPlaceId[input.placeId] = cached.metrics;
        continue;
      }

      const metrics = await fetchGooglePlaceMetrics(input, apiKey);
      cache.items[cacheKey] = {
        fetchedAt: new Date().toISOString(),
        kakaoPlaceId: input.kakaoPlaceId,
        metrics,
      };
      metricsByKakaoPlaceId[input.placeId] = metrics;
    }

    writeGooglePlacesCache(cache);
    sendJson(response, 200, { metricsByKakaoPlaceId });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Failed to load Google Places data." });
  }
}

async function handleDirectionsRequest(request, response, requestUrl) {
  try {
    if (request.method !== "GET") {
      sendJson(response, 404, { message: "API not found." });
      return;
    }

    const origin = String(requestUrl.searchParams.get("origin") || "").trim();
    const destination = String(requestUrl.searchParams.get("destination") || "").trim();
    const mode = String(requestUrl.searchParams.get("mode") || "walking").trim();
    const waypointsStr = String(requestUrl.searchParams.get("waypoints") || "").trim();
    const waypoints = waypointsStr ? waypointsStr.split("|").map(w => w.trim()).filter(Boolean) : [];

    if (!origin || !destination) {
      sendJson(response, 400, { message: "origin and destination are required." });
      return;
    }

    const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
    const directions = await fetchRoute({ origin, destination, waypoints, mode }, apiKey);
    sendJson(response, 200, { route: directions });
  } catch (error) {
    sendJson(response, 500, { message: error.message || "Directions lookup failed." });
  }
}

async function fetchRoute(options, apiKey) {
  if (!apiKey) {
    const fallbackRoute = await fetchOsrmRoute(options);
    return {
      ...fallbackRoute,
      provider: fallbackRoute.provider || "osrm",
      fallbackReason: "GOOGLE_ROUTES_API_KEY is not configured.",
    };
  }

  try {
    return await fetchGoogleRoutes(options, apiKey);
  } catch (error) {
    const fallbackRoute = await fetchOsrmRoute(options);
    return {
      ...fallbackRoute,
      provider: fallbackRoute.provider || "osrm",
      fallbackReason: error.message || "Google Routes request failed.",
    };
  }
}

async function fetchGoogleRoutes({ origin, destination, waypoints = [], mode = "walking" }, apiKey) {
  // Parse origin and destination coordinates
  const [originLat, originLng] = origin.split(",").map(x => parseFloat(x.trim()));
  const [destLat, destLng] = destination.split(",").map(x => parseFloat(x.trim()));
  
  if (!Number.isFinite(originLat) || !Number.isFinite(originLng) || !Number.isFinite(destLat) || !Number.isFinite(destLng)) {
    throw new Error("Invalid origin or destination coordinates.");
  }
  
  const travelMode = mode === "walking" ? "WALK" : "DRIVE";
  
  const requestBody = {
    origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
    destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
    travelMode,
    polylineQuality: "HIGH_QUALITY",
    languageCode: "ko-KR",
    regionCode: "KR",
    units: "METRIC",
  };

  if (travelMode === "DRIVE") {
    requestBody.routingPreference = "TRAFFIC_AWARE";
  }
  
  // Add waypoints if provided
  if (waypoints.length > 0) {
    const intermediates = waypoints.map(wp => {
      const [lat, lng] = wp.split(",").map(x => parseFloat(x.trim()));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error(`Invalid waypoint coordinates: ${wp}`);
      }
      return { location: { latLng: { latitude: lat, longitude: lng } } };
    });
    requestBody.intermediates = intermediates;
  }

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(requestBody),
  });
  
  const payload = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const errorMsg = payload.error?.message || payload.error?.status || "Google Routes request failed.";
    throw new Error(errorMsg);
  }
  
  const route = payload.routes?.[0];
  if (!route) {
    throw new Error("No routes found.");
  }
  
  const totalDistance = Number(route.distanceMeters || 0);
  const totalDuration = parseDurationSeconds(route.duration);
  
  // Decode polyline
  const encodedPolyline = route.polyline?.encodedPolyline || "";
  const points = decodePolyline(encodedPolyline);
  
  return {
    distance: totalDistance,
    duration: totalDuration,
    points,
    provider: "google-routes",
  };
}

function parseDurationSeconds(duration = "") {
  const seconds = Number(String(duration).replace(/s$/, ""));
  return Number.isFinite(seconds) ? seconds : 0;
}

async function fetchOsrmRoute({ origin, destination, waypoints = [], mode = "walking" }) {
  const coordinates = [origin, ...waypoints, destination]
    .map(parseLatLngText)
    .filter(Boolean)
    .map(({ lat, lng }) => `${lng},${lat}`)
    .join(";");

  if (!coordinates) {
    throw new Error("Invalid route coordinates.");
  }

  if (mode === "walking") {
    try {
      const route = await fetchOsrmProfileRoute("foot", coordinates);
      return {
        ...route,
        duration: getWalkingDurationSeconds(route.distance),
        provider: "osrm-walking-estimate",
      };
    } catch {
      const route = await fetchOsrmProfileRoute("driving", coordinates);
      return {
        ...route,
        duration: getWalkingDurationSeconds(route.distance),
        provider: "osrm-driving-walking-estimate",
      };
    }
  }

  return fetchOsrmProfileRoute("driving", coordinates);
}

async function fetchOsrmProfileRoute(profile, coordinates) {
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });
  const response = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${coordinates}?${params.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "OSRM route request failed.");
  }

  const route = payload.routes?.[0];
  if (!route) {
    throw new Error("No fallback routes found.");
  }

  return {
    distance: Number(route.distance || 0),
    duration: Number(route.duration || 0),
    points: route.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [],
    provider: "osrm",
  };
}

function getWalkingDurationSeconds(distanceMeters) {
  const walkingSpeedMetersPerSecond = 1.25;
  return Math.max(60, Number(distanceMeters || 0) / walkingSpeedMetersPerSecond);
}

function parseLatLngText(value = "") {
  const [lat, lng] = String(value).split(",").map((item) => Number(item.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

// Decode encoded polyline string into array of [lat, lng]
function decodePolyline(encoded) {
  if (!encoded) return [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < len) {
    let result = 0;
    let shift = 0;
    let byte = null;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

async function handleTourismRequest(request, response, requestUrl) {
  try {
    if (request.method !== "GET" || requestUrl.pathname !== "/api/tourism/story") {
      sendJson(response, 404, { message: "API not found." });
      return;
    }

    const apiKey = process.env.TOUR_API_KEY;
    if (!apiKey) {
      sendJson(response, 200, { story: null, message: "TOUR_API_KEY is not configured." });
      return;
    }

    const name = String(requestUrl.searchParams.get("name") || "").trim();
    const address = String(requestUrl.searchParams.get("address") || "").trim();
    const lat = Number(requestUrl.searchParams.get("lat"));
    const lng = Number(requestUrl.searchParams.get("lng"));
    if (!name) {
      sendJson(response, 400, { message: "name is required." });
      return;
    }

    const story = await fetchTourismStory({ name, address, lat, lng }, apiKey);
    sendJson(response, 200, { story });
  } catch (error) {
    sendJson(response, 200, { story: null, message: error.message || "Tour API lookup failed." });
  }
}

async function fetchTourismStory(place, apiKey) {
  const searchPayload = await requestTourApi("searchKeyword2", apiKey, {
    keyword: place.name,
    numOfRows: "5",
    arrange: "A",
  });
  const candidates = toTourItems(searchPayload);
  const matched = findBestTourItem(candidates, place);
  if (!matched?.contentid) return null;

  const detailPayload = await requestTourApi("detailCommon2", apiKey, {
    contentId: matched.contentid,
    contentTypeId: matched.contenttypeid || "",
    defaultYN: "Y",
    firstImageYN: "Y",
    addrinfoYN: "Y",
    overviewYN: "Y",
    numOfRows: "1",
  });
  const detail = toTourItems(detailPayload)[0] || matched;
  const overview = cleanTourText(detail.overview);
  if (!overview) return null;

  return {
    source: "tour-api",
    title: cleanTourText(detail.title || matched.title || place.name),
    script: overview,
    overview,
    imageUrl: detail.firstimage || detail.firstimage2 || matched.firstimage || matched.firstimage2 || "",
    sourceUrl: detail.homepage ? stripHtml(detail.homepage) : "https://api.visitkorea.or.kr/",
    contentId: detail.contentid || matched.contentid,
    contentTypeId: detail.contenttypeid || matched.contenttypeid || "",
    raw: {
      address: detail.addr1 || matched.addr1 || "",
      tel: detail.tel || matched.tel || "",
    },
  };
}

async function requestTourApi(operation, apiKey, params = {}) {
  const baseUrl = process.env.TOUR_API_BASE || "https://apis.data.go.kr/B551011/KorService2";
  const url = new URL(`${baseUrl}/${operation}`);
  const normalizedParams = {
    MobileOS: "ETC",
    MobileApp: "AIPlaceApp",
    _type: "json",
    ...params,
  };

  Object.entries(normalizedParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  url.searchParams.set("serviceKey", normalizeTourApiKey(apiKey));

  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.response?.header?.resultMsg || "Tour API request failed.");
  }

  return payload;
}

function toTourItems(payload = {}) {
  const items = payload.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function normalizeTourApiKey(apiKey = "") {
  try {
    return apiKey.includes("%") ? decodeURIComponent(apiKey) : apiKey;
  } catch {
    return apiKey;
  }
}

function findBestTourItem(items, place) {
  if (!items.length) return null;
  const placeAddress = normalizeMatchText(place.address);
  const exactName = items.find((item) => isRelevantTourItem(item, place) && normalizeMatchText(item.title) === normalizeMatchText(place.name));
  if (exactName) return exactName;
  const relevantItems = items.filter((item) => isRelevantTourItem(item, place));
  if (!relevantItems.length) return null;

  if (!placeAddress) return relevantItems[0];

  return relevantItems.find((item) => hasAddressOverlap(item, placeAddress)) || relevantItems[0];
}

function isRelevantTourItem(item, place) {
  const title = normalizeMatchText(item.title);
  const placeName = normalizeMatchText(place.name);
  const nameMatches = title && placeName && (title.includes(placeName) || placeName.includes(title));
  const addressMatches = hasAddressOverlap(item, normalizeMatchText(place.address));
  const distanceMatches = isNearbyTourItem(item, place);

  return nameMatches || addressMatches || distanceMatches;
}

function hasAddressOverlap(item, normalizedPlaceAddress) {
  if (!normalizedPlaceAddress) return false;
  const itemAddress = normalizeMatchText(`${item.addr1 || ""} ${item.addr2 || ""}`);
  if (!itemAddress) return false;

  return normalizedPlaceAddress.includes(itemAddress.slice(0, 6)) || itemAddress.includes(normalizedPlaceAddress.slice(0, 6));
}

function isNearbyTourItem(item, place) {
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  const mapX = Number(item.mapx);
  const mapY = Number(item.mapy);
  if (![lat, lng, mapX, mapY].every(Number.isFinite)) return false;

  return getDistanceKm({ lat, lng }, { lat: mapY, lng: mapX }) <= 2;
}

function getDistanceKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function normalizeMatchText(value = "") {
  return stripHtml(value).replace(/\s+/g, "").toLowerCase();
}

function cleanTourText(value = "") {
  return stripHtml(value)
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").trim();
}

async function fetchGooglePlaceMetrics(place, apiKey) {
  const textSearchPayload = {
    textQuery: [place.name, place.address].filter(Boolean).join(" "),
    maxResultCount: 1,
    languageCode: "ko",
    regionCode: "KR",
  };

  if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    textSearchPayload.locationBias = {
      circle: {
        center: { latitude: place.lat, longitude: place.lng },
        radius: 120,
      },
    };
  }

  const searchResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
    },
    body: JSON.stringify(textSearchPayload),
  });

  const searchPayload = await searchResponse.json().catch(() => ({}));
  if (!searchResponse.ok) {
    throw new Error(searchPayload.error?.message || "Google Places search failed.");
  }

  const googlePlace = searchPayload.places?.[0];
  if (!googlePlace?.id) return emptyGoogleMetrics();

  const detailsResponse = await fetch(`https://places.googleapis.com/v1/places/${googlePlace.id}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,rating,userRatingCount,reviews",
    },
  });
  const detailsPayload = await detailsResponse.json().catch(() => ({}));
  const details = detailsResponse.ok ? detailsPayload : {};

  return {
    googlePlaceId: googlePlace.id,
    rating: Number(details.rating ?? googlePlace.rating ?? 0),
    reviewCount: Number(details.userRatingCount ?? googlePlace.userRatingCount ?? 0),
    reviews: normalizeGoogleReviews(details.reviews),
    displayName: googlePlace.displayName?.text || "",
    formattedAddress: googlePlace.formattedAddress || "",
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function readDb() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(dbPath)) {
    return { users: [], sessions: [], reviews: [] };
  }

  try {
    const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    return {
      users: Array.isArray(db.users) ? db.users : [],
      sessions: Array.isArray(db.sessions) ? db.sessions : [],
      reviews: Array.isArray(db.reviews) ? db.reviews : [],
    };
  } catch {
    return { users: [], sessions: [], reviews: [] };
  }
}

function writeDb(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function readGooglePlacesCache() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(googlePlacesCachePath)) {
    return { items: {} };
  }

  try {
    const cache = JSON.parse(fs.readFileSync(googlePlacesCachePath, "utf8"));
    return { items: cache && typeof cache.items === "object" ? cache.items : {} };
  } catch {
    return { items: {} };
  }
}

function writeGooglePlacesCache(cache) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(googlePlacesCachePath, JSON.stringify(cache, null, 2));
}

function getFreshCacheItem(item) {
  if (!item?.fetchedAt || Date.now() - Date.parse(item.fetchedAt) > googlePlacesCacheTtlMs) return null;
  return item;
}

function normalizeGooglePlaceInput(place = {}) {
  return {
    placeId: String(place.placeId || place.id || "").trim(),
    kakaoPlaceId: String(place.kakaoPlaceId || place.placeId || place.id || "").trim(),
    name: String(place.name || "").trim(),
    address: String(place.address || "").trim(),
    lat: Number(place.lat),
    lng: Number(place.lng),
  };
}

function makeGooglePlaceCacheKey(place) {
  return place.kakaoPlaceId || `${place.name}:${place.address}:${place.lat},${place.lng}`;
}

function emptyGoogleMetrics() {
  return {
    googlePlaceId: "",
    rating: 0,
    reviewCount: 0,
    reviews: [],
    displayName: "",
    formattedAddress: "",
  };
}

function normalizeGoogleReviews(reviews) {
  if (!Array.isArray(reviews)) return [];

  return reviews.slice(0, 5).map((review) => ({
    rating: Number(review.rating || 0),
    text: review.text?.text || review.originalText?.text || "",
    authorName: review.authorAttribution?.displayName || "",
    relativePublishTimeDescription: review.relativePublishTimeDescription || "",
  }));
}

function getReviewStatsByPlaceId(reviews, placeIds) {
  const allowedPlaceIds = new Set(placeIds);
  const grouped = {};

  reviews.forEach((review) => {
    if (allowedPlaceIds.size && !allowedPlaceIds.has(review.placeId)) return;

    if (!grouped[review.placeId]) {
      grouped[review.placeId] = { ratingTotal: 0, reviewCount: 0 };
    }

    grouped[review.placeId].ratingTotal += Number(review.rating || 0);
    grouped[review.placeId].reviewCount += 1;
  });

  return Object.fromEntries(
    Object.entries(grouped).map(([placeId, stats]) => [
      placeId,
      {
        rating: stats.reviewCount ? Math.round((stats.ratingTotal / stats.reviewCount) * 10) / 10 : 0,
        reviewCount: stats.reviewCount,
      },
    ])
  );
}

function getSessionUser(request) {
  const sessionId = getCookie(request, "ai_place_session");
  if (!sessionId) return null;

  const db = readDb();
  const now = Date.now();
  const session = db.sessions.find((item) => item.id === sessionId && Date.parse(item.expiresAt) > now);
  if (!session) return null;

  const user = db.users.find((item) => item.id === session.userId);
  return user ? toPublicUser(user) : null;
}

function createSession(db, userId) {
  const session = {
    id: crypto.randomBytes(32).toString("hex"),
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString(),
  };

  db.sessions = db.sessions
    .filter((item) => item.userId !== userId && Date.parse(item.expiresAt) > Date.now())
    .concat(session);
  return session;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

function verifyPassword(password, storedHash = "") {
  const [, salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const attemptedHash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attemptedHash, "hex"));
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    city: user.city || "",
  };
}

function toPublicReview(review) {
  return {
    id: review.id,
    placeId: review.placeId,
    placeName: review.placeName,
    placeAddress: review.placeAddress || "",
    rating: review.rating,
    content: review.content,
    userNickname: review.userNickname,
    userCity: review.userCity || "",
    userNeighborhood: review.userNeighborhood || review.userCity || "",
    isLocalResident: Boolean(review.isLocalResident),
    createdAt: review.createdAt,
  };
}

function isAdjacentNeighborhood(userNeighborhood = "", placeAddress = "") {
  const userArea = parseLocalArea(userNeighborhood);
  const placeArea = parseLocalArea(placeAddress);

  if (userArea.neighborhood && placeArea.neighborhood && userArea.neighborhood === placeArea.neighborhood) {
    return true;
  }

  return Boolean(
    userArea.district &&
      placeArea.district &&
      userArea.district === placeArea.district &&
      (!userArea.province || !placeArea.province || userArea.province === placeArea.province)
  );
}

function extractNeighborhood(value = "") {
  const tokens = String(value).split(/\s+/).filter(Boolean);
  return [...tokens].reverse().find((token) => /동$|읍$|면$|리$|가$/.test(token)) || String(value).trim();
}

function parseLocalArea(value = "") {
  const tokens = String(value).split(/\s+/).filter(Boolean);
  const district = tokens.find((token) => /구$|군$/.test(token)) || tokens.find((token) => /시$/.test(token) && !/특별시$|광역시$|특별자치시$/.test(token)) || "";

  return {
    province: tokens.find((token) => /도$|특별시$|광역시$|특별자치시$|특별자치도$/.test(token)) || "",
    district,
    neighborhood: [...tokens].reverse().find((token) => /동$|읍$|면$|리$|가$/.test(token)) || "",
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sendAuthResponse(response, statusCode, session, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Set-Cookie": makeSessionCookie(session),
  });
  response.end(JSON.stringify(payload));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function getCookie(request, name) {
  const cookie = request.headers.cookie || "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function makeSessionCookie(session) {
  return [
    `ai_place_session=${session.id}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${sessionMaxAgeSeconds}`,
  ].join("; ");
}

function makeExpiredSessionCookie() {
  return "ai_place_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}
