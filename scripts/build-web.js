const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "www");
const files = ["index.html", "manifest.webmanifest", "sw.js"];
const directories = ["src", "public"];

fs.rmSync(outDir, { recursive: true, force: true });

for (const file of files) {
  const source = path.join(root, file);
  const target = path.join(outDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

for (const directory of directories) {
  fs.cpSync(path.join(root, directory), path.join(outDir, directory), {
    recursive: true,
    force: true,
  });
}

console.log(`Android web assets prepared in ${path.relative(root, outDir)}`);
