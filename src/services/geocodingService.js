export async function searchPlaces(query, location) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  await waitForKakaoMaps();

  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places();
    const options = {
      size: 5,
      sort: kakao.maps.services.SortBy.ACCURACY,
    };

    if (location?.lat && location?.lng) {
      options.location = new kakao.maps.LatLng(location.lat, location.lng);
    }

    places.keywordSearch(
      trimmedQuery,
      (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve(data.map(normalizeKakaoPlace));
          return;
        }

        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }

        reject(new Error("장소 검색에 실패했습니다."));
      },
      options
    );
  });
}

function normalizeKakaoPlace(place) {
  return {
    id: place.id,
    name: place.place_name || "검색 결과",
    address: place.road_address_name || place.address_name || "",
    lat: Number(place.y),
    lng: Number(place.x),
    type: place.category_group_name || place.category_name || "장소",
    phone: place.phone || "",
    url: place.place_url || "",
  };
}

function waitForKakaoMaps() {
  if (window.kakao?.maps?.services) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (window.kakao?.maps?.services) {
        clearInterval(timer);
        resolve();
        return;
      }

      if (Date.now() - startedAt > 8000) {
        clearInterval(timer);
        reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));
      }
    }, 80);
  });
}
