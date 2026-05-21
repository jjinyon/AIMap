export async function getCurrentUser() {
  return requestAuth("/api/auth/me", {
    method: "GET",
  });
}

export async function signupUser({ nickname, email, password }) {
  return requestAuth("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ nickname, email, password }),
  });
}

export async function loginUser({ email, password }) {
  return requestAuth("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutUser() {
  return requestAuth("/api/auth/logout", {
    method: "POST",
  });
}

async function requestAuth(path, options) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "요청을 처리하지 못했습니다.");
  }

  return payload;
}
