import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const botDir = resolve(__dirname, "..", "discord-bot");
const envPaths = [resolve(__dirname, "..", "blainville-rp-dashboard-visuel", ".env"), join(__dirname, ".env")];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
      })
  );
}

const env = Object.assign({}, process.env, ...envPaths.map(loadEnvFile));
Object.assign(process.env, env);

const host = process.env.CAD_HOST || "0.0.0.0";
const port = Number(process.env.CAD_PORT || 4175);
const botApiUrl = process.env.DASHBOARD_API_URL || "http://127.0.0.1:4174";
let botProcess = null;

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function startBot() {
  if (process.env.CAD_START_BOT === "false") return;
  if (!process.env.DISCORD_TOKEN) {
    console.warn("DISCORD_TOKEN manquant: bot non demarre.");
    return;
  }

  const botEntry = resolve(botDir, "src", "index.js");
  if (!existsSync(botEntry)) return;

  botProcess = spawn(process.execPath, [botEntry], {
    cwd: botDir,
    env: { ...process.env, ...env },
    stdio: "inherit",
    windowsHide: true,
  });
}

async function proxyBotApi(request, response, url) {
  try {
    const target = new URL(url.pathname + url.search, botApiUrl);
    const botResponse = await fetch(target, { method: request.method });
    response.writeHead(botResponse.status, {
      "Content-Type": botResponse.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(Buffer.from(await botResponse.arrayBuffer()));
  } catch {
    sendJson(response, 502, { ok: false, reason: "Bot/API indisponible." });
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (url.pathname === "/api/dashboard/config") {
      return sendJson(response, 200, {
        clientId: process.env.CLIENT_ID || "",
        guildId: process.env.GUILD_ID || "",
        apiBaseUrl: "",
        apiReady: true,
      });
    }

    if (url.pathname.startsWith("/api/dashboard/")) {
      return proxyBotApi(request, response, url);
    }

    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(path).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(__dirname, safePath);

    if (!filePath.startsWith(__dirname)) {
      response.writeHead(403);
      return response.end("Forbidden");
    }

    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

startBot();

server.listen(port, host, () => {
  console.log(`CAD disponible sur http://localhost:${port}`);
});

process.on("SIGINT", () => {
  if (botProcess) botProcess.kill();
  process.exit();
});

process.on("SIGTERM", () => {
  if (botProcess) botProcess.kill();
  process.exit();
});
