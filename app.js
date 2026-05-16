const discordApiUrl = "https://discord.com/api/v10";
const discordAuthUrl = "https://discord.com/oauth2/authorize";
const discordStateKey = "blainville-cad-discord-state";
const storageKey = "blainville-cad-access-v1";

const services = [
  {
    id: "sq",
    name: "Surete du Quebec",
    roleId: "1484018631653330954",
    logoUrl: "https://fr.wikipedia.org/wiki/Fichier:Logo_SQ.svg",
    sourceUrl: "https://fr.wikipedia.org/wiki/Fichier:Logo_SQ.svg",
  },
  {
    id: "spvb",
    name: "SPVB",
    roleId: "1484161421448056943",
    logoUrl: "https://www.facebook.com/PoliceBlainville/",
    sourceUrl: "https://www.facebook.com/PoliceBlainville/",
  },
  {
    id: "sivb",
    name: "SIVB",
    roleId: "1484368916812660746",
    logoUrl: "https://blainville.ca/storage/app/media/Services/Services%20aux%20citoyens/Pompiers/Rapport%20des%20activit%C3%A9s%202022.pdf",
    sourceUrl: "https://blainville.ca/storage/app/media/Services/Services%20aux%20citoyens/Pompiers/Rapport%20des%20activit%C3%A9s%202022.pdf",
  },
  {
    id: "spall",
    name: "SPALL",
    roleId: "1484347605713424495",
    logoUrl: "https://www.facebook.com/spllofficiel/",
    sourceUrl: "https://www.facebook.com/spllofficiel/",
  },
  {
    id: "mtq",
    name: "MTQ",
    roleId: "1484743685248913538",
    logoUrl: "https://www.carignan.quebec/congestion-a-prevoir-sur-la-bretelle-de-lautoroute-10-a-brossard-du-3-au-9-aout/",
    sourceUrl: "https://www.carignan.quebec/congestion-a-prevoir-sur-la-bretelle-de-lautoroute-10-a-brossard-du-3-au-9-aout/",
  },
];

let config = {
  clientId: "",
  guildId: "",
  apiBaseUrl: "",
};

let state = loadState();

