import { getKyungheeMockReviews, getKyungheeMockReviewStats } from "../data/kyungheeReviewMockData.js";

export async function fetchPlaceReviews(placeId) {
  const params = new URLSearchParams({ placeId });
  const payload = await requestReview(`/api/reviews?${params.toString()}`, {
    method: "GET",
  });
  const mockReviews = getKyungheeMockReviews(placeId);

  return {
    ...payload,
    reviews: mergeReviews(payload.reviews || [], mockReviews),
  };
}

export async function createPlaceReview({ placeId, placeName, placeAddress = "", rating, content }) {
  return requestReview("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ placeId, placeName, placeAddress, rating, content }),
  });
}

export async function fetchLocalReviewStats(placeIds, options = {}) {
  const ids = [...new Set(placeIds.filter(Boolean))];
  if (!ids.length) return {};

  const params = new URLSearchParams({ placeIds: ids.join(",") });
  const endpoint = options.endpoint || `/api/reviews/stats?${params.toString()}`;
  const response = await fetch(endpoint, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Failed to load local review stats.");
  }

  return mergeReviewStats(payload.statsByPlaceId || {}, getKyungheeMockReviewStats(ids));
}

function mergeReviews(realReviews = [], mockReviews = []) {
  const seen = new Set(realReviews.map((review) => review.id));
  return [...realReviews, ...mockReviews.filter((review) => !seen.has(review.id))];
}

function mergeReviewStats(realStats = {}, mockStats = {}) {
  const merged = { ...realStats };

  Object.entries(mockStats).forEach(([placeId, stats]) => {
    if (!merged[placeId]) {
      merged[placeId] = stats;
      return;
    }

    const realReviewCount = Number(merged[placeId].reviewCount || 0);
    const mockReviewCount = Number(stats.reviewCount || 0);
    const totalReviewCount = realReviewCount + mockReviewCount;
    const ratingTotal = Number(merged[placeId].rating || 0) * realReviewCount + Number(stats.rating || 0) * mockReviewCount;

    merged[placeId] = {
      ...merged[placeId],
      rating: totalReviewCount ? Math.round((ratingTotal / totalReviewCount) * 10) / 10 : 0,
      reviewCount: totalReviewCount,
      localReviewCount: Number(merged[placeId].localReviewCount || 0) + Number(stats.localReviewCount || 0),
    };
  });

  return merged;
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
