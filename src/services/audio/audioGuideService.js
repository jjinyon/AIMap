import {
  getAudioEpisodesFromStoryCards,
  getAudioStoriesForPlaces,
  getAudioStoryCards,
  toAudioEpisode,
} from "./audioBookService.js";
import { getPlaceStory } from "./storyCardGenerator.js";

export async function getAudioStory(place, context = {}) {
  return getPlaceStory(place, context);
}

export { getAudioEpisodesFromStoryCards, getAudioStoriesForPlaces, getAudioStoryCards, toAudioEpisode };