const serviceButtons = document.querySelector("#serviceButtons");
const discordLoginBtn = document.querySelector("#discordLoginBtn");
const syncBtn = document.querySelector("#syncBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const sessionName = document.querySelector("#sessionName");
const sessionMeta = document.querySelector("#sessionMeta");
const statusDot = document.querySelector(".status-dot");
const notice = document.querySelector("#notice");
const cadArea = document.querySelector("#cadArea");
const cadServiceLabel = document.querySelector("#cadServiceLabel");
const cadTitle = document.querySelector("#cadTitle");
const cadStatus = document.querySelector("#cadStatus");
const backBtn = document.querySelector("#backBtn");

function loadState() {
  try {
    return {
      session: {
        userId: "",
        username: "",
        displayName: "",
        avatarUrl: "",
        roles: [],
        cadServices: [],
      },
      ...JSON.parse(localStorage.getItem(storageKey) || "{}"),
    };
  } catch {
    return {
      session: {
        userId: "",
        username: "",
        displayName: "",
        avatarUrl: "",
        roles: [],
        cadServices: [],
      },
    };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function getRedirectUri() {
  if (window.location.protocol !== "http:" && window.location.protocol !== "https:") return "";
  return `${window.location.origin}${window.location.pathname}`;
}

async function loadConfig() {
  try {
    const response = await fetch("/api/dashboard/config");
    if (!response.ok) throw new Error("Config indisponible");
    const payload = await response.json();
    config = {
      clientId: payload.clientId || "",
      guildId: payload.guildId || "",
      apiBaseUrl: payload.apiBaseUrl || "",
    };
    notice.textContent = payload.apiReady
      ? "Bot Discord detecte. Connecte-toi pour verifier tes roles."
      : "Configuration chargee.";
  } catch {
    notice.textContent = "Ouvre ce CAD avec son serveur local, pas directement en file://.";
  }
}

async function buildDiscordLoginUrl() {
  if (!config.clientId) await loadConfig();

  const redirectUri = getRedirectUri();
  if (!redirectUri) {
    throw new Error("Ouvre le CAD avec http://localhost:4175/index.html pour utiliser Discord.");
  }

  if (!config.clientId) {
    throw new Error("CLIENT_ID absent. Verifie le .env du serveur CAD.");
  }

  const oauthState = crypto.randomUUID();
  sessionStorage.setItem(discordStateKey, oauthState);

  const params = new URLSearchParams({
    response_type: "token",
    client_id: config.clientId,
    scope: "identify",
    redirect_uri: redirectUri,
    state: oauthState,
    prompt: "consent",
  });

  return `${discordAuthUrl}?${params.toString()}`;
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch(`${discordApiUrl}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error("Connexion Discord refusee.");
  return response.json();
}

async function handleDiscordCallback() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hash.get("access_token");
  const callbackState = hash.get("state");

  if (!accessToken) return;

  const expectedState = sessionStorage.getItem(discordStateKey);
  if (expectedState && callbackState !== expectedState) {
    notice.textContent = "Verification Discord refusee.";
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  try {
    const user = await fetchDiscordUser(accessToken);
    state.session = {
      userId: user.id,
      username: user.username || user.id,
      displayName: user.global_name || user.username || user.id,
      avatarUrl: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : "",
      roles: [],
      cadServices: [],
    };
    saveState();
    await syncProfile();
  } catch (error) {
    notice.textContent = error instanceof Error ? error.message : "Connexion impossible.";
  } finally {
    sessionStorage.removeItem(discordStateKey);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function apiFetch(path) {
  const response = await fetch(`${config.apiBaseUrl}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.reason || "API bot indisponible.");
  }
  return payload;
}

async function syncProfile() {
  if (!state.session.userId) {
    notice.textContent = "Connecte-toi avec Discord avant de verifier les roles.";
    return;
  }

  if (!config.clientId) await loadConfig();

  try {
    const payload = await apiFetch(`/api/dashboard/me?userId=${encodeURIComponent(state.session.userId)}`);
    const profile = payload.profile;
    state.session = {
      ...state.session,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      roles: profile.roles || [],
      cadServices: profile.cadServices || [],
    };
    saveState();
    notice.textContent = state.session.cadServices.length
      ? "Roles detectes. Choisis ton service CAD."
      : "Aucun role CAD autorise detecte sur ton compte.";
    render();
  } catch (error) {
    notice.textContent = error instanceof Error ? error.message : "Impossible de verifier les roles.";
  }
}

function hasService(service) {
  return state.session.cadServices.some((allowed) => allowed.roleId === service.roleId);
}

function renderSession() {
  const connected = Boolean(state.session.userId);
  sessionName.textContent = connected ? state.session.displayName || state.session.username : "Non connecte";
  sessionMeta.textContent = connected
    ? `${state.session.cadServices.length} acces CAD detecte(s)`
    : "Connexion Discord requise";
  statusDot.classList.toggle("connected", connected);
  logoutBtn.classList.toggle("hidden", !connected);
}

function renderServices() {
  serviceButtons.innerHTML = services
    .map((service) => {
      const unlocked = hasService(service);
      return `
        <button class="service-card ${unlocked ? "" : "locked"}" type="button" data-service="${service.id}" ${unlocked ? "" : "disabled"}>
          <span class="service-logo" data-fallback="${initials(service.name)}">
            <img src="${service.logoUrl}" alt="Logo ${service.name}" onerror="this.parentElement.textContent=this.parentElement.dataset.fallback" />
          </span>
          <span>
            <strong>${service.name}</strong>
            <small>Role ID: ${service.roleId}</small>
            <p>${unlocked ? "Acces autorise" : "Role requis"}</p>
          </span>
        </button>
      `;
    })
    .join("");
}

function openCad(serviceId) {
  const service = services.find((item) => item.id === serviceId);
  if (!service || !hasService(service)) return;

  cadServiceLabel.textContent = service.name;
  cadTitle.textContent = `CAD ${service.name}`;
  cadStatus.textContent = `Acces confirme avec le role Discord ${service.roleId}.`;
  cadArea.classList.remove("hidden");
  cadArea.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function render() {
  renderSession();
  renderServices();
}

discordLoginBtn.addEventListener("click", async () => {
  try {
    window.location.href = await buildDiscordLoginUrl();
  } catch (error) {
    notice.textContent = error instanceof Error ? error.message : "Connexion Discord impossible.";
  }
});

syncBtn.addEventListener("click", syncProfile);

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  state = loadState();
  cadArea.classList.add("hidden");
  notice.textContent = "Session deconnectee.";
  render();
});

serviceButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-service]");
  if (!button) return;
  openCad(button.dataset.service);
});

backBtn.addEventListener("click", () => {
  cadArea.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

await loadConfig();
await handleDiscordCallback();
render();
