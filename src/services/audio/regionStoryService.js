import { regionStoryData, storyTypeToCardType } from "../../data/regionStoryData.js";
import { getDistanceKm } from "../audioEpisodeService.js";
import { getTourApiStory } from "../publicApi/tourismService.js";
import { getWikipediaStory } from "../publicApi/wikipediaService.js";

const STORY_QUERY_RULES = [
  { storyType: "origin", type: "region_origin", suffixes: ["유래", "지명 유래", "이름 유래"] },
  { storyType: "legend", type: "legend", suffixes: ["설화", "전설", "민담"] },
  { storyType: "history", type: "history", suffixes: ["역사", "문화재", "유적"] },
  { storyType: "culture", type: "culture", suffixes: ["문화", "관광", "마을"] },
];

const MAX_DYNAMIC_CARDS = 4;

export async function getRegionStories(location = {}, options = {}) {
  const dynamicStories = await getExternalRegionStories(location, options);
  if (dynamicStories.length) return dynamicStories;

  return getMockRegionStories(location, options);
}

export function getMockRegionStories(location = {}, options = {}) {
  const region = inferRegion(location, options);
  if (!region) return [];

  return regionStoryData
    .filter((story) => story.regionId === region.regionId)
    .map((story) => ({
      ...story,
      type: storyTypeToCardType[story.storyType] || story.storyType,
      distanceKm: region.distanceKm,
    }));
}

export async function getExternalRegionStories(location = {}, options = {}) {
  const candidates = buildRegionSearchCandidates(location, options);
  const cards = [];
  const seenSource = new Set();

  for (const rule of STORY_QUERY_RULES) {
    const story = await findExternalStoryForRule(rule, candidates, location, options);
    if (!story?.content) continue;

    const sourceKey = `${story.sourceType}-${story.sourceUrl || story.title}`;
    if (seenSource.has(sourceKey)) continue;
    seenSource.add(sourceKey);
    cards.push(story);

    if (cards.length >= MAX_DYNAMIC_CARDS) break;
  }

  return cards;
}

export function buildRegionSearchCandidates(location = {}, options = {}) {
  const rawHints = [
    location.regionName,
    location.label,
    location.address,
    location.name,
    ...(options.keywords || []),
    ...(options.regionHints || []),
  ];
  const text = rawHints.filter(Boolean).join(" ");
  const candidates = [];

  extractAddressCandidates(text).forEach((candidate) => candidates.push(candidate));
  extractPlaceNameCandidates(options.regionHints || []).forEach((candidate) => candidates.push(candidate));

  return dedupeStrings(candidates)
    .filter((candidate) => !isGenericCandidate(candidate))
    .slice(0, 8);
}

export function inferRegion(location = {}, options = {}) {
  const candidates = getRegionCandidates(location, options);
  if (!candidates.length) return null;

  return candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.distanceKm - b.distanceKm;
  })[0];
}

async function findExternalStoryForRule(rule, candidates = [], location = {}, options = {}) {
  for (const candidate of candidates) {
    const queries = buildQueries(candidate, rule);

    for (const query of queries) {
      const place = makeRegionLookupPlace(query, candidate, location);
      const story =
        (await getTourApiStory(place, options.tourism).catch(() => null)) ||
        (await getWikipediaStory(place, options.wikipedia).catch(() => null));

      if (!story?.script) continue;
      if (!isUsefulRegionStory(story, candidate, rule)) continue;

      return {
        regionId: `external-${safeId(candidate)}`,
        regionName: candidate,
        storyType: rule.storyType,
        type: rule.type,
        title: makeDynamicTitle(candidate, rule, story.title),
        content: story.script,
        keywords: [candidate, ...rule.suffixes],
        sourceType: story.source || "external_source",
        sourceName: story.sourceName || "외부 지역 자료",
        sourceUrl: story.sourceUrl || "",
        distanceKm: 0,
      };
    }
  }

  return null;
}

function buildQueries(candidate, rule) {
  if (rule.storyType === "history") return [candidate, ...rule.suffixes.map((suffix) => `${candidate} ${suffix}`)];
  return rule.suffixes.map((suffix) => `${candidate} ${suffix}`).concat(candidate);
}

