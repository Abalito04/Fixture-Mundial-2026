import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || process.argv[2] || 5173);
const apiBase = "https://api.balldontlie.io/fifa/worldcup/v1";
const zafronixBase = "https://api.zafronix.com/fifa/worldcup/v1";
const openFootballUrl = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const openFootballSnapshot = join(root, "data", "openfootball-worldcup2026.json");
const zafronixSnapshot = join(root, "data", "zafronix-tournament2026.json");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/fifa/")) {
    await proxyFifaRequest(url, res);
    return;
  }

  if (url.pathname === "/api/openfootball/worldcup2026") {
    await proxyOpenFootballRequest(res);
    return;
  }

  if (url.pathname === "/api/zafronix/tournament2026") {
    await proxyZafronixRequest(res);
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(root, decodeURIComponent(requested)));

  if (!filePath.startsWith(normalize(root))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": types[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Fixture Mundial en http://127.0.0.1:${port}`);
});

async function proxyFifaRequest(url, res) {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) {
    writeJson(res, 500, { error: "Falta configurar BALLDONTLIE_API_KEY en el servidor local." });
    return;
  }

  const endpoint = url.pathname.replace("/api/fifa", "");
  const apiUrl = new URL(`${apiBase}${endpoint}`);
  url.searchParams.forEach((value, key) => apiUrl.searchParams.append(key, value));

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: apiKey
      }
    });
    const body = await response.text();
    res.writeHead(response.status, { "content-type": response.headers.get("content-type") || "application/json" });
    res.end(body);
  } catch (error) {
    writeJson(res, 502, { error: "No se pudo conectar con BALLDONTLIE.", detail: error.message });
  }
}

async function proxyOpenFootballRequest(res) {
  if (await writeSnapshotIfExists(res, openFootballSnapshot)) return;

  try {
    const response = await fetch(openFootballUrl);
    const body = await response.text();
    res.writeHead(response.status, { "content-type": response.headers.get("content-type") || "application/json" });
    res.end(body);
  } catch (error) {
    writeJson(res, 502, { error: "No se pudo conectar con OpenFootball.", detail: error.message });
  }
}

async function proxyZafronixRequest(res) {
  if (await writeSnapshotIfExists(res, zafronixSnapshot)) return;

  const apiKey = process.env.ZAFRONIX_API_KEY;
  if (!apiKey) {
    writeJson(res, 500, { error: "Falta configurar ZAFRONIX_API_KEY en el servidor local." });
    return;
  }

  try {
    const response = await fetch(`${zafronixBase}/tournaments/2026`, {
      headers: {
        "X-API-Key": apiKey
      }
    });
    const body = await response.text();
    res.writeHead(response.status, { "content-type": response.headers.get("content-type") || "application/json" });
    res.end(body);
  } catch (error) {
    writeJson(res, 502, { error: "No se pudo conectar con Zafronix.", detail: error.message });
  }
}

async function writeSnapshotIfExists(res, filePath) {
  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "x-data-source": "local-snapshot"
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

function writeJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
