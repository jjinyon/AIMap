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
  "src/services/mapService.js",
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
