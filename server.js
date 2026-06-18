const http = require("http");
const fs = require("fs");
const path = require("path");
const ideiasHandler = require("./api/ideias");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  if (req.url === "/api/ideias") {
    addJsonHelpers(res);

    try {
      req.body = await readJsonBody(req);
    } catch (error) {
      return res.status(400).json({ error: "JSON invalido no pedido." });
    }

    return ideiasHandler(req, res);
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Servidor ligado em http://localhost:${PORT}`);
});

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function addJsonHelpers(res) {
  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };

  res.json = (data) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
  };
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME_TYPES[extension] || "application/octet-stream");
    res.end(content);
  });
}
