const discordApiUrl = "https://discord.com/api/v10";
const discordAuthUrl = "https://discord.com/oauth2/authorize";
const discordStateKey = "blainville-cad-discord-state";
const storageKey = "blainville-cad-access-v2";
const medicalForumChannelId = "1483574322399416320";
const bypassRoleCheck = true;

const services = [
  {
    id: "sq",
    name: "Surete du Quebec",
    shortName: "SQ",
    roleId: "1484018631653330954",
    logoUrl: "https://fr.wikipedia.org/wiki/Fichier:Logo_SQ.svg",
    unitFilter: ["sq", "spvb"],
    callFilter: ["police", "sq", "spvb"],
    panel: "law",
    shiftEligible: true,
  },
  {
    id: "spvb",
    name: "SPVB",
    shortName: "SPVB",
    roleId: "1484161421448056943",
    logoUrl: "https://www.facebook.com/PoliceBlainville/",
    unitFilter: ["sq", "spvb"],
    callFilter: ["police", "sq", "spvb"],
    panel: "law",
    shiftEligible: true,
  },
  {
    id: "sivb",
    name: "SIVB",
    shortName: "SIVB",
    roleId: "1484368916812660746",
    logoUrl: "https://blainville.ca/storage/app/media/Services/Services%20aux%20citoyens/Pompiers/Rapport%20des%20activit%C3%A9s%202022.pdf",
    unitFilter: ["fire", "sivb"],
    callFilter: ["fire", "sivb"],
    panel: "fire",
    shiftEligible: false,
  },
  {
    id: "spall",
    name: "SPLL",
    shortName: "SPLL",
    roleId: "1484347605713424495",
    logoUrl: "https://www.facebook.com/spllofficiel/",
    unitFilter: ["ems", "spall"],
    callFilter: ["ems", "medical", "spall"],
    panel: "medical",
    shiftEligible: false,
  },
  {
    id: "mtq",
    name: "MTQ",
    shortName: "MTQ",
    roleId: "1484743685248913538",
    logoUrl: "https://www.carignan.quebec/congestion-a-prevoir-sur-la-bretelle-de-lautoroute-10-a-brossard-du-3-au-9-aout/",
    unitFilter: ["dot", "mtq"],
    callFilter: ["dot", "mtq"],
    panel: "dot",
    shiftEligible: false,
  },
  {
    id: "dispatcher",
    name: "Repartisseur 911",
    shortName: "911",
    roleId: "",
    logoUrl: "",
    unitFilter: ["all"],
    callFilter: ["all"],
    panel: "dispatcher",
    shiftEligible: false,
    comingSoon: true,
  },
];

let config = {
  clientId: "1498839231429218354",
  guildId: "1482748692711866399",
  apiBaseUrl: "",
};

let runtime = {
  erlc: { calls: [], units: [], warrants: [], mapUnits: [], source: "offline" },
  medicalRecords: [],
  assignments: [],
  activeShiftStartedAt: 0,
};

let state = loadState();

