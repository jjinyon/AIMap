export async function fetchPlaceReviews(placeId) {
  const params = new URLSearchParams({ placeId });
  return requestReview(`/api/reviews?${params.toString()}`, {
    method: "GET",
  });
}

export async function createPlaceReview({ placeId, placeName, rating, content }) {
  return requestReview("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ placeId, placeName, rating, content }),
  });
}

async function requestReview(path, options) {
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
