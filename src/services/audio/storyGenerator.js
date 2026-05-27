import { summarizeReviews } from "./reviewSummaryService.js";

export async function generateAIStory(place = {}, context = {}) {
  const name = place.name || place.place_name || "지금 이 장소";
  const category = place.categoryName || place.type || place.category || "장소";
  const timeLabel = getTimeLabel(context.currentTime || new Date());
  const weatherLabel = getWeatherLabel(context.weather);
  const reviewMood = context.reviewSummary?.vibe || summarizeReviews(context.reviews || [], place).vibe;
  const opening = weatherLabel
    ? `${weatherLabel} ${timeLabel}의 ${name}은 조금 다른 표정으로 다가옵니다.`
    : `${timeLabel}의 ${name}은 잠시 걸음을 늦추고 바라보기 좋은 ${category}입니다.`;

  return {
    source: "ai-generated",
    sourceName: "AI Story Generator",
    sourceUrl: place.url || "",
    title: name,
    script: [
      opening,
      `${category}라는 이름 안에는 이곳을 오가는 사람들의 작은 리듬이 쌓여 있습니다.`,
      reviewMood || "주변의 소리와 빛, 사람들의 움직임이 이 장소만의 분위기를 만듭니다.",
      "지금 보이는 풍경을 천천히 따라가 보세요. 익숙한 길도 한 편의 짧은 여행처럼 느껴질 수 있습니다.",
    ].join(" "),
  };
}

function getTimeLabel(currentTime) {
  const hour = parseHour(currentTime);
  if (hour >= 5 && hour < 11) return "아침";
  if (hour >= 11 && hour < 14) return "점심 무렵";
  if (hour >= 14 && hour < 18) return "오후";
  if (hour >= 18 && hour < 22) return "저녁";
  return "밤";
}

function getWeatherLabel(weather = {}) {
  const condition = String(weather.condition || weather.main || weather.description || "").toLowerCase();
  const temperature = Number(weather.temperature);

  if (/rain|비|drizzle/.test(condition)) return "비 오는";
  if (/snow|눈/.test(condition)) return "눈 내리는";
  if (/clear|맑/.test(condition)) return "맑은";
  if (/cloud|흐|구름/.test(condition)) return "구름 낀";
  if (Number.isFinite(temperature) && temperature >= 30) return "뜨거운 햇살 아래";
  if (Number.isFinite(temperature) && temperature <= 3) return "차가운 공기 속";
  return "";
}

function parseHour(currentTime) {
  if (currentTime instanceof Date) return currentTime.getHours();
  if (typeof currentTime === "number") return currentTime;
  if (typeof currentTime === "string") return Number(currentTime.split(":")[0]);
  return new Date().getHours();
}
