import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const botDir = resolve(__dirname, "..", "discord-bot");
const envPaths = [resolve(__dirname, "..", "blainville-rp-dashboard-visuel", ".env"), join(__dirname, ".env")];
const fallbackGuildId = "1482748692711866399";
const dataDir = join(__dirname, "data");
const erlcConfigPath = join(dataDir, "erlc-config.json");

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

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 128) {
        request.destroy();
        reject(new Error("Payload trop grand."));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalide."));
      }
    });
    request.on("error", reject);
  });
}

async function loadErlcConfig() {
  const envUrl = process.env.ERLC_STATE_URL || process.env.ERLC_API_URL || "";
  const envKey = process.env.ERLC_API_KEY || "";

  let stored = {};
  try {
    stored = JSON.parse(await readFile(erlcConfigPath, "utf8"));
  } catch {
    stored = {};
  }

  return {
    stateUrl: envUrl || stored.stateUrl || "",
    apiKey: envKey || stored.apiKey || "",
    savedAt: stored.savedAt || "",
    source: envUrl ? "env" : stored.stateUrl ? "server" : "none",
  };
}

async function saveErlcConfig(config) {
  await mkdir(dataDir, { recursive: true });
  const payload = {
    stateUrl: String(config.stateUrl || "").trim(),
    apiKey: String(config.apiKey || "").trim(),
    savedAt: new Date().toISOString(),
  };
  await writeFile(erlcConfigPath, JSON.stringify(payload, null, 2));
  return payload;
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

  console.log(`Demarrage du bot Discord avec API interne sur ${botApiUrl}`);

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

async function getErlcState(service) {
  const erlcConfig = await loadErlcConfig();
  const stateUrl = erlcConfig.stateUrl;

  if (!stateUrl) {
    return {
      source: "not_configured",
      message: "Aucun endpoint ERLC configure.",
      calls: [],
      units: [],
      warrants: [],
      mapUnits: [],
      service,
    };
  }

  const target = new URL(stateUrl);
  target.searchParams.set("service", service);

  const erlcResponse = await fetch(target, {
    headers: {
      Accept: "application/json",
      ...(erlcConfig.apiKey ? { Authorization: `Bearer ${erlcConfig.apiKey}` } : {}),
    },
  });

  if (!erlcResponse.ok) {
    throw new Error(`ERLC API ${erlcResponse.status}`);
  }

  const payload = await erlcResponse.json();

  return {
    source: "erlc",
    message: payload.message || "Flux ERLC connecte.",
    calls: payload.calls || [],
    units: payload.units || [],
    warrants: payload.warrants || [],
    mapUnits: payload.mapUnits || payload.units || [],
    service,
  };
}

async function getMedicalRecords(url) {
  try {
    const target = new URL(url.pathname + url.search, botApiUrl);
    const botResponse = await fetch(target, { method: "GET" });
    const payload = await botResponse.json().catch(() => ({}));
    if (!botResponse.ok || payload.ok === false) {
      throw new Error(payload.reason || "Bot API indisponible.");
    }
    return payload.records || [];
  } catch {
    return [];
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      return sendJson(response, 200, {
        ok: true,
        service: "cad",
        botMode: shouldStartBot ? "enabled" : "disabled",
        apiPort: botApiPort,
      });
    }

    if (url.pathname === "/api/dashboard/config") {
      const erlcConfig = await loadErlcConfig();
      return sendJson(response, 200, {
        clientId: process.env.CLIENT_ID || "",
        guildId: process.env.GUILD_ID || "",
        apiBaseUrl: "",
        apiReady: shouldStartBot || hasExternalBotApi,
        erlcConfigured: Boolean(erlcConfig.stateUrl),
        erlcSource: erlcConfig.source,
      });
    }

    if (request.method === "GET" && url.pathname === "/api/cad/erlc-config") {
      const erlcConfig = await loadErlcConfig();
      return sendJson(response, 200, {
        ok: true,
        config: {
          stateUrl: erlcConfig.stateUrl,
          hasApiKey: Boolean(erlcConfig.apiKey),
          savedAt: erlcConfig.savedAt,
          source: erlcConfig.source,
        },
      });
    }

    if (request.method === "POST" && url.pathname === "/api/cad/erlc-config") {
      const body = await readJsonBody(request);
      const stateUrl = String(body.stateUrl || "").trim();

      if (!/^https?:\/\//i.test(stateUrl)) {
        return sendJson(response, 400, {
          ok: false,
          reason: "URL ERLC invalide. Elle doit commencer par http:// ou https://.",
        });
      }

      const saved = await saveErlcConfig({
        stateUrl,
        apiKey: body.apiKey || "",
      });

      return sendJson(response, 200, {
        ok: true,
        config: {
          stateUrl: saved.stateUrl,
          hasApiKey: Boolean(saved.apiKey),
          savedAt: saved.savedAt,
          source: "server",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/api/cad/erlc-state") {
      const service = url.searchParams.get("service") || "all";
      try {
        return sendJson(response, 200, {
          ok: true,
          state: await getErlcState(service),
        });
      } catch (error) {
        return sendJson(response, 502, {
          ok: false,
          reason: error instanceof Error ? error.message : "ERLC API indisponible.",
        });
      }
    }

    if (request.method === "GET" && url.pathname === "/api/cad/medical-records") {
      return sendJson(response, 200, {
        ok: true,
        records: await getMedicalRecords(url),
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
