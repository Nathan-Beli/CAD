import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const botDir = resolve(__dirname, "..", "discord-bot");
const envPaths = [resolve(__dirname, "..", "blainville-rp-dashboard-visuel", ".env"), join(__dirname, ".env")];
const fallbackGuildId = "1482748692711866399";

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

const fileEnv = Object.assign({}, ...envPaths.map(loadEnvFile));
const env = { ...fileEnv };

for (const [key, value] of Object.entries(process.env)) {
  if (value !== undefined && value !== "") {
    env[key] = value;
  }
}

if (!/^\d{17,20}$/.test(env.GUILD_ID || "") && /^\d{17,20}$/.test(fileEnv.GUILD_ID || "")) {
  env.GUILD_ID = fileEnv.GUILD_ID;
}

if (!/^\d{17,20}$/.test(env.GUILD_ID || "")) {
  env.GUILD_ID = fallbackGuildId;
}

if (!/^\d{17,20}$/.test(env.CLIENT_ID || "") && /^\d{17,20}$/.test(fileEnv.CLIENT_ID || "")) {
  env.CLIENT_ID = fileEnv.CLIENT_ID;
}

Object.assign(process.env, env);

const host = process.env.CAD_HOST || "0.0.0.0";
const port = Number(process.env.PORT || process.env.CAD_PORT || 4175);
const botApiPort = String(process.env.DASHBOARD_API_PORT || 4174);
const botApiUrl = process.env.DASHBOARD_API_URL || `http://127.0.0.1:${botApiPort}`;
let botProcess = null;

const shouldStartBot =
  process.env.CAD_START_BOT === "true" ||
  (
    process.env.CAD_START_BOT !== "false" &&
    (
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_SERVICE_ID ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.NODE_ENV === "production"
    )
  );
const hasExternalBotApi = Boolean(process.env.DASHBOARD_API_URL);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function startBot() {
  if (!shouldStartBot) {
    console.log("Bot Discord non demarre localement. Mets CAD_START_BOT=true pour le lancer avec le CAD.");
    return;
  }

  if (!process.env.DISCORD_TOKEN) {
    console.warn("DISCORD_TOKEN manquant: bot non demarre.");
    return;
  }

  const botEntry = resolve(botDir, "src", "index.js");
  if (!existsSync(botEntry)) return;

  botProcess = spawn(process.execPath, [botEntry], {
    cwd: botDir,
    env: {
      ...process.env,
      ...env,
      PORT: botApiPort,
      DASHBOARD_API_PORT: botApiPort,
    },
    stdio: "inherit",
    windowsHide: true,
  });

  botProcess.on("exit", (code) => {
    console.warn(`Bot Discord arrete avec le code ${code}. Le portail CAD reste en ligne.`);
  });

  botProcess.on("error", (error) => {
    console.warn(`Bot Discord impossible a lancer: ${error.message}`);
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
        apiReady: shouldStartBot || hasExternalBotApi,
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
  const publicUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  console.log(`CAD disponible sur ${publicUrl}`);
});

process.on("SIGINT", () => {
  if (botProcess) botProcess.kill();
  process.exit();
});

process.on("SIGTERM", () => {
  if (botProcess) botProcess.kill();
  process.exit();
});
