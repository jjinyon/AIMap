import { fetchGoogleReviewMetricsForPlaces } from "./googlePlacesService.js";
import { getGeneratedLocalReviewStats } from "./localReviewInsightService.js";
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
      const generatedLocal = getGeneratedLocalReviewStats(place);
      const realLocalReviewCount = Number(local.reviewCount || 0);
      const googleReviewCount = Number(google.reviewCount || 0);
      const generatedLocalReviewCount = Number(generatedLocal.localReviewCount || 0);
      const localReviewCount = realLocalReviewCount + generatedLocalReviewCount;
      const localRating = weightedAverageRating(
        Number(local.rating || 0),
        realLocalReviewCount,
        Number(generatedLocal.localRating || 0),
        generatedLocalReviewCount
      );

      return [
        place.id,
        {
          googlePlaceId: google.googlePlaceId || "",
          googleRating: Number(google.rating || 0),
          googleReviewCount,
          googleReviews: Array.isArray(google.reviews) ? google.reviews : [],
          localRating,
          localReviewCount,
          generatedLocalReviews: generatedLocal.generatedLocalReviews,
          localScore: generatedLocal.localScore,
          reviewCount: googleReviewCount + localReviewCount,
        },
      ];
    })
  );
}

function weightedAverageRating(realRating, realCount, generatedRating, generatedCount) {
  const total = realCount + generatedCount;
  if (!total) return 0;

  return Math.round(((realRating * realCount + generatedRating * generatedCount) / total) * 10) / 10;
}
