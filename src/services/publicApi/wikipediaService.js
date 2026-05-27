const WIKIPEDIA_API_BASE = "https://ko.wikipedia.org/api/rest_v1";
const WIKIPEDIA_SEARCH_API = "https://ko.wikipedia.org/w/api.php";

export async function getWikipediaStory(place, options = {}) {
  const title = normalizeSearchTitle(place);
  if (!title) return null;

  try {
    const summary = await fetchWikipediaSummary(title, place, options);
    if (summary) return summary;

    const searchedTitle = await searchWikipediaTitle(title, options);
    return searchedTitle ? fetchWikipediaSummary(searchedTitle, place, options) : null;
  } catch {
    return null;
  }
}

async function fetchWikipediaSummary(title, place, options = {}) {
  const fetcher = options.fetcher || fetch;
  const endpoint = `${options.summaryBase || WIKIPEDIA_API_BASE}/page/summary/${encodeURIComponent(title)}`;
  const response = await fetcher(endpoint, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.type === "disambiguation" || !payload.extract) return null;
  if (!isRelevantWikipediaSummary(payload, place)) return null;

  return {
    source: "wikipedia",
    sourceName: "Wikipedia",
    sourceUrl: payload.content_urls?.desktop?.page || `https://ko.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    title: payload.title || title,
    script: makeWikipediaScript(payload.extract),
    imageUrl: payload.thumbnail?.source || payload.originalimage?.source || "",
    raw: payload,
  };
}

async function searchWikipediaTitle(query, options = {}) {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "1",
    format: "json",
    origin: "*",
  });
  const response = await (options.fetcher || fetch)(`${options.searchEndpoint || WIKIPEDIA_SEARCH_API}?${params}`);
  const payload = await response.json().catch(() => ({}));

  return payload.query?.search?.[0]?.title || "";
}

function makeWikipediaScript(extract = "") {
  const text = cleanText(extract);
  if (text.length <= 360) return text;

  const sentenceEnd = text.slice(0, 360).lastIndexOf(".");
  return `${text.slice(0, sentenceEnd > 160 ? sentenceEnd + 1 : 360).trim()}...`;
}

function normalizeSearchTitle(place = {}) {
  return cleanText(place.name || place.place_name || place.title || "");
}

function isRelevantWikipediaSummary(payload = {}, place = {}) {
  const title = normalizeToken(payload.title);
  const extract = normalizeToken(payload.extract);
  const placeName = normalizeToken(place.name || place.place_name || place.title);
  const address = normalizeToken(place.address || place.road_address_name || place.address_name);
  const category = normalizeToken(place.categoryName || place.categoryPath || place.type || "");
  const tokens = getPlaceTokens(placeName);

  if (!placeName) return false;
  if (looksLikePerson(title, extract)) return false;
  if (title && (title.includes(placeName) || placeName.includes(title))) return true;
  if (tokens.some((token) => title.includes(token) || extract.includes(token))) return true;
  if (address && getAddressTokens(address).some((token) => extract.includes(token))) return true;
  if (/대학교|대학|캠퍼스/.test(placeName) && /대학교|대학|캠퍼스/.test(`${title} ${extract}`)) return true;
  if (/공원|호수|산|해변|시장|궁|성|문화|박물관|미술관/.test(category) && tokens.some((token) => extract.includes(token))) return true;

  return false;
}

function looksLikePerson(title = "", extract = "") {
  return /대통령|정치인|배우|가수|선수|작가|교수|출생|사망/.test(`${title} ${extract}`);
}

function getPlaceTokens(value = "") {
  return value
    .split(/[\s·,()]+/)
    .map((token) => token.replace(/점|지점|본점|국제캠퍼스|캠퍼스/g, ""))
    .filter((token) => token.length >= 2);
}

function getAddressTokens(value = "") {
  return value.split(/[\s,]+/).filter((token) => /시$|군$|구$|동$|로$|길$/.test(token));
}

function normalizeToken(value = "") {
  return cleanText(value).replace(/\s+/g, "").toLowerCase();
}

function cleanText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}
