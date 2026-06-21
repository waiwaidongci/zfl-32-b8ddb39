const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const ROOT = path.resolve(__dirname, "..");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json"
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function sanitizePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const resolved = path.normalize(path.join(ROOT, decoded));
  if (!resolved.startsWith(ROOT)) {
    return null;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = sanitizePath(urlPath);

  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found: " + urlPath);
      return;
    }

    const contentType = getMimeType(filePath);
    res.writeHead(200, { "Content-Type": contentType });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on("error", () => {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Internal Server Error");
    });
  });
});

server.listen(PORT, () => {
  console.log("\n  斗拱排布模拟器 - 本地开发服务器");
  console.log("  ================================");
  console.log("  本地访问:  http://localhost:" + PORT);
  console.log("  项目目录:  " + ROOT);
  console.log("  按 Ctrl+C 停止服务器\n");
});
