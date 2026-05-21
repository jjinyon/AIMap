const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, ".data");
const dbPath = path.join(dataDir, "auth-db.json");
const initialPort = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
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
        rating,
        content: content.slice(0, 500),
        userId: user.id,
        userNickname: user.nickname,
        userCity: user.city || "",
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
    rating: review.rating,
    content: review.content,
    userNickname: review.userNickname,
    userCity: review.userCity || "",
    createdAt: review.createdAt,
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
