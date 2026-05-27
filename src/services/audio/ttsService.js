let currentUtterance = null;

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakStory(story, options = {}) {
  if (!canSpeak()) {
    throw new Error("이 브라우저는 음성 재생을 지원하지 않습니다.");
  }

  stopAudio();

  const utterance = new SpeechSynthesisUtterance(`${story.title || ""}. ${story.script || ""}`.trim());
  utterance.lang = options.lang || "ko-KR";
  utterance.rate = options.rate || 0.92;
  utterance.pitch = options.pitch || 1;
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
