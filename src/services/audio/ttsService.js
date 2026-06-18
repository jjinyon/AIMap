let currentUtterance = null;
let preferredVoice = null;

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getKoreanVoices() {
  if (!canSpeak()) return [];

  return window.speechSynthesis
    .getVoices()
    .filter((voice) => /ko|korean|한국/i.test(`${voice.lang} ${voice.name}`));
}

export function loadVoices() {
  if (!canSpeak()) return Promise.resolve([]);

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 800);

    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timeoutId);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

export function selectNarrationVoice() {
  if (!canSpeak()) return null;

  const voices = window.speechSynthesis.getVoices();
  const koreanVoices = getKoreanVoices();
  const candidates = koreanVoices.length ? koreanVoices : voices;

  preferredVoice = [...candidates].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] || null;

  return preferredVoice;
}

export function speakStory(story, options = {}) {
  if (!canSpeak()) {
    throw new Error("이 브라우저에서는 음성 재생을 지원하지 않습니다.");
  }

  stopAudio();

  const utterance = new SpeechSynthesisUtterance(makeNarrationText(story));
  utterance.lang = options.lang || "ko-KR";
  utterance.voice = options.voice || preferredVoice || selectNarrationVoice();
  utterance.rate = options.rate || 0.88;
  utterance.pitch = options.pitch || 1;
  utterance.volume = options.volume || 1;
  utterance.onend = options.onEnd || null;
  utterance.onerror = options.onError || null;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function pauseAudio() {
  if (canSpeak()) window.speechSynthesis.pause();
}

export function resumeAudio() {
  if (canSpeak()) window.speechSynthesis.resume();
}

export function stopAudio() {
  if (canSpeak()) window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isPaused() {
  return canSpeak() && window.speechSynthesis.paused;
}

export function getCurrentUtterance() {
  return currentUtterance;
}

function makeNarrationText(story = {}) {
  const title = String(story.title || "").trim();
  const script = String(story.narrationScript || story.script || "").trim();
  const text = [title, script].filter(Boolean).join(". ");

  return text
    .replace(/\s+/g, " ")
    .replace(/([가-힣])입니다\./g, "$1입니다. ")
    .replace(/([가-힣])요\./g, "$1요. ")
    .replace(/([.!?。！？])\s*/g, "$1 ")
    .trim();
}

function scoreVoice(voice = {}) {
  const name = String(voice.name || "");
  const lang = String(voice.lang || "");
  const searchable = `${name} ${lang}`.toLowerCase();
  let score = 0;

  if (/^ko(-|_)?kr$/i.test(lang) || /ko-kr/i.test(searchable)) score += 80;
  else if (/ko|korean|한국/.test(searchable)) score += 55;

  if (/natural|neural|online|premium/i.test(name)) score += 60;
  if (/google/i.test(name)) score += 45;
  if (/microsoft/i.test(name)) score += 25;
  if (/yuna|sunhi|heami|한국|korean/i.test(name)) score += 20;
  if (voice.default) score += 8;

  if (/desktop|legacy|compact|espeak/i.test(name)) score -= 70;
  if (voice.localService && !/natural|neural|online|premium|google/i.test(name)) score -= 18;

  return score;
}
