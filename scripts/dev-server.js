const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const initialPort = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const safePath = path
    .normalize(pathname)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]/, "");
  const filePath = path.join(root, safePath || "index.html");
  const resolvedPath = filePath.endsWith(path.sep)
    ? path.join(filePath, "index.html")
    : filePath;

  if (!resolvedPath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(resolvedPath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const ext = path.extname(resolvedPath);
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(content);
  });
});

function listen(port) {
  server.listen(port, host, () => {
    console.log(`AI 장소 추천 앱 실행 중: http://${host}:${port}/`);
    console.log("종료하려면 Ctrl+C를 누르세요.");
  });
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    const nextPort = Number(server.address()?.port || initialPort) + 1;
    console.log(`${host}:${nextPort - 1} 포트가 사용 중이라 ${nextPort} 포트로 다시 시도합니다.`);
    listen(nextPort);
    return;
  }

  throw error;
});

listen(initialPort);
