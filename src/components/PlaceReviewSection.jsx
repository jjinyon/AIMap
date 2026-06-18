const h = window.React.createElement;

export function PlaceReviewSection({ reviews = [], status = "", reviewForm = null }) {
  const summary = summarizeReviews(reviews);

  return h(
    "section",
    { className: "place-review-section" },
    h("h2", null, "리뷰 요약"),
    status ? h("p", { className: "place-page-muted", role: "status" }, status) : null,
    h("p", { className: summary ? "" : "place-page-empty" }, summary || "아직 요약할 리뷰가 없습니다."),
    h("h2", null, "리뷰 목록"),
    reviews.length
      ? h(
          "div",
          { className: "place-review-list" },
          reviews.map((review) =>
            h(
              "article",
              { className: "place-review-item", key: review.id },
              h(
                "div",
                { className: "place-review-meta" },
                h("strong", null, review.userNickname || "사용자"),
                review.isLocalResident ? h("em", { className: "local-resident-badge" }, "토박이") : null,
                h("span", null, review.createdAt ? new Date(review.createdAt).toLocaleDateString("ko-KR") : ""),
                h("b", null, `★${review.rating || "-"}`)
              ),
              h("p", null, review.content || review.text || "")
            )
          )
        )
      : h("p", { className: "place-page-empty" }, "아직 작성된 사용자 리뷰가 없습니다."),
    reviewForm
  );
}

function summarizeReviews(reviews = []) {
  if (!reviews.length) return "";

  const average =
    reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / Math.max(1, reviews.length);
  const localCount = reviews.filter((review) => review.isLocalResident).length;
  const localText = localCount ? ` 토박이 리뷰 ${localCount}개가 포함되어 있습니다.` : "";

  return `${reviews.length}개의 리뷰 기준 평균 평점은 ${average.toFixed(1)}점입니다.${localText}`;
}
