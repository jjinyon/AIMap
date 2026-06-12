import { generateStoryCards } from "./storyCardGenerator.js";

const CARD_GENRE_LABELS = {
  region_origin: "지명",
  legend: "설화",
  history: "역사",
  culture: "문화",
  place_story: "장소",
  local_review: "리뷰",
  visit_tip: "팁",
};

export async function getAudioStoryCards(params = {}) {
  return generateStoryCards(params);
}

export async function getAudioStoriesForPlaces(places = [], context = {}, options = {}) {
  const location = context.location || options.location || {};
  const selectedPlace = places.find((place) => place?.name) || null;

  return getAudioEpisodesFromStoryCards({
    location,
    place: selectedPlace,
    reviews: context.reviews,
    context,
  });
}

export async function getAudioEpisodesFromStoryCards(params = {}) {
  const cards = await getAudioStoryCards(params);
  return cards.map(toAudioEpisode);
}

export function toAudioEpisode(card = {}, index = 0) {
  const title = card.title || "지역 이야기";

  return {
    ...card,
    id: card.id || `story-card-${index}`,
    title,
    shortTitle: makeShortTitle(title),
    genre: CARD_GENRE_LABELS[card.type] || "이야기",
    tone: getTone(card.type, index),
    script: card.script || "",
    sourceName: card.sourceName || card.sourceType || "AIMap",
    sourceUrl: card.sourceUrl || "",
    storySource: card.sourceType,
    distanceKm: Number(card.distanceKm || 0),
  };
}

function makeShortTitle(title = "") {
  const normalized = String(title).trim() || "지역 이야기";
  const compact = normalized.replace(/\s+/g, " ");
  if (compact.length <= 8) return compact;

  const words = compact.split(" ");
  if (words.length >= 2) return `${words[0]}\n${words.slice(1, 3).join(" ")}`;
  return `${compact.slice(0, 6)}\n${compact.slice(6, 12)}`;
}

function getTone(type = "", index = 0) {
  const tones = {
    region_origin: "warm",
    legend: "green",
    history: "pink",
    culture: "blue",
    place_story: "warm",
    local_review: "green",
    visit_tip: "blue",
  };

  return tones[type] || ["warm", "green", "blue", "pink"][index % 4];
}
