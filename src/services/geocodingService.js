export async function searchPlaces(query, location) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const params = new URLSearchParams({
    q: trimmedQuery,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    "accept-language": "ko",
  });

  if (location?.lat && location?.lng) {
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    params.set("viewbox", `${lng - 0.25},${lat + 0.25},${lng + 0.25},${lat - 0.25}`);
    params.set("bounded", "0");
  }

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("장소 검색에 실패했습니다.");
  }

  const results = await response.json();
  return results.map((item) => {
    const displayParts = item.display_name.split(",").map((part) => part.trim());
    return {
      id: item.place_id,
      name: displayParts[0] || item.name || "검색 결과",
      address: displayParts.slice(1, 4).join(", "),
      lat: Number(item.lat),
      lng: Number(item.lon),
      type: item.type || item.class || "place",
    };
  });
}
