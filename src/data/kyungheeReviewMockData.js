const KYUNGHEE_CENTER = { lat: 37.2414, lng: 127.0811 };
const KYUNGHEE_RADIUS_KM = 3;

export const kyungheeMockPlaces = [
  {
    id: "kyunghee-place-campus-cafe",
    kakaoPlaceId: "kyunghee-place-campus-cafe",
    name: "국제캠 정문 카페",
    address: "경기도 용인시 기흥구 서천동 경희대학교 국제캠퍼스 정문 앞",
    lat: 37.2442,
    lng: 127.0787,
    category: "CE7",
    categoryName: "카페",
    categoryPath: "음식점 > 카페",
    type: "카페",
    distance: 360,
    rating: 4.7,
    reviewCount: 6,
    localReviewCount: 3,
    summary: "공강 시간에 들르기 좋은 조용한 카페",
    aiReason: "경희대 국제캠퍼스 주변 시연용 mock 리뷰 장소입니다.",
    reviewText: "정문과 가까워 학생과 동네 주민이 함께 찾는 카페입니다.",
    description: "정문과 가까워 학생과 동네 주민이 함께 찾는 카페입니다.",
  },
  {
    id: "kyunghee-place-youngtong-bunsik",
    kakaoPlaceId: "kyunghee-place-youngtong-bunsik",
    name: "영통 학식골목 분식",
    address: "경기도 수원시 영통구 영통동 대학로 골목",
    lat: 37.2478,
    lng: 127.0754,
    category: "FD6",
    categoryName: "음식점",
    categoryPath: "음식점 > 분식",
    type: "음식점",
    distance: 940,
    rating: 4.5,
    reviewCount: 5,
    localReviewCount: 2,
    summary: "빠르게 한 끼 먹기 좋은 대학가 분식집",
    aiReason: "같은 영통 생활권 토박이 리뷰와 외부 방문 리뷰를 비교할 수 있습니다.",
    reviewText: "점심에는 학생 손님이 많고 저녁에는 동네 단골도 보이는 분식집입니다.",
    description: "점심에는 학생 손님이 많고 저녁에는 동네 단골도 보이는 분식집입니다.",
  },
  {
    id: "kyunghee-place-seocheon-walk",
    kakaoPlaceId: "kyunghee-place-seocheon-walk",
    name: "서천동 산책길",
    address: "경기도 용인시 기흥구 서천동 서천레스피아 산책로",
    lat: 37.2382,
    lng: 127.0866,
    category: "AT4",
    categoryName: "관광명소",
    categoryPath: "여행 > 산책로",
    type: "산책",
    distance: 680,
    rating: 4.6,
    reviewCount: 4,
    localReviewCount: 2,
    summary: "수업 전후로 걷기 좋은 조용한 산책 동선",
    aiReason: "서천동 토박이 리뷰가 붙어 있는 경희대 주변 mock 장소입니다.",
    reviewText: "학교와 주거지 사이를 잇는 편한 산책길입니다.",
    description: "학교와 주거지 사이를 잇는 편한 산책길입니다.",
  },
];

