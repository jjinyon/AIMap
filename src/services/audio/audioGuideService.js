import { getTourApiStory } from "../publicApi/tourismService.js";
import { getWikipediaStory } from "../publicApi/wikipediaService.js";
import { getReviewSummary } from "./reviewSummaryService.js";
import { generateAIStory } from "./storyGenerator.js";

export async function getAudioStory(place, context = {}) {
  return (
    (await getTourApiStory(place, context.tourism)) ||
    (await getWikipediaStory(place, context.wikipedia)) ||
    (await getReviewSummary(place, context.reviews)) ||
    (await generateAIStory(place, context))
  );
}

export async function getAudioStoriesForPlaces(places = [], context = {}, options = {}) {
  const limit = Number.isFinite(options.limit) ? options.limit : 5;
  const stories = [];

  for (const place of places.slice(0, limit)) {
    const story = await getAudioStory(place, context);
    if (!story?.script) continue;

    stories.push(toAudioEpisode(place, story, stories.length));
  }

  return stories;
}

export function toAudioEpisode(place = {}, story = {}, index = 0) {
  const title = normalizeEpisodeTitle(story.title || place.name);
  const distanceKm = place.distance ? Math.max(0.1, Math.round((Number(place.distance) / 1000) * 10) / 10) : 0.1;

  return {
    id: `audio-guide-${place.id || index}-${story.source || "story"}`,
    place,
    title,
    shortTitle: makeShortTitle(title),
    genre: getGenre(story, place),
    tone: getTone(index),
    script: story.script,
    sourceName: story.sourceName || "Audio Guide",
    sourceUrl: story.sourceUrl || place.url || "",
    imageUrl: story.imageUrl || "",
    distanceKm,
    storySource: story.source,
  };
}

function normalizeEpisodeTitle(title = "") {
  const trimmedTitle = String(title).trim();
  if (!trimmedTitle || /^(현재\s*)?위치$/.test(trimmedTitle)) return "내 주변 이야기";

  return trimmedTitle;
}

function makeShortTitle(title = "") {
  const normalizedTitle = normalizeEpisodeTitle(title);
  const words = normalizedTitle.split(/\s+/);
  if (words.length <= 1) return normalizedTitle;
  if (words.length === 2 && /이야기$/.test(words[1])) return normalizedTitle;

  return words.slice(0, 2).join("\n");
}

function getGenre(story = {}, place = {}) {
  if (story.source === "tour-api") return "역사";
  if (story.source === "wikipedia") return "지명";
  if (/문화|전시|공연|관광|명소/.test(`${place.categoryName || ""} ${place.categoryPath || ""}`)) return "역사";
  return "지명";
}

function getTone(index) {
  return ["warm", "green", "blue"][index % 3];
}
