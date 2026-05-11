export const defaultLocation = {
  lat: 37.5665,
  lng: 126.978,
  label: "서울 시청 근처",
};

export const categoryOptions = [
  { value: "all", label: "전체" },
  { value: "food", label: "식사" },
  { value: "cafe", label: "카페" },
  { value: "culture", label: "문화" },
  { value: "park", label: "공원" },
  { value: "convenience", label: "편의" },
];

export const moodOptions = [
  { value: "balanced", label: "균형" },
  { value: "quiet", label: "조용" },
  { value: "active", label: "활기" },
  { value: "quick", label: "근처" },
];

const placeSeeds = [
  {
    name: "브릭 로스터스",
    category: "cafe",
    type: "카페",
    mood: "quiet",
    offset: [0.0048, -0.0032],
    rating: 4.7,
    reason: "작업하기 좋은 좌석과 차분한 분위기가 어울립니다.",
  },
  {
    name: "그린웨이 산책로",
    category: "park",
    type: "공원",
    mood: "quiet",
    offset: [-0.0054, 0.004],
    rating: 4.5,
    reason: "가볍게 걷기 좋은 동선이라 이동 중 쉬어가기 좋습니다.",
  },
  {
    name: "오늘의 식탁",
    category: "food",
    type: "식사",
    mood: "balanced",
    offset: [0.0028, 0.0062],
    rating: 4.6,
    reason: "후기가 안정적이고 혼밥과 모임 모두 무난합니다.",
  },
  {
    name: "시티 아트랩",
    category: "culture",
    type: "문화",
    mood: "active",
    offset: [-0.0068, -0.005],
    rating: 4.4,
    reason: "전시와 공연을 함께 둘러볼 수 있어 일정에 변화를 줍니다.",
  },
  {
    name: "모던 델리",
    category: "food",
    type: "식사",
    mood: "quick",
    offset: [0.0016, -0.002],
    rating: 4.3,
    reason: "가까운 거리에서 빠르게 식사하기 좋은 선택입니다.",
  },
  {
    name: "라이트 편의점",
    category: "convenience",
    type: "편의",
    mood: "quick",
    offset: [-0.0018, 0.0016],
    rating: 4.1,
    reason: "현재 위치에서 가장 부담 없이 들를 수 있습니다.",
  },
  {
    name: "루프탑 라운지",
    category: "cafe",
    type: "카페",
    mood: "active",
    offset: [0.006, 0.0022],
    rating: 4.8,
    reason: "전망이 좋아 약속 장소나 기분 전환 코스로 추천합니다.",
  },
  {
    name: "동네 생활문화센터",
    category: "culture",
    type: "문화",
    mood: "balanced",
    offset: [-0.0038, 0.0072],
    rating: 4.2,
    reason: "지역 체험 프로그램과 전시를 확인하기 좋습니다.",
  },
];

export function buildPlaces(location, category, mood) {
  return placeSeeds
    .map((seed, index) => {
      const lat = location.lat + seed.offset[0];
      const lng = location.lng + seed.offset[1];
      const distance = getDistanceMeters(location, { lat, lng });
      const categoryBoost =
        category === "all" || category === seed.category ? 2 : 0;
      const moodBoost = mood === "balanced" || mood === seed.mood ? 1.5 : 0;
      const quickBoost =
        mood === "quick" ? Math.max(0, 1.8 - distance / 700) : 0;

      return {
        ...seed,
        id: `${seed.category}-${index}`,
        lat,
        lng,
        distance,
        score: seed.rating + categoryBoost + moodBoost + quickBoost,
      };
    })
    .filter((place) => category === "all" || place.category === category)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }

  return `${(meters / 1000).toFixed(1)}km`;
}

function getDistanceMeters(a, b) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}
