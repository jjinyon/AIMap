import {
  clearCurrentUserId,
  createUserProfile,
  findUserByEmail,
  getCurrentUserId,
  getUserById,
  setCurrentUserId,
  toPublicUser,
  updateUserPreferences,
} from "./userProfileService.js";

export async function registerUser({ name, email, city, password, preferences }) {
  validateRegistration({ name, email, city, password });

  const user = createUserProfile({
    name,
    email,
    city,
    passwordHash: hashPassword(password),
    preferences,
  });
  setCurrentUserId(user.id);

  return { user: toPublicUser(user) };
}

export async function signupUser(payload) {
  return registerUser({
    name: payload.name || payload.nickname,
    email: payload.email,
    city: payload.city,
    password: payload.password,
    preferences: payload.preferences,
  });
}

export async function loginUser({ email, password }) {
  const user = findUserByEmail(email);

  if (!user || user.passwordHash !== hashPassword(password)) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  setCurrentUserId(user.id);
  return { user: toPublicUser(user) };
}

export async function logoutUser() {
  clearCurrentUserId();
  return { ok: true };
}

export async function getCurrentUser() {
  const user = getUserById(getCurrentUserId());

  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  return { user: toPublicUser(user) };
}

export async function updateCurrentUserPreferences(preferences) {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("로그인이 필요합니다.");
  }

  return { user: toPublicUser(updateUserPreferences(userId, preferences)) };
}

function validateRegistration({ name, email, city, password }) {
  if (!String(name || "").trim()) {
    throw new Error("이름을 입력해주세요.");
  }

  if (!/^\S+@\S+\.\S+$/.test(String(email || "").trim())) {
    throw new Error("올바른 이메일을 입력해주세요.");
  }

  if (!String(city || "").trim()) {
    throw new Error("지역을 선택해주세요.");
  }

  if (String(password || "").length < 6) {
    throw new Error("비밀번호는 6자 이상이어야 합니다.");
  }
}

// Prototype-only password hashing. Replace with a backend auth provider before production.
function hashPassword(password = "") {
  let hash = 5381;
  String(password)
    .split("")
    .forEach((char) => {
      hash = (hash * 33) ^ char.charCodeAt(0);
    });

  return `proto-${hash >>> 0}`;
}
