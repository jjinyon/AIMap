const TOURISM_STORY_ENDPOINT = "/api/tourism/story";

export async function getTourApiStory(place, options = {}) {
  const normalizedPlace = normalizeTourPlace(place);
  if (!normalizedPlace.name) return null;

  try {
    const params = new URLSearchParams({
      name: normalizedPlace.name,
      address: normalizedPlace.address,
      category: normalizedPlace.category,
    });
    if (Number.isFinite(normalizedPlace.lat)) params.set("lat", String(normalizedPlace.lat));
    if (Number.isFinite(normalizedPlace.lng)) params.set("lng", String(normalizedPlace.lng));
    const response = await (options.fetcher || fetch)(
      `${options.endpoint || TOURISM_STORY_ENDPOINT}?${params.toString()}`
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.story?.script) return null;

    return normalizeTourStory(payload.story, normalizedPlace);
  } catch {
    return null;
  }
}

export function normalizeTourStory(story = {}, place = {}) {
  const script = cleanText(story.script || story.overview);
  if (!script) return null;

  return {
    source: "tour-api",
    sourceName: "한국관광공사",
    sourceUrl: story.sourceUrl || "https://api.visitkorea.or.kr/",
    title: story.title || place.name,
    script: shortenForAudio(script),
    imageUrl: story.imageUrl || "",
    contentId: story.contentId || "",
    contentTypeId: story.contentTypeId || "",
    raw: story.raw || null,
  };
}

export function normalizeTourPlace(place = {}) {
  return {
    id: place.id || place.kakaoPlaceId || "",
    name: cleanText(place.name || place.place_name || place.title),
    address: cleanText(place.address || place.road_address_name || place.address_name),
    category: cleanText(place.categoryName || place.categoryPath || place.type || place.category),
    lat: Number(place.lat ?? place.y),
    lng: Number(place.lng ?? place.x),
  };
}

function shortenForAudio(value) {
  const text = cleanText(value);
  if (text.length <= 420) return text;

  const sentenceEnd = text.slice(0, 420).lastIndexOf(".");
  return `${text.slice(0, sentenceEnd > 180 ? sentenceEnd + 1 : 420).trim()}...`;
}

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
