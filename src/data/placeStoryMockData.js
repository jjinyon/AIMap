const PLACE_STORY_MOCKS = [
  {
    tags: ["cafe", "CE7", "카페", "coffee"],
    title: "오래 머무는 사람들의 자리",
    reviewHighlights: [
      "창가 자리가 조용해서 혼자 노트북을 열기 좋다는 이야기가 많습니다.",
      "커피 맛보다도 매장 안의 온도와 음악이 편안하다는 반응이 자주 보입니다.",
      "오후에는 단골처럼 보이는 손님들이 책을 읽거나 짧은 회의를 하는 편입니다.",
    ],
    story:
      "이 장소는 빠르게 들렀다 나가는 곳이라기보다 잠깐 속도를 늦추는 공간에 가깝습니다. 로컬 리뷰를 보면 메뉴 하나보다 좌석의 편안함, 조용한 분위기, 직원 응대처럼 머무는 시간의 질을 말하는 문장이 많습니다.",
  },
  {
    tags: ["food", "FD6", "음식", "식당", "맛집", "restaurant"],
    title: "식사 시간의 작은 기준점",
    reviewHighlights: [
      "처음 방문해도 메뉴를 고르기 쉽다는 반응이 많습니다.",
      "점심시간에는 회전이 빠르고 저녁에는 조금 더 여유롭다는 이야기가 보입니다.",
      "맛의 개성보다 안정적인 한 끼를 기대하고 찾는 사람이 많습니다.",
    ],
    story:
      "이 장소의 로컬 리뷰는 특별한 이벤트보다 반복해서 찾을 만한 안정감에 초점이 맞춰져 있습니다. 맛, 가격, 응대, 대기 시간에 대한 언급이 고르게 나와서 주변 사람들이 일상 속 선택지로 기억하는 장소처럼 보입니다.",
  },
  {
    tags: ["culture", "AT4", "CT1", "문화", "관광", "전시", "공원", "park"],
    title: "걸음을 늦추게 하는 동네 장면",
    reviewHighlights: [
      "사진을 찍기 좋고 산책 동선에 넣기 좋다는 말이 자주 보입니다.",
      "방문 목적이 뚜렷하지 않아도 잠깐 들르기 편하다는 반응이 있습니다.",
      "날씨와 시간대에 따라 인상이 달라진다는 리뷰가 많습니다.",
    ],
    story:
      "이 장소는 목적지 하나로만 소비되기보다 주변 길과 함께 기억되는 타입입니다. 로컬 리뷰에서는 볼거리 자체보다 걷는 흐름, 머무는 시간, 같이 간 사람과의 분위기를 이야기하는 문장이 자주 등장합니다.",
  },
  {
    tags: ["shopping", "MT1", "CS2", "store", "편의", "상점"],
    title: "동네 사람들이 자주 확인하는 지점",
    reviewHighlights: [
      "필요한 것을 빠르게 해결하기 좋다는 반응이 많습니다.",
      "위치가 찾기 쉽고 이동 중 들르기 편하다는 이야기가 보입니다.",
      "친절한 응대나 깔끔한 진열을 언급한 리뷰가 있습니다.",
    ],
    story:
      "이 장소의 이야기는 거창한 명소보다 생활의 리듬에 가깝습니다. 로컬 리뷰를 기준으로 보면 사람들은 이곳을 계획된 방문지라기보다 이동 중 믿고 들르는 작은 기준점으로 사용하고 있습니다.",
  },
];

const DEFAULT_STORY = {
  title: "리뷰가 먼저 만든 장소 이야기",
  reviewHighlights: [
    "방문자들은 접근성과 분위기를 함께 언급하는 편입니다.",
    "짧게 들르는 사람과 오래 머무는 사람의 반응이 함께 보입니다.",
    "아직 실제 리뷰가 충분하지 않아 mock 로컬 리뷰 흐름으로 구성했습니다.",
  ],
  story:
    "이 장소의 이야기는 아직 실제 로컬 리뷰가 쌓이기 전의 임시 버전입니다. 지금은 이름, 분류, 주변 맥락을 바탕으로 사람들이 어떤 이유로 이곳을 기억할지 가볍게 상상한 mock 데이터로 들려줍니다.",
};

export function getMockPlaceStory(place = {}) {
  const text = [
    place.name,
    place.category,
    place.categoryName,
    place.categoryPath,
    place.type,
    place.summary,
    place.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchedStory = PLACE_STORY_MOCKS.find((mock) =>
    mock.tags.some((tag) => text.includes(String(tag).toLowerCase()))
  );
  const baseStory = matchedStory || DEFAULT_STORY;
  const name = place.name || "이 장소";

  return {
    ...baseStory,
    title: `${name}: ${baseStory.title}`,
    script: `${baseStory.story} ${baseStory.reviewHighlights.join(" ")}`,
    sourceName: "Mock local reviews",
  };
}
