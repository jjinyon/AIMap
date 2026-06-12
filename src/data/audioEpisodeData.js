export const currentLocationAudioEpisodes = [
  {
    id: "fallback-haeundae-origin",
    type: "region_origin",
    title: "해운대 지명의 유래",
    shortTitle: "해운대\n지명",
    genre: "지명",
    tone: "warm",
    sourceName: "지역 스토리 DB",
    sourceType: "region_story_db",
    sourceUrl: "",
    areaName: "부산 해운대",
    coordinates: { lat: 35.1587, lng: 129.1604 },
    radiusKm: 5,
    matchKeywords: ["해운대", "동백섬", "최치원"],
    summary: "최치원의 호 해운에서 비롯되었다고 전해지는 지명 이야기",
    script:
      "해운대라는 이름은 신라 말 학자 최치원의 호인 해운에서 비롯되었다고 전해집니다. 동백섬 일대의 풍경과 최치원의 이야기가 겹치며, 이 지역은 단순한 해변을 넘어 이름 자체에 오래된 기억을 품은 장소가 되었습니다.",
    durationSeconds: 40,
  },
  {
    id: "fallback-cheongsapo-legend",
    type: "legend",
    title: "청사포의 푸른 뱀 설화",
    shortTitle: "청사포\n설화",
    genre: "설화",
    tone: "green",
    sourceName: "지역 스토리 DB",
    sourceType: "region_story_db",
    sourceUrl: "",
    areaName: "부산 청사포",
    coordinates: { lat: 35.1601, lng: 129.1914 },
    radiusKm: 3,
    matchKeywords: ["청사포", "푸른 뱀", "망부송"],
    summary: "바다로 나간 남편을 기다리던 아내와 푸른 뱀에 관한 설화",
    script:
      "청사포에는 바다로 나간 남편을 기다리던 아내와 푸른 뱀에 관한 설화가 전해집니다. 기다림과 그리움의 정서가 포구의 풍경과 이어지며, 청사포를 이야기가 머무는 장소로 느끼게 합니다.",
    durationSeconds: 38,
  },
];

export const audioGenreFilters = ["지명", "설화", "역사", "문화", "장소", "리뷰", "팁"];