function makeRegionLookupPlace(query, candidate, location = {}) {
  return {
    id: `region-${safeId(query)}`,
    name: query,
    address: location.address || candidate,
    categoryName: "지역 이야기",
    type: "지역 이야기",
    lat: location.lat,
    lng: location.lng,
  };
}

function isUsefulRegionStory(story = {}, candidate = "", rule = {}) {
  const script = normalizeSearchText(story.script);
  const title = normalizeSearchText(story.title);
  const normalizedCandidate = normalizeSearchText(candidate);
  const suffixMatch = rule.suffixes.some((suffix) => script.includes(normalizeSearchText(suffix)) || title.includes(normalizeSearchText(suffix)));

  if (normalizedCandidate && (script.includes(normalizedCandidate) || title.includes(normalizedCandidate))) return true;
  return rule.storyType === "history" && suffixMatch;
}

function makeDynamicTitle(candidate, rule, sourceTitle = "") {
  if (rule.type === "region_origin") return `${candidate}의 유래`;
  if (rule.type === "legend") return `${candidate}에 전해지는 이야기`;
  if (rule.type === "history") return `${candidate}의 역사`;
  if (rule.type === "culture") return `${candidate}의 문화 이야기`;
  return sourceTitle || `${candidate} 이야기`;
}

function extractAddressCandidates(text = "") {
  const tokens = String(text)
    .split(/[\s,()·|>]+/)
    .map((token) => token.replace(/[^\w가-힣-]/g, ""))
    .filter(Boolean);
  const candidates = [];

  tokens.forEach((token, index) => {
    if (/동$|읍$|면$|리$/.test(token)) candidates.push(token);
    if (/구$|군$/.test(token)) candidates.push(token);
    if (/시$/.test(token)) candidates.push(token);
    if (index > 0 && /동$|읍$|면$/.test(token)) candidates.push(`${tokens[index - 1]} ${token}`);
    if (index > 1 && /동$|읍$|면$/.test(token)) candidates.push(`${tokens[index - 2]} ${tokens[index - 1]} ${token}`);
  });

  return candidates;
}

function extractPlaceNameCandidates(hints = []) {
  return hints
    .map((hint) => String(hint).trim())
    .filter((hint) => /궁|성|문|정|루|연|사|절|향교|서원|고택|문화재|유적|박물관|마을|거리/.test(hint))
    .map((hint) => hint.split(/[\s,|>]+/).slice(0, 3).join(" "));
}

function getRegionCandidates(location = {}, options = {}) {
  const text = normalizeSearchText(
    [location.label, location.address, location.name, location.regionName, ...(options.keywords || []), ...(options.regionHints || [])].join(" ")
  );
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);
  const byRegion = new Map();

  regionStoryData.forEach((story) => {
    const distanceKm = hasCoordinates ? getDistanceKm({ lat, lng }, story.coordinates) : Number.POSITIVE_INFINITY;
    const radiusKm = Number(story.radiusKm || 0);
    const keywordMatch = story.keywords.some((keyword) => text.includes(normalizeSearchText(keyword)));
    const coordinateMatch = Number.isFinite(distanceKm) && distanceKm <= radiusKm;

    if (!keywordMatch && !coordinateMatch) return;

    const score = (keywordMatch ? 1.2 : 0) + (coordinateMatch ? Math.max(0.1, 1 - distanceKm / radiusKm) : 0);
    const current = byRegion.get(story.regionId);

    if (!current || score > current.score) {
      byRegion.set(story.regionId, {
        regionId: story.regionId,
        regionName: story.regionName,
        score,
        distanceKm: Number.isFinite(distanceKm) ? Math.round(distanceKm * 100) / 100 : 0,
      });
    }
  });

  return [...byRegion.values()];
}

function dedupeStrings(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value).trim();
    const key = normalizeSearchText(normalized);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isGenericCandidate(value = "") {
  return /현재위치|currentlocation|근처|주변/.test(normalizeSearchText(value));
}

function normalizeSearchText(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

function safeId(value = "") {
  return String(value || "region")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
