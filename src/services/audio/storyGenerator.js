import { summarizeReviews } from "./reviewSummaryService.js";

export async function generateAIStory(place = {}, context = {}) {
  const name = normalizePlaceName(place);
  const category = place.categoryName || place.type || place.category || "장소";
  const timeLabel = getTimeLabel(context.currentTime || new Date());
  const weatherLabel = getWeatherLabel(context.weather);
  const reviewMood = context.reviewSummary?.vibe || summarizeReviews(context.reviews || [], place).vibe;
  const opening = weatherLabel
    ? `${weatherLabel} ${timeLabel}, ${name}은 조금 다른 표정으로 보입니다.`
    : `${timeLabel}, ${name}은 잠시 걸음을 늦추고 바라보기 좋은 ${category}입니다.`;

  return {
    source: "ai-generated",
    sourceName: "AI Story Generator",
    sourceUrl: place.url || "",
    title: name,
    script: [
      opening,
      `${category}라는 분류 안에도 이곳을 이용하는 사람들의 동선과 습관이 쌓여 있습니다.`,
      reviewMood || "주변의 소리와 방문자들의 움직임이 이 장소만의 분위기를 만듭니다.",
      "지금 보이는 풍경을 천천히 따라가 보세요. 익숙한 길도 잠깐은 여행처럼 느껴질 수 있습니다.",
    ].join(" "),
  };
}

function normalizePlaceName(place = {}) {
  const name = String(place.name || place.place_name || "").trim();
  if (!name || /^(현재\s*)?위치$/.test(name)) return "이 주변";

  return name;
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

  if (/rain|비|drizzle/.test(condition)) return "비 내리는";
  if (/snow|눈/.test(condition)) return "눈 내리는";
  if (/clear|맑/.test(condition)) return "맑은";
  if (/cloud|흐림|구름/.test(condition)) return "구름 낀";
  if (Number.isFinite(temperature) && temperature >= 30) return "더운 공기 아래";
  if (Number.isFinite(temperature) && temperature <= 3) return "차가운 공기 속";
  return "";
}

function parseHour(currentTime) {
  if (currentTime instanceof Date) return currentTime.getHours();
  if (typeof currentTime === "number") return currentTime;
  if (typeof currentTime === "string") return Number(currentTime.split(":")[0]);
  return new Date().getHours();
}
