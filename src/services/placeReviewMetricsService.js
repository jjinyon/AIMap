import { fetchGoogleReviewMetricsForPlaces } from "./googlePlacesService.js";
import { fetchLocalReviewStats } from "./reviewService.js";

export async function fetchReviewMetricsForKakaoPlaces(kakaoPlaces, options = {}) {
  const [googleMetrics, localStats] = await Promise.all([
    fetchGoogleReviewMetricsForPlaces(kakaoPlaces, options.google).catch(() => ({})),
    fetchLocalReviewStats(kakaoPlaces.map((place) => place.id), options.local).catch(() => ({})),
  ]);

  return mergeReviewMetricsByKakaoId(kakaoPlaces, googleMetrics, localStats);
}

export function mergeReviewMetricsByKakaoId(kakaoPlaces, googleMetricsByKakaoId = {}, localStatsByPlaceId = {}) {
  return Object.fromEntries(
    kakaoPlaces.map((place) => {
      const google = googleMetricsByKakaoId[place.id] || {};
      const local = localStatsByPlaceId[place.id] || {};
      const localReviewCount = Number(local.reviewCount || 0);
      const googleReviewCount = Number(google.reviewCount || 0);

      return [
        place.id,
        {
          googlePlaceId: google.googlePlaceId || "",
          googleRating: Number(google.rating || 0),
          googleReviewCount,
          googleReviews: Array.isArray(google.reviews) ? google.reviews : [],
          localRating: Number(local.rating || 0),
          localReviewCount,
          reviewCount: googleReviewCount + localReviewCount,
        },
      ];
    })
  );
}