const portalView = document.querySelector("#portalView");
const departmentLogin = document.querySelector("#departmentLogin");
const cadView = document.querySelector("#cadView");
const civilForm = document.querySelector("#civilForm");
const firstName = document.querySelector("#firstName");
const lastName = document.querySelector("#lastName");
const civilCardName = document.querySelector("#civilCardName");
const civilCardDiscord = document.querySelector("#civilCardDiscord");
const erlcConfigForm = document.querySelector("#erlcConfigForm");
const erlcStateUrl = document.querySelector("#erlcStateUrl");
const erlcApiKey = document.querySelector("#erlcApiKey");
const erlcConfigStatus = document.querySelector("#erlcConfigStatus");
const serviceButtons = document.querySelector("#serviceButtons");
const discordLoginBtn = document.querySelector("#discordLoginBtn");
const syncBtn = document.querySelector("#syncBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const sessionName = document.querySelector("#sessionName");
const sessionMeta = document.querySelector("#sessionMeta");
const statusDot = document.querySelector(".status-dot");
const notice = document.querySelector("#notice");
const loginServiceLabel = document.querySelector("#loginServiceLabel");
const loginBackBtn = document.querySelector("#loginBackBtn");
const departmentForm = document.querySelector("#departmentForm");
const unitNumber = document.querySelector("#unitNumber");
const rank = document.querySelector("#rank");
const subdivision = document.querySelector("#subdivision");
const cadServiceLabel = document.querySelector("#cadServiceLabel");
const cadTitle = document.querySelector("#cadTitle");
const operatorLine = document.querySelector("#operatorLine");
const cadGrid = document.querySelector("#cadGrid");
const shiftBtn = document.querySelector("#shiftBtn");
const shiftSummaryBtn = document.querySelector("#shiftSummaryBtn");
const cadBackBtn = document.querySelector("#cadBackBtn");

function emptySession() {
  return {
    userId: "",
    username: "",
    displayName: "",
    avatarUrl: "",
    dashboardRole: "",
    roles: [],
    cadServices: [],
  };
}

function loadState() {
  const fallback = {
    session: emptySession(),
    civilCard: { firstName: "", lastName: "" },
    operators: {},
    shifts: [],
    activeServiceId: "",
  };

  try {
    return {
      ...fallback,
      ...JSON.parse(localStorage.getItem(storageKey) || "{}"),
    };
  } catch {
    return fallback;
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
  if (window.location.protocol === "file:") {
    notice.textContent = "Tu es en file://. Lance le serveur CAD puis ouvre l'URL hebergee ou localhost.";
    discordLoginBtn.disabled = true;
    syncBtn.disabled = true;
    return;
  }

  try {
    const response = await fetch("/api/dashboard/config");
    if (!response.ok) throw new Error("Config indisponible");
    const payload = await response.json();
    config = {
      clientId: payload.clientId || "",
      guildId: payload.guildId || "",
      apiBaseUrl: payload.apiBaseUrl || "",
    };
    discordLoginBtn.disabled = !config.clientId;
    syncBtn.disabled = !config.clientId;
    notice.textContent = config.clientId
      ? "Connecte-toi avec Discord, puis verifie tes roles."
      : "CLIENT_ID absent cote serveur. Verifie les variables d'environnement.";
    if (payload.erlcConfigured) {
      erlcConfigStatus.textContent = `ERLC connecte (${payload.erlcSource}).`;
    }
  } catch {
    config = {
      clientId: "1498839231429218354",
      guildId: "1482748692711866399",
      apiBaseUrl: "",
    };
    notice.textContent = "Mode portail seulement: la connexion Discord peut ouvrir, mais les roles demandent le serveur CAD/API.";
    discordLoginBtn.disabled = false;
    syncBtn.disabled = false;
  }
}

async function loadErlcConfig() {
  try {
    const payload = await apiFetch("/api/cad/erlc-config");
    erlcStateUrl.value = payload.config?.stateUrl || "";
    erlcApiKey.value = "";
    erlcConfigStatus.textContent = payload.config?.stateUrl
      ? `ERLC connecte (${payload.config.source}). Cle: ${payload.config.hasApiKey ? "oui" : "non"}.`
      : "Aucune API ERLC connectee.";
  } catch {
    erlcConfigStatus.textContent = "Config ERLC indisponible tant que le serveur CAD/API ne repond pas.";
  }
}

async function saveErlcConfig(event) {
  event.preventDefault();
  const stateUrl = erlcStateUrl.value.trim();
  const apiKey = erlcApiKey.value.trim();

  if (!stateUrl) {
    erlcConfigStatus.textContent = "Entre l'URL de ton API ERLC.";
    return;
  }

  try {
    const response = await fetch("/api/cad/erlc-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stateUrl, apiKey }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.reason || "Sauvegarde impossible.");
    }
    erlcApiKey.value = "";
    erlcConfigStatus.textContent = "API ERLC sauvegardee. Les CAD utiliseront ce serveur.";
  } catch (error) {
    erlcConfigStatus.textContent = error instanceof Error ? error.message : "Connexion ERLC impossible.";
  }
}

async function buildDiscordLoginUrl() {
  if (!config.clientId) await loadConfig();

  const redirectUri = getRedirectUri();
  if (!redirectUri) {
    throw new Error("Ouvre le CAD avec une URL http/https pour utiliser Discord.");
  }

  if (!config.clientId) {
    throw new Error("CLIENT_ID absent. Verifie les variables d'environnement du serveur CAD.");
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
      ...emptySession(),
      userId: user.id,
      username: user.username || user.id,
      displayName: user.global_name || user.username || user.id,
      avatarUrl: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : "",
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
    throw new Error(payload.reason || "API indisponible.");
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
      dashboardRole: profile.dashboardRole || "",
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
  if (service.comingSoon) return false;
  if (bypassRoleCheck) return true;
  return state.session.cadServices.some((allowed) => allowed.roleId === service.roleId);
}

function getCivilName() {
  const first = state.civilCard.firstName.trim();
  const last = state.civilCard.lastName.trim();
  return `${first} ${last}`.trim();
}

function getRoleNames() {
  return (state.session.roles || []).map((role) =>
    typeof role === "string" ? role : role.name || ""
  );
}

function isDirector() {
  const roleText = getRoleNames().join(" ").toLowerCase();
  return (
    state.session.dashboardRole === "staff" ||
    roleText.includes("directeur") ||
    roleText.includes("direction")
  );
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

function renderCivilCard() {
  firstName.value = state.civilCard.firstName;
  lastName.value = state.civilCard.lastName;
  civilCardName.textContent = getCivilName() || "Non creee";
  civilCardDiscord.textContent = state.session.userId
    ? `Discord: ${state.session.displayName || state.session.username}`
    : "Aucun compte Discord";
}

function renderServices() {
  serviceButtons.innerHTML = services
    .map((service) => {
      const unlocked = hasService(service);
      const disabled = !unlocked || service.comingSoon;
      const label = service.comingSoon ? "Coming soon" : bypassRoleCheck ? "Acces temporaire sans role" : unlocked ? "Acces autorise" : "Role requis";
      return `
        <button class="service-card ${unlocked ? "" : "locked"} ${service.comingSoon ? "soon" : ""}" type="button" data-service="${service.id}" ${disabled ? "disabled" : ""}>
          <span class="service-logo" data-fallback="${initials(service.shortName || service.name)}">
            ${service.logoUrl ? `<img src="${service.logoUrl}" alt="Logo ${escapeHtml(service.name)}" onerror="this.parentElement.textContent=this.parentElement.dataset.fallback" />` : initials(service.shortName || service.name)}
          </span>
          <span>
            <strong>${escapeHtml(service.name)}</strong>
            <small>${service.roleId ? `Role ID: ${service.roleId}` : "Role a venir"}</small>
            <p>${label}</p>
          </span>
        </button>
      `;
    })
    .join("");
}

function showPortal() {
  portalView.classList.remove("hidden");
  departmentLogin.classList.add("hidden");
  cadView.classList.add("hidden");
}

function showDepartmentLogin(serviceId) {
  const service = services.find((item) => item.id === serviceId);
  if (!service || !hasService(service)) return;

  state.activeServiceId = serviceId;
  saveState();
  loginServiceLabel.textContent = service.name;
  const operator = state.operators[serviceId] || {};
  unitNumber.value = operator.unitNumber || "";
  rank.value = operator.rank || "";
  const subdivisionLabel = subdivision.closest("label");
  const subdivisions = getSubdivisions(service);
  subdivisionLabel.classList.remove("hidden");
  subdivision.required = true;
  subdivision.innerHTML = subdivisions.map((item) => `<option ${operator.subdivision === item ? "selected" : ""}>${item}</option>`).join("");
  portalView.classList.add("hidden");
  departmentLogin.classList.remove("hidden");
  cadView.classList.add("hidden");
}

function getSubdivisions(service) {
  if (["sivb", "spall", "mtq"].includes(service.id)) return ["Superviseur"];
  const base = ["Enqueteur", "Superviseur", "Patrouille", "K9"];
  return service.id === "sq" ? ["GTI", ...base] : base;
}

async function enterCad() {
  const service = services.find((item) => item.id === state.activeServiceId);
  if (!service) return;

  state.operators[service.id] = {
    unitNumber: unitNumber.value.trim(),
    rank: rank.value.trim(),
    subdivision: subdivision.value,
  };
  saveState();

  await refreshDepartmentData(service);
  renderCad(service);
  portalView.classList.add("hidden");
  departmentLogin.classList.add("hidden");
  cadView.classList.remove("hidden");
}

async function refreshDepartmentData(service) {
  try {
    const payload = await apiFetch(`/api/cad/erlc-state?service=${encodeURIComponent(service.id)}`);
    runtime.erlc = payload.state || runtime.erlc;
  } catch {
    runtime.erlc = getOfflineErlcState(service);
  }

  if (service.panel === "medical") {
    try {
      const payload = await apiFetch(`/api/cad/medical-records?channelId=${medicalForumChannelId}`);
      runtime.medicalRecords = payload.records || [];
    } catch {
      runtime.medicalRecords = [];
    }
  }
}

function getOfflineErlcState(service) {
  return {
    source: "offline",
    calls: [],
    units: [],
    warrants: [],
    mapUnits: [],
    message: `Aucun endpoint ERLC configure pour ${service.name}.`,
  };
}

function renderCad(service) {
  const operator = state.operators[service.id] || {};
  const displayName = getOperatorName(service, operator);
  cadServiceLabel.textContent = service.name;
  cadTitle.textContent = `CAD ${service.name}`;
  operatorLine.textContent = `${displayName} | ${operator.rank || "Grade non defini"} | ${operator.subdivision || "Subdivision non definie"}`;

  shiftBtn.disabled = !service.shiftEligible;
  shiftBtn.textContent = runtime.activeShiftStartedAt ? "Terminer shift" : "Debuter shift";
  shiftBtn.title = service.shiftEligible ? "Suivi de temps CAD" : "Shift reserve aux equipes police.";
  shiftSummaryBtn.classList.toggle("hidden", !isDirector());

  const calls = filterByDepartment(runtime.erlc.calls, service.callFilter);
  const units = filterByDepartment(runtime.erlc.units, service.unitFilter);
  const mapUnits = filterByDepartment(runtime.erlc.mapUnits.length ? runtime.erlc.mapUnits : runtime.erlc.units, service.unitFilter);

  const panels = [
    renderCallsPanel(service, calls),
    renderUnitsPanel(units),
    renderBottomLeftPanel(service),
    renderMapPanel(mapUnits, runtime.erlc.message),
  ];

  cadGrid.innerHTML = panels.join("");
}

function getOperatorName(service, operator) {
  const civilName = getCivilName() || state.session.displayName || state.session.username || "Operateur";
  return operator.unitNumber ? `${service.shortName}-${operator.unitNumber} | ${civilName}` : civilName;
}

function filterByDepartment(items, filters) {
  if (!Array.isArray(items)) return [];
  if (!filters || filters.includes("all")) return items;
  const lowered = filters.map((item) => item.toLowerCase());
  return items.filter((item) => {
    const text = `${item.department || ""} ${item.service || ""} ${item.team || ""} ${item.type || ""}`.toLowerCase();
    return lowered.some((filter) => text.includes(filter));
  });
}

function renderCallsPanel(service, calls) {
  const title = service.id === "mtq" ? "Appels ERLC DOT" : service.panel === "dispatcher" ? "Tous les appels ERLC" : "Appels ERLC";
  return `
    <article class="panel">
      <p class="eyebrow">${title}</p>
      <div class="list">
        ${calls.length ? calls.map(renderCall).join("") : emptyCard(runtime.erlc.message || "Aucun appel recu depuis ERLC.")}
      </div>
    </article>
  `;
}

function renderUnitsPanel(units) {
  return `
    <article class="panel">
      <p class="eyebrow">Unites actives</p>
      <div class="list">
        ${units.length ? units.map(renderUnit).join("") : emptyCard("Aucune unite active recue depuis ERLC.")}
      </div>
    </article>
  `;
}

function renderBottomLeftPanel(service) {
  if (service.panel === "law") {
    return `
      <article class="panel">
        <p class="eyebrow">Mandats</p>
        <div class="list">
          ${runtime.erlc.warrants.length ? runtime.erlc.warrants.map(renderWarrant).join("") : emptyCard("Aucun mandat importe pour le moment.")}
        </div>
      </article>
    `;
  }

  if (service.panel === "medical") {
    return `
      <article class="panel">
        <p class="eyebrow">Dossiers medicaux</p>
        <small>Import salon/forum: ${medicalForumChannelId}</small>
        <div class="list">
          ${runtime.medicalRecords.length ? runtime.medicalRecords.map(renderMedicalRecord).join("") : emptyCard("Aucun dossier medical importe du forum pour le moment.")}
        </div>
      </article>
    `;
  }

  if (service.panel === "dispatcher") {
    return `
      <article class="panel">
        <p class="eyebrow">Assignation</p>
        <form class="assign-form" id="assignForm">
          <input name="callNumber" placeholder="Numero de l'appel" required />
          <input name="unitNumber" placeholder="Matricule unite" required />
          <button class="btn primary" type="submit">Assigner</button>
        </form>
        <div class="list">
          ${runtime.assignments.length ? runtime.assignments.map(renderAssignment).join("") : emptyCard("Aucune assignation locale.")}
        </div>
      </article>
    `;
  }

  return `
    <article class="panel">
      <p class="eyebrow">Operations</p>
      <div class="list">
        ${emptyCard("Panneau pret pour les donnees du departement.")}
      </div>
    </article>
  `;
}

function renderMapPanel(units, message) {
  const pins = units.map((unit, index) => {
    const x = Number(unit.x ?? unit.lng ?? 18 + (index * 17) % 68);
    const y = Number(unit.y ?? unit.lat ?? 24 + (index * 23) % 58);
    const type = `${unit.department || unit.service || ""}`.toLowerCase();
    const cls = type.includes("ems") || type.includes("spall") ? "ems" : type.includes("fire") || type.includes("sivb") ? "fire" : "";
    return `<span class="unit-pin ${cls}" style="left:${Math.max(4, Math.min(92, x))}%; top:${Math.max(6, Math.min(88, y))}%"></span>`;
  }).join("");

  return `
    <article class="panel map-panel">
      <p class="eyebrow">Carte ERLC temps reel</p>
      <small>${message || "En attente du flux carte ERLC."}</small>
      ${pins}
    </article>
  `;
}

function renderCall(call) {
  return `
    <article class="row-card">
      <div class="row-top">
        <strong>${escapeHtml(call.number || call.id || "Appel")}</strong>
        <span class="badge red">${escapeHtml(call.priority || "ERLC")}</span>
      </div>
      <p>${escapeHtml(call.type || "Type inconnu")} | ${escapeHtml(call.location || "Position inconnue")}</p>
      <small>${escapeHtml(call.status || "Non assigne")}</small>
    </article>
  `;
}

function renderUnit(unit) {
  return `
    <article class="row-card">
      <div class="row-top">
        <strong>${escapeHtml(unit.callsign || unit.unit || unit.id || "Unite")}</strong>
        <span class="badge green">${escapeHtml(unit.status || "Actif")}</span>
      </div>
      <p>${escapeHtml(unit.department || unit.service || "Departement")} | ${escapeHtml(unit.location || "Position inconnue")}</p>
      <small>${escapeHtml(unit.player || unit.name || "")}</small>
    </article>
  `;
}

function renderWarrant(warrant) {
  return `
    <article class="row-card">
      <div class="row-top">
        <strong>${escapeHtml(warrant.subject || "Sujet inconnu")}</strong>
        <span class="badge yellow">${escapeHtml(warrant.status || "Actif")}</span>
      </div>
      <p>${escapeHtml(warrant.reason || "Aucune raison")}</p>
    </article>
  `;
}

function renderMedicalRecord(record) {
  return `
    <article class="row-card">
      <div class="row-top">
        <strong>${escapeHtml(record.title || "Dossier medical")}</strong>
        <span class="badge">${escapeHtml(record.status || "Forum")}</span>
      </div>
      <p>${escapeHtml(record.summary || "Import forum pret a connecter.")}</p>
    </article>
  `;
}

function renderAssignment(assignment) {
  return `
    <article class="row-card">
      <strong>Appel ${escapeHtml(assignment.callNumber)} -> ${escapeHtml(assignment.unitNumber)}</strong>
      <small>${new Date(assignment.createdAt).toLocaleString("fr-CA")}</small>
    </article>
  `;
}

function emptyCard(message) {
  return `<article class="row-card"><p>${escapeHtml(message)}</p></article>`;
}

function toggleShift() {
  const service = services.find((item) => item.id === state.activeServiceId);
  if (!service?.shiftEligible) {
    alert("Tu ne peux pas etre en shift si tu n'es pas dans une team police.");
    return;
  }

  const operator = state.operators[service.id] || {};
  if (!runtime.activeShiftStartedAt) {
    runtime.activeShiftStartedAt = Date.now();
    shiftBtn.textContent = "Terminer shift";
    return;
  }

  state.shifts.push({
    serviceId: service.id,
    serviceName: service.name,
    operator: getOperatorName(service, operator),
    userId: state.session.userId,
    startedAt: runtime.activeShiftStartedAt,
    endedAt: Date.now(),
  });
  runtime.activeShiftStartedAt = 0;
  saveState();
  shiftBtn.textContent = "Debuter shift";
}

function showShiftSummary() {
  if (!isDirector()) return;

  const rows = summarizeShifts().map((row) => `
    <tr>
      <td>${escapeHtml(row.operator)}</td>
      <td>${escapeHtml(row.service)}</td>
      <td>${formatDuration(row.ms)}</td>
    </tr>
  `).join("");

  cadGrid.innerHTML = `
    <article class="panel full">
      <p class="eyebrow">SHIFT - Sommaire de la semaine</p>
      <p>Le dimanche, ce panneau donne le temps passe en jeu dans le CAD pour les shifts sauvegardes localement.</p>
      <table>
        <thead><tr><th>Personne</th><th>Service</th><th>Temps</th></tr></thead>
        <tbody>${rows || `<tr><td>Aucun shift</td><td></td><td>0 min</td></tr>`}</tbody>
      </table>
    </article>
  `;
}

function summarizeShifts() {
  const weekStart = getWeekStart();
  const map = new Map();
  state.shifts
    .filter((shift) => shift.startedAt >= weekStart)
    .forEach((shift) => {
      const key = `${shift.operator}|${shift.serviceName}`;
      const current = map.get(key) || { operator: shift.operator, service: shift.serviceName, ms: 0 };
      current.ms += Math.max(0, shift.endedAt - shift.startedAt);
      map.set(key, current);
    });
  return [...map.values()].sort((a, b) => b.ms - a.ms);
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day);
  return start.getTime();
}

function formatDuration(ms) {
  const minutes = Math.round(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h ${rest} min` : `${rest} min`;
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  renderSession();
  renderCivilCard();
  renderServices();
}

civilForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.civilCard = {
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
  };
  saveState();
  renderCivilCard();
  notice.textContent = "Carte civile sauvegardee.";
});

erlcConfigForm.addEventListener("submit", saveErlcConfig);

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
  runtime.activeShiftStartedAt = 0;
  showPortal();
  notice.textContent = "Session deconnectee.";
  render();
});

serviceButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-service]");
  if (!button) return;
  showDepartmentLogin(button.dataset.service);
});

loginBackBtn.addEventListener("click", showPortal);

departmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await enterCad();
});

cadBackBtn.addEventListener("click", showPortal);
shiftBtn.addEventListener("click", toggleShift);
shiftSummaryBtn.addEventListener("click", showShiftSummary);

cadGrid.addEventListener("submit", (event) => {
  if (event.target.id !== "assignForm") return;
  event.preventDefault();
  const form = new FormData(event.target);
  runtime.assignments.unshift({
    callNumber: form.get("callNumber").trim(),
    unitNumber: form.get("unitNumber").trim(),
    createdAt: Date.now(),
  });
  const service = services.find((item) => item.id === state.activeServiceId);
  if (service) renderCad(service);
});

await loadConfig();
await loadErlcConfig();
await handleDiscordCallback();
render();
