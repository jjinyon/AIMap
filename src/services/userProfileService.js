const USER_STORE_KEY = "ai-place-app.users.v1";
const CURRENT_USER_KEY = "ai-place-app.currentUserId.v1";

export const preferenceOptions = {
  categories: [
    { value: "cafe", label: "카페" },
    { value: "food", label: "맛집" },
    { value: "park", label: "공원" },
    { value: "culture", label: "문화시설" },
    { value: "shopping", label: "쇼핑" },
    { value: "photo_spot", label: "사진 명소" },
  ],
  moods: [
    { value: "quiet", label: "조용함" },
    { value: "lively", label: "활기참" },
    { value: "nature", label: "자연" },
    { value: "history", label: "역사" },
    { value: "trendy", label: "트렌디함" },
    { value: "value", label: "가성비" },
  ],
  companions: [
    { value: "solo", label: "혼자" },
    { value: "friend", label: "친구" },
    { value: "couple", label: "연인" },
    { value: "family", label: "가족" },
  ],
  audioInterests: [
    { value: "history", label: "역사" },
    { value: "culture", label: "문화" },
    { value: "food", label: "맛집" },
    { value: "legend", label: "지역 전설" },
    { value: "architecture", label: "건축" },
    { value: "campus", label: "대학가 이야기" },
  ],
};

export const cityOptions = [
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

export function createUserProfile({ name, email, city, passwordHash, preferences }) {
  const users = loadStoredUsers();
  const normalizedEmail = normalizeEmail(email);

  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("이미 가입된 이메일입니다.");
  }

  const user = {
    id: makeUserId(),
    name: String(name || "").trim(),
    email: normalizedEmail,
    city: normalizeCity(city),
    passwordHash,
    preferences: normalizePreferences(preferences),
    createdAt: new Date().toISOString(),
  };

  saveStoredUsers([...users, user]);
  return user;
}

export function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return loadStoredUsers().find((user) => user.email === normalizedEmail) || null;
}

export function getUserById(userId) {
  return loadStoredUsers().find((user) => user.id === userId) || null;
}

export function setCurrentUserId(userId) {
  window.localStorage.setItem(CURRENT_USER_KEY, userId);
}

export function getCurrentUserId() {
  return window.localStorage.getItem(CURRENT_USER_KEY) || "";
}

export function clearCurrentUserId() {
  window.localStorage.removeItem(CURRENT_USER_KEY);
}

export function toPublicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    nickname: user.name,
    email: user.email,
    city: normalizeCity(user.city),
    preferences: normalizePreferences(user.preferences),
  };
}

export function normalizePreferences(preferences = {}) {
  return {
    categories: normalizeArray(preferences.categories),
    moods: normalizeArray(preferences.moods),
    companion: String(preferences.companion || "").trim(),
    audioInterests: normalizeArray(preferences.audioInterests),
  };
}

function loadStoredUsers() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(USER_STORE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  window.localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
}

function normalizeArray(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeCity(city = "") {
  return String(city).trim();
}

function makeUserId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
