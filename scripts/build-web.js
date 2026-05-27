const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "www");
const files = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "src/app.js",
  "src/pages/Home.js",
  "src/components/MapView.js",
  "src/hooks/useCurrentLocation.js",
  "src/services/audio/audioGuideService.js",
  "src/services/audio/reviewSummaryService.js",
  "src/services/audio/storyGenerator.js",
  "src/services/audio/triggerService.js",
  "src/services/audio/ttsService.js",
  "src/services/authService.js",
  "src/services/geocodingService.js",
  "src/services/googlePlacesService.js",
  "src/services/mapService.js",
  "src/services/placeReviewMetricsService.js",
  "src/services/publicApi/tourismService.js",
  "src/services/publicApi/wikipediaService.js",
  "src/services/recommendation/index.js",
  "src/services/recommendation/mockData.js",
  "src/services/recommendation/recommendationService.js",
  "src/services/reviewService.js",
  "src/services/routingService.js",
  "src/styles/app.css",
  "public/icon.svg"
];

fs.rmSync(outDir, { recursive: true, force: true });

for (const file of files) {
  const source = path.join(root, file);
  const target = path.join(outDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

console.log(`Android web assets prepared in ${path.relative(root, outDir)}`);