export const kyungheeMockReviewsByPlaceId = {
  "kyunghee-place-campus-cafe": [
    makeReview({
      id: "kyunghee-review-cafe-local-1",
      placeId: "kyunghee-place-campus-cafe",
      userNickname: "서천동단골",
      userCity: "경기도 용인시 기흥구 서천동",
      isLocalResident: true,
      rating: 5,
      content: "아침에는 비교적 조용해서 발표 준비하기 좋습니다. 정문 앞이라 수업 가기 전에 들르기 편해요.",
      createdAt: "2026-06-16T09:20:00.000Z",
    }),
    makeReview({
      id: "kyunghee-review-cafe-local-2",
      placeId: "kyunghee-place-campus-cafe",
      userNickname: "영통생활권",
      userCity: "경기도 수원시 영통구 영통동",
      isLocalResident: true,
      rating: 4,
      content: "시험기간에는 자리가 빨리 차지만 평소 오후에는 회의하기 괜찮습니다. 근처 카페 중 콘센트 자리가 편한 편입니다.",
      createdAt: "2026-06-15T13:10:00.000Z",
    }),
    makeReview({
      id: "kyunghee-review-cafe-visitor-1",
      placeId: "kyunghee-place-campus-cafe",
      userNickname: "서울방문자",
      userCity: "서울특별시 마포구 합정동",
      isLocalResident: false,
      rating: 4,
      content: "캠퍼스 구경 왔다가 들렀는데 위치가 찾기 쉬웠습니다. 다만 점심 직후에는 조금 붐볐어요.",
      createdAt: "2026-06-14T06:45:00.000Z",
    }),
  ],
  "kyunghee-place-youngtong-bunsik": [
    makeReview({
      id: "kyunghee-review-bunsik-local-1",
      placeId: "kyunghee-place-youngtong-bunsik",
      userNickname: "영통토박이",
      userCity: "경기도 수원시 영통구 영통동",
      isLocalResident: true,
      rating: 5,
      content: "이 골목에서는 회전이 빠른 편이라 수업 사이에 먹기 좋습니다. 매운 메뉴는 저녁보다 점심에 더 안정적이에요.",
      createdAt: "2026-06-17T04:25:00.000Z",
    }),
    makeReview({
      id: "kyunghee-review-bunsik-local-2",
      placeId: "kyunghee-place-youngtong-bunsik",
      userNickname: "망포주민",
      userCity: "경기도 수원시 영통구 망포동",
      isLocalResident: true,
      rating: 4,
      content: "같은 영통 생활권이라 자주 지나는 길인데, 포장해서 가기 편합니다. 피크 시간만 피하면 만족도가 높아요.",
      createdAt: "2026-06-13T10:30:00.000Z",
    }),
    makeReview({
      id: "kyunghee-review-bunsik-visitor-1",
      placeId: "kyunghee-place-youngtong-bunsik",
      userNickname: "분당방문",
      userCity: "경기도 성남시 분당구 정자동",
      isLocalResident: false,
      rating: 3,
      content: "맛은 괜찮았지만 처음 가면 골목 입구를 조금 헷갈릴 수 있습니다. 학생들이 많이 가는 분위기였어요.",
      createdAt: "2026-06-12T11:05:00.000Z",
    }),
  ],
  "kyunghee-place-seocheon-walk": [
    makeReview({
      id: "kyunghee-review-walk-local-1",
      placeId: "kyunghee-place-seocheon-walk",
      userNickname: "서천산책러",
      userCity: "경기도 용인시 기흥구 서천동",
      isLocalResident: true,
      rating: 5,
      content: "저녁에는 학생보다 동네 주민이 더 많습니다. 해 질 때 조용히 걷기 좋고 학교 쪽으로 돌아오기 편합니다.",
      createdAt: "2026-06-16T12:40:00.000Z",
    }),
    makeReview({
      id: "kyunghee-review-walk-visitor-1",
      placeId: "kyunghee-place-seocheon-walk",
      userNickname: "외대앞방문",
      userCity: "서울특별시 동대문구 이문동",
      isLocalResident: false,
      rating: 4,
      content: "캠퍼스 주변을 걷고 싶어서 들렀는데 길이 어렵지 않았습니다. 다만 밤에는 처음 온 사람에게 조금 어두울 수 있어요.",
      createdAt: "2026-06-11T09:00:00.000Z",
    }),
  ],
};

export function isNearKyunghee(location = {}) {
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  return getDistanceKm({ lat, lng }, KYUNGHEE_CENTER) <= KYUNGHEE_RADIUS_KM;
}

export function getKyungheeMockReviews(placeId = "") {
  return kyungheeMockReviewsByPlaceId[placeId] || [];
}

export function getKyungheeMockReviewStats(placeIds = []) {
  const stats = {};

  placeIds.forEach((placeId) => {
    const reviews = getKyungheeMockReviews(placeId);
    if (!reviews.length) return;

    const ratingTotal = reviews.reduce((total, review) => total + Number(review.rating || 0), 0);
    stats[placeId] = {
      rating: Math.round((ratingTotal / reviews.length) * 10) / 10,
      reviewCount: reviews.length,
      localReviewCount: reviews.filter((review) => review.isLocalResident).length,
    };
  });

  return stats;
}

function makeReview(review) {
  return {
    placeName: kyungheeMockPlaces.find((place) => place.id === review.placeId)?.name || "",
    placeAddress: kyungheeMockPlaces.find((place) => place.id === review.placeId)?.address || "",
    userNeighborhood: review.userCity,
    ...review,
  };
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
