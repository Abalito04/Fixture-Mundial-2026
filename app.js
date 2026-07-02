const teamColors = {
  Argentina: ["#75aadb", "#ffffff"],
  Mexico: ["#006847", "#ce1126"],
  Polonia: ["#dc143c", "#ffffff"],
  Arabia: ["#006c35", "#ffffff"],
  Brasil: ["#009b3a", "#ffdf00"],
  Serbia: ["#c6363c", "#0c4076"],
  Suiza: ["#d52b1e", "#ffffff"],
  Camerun: ["#007a5e", "#fcd116"],
  Espana: ["#aa151b", "#f1bf00"],
  Alemania: ["#000000", "#dd0000"],
  Japon: ["#bc002d", "#ffffff"],
  CostaRica: ["#002b7f", "#ce1126"]
};

const groupTeams = {
  "Grupo A": ["Mexico", "Sudafrica", "Corea del Sur", "Rep. Checa"],
  "Grupo B": ["Canada", "Bosnia y Herzegovina", "Qatar", "Suiza"],
  "Grupo C": ["Brasil", "Marruecos", "Haiti", "Escocia"],
  "Grupo D": ["Estados Unidos", "Paraguay", "Australia", "Turquia"],
  "Grupo E": ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
  "Grupo F": ["Paises Bajos", "Japon", "Suecia", "Tunez"],
  "Grupo G": ["Belgica", "Egipto", "Iran", "Nueva Zelanda"],
  "Grupo H": ["Espana", "Cabo Verde", "Arabia Saudita", "Uruguay"],
  "Grupo I": ["Francia", "Senegal", "Irak", "Noruega"],
  "Grupo J": ["Argentina", "Argelia", "Austria", "Jordania"],
  "Grupo K": ["Portugal", "RD Congo", "Uzbekistan", "Colombia"],
  "Grupo L": ["Inglaterra", "Croacia", "Ghana", "Panama"]
};

const worldCupGroups = Object.keys(groupTeams);
const storageKey = "worldCupFixtureV5";
const manualResultsKey = "roadTo26ManualResultsV1";
const apiCacheKey = "worldCupApiCacheV6";
const allTeams = worldCupGroups.flatMap((group) => groupTeams[group]);
const flagFallbacks = {
  Inglaterra: "https://flagcdn.com/w160/gb-eng.png",
  Escocia: "https://flagcdn.com/w160/gb-sct.png"
};
const fifaRankings = {
  Argentina: 1,
  Espana: 2,
  Francia: 3,
  Inglaterra: 4,
  Portugal: 5,
  Brasil: 6,
  Marruecos: 7,
  "Paises Bajos": 8,
  Belgica: 9,
  Alemania: 10,
  Croacia: 11,
  Colombia: 13,
  Mexico: 14,
  Senegal: 15,
  Uruguay: 16,
  "Estados Unidos": 17,
  Japon: 18,
  Suiza: 19,
  Iran: 20,
  Turquia: 22,
  Ecuador: 23,
  Austria: 24,
  "Corea del Sur": 25,
  Australia: 27,
  Argelia: 28,
  Egipto: 29,
  Canada: 30,
  Noruega: 31,
  "Costa de Marfil": 33,
  Panama: 34,
  Suecia: 38,
  "Rep. Checa": 40,
  Paraguay: 41,
  Escocia: 42,
  Tunez: 45,
  "RD Congo": 46,
  Uzbekistan: 50,
  Qatar: 56,
  Irak: 57,
  Sudafrica: 60,
  "Arabia Saudita": 61,
  Jordania: 63,
  "Bosnia y Herzegovina": 64,
  "Cabo Verde": 67,
  Ghana: 73,
  Curazao: 82,
  Haiti: 83,
  "Nueva Zelanda": 85
};
let apiStatus = "Sin sincronizar";
let openFootballStatus = "Fixture local";
let zafronixStatus = "Planteles sin sincronizar";
let apiTeams = [];
const cachedTeamProfiles = null;
let teamProfiles = cachedTeamProfiles || createTeamProfiles();
if (cachedTeamProfiles) {
  zafronixStatus = "Planteles guardados localmente";
}

const seedMatches = createGroupStageMatches();

let manualResults = loadManualResults();
let matches = applyManualResults(loadMatches());
let activeFilter = "Todos";
let activeView = "partidos";
let openMatchGroups = new Set(["Grupo A"]);
let openMatchStages = new Set([]);
let selectedTeam = allTeams[0];

const els = {
  navItems: document.querySelectorAll(".nav-item"),
  toolbar: document.querySelector(".toolbar"),
  filtersGroup: document.querySelector(".filter-group"),
  search: document.querySelector("#searchInput"),
  matchList: document.querySelector("#matchList"),
  matchCount: document.querySelector("#matchCount"),
  standings: document.querySelector("#standingsTable"),
  groupSelect: document.querySelector("#groupSelect"),
  knockout: document.querySelector("#knockoutPreview"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  dialog: document.querySelector("#matchDialog"),
  form: document.querySelector("#matchForm")
};

populateGroupControls();

document.querySelector("#openAddMatch")?.addEventListener("click", () => {
  els.form.date.valueAsDate = new Date("2026-06-14");
  els.form.time.value = "16:00";
  els.dialog.showModal();
});

document.querySelector("#closeDialog").addEventListener("click", () => els.dialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => els.dialog.close());

els.matchList.addEventListener("click", (event) => {
  const stageToggle = event.target.closest("[data-toggle-stage]");
  if (stageToggle) {
    const stage = stageToggle.dataset.toggleStage;
    if (openMatchStages.has(stage)) {
      openMatchStages.delete(stage);
    } else {
      openMatchStages.add(stage);
    }
    renderMatches();
    return;
  }

  const toggle = event.target.closest("[data-toggle-group]");
  if (!toggle) return;
  const group = toggle.dataset.toggleGroup;
  if (openMatchGroups.has(group)) {
    openMatchGroups.delete(group);
  } else {
    openMatchGroups.add(group);
  }
  renderMatches();
});

els.matchList.addEventListener("click", (event) => {
  const teamButton = event.target.closest("[data-team-detail]");
  if (!teamButton) return;
  selectedTeam = teamButton.dataset.teamDetail;
  renderTablesInfoView();
  document.querySelector(".team-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

els.matchList.addEventListener("click", async (event) => {
  const syncButton = event.target.closest("[data-sync-api]");
  if (!syncButton) return;
  await syncFifaApi();
});

els.matchList.addEventListener("input", (event) => {
  if (!event.target.matches("[data-score-home], [data-score-away]")) return;
  const card = event.target.closest(".match-card, .bracket-match");
  const penaltyEditor = card?.querySelector("[data-penalty-editor]");
  if (!penaltyEditor) return;

  const homeValue = card.querySelector("[data-score-home]")?.value ?? "";
  const awayValue = card.querySelector("[data-score-away]")?.value ?? "";
  const tied = homeValue !== "" && awayValue !== "" && Number(homeValue) === Number(awayValue);
  const locked = penaltyEditor.dataset.locked === "true";
  penaltyEditor.classList.toggle("hidden", !tied);
  penaltyEditor.querySelectorAll(".penalty-input").forEach((input) => {
    input.disabled = locked || !tied;
    if (!tied) input.value = "";
  });
});

els.matchList.addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save-result]");
  const clearButton = event.target.closest("[data-clear-result]");
  const actionButton = saveButton || clearButton;
  if (!actionButton) return;

  const matchId = Number(actionButton.dataset.saveResult || actionButton.dataset.clearResult);
  const match = matches.find((item) => item.id === matchId);
  if (!match) return;

  const resultKey = getManualResultKey(match);
  if (clearButton) {
    delete manualResults[resultKey];
    saveManualResults();
    matches = matches.map((item) => getManualResultKey(item) === resultKey
      ? { ...item, scoreHome: null, scoreAway: null, penaltiesHome: null, penaltiesAway: null, confirmed: false, manual: false }
      : item);
    render();
    return;
  }

  const card = actionButton.closest(".match-card, .bracket-match");
  const homeInput = card?.querySelector("[data-score-home]");
  const awayInput = card?.querySelector("[data-score-away]");
  const scoreHome = Number(homeInput?.value);
  const scoreAway = Number(awayInput?.value);
  const penaltiesHomeInput = card?.querySelector("[data-penalties-home]");
  const penaltiesAwayInput = card?.querySelector("[data-penalties-away]");
  const isKnockout = match.group === "Eliminatorias";

  if (!Number.isInteger(scoreHome) || !Number.isInteger(scoreAway) || scoreHome < 0 || scoreAway < 0) {
    return;
  }

  let penaltiesHome = null;
  let penaltiesAway = null;
  if (isKnockout && scoreHome === scoreAway) {
    penaltiesHome = Number(penaltiesHomeInput?.value);
    penaltiesAway = Number(penaltiesAwayInput?.value);
    if (!Number.isInteger(penaltiesHome) || !Number.isInteger(penaltiesAway)
      || penaltiesHome < 0 || penaltiesAway < 0 || penaltiesHome === penaltiesAway) {
      const status = card?.querySelector(".result-status, .bracket-result-status");
      if (status) status.textContent = "Carga una tanda de penales con ganador";
      return;
    }
  }

  manualResults[resultKey] = { scoreHome, scoreAway, penaltiesHome, penaltiesAway };
  saveManualResults();
  matches = matches.map((item) => getManualResultKey(item) === resultKey
    ? { ...item, scoreHome, scoreAway, penaltiesHome, penaltiesAway, confirmed: true, manual: true }
    : item);
  render();
});

els.navItems.forEach((item) => {
  item.addEventListener("click", () => {
    activeView = item.dataset.view;
    els.navItems.forEach((nav) => nav.classList.toggle("active", nav === item));
    document.querySelector("#fixtureTitle").textContent = titleForView(activeView);
    document.body.dataset.view = activeView;
    render();
  });
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach((filter) => filter.classList.toggle("active", filter === button));
    render();
  });
});

els.search.addEventListener("input", render);
els.groupSelect.addEventListener("change", render);

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.form);
  matches.push({
    id: Date.now(),
    group: data.get("group"),
    date: data.get("date"),
    time: data.get("time"),
    home: cleanTeam(data.get("home")),
    away: cleanTeam(data.get("away")),
    venue: data.get("venue"),
    scoreHome: null,
    scoreAway: null,
    confirmed: false
  });
  saveMatches();
  els.form.reset();
  els.dialog.close();
  render();
});

function loadMatches() {
  return seedMatches;
}

function saveMatches() {
  return null;
}

function loadManualResults() {
  try {
    return JSON.parse(localStorage.getItem(manualResultsKey) || "{}");
  } catch {
    return {};
  }
}

function saveManualResults() {
  localStorage.setItem(manualResultsKey, JSON.stringify(manualResults));
}

function applyManualResults(list) {
  return list.map((match) => {
    const saved = manualResults[getManualResultKey(match)];
    if (!saved) return match;
    return {
      ...match,
      scoreHome: saved.scoreHome,
      scoreAway: saved.scoreAway,
      penaltiesHome: saved.penaltiesHome ?? null,
      penaltiesAway: saved.penaltiesAway ?? null,
      confirmed: true,
      manual: true
    };
  });
}

function loadApiCache() {
  return null;
}

function saveApiCache() {
  return null;
}

function createGroupStageMatches() {
  const venues = ["Estadio Azteca", "BMO Field", "Los Angeles", "Arena Norte", "Estadio Central", "Ciudad Sur"];
  const times = ["13:00", "16:00", "19:00", "22:00"];
  const pairings = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]];
  let id = 1;

  return worldCupGroups.flatMap((group, groupIndex) => {
    const teams = groupTeams[group];
    return pairings.map(([homeIndex, awayIndex], matchIndex) => {
      const date = new Date(Date.UTC(2026, 5, 11 + groupIndex + Math.floor(matchIndex / 2) * 5));
      return {
        id: id++,
        group,
        date: date.toISOString().slice(0, 10),
        time: times[(groupIndex + matchIndex) % times.length],
        home: teams[homeIndex],
        away: teams[awayIndex],
        venue: venues[(groupIndex + matchIndex) % venues.length],
        scoreHome: null,
        scoreAway: null,
        confirmed: false
      };
    });
  });
}

async function syncOpenFootball() {
  openFootballStatus = "Sincronizando resultados...";
  renderMatches();

  try {
    const payload = await fetchFixturesPayload();
    matches = applyManualResults(normalizeFixturePayload(payload));
    saveMatches();
    openFootballStatus = `${fixtureSourceLabel(payload.__source)}: ${matches.length} partidos`;
  } catch (error) {
    openFootballStatus = error.message;
  }

  render();
}

async function fetchFixturesPayload() {
  return fetchJsonWithFallback("/api/openfootball/worldcup2026", "data/openfootball-worldcup2026.json");
}

function normalizeFixturePayload(payload) {
  if (hasApiFootballFixtures(payload)) {
    return payload.response.map((fixture, index) => normalizeApiFootballFixture(fixture, index + 1));
  }
  return (payload.matches || []).map((match, index) => normalizeOpenFootballMatch(match, index + 1));
}

function hasApiFootballFixtures(payload) {
  return Array.isArray(payload?.response) && payload.response.length > 0;
}

function fixtureSourceLabel(source) {
  const labels = {
    "api-football-live": "API-Football",
    "api-football-cache": "API-Football cache",
    "api-football-stale-cache": "API-Football cache anterior",
    "local-snapshot": "Fixture local",
    local: "Fixture local",
    api: "OpenFootball"
  };
  return labels[source] || "Resultados";
}

function normalizeOpenFootballMatch(match, id, previousByKey) {
  const group = translateGroup(match.group);
  const score = match.score?.ft || null;
  return {
    id,
    num: match.num || id,
    externalKey: `${match.date}|${match.team1}|${match.team2}|${match.round}`,
    round: translateRound(match.round),
    group,
    date: match.date,
    time: cleanOpenFootballTime(match.time),
    home: translateTeamName(match.team1),
    away: translateTeamName(match.team2),
    venue: match.ground || "Sede por confirmar",
    scoreHome: Array.isArray(score) ? score[0] : null,
    scoreAway: Array.isArray(score) ? score[1] : null,
    confirmed: Array.isArray(score)
  };
}

function normalizeApiFootballFixture(item, id) {
  const home = translateTeamName(item.teams?.home?.name || "Local");
  const away = translateTeamName(item.teams?.away?.name || "Visitante");
  const kickoff = item.fixture?.date ? new Date(item.fixture.date) : null;
  const scoreHome = item.goals?.home;
  const scoreAway = item.goals?.away;
  const statusShort = item.fixture?.status?.short || "";
  const statusLong = item.fixture?.status?.long || "";
  const round = translateApiFootballRound(item.league?.round || "");
  return {
    id: item.fixture?.id || id,
    num: item.fixture?.id || id,
    externalKey: String(item.fixture?.id || `${item.fixture?.date}|${home}|${away}`),
    round,
    group: getSharedGroup(home, away) || "Eliminatorias",
    date: kickoff && !Number.isNaN(kickoff.valueOf()) ? kickoff.toISOString().slice(0, 10) : "",
    time: formatArgentinaTime(kickoff),
    home,
    away,
    venue: [item.fixture?.venue?.name, item.fixture?.venue?.city].filter(Boolean).join(" · ") || "Sede por confirmar",
    scoreHome: scoreHome ?? null,
    scoreAway: scoreAway ?? null,
    confirmed: ["FT", "AET", "PEN"].includes(statusShort),
    live: ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"].includes(statusShort),
    minute: item.fixture?.status?.elapsed ? `${item.fixture.status.elapsed}'` : statusLong
  };
}

function translateApiFootballRound(round) {
  const value = String(round || "");
  if (/group/i.test(value)) return "";
  if (/round of 32/i.test(value)) return "Dieciseisavos";
  if (/round of 16/i.test(value)) return "Octavos";
  if (/quarter/i.test(value)) return "Cuartos";
  if (/semi/i.test(value)) return "Semifinal";
  if (/third/i.test(value)) return "Tercer puesto";
  if (/final/i.test(value)) return "Final";
  return value;
}

function getSharedGroup(home, away) {
  return worldCupGroups.find((group) => groupTeams[group].includes(home) && groupTeams[group].includes(away));
}

function formatArgentinaTime(date) {
  if (!date || Number.isNaN(date.valueOf())) return "Hora a confirmar";
  return `${new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(date)} ARG`;
}

function cleanOpenFootballTime(time) {
  const value = String(time || "").trim();
  const match = value.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/);
  if (!match) return value.replace(/\s*UTC.*$/, "");

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const sourceOffset = Number(match[3]);
  const argentinaOffset = -3;
  const convertedMinutes = (((hours - sourceOffset + argentinaOffset) * 60 + minutes) % 1440 + 1440) % 1440;
  const convertedHours = Math.floor(convertedMinutes / 60);
  const convertedMins = convertedMinutes % 60;
  return `${String(convertedHours).padStart(2, "0")}:${String(convertedMins).padStart(2, "0")} ARG`;
}

function translateGroup(group) {
  if (!group) return "Eliminatorias";
  return group.replace("Group", "Grupo");
}

function translateRound(round) {
  const labels = {
    "Round of 32": "Dieciseisavos",
    "Round of 16": "Octavos",
    "Quarter-final": "Cuartos",
    "Semi-final": "Semifinal",
    "Match for third place": "Tercer puesto",
    Final: "Final"
  };
  return labels[round] || round;
}

function translateTeamName(team) {
  const labels = {
    "South Africa": "Sudafrica",
    "South Korea": "Corea del Sur",
    "Korea Republic": "Corea del Sur",
    "Korea Rep.": "Corea del Sur",
    "Czech Republic": "Rep. Checa",
    Czechia: "Rep. Checa",
    "Bosnia & Herzegovina": "Bosnia y Herzegovina",
    "Bosnia and Herzegovina": "Bosnia y Herzegovina",
    Switzerland: "Suiza",
    Brazil: "Brasil",
    Morocco: "Marruecos",
    Scotland: "Escocia",
    "Scotland": "Escocia",
    USA: "Estados Unidos",
    "United States": "Estados Unidos",
    Turkey: "Turquia",
    "Türkiye": "Turquia",
    Turkiye: "Turquia",
    Germany: "Alemania",
    "Ivory Coast": "Costa de Marfil",
    "Côte d'Ivoire": "Costa de Marfil",
    "Curaçao": "Curazao",
    "CuraÃ§ao": "Curazao",
    Netherlands: "Paises Bajos",
    Japan: "Japon",
    Sweden: "Suecia",
    Tunisia: "Tunez",
    Belgium: "Belgica",
    Egypt: "Egipto",
    "IR Iran": "Iran",
    "Iran": "Iran",
    "New Zealand": "Nueva Zelanda",
    Spain: "Espana",
    "Cape Verde": "Cabo Verde",
    "Saudi Arabia": "Arabia Saudita",
    France: "Francia",
    Iraq: "Irak",
    Norway: "Noruega",
    Algeria: "Argelia",
    Jordan: "Jordania",
    Portugal: "Portugal",
    "DR Congo": "RD Congo",
    "Congo DR": "RD Congo",
    "Congo Democratic Republic": "RD Congo",
    Uzbekistan: "Uzbekistan",
    England: "Inglaterra",
    "England": "Inglaterra",
    Croatia: "Croacia"
  };
  return labels[team] || team;
}

function getMatchKey(match) {
  return `${match.date}|${match.home}|${match.away}|${match.round || ""}`;
}

function getManualResultKey(match) {
  return match.externalKey || getMatchKey(match);
}

function createTeamProfiles() {
  const positions = ["ARQ", "DEF", "DEF", "MED", "MED", "DEL"];
  return Object.fromEntries(allTeams.map((team, teamIndex) => [
    team,
    {
      coach: "DT por cargar",
      players: positions.map((position, index) => ({
        name: `${team} Jugador ${index + 1}`,
        position,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        number: index + 1 + (teamIndex % 3) * 10
      }))
    }
  ]));
}

async function syncFifaApi() {
  apiStatus = "Sincronizando...";
  renderTablesInfoView();

  try {
    const teamsResponse = await fetch("/api/fifa/teams?seasons[]=2026&per_page=100");
    const teamsPayload = await teamsResponse.json();
    if (!teamsResponse.ok) throw new Error(teamsPayload.error || "No se pudieron traer equipos.");

    apiTeams = teamsPayload.data || [];
    const profiles = {};

    for (const team of apiTeams) {
      const rosterResponse = await fetch(`/api/fifa/rosters?seasons[]=2026&team_ids[]=${team.id}&per_page=100`);
      const rosterPayload = await rosterResponse.json();
      const roster = rosterResponse.ok ? rosterPayload.data || [] : [];
      profiles[team.name] = {
        coach: "DT por cargar",
        apiId: team.id,
        abbreviation: team.abbreviation,
        players: roster.map((entry, index) => ({
          name: entry.player?.name || `Jugador ${index + 1}`,
          position: entry.position || entry.player?.position || "Por cargar",
          goals: entry.goals || 0,
          yellowCards: entry.yellow_cards || 0,
          redCards: entry.red_cards || 0,
          number: entry.player?.jersey_number || index + 1
        }))
      };
      if (!profiles[team.name].players.length) {
        profiles[team.name].players = createTeamProfiles()[allTeams[0]].players.map((player, index) => ({
          ...player,
          name: `${team.name} Jugador ${index + 1}`
        }));
      }
    }

    teamProfiles = { ...teamProfiles, ...profiles };
    selectedTeam = apiTeams[0]?.name || selectedTeam;
    saveApiCache();
    apiStatus = `Sincronizado: ${apiTeams.length} selecciones`;
  } catch (error) {
    apiStatus = error.message;
  }

  renderTablesInfoView();
}

async function syncZafronix() {
  zafronixStatus = "Sincronizando Zafronix...";
  render();

  try {
    const payload = await fetchTeamProfilesPayload();
    const source = payload.__source;

    const profiles = {};
    (payload.teams || []).forEach((team) => {
      const localName = translateTeamName(team.name);
      profiles[localName] = {
        coach: team.coach?.name || "DT por cargar",
        source: "Zafronix",
        squadKind: team.squadKind || "squad",
        flagUrl: resolveFlagUrl(localName, team.flag?.flagUrl),
        players: (team.squad || []).map((player, index) => ({
          name: player.name || `Jugador ${index + 1}`,
          position: translatePosition(player.position),
          goals: player.goals || 0,
          yellowCards: player.yellowCards || player.yellow_cards || 0,
          redCards: player.redCards || player.red_cards || 0,
          number: player.jersey || index + 1,
          club: formatClub(player.club)
        }))
      };
    });

    if (!Object.keys(profiles).length) {
      throw new Error("No se encontraron planteles en la fuente de equipos.");
    }

    teamProfiles = { ...teamProfiles, ...profiles };
    saveApiCache();
    const sourceLabel = source === "zafronix-live" ? "API" : "local";
    zafronixStatus = `Zafronix ${sourceLabel}: ${Object.keys(profiles).length} planteles`;
  } catch (error) {
    zafronixStatus = error.message;
  }

  render();
}

async function fetchTeamProfilesPayload() {
  const payload = await fetchJsonWithFallback("/api/zafronix/tournament2026", "data/zafronix-tournament2026.json");
  if (Array.isArray(payload.teams) && payload.teams.length) return payload;
  return fetchLocalJson("data/zafronix-tournament2026.json");
}

async function fetchJsonWithFallback(primaryUrl, fallbackUrl) {
  try {
    const response = await fetch(primaryUrl);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "No se pudo traer datos.");
    return { ...payload, __source: response.headers.get("X-Data-Source") || "api" };
  } catch (primaryError) {
    if (!fallbackUrl) throw primaryError;
    const fallbackResponse = await fetch(fallbackUrl);
    const payload = await fallbackResponse.json();
    if (!fallbackResponse.ok) throw primaryError;
    return { ...payload, __source: "local" };
  }
}

async function fetchLocalJson(url) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(`No se pudo cargar ${url}.`);
  return { ...payload, __source: "local" };
}

function translatePosition(position) {
  const labels = { GK: "ARQ", DF: "DEF", MF: "MED", FW: "DEL" };
  return labels[position] || position || "Por cargar";
}

function formatClub(club) {
  if (!club) return "";
  if (typeof club === "string") return club;
  return [club.name, club.country].filter(Boolean).join(" · ");
}

function resolveFlagUrl(team, flagUrl) {
  if (!flagUrl || flagUrl.includes("unknown.svg")) {
    return flagFallbacks[team] || "";
  }
  return flagUrl;
}

function populateGroupControls() {
  els.filtersGroup.innerHTML = ["Todos", "Hoy", ...worldCupGroups]
    .map((filter) => `<button class="filter ${filter === "Todos" ? "active" : ""}" data-filter="${filter}" type="button">${filter}</button>`)
    .join("");

  const groupOptions = worldCupGroups.map((group) => `<option>${group}</option>`).join("");
  els.groupSelect.innerHTML = groupOptions;
  els.form.elements.group.innerHTML = groupOptions;
}

function cleanTeam(value) {
  return String(value).trim().replace(/\s+/g, " ");
}

function titleForView(view) {
  return {
    partidos: "Partidos",
    grupos: "Grupos",
    tabla: "Informacion de equipos",
    eliminatorias: "Llaves finales"
  }[view];
}

function updateToolbar() {
  const placeholders = {
    partidos: "Buscar seleccion, sede o partido",
    grupos: "Buscar grupo o seleccion",
    tabla: "Buscar seleccion",
    eliminatorias: ""
  };
  els.search.placeholder = placeholders[activeView] || "Buscar seleccion";
  els.toolbar.setAttribute("aria-label", activeView === "partidos" ? "Filtros de partidos" : "Busqueda");
}

function filteredMatches() {
  const query = els.search.value.trim().toLowerCase();
  const today = getTodayIsoDate();
  return matches
    .filter((match) => {
      const byFilter =
        activeFilter === "Todos" ||
        (activeFilter === "Hoy" && match.date === today) ||
        match.group === activeFilter;
      const bySearch = !query || `${match.home} ${match.away} ${match.venue}`.toLowerCase().includes(query);
      const byView = activeView === "partidos" || activeView === "tabla" || activeView === "eliminatorias" ? true : match.group;
      return byFilter && bySearch && byView;
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function getTodayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function renderMatches() {
  if (activeView === "grupos") {
    renderGroupsView();
    return;
  }

  if (activeView === "tabla") {
    renderTablesInfoView();
    return;
  }

  if (activeView === "eliminatorias") {
    renderKnockoutFullView();
    return;
  }

  const knockoutResolver = createKnockoutResolver(matches.filter((match) => match.group === "Eliminatorias"));
  const list = filteredMatches().map((match) => match.group === "Eliminatorias"
    ? {
        ...match,
        home: knockoutResolver.resolve(match.home),
        away: knockoutResolver.resolve(match.away)
      }
    : match);
  els.matchCount.textContent = `${list.length} ${list.length === 1 ? "partido" : "partidos"}`;
  if (!list.length) {
    const emptyText = activeFilter === "Hoy" ? "No hay partidos programados para hoy." : "No hay partidos para ese filtro.";
    els.matchList.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  const groups = groupBy(list, (match) => match.group);
  const groupSections = worldCupGroups
    .filter((group) => groups[group]?.length)
    .map((group) => renderMatchSection(group, groups[group]))
    .join("");

  const knockoutMatches = groups.Eliminatorias || [];
  const groupMatchCount = worldCupGroups.reduce((total, group) => total + (groups[group]?.length || 0), 0);
  const groupStageSection = renderStageSection("Fase de grupos", `${groupMatchCount} partidos`, groupSections);
  const knockoutSection = knockoutMatches.length
    ? renderStageSection("Llaves finales", `${knockoutMatches.length} cruces`, renderMatchSection("Llaves finales", knockoutMatches))
    : "";
  els.matchList.innerHTML = `
    <div class="sync-strip">
      <span>${openFootballStatus}</span>
    </div>
    ${groupStageSection}
    ${knockoutSection}
  `;
}

function renderStageSection(label, summary, content) {
  const isOpen = openMatchStages.has(label);
  return `
    <section class="match-stage ${isOpen ? "open" : ""}">
      <button class="match-stage-toggle" data-toggle-stage="${label}" type="button" aria-expanded="${isOpen}">
        <span>${label}</span>
        <strong>${summary}</strong>
        <em>${isOpen ? "Minimizar" : "Ver"}</em>
      </button>
      <div class="match-stage-body">
        ${isOpen ? content : ""}
      </div>
    </section>
  `;
}

function renderMatchSection(label, sectionMatches) {
  const isOpen = openMatchGroups.has(label);
  const orderedMatches = sectionMatches.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const confirmed = orderedMatches.filter((match) => match.confirmed).length;
  const groupCountries = groupTeams[label] || [];
  return `
    <div class="match-group ${isOpen ? "open" : ""}">
      <button class="match-group-toggle" data-toggle-group="${label}" type="button" aria-expanded="${isOpen}">
        <span class="match-group-title">${label}</span>
        <span class="match-group-teams">${groupCountries.map((team) => `<span class="mini-team">${teamSwatch(team)}<span>${team}</span></span>`).join("")}</span>
        <span class="match-group-summary">${orderedMatches.length} partidos · ${confirmed} jugados</span>
        <strong>${isOpen ? "Minimizar" : "Ver partidos"}</strong>
      </button>
      <div class="match-group-body">
        ${isOpen ? orderedMatches.map(renderMatchCard).join("") : ""}
      </div>
    </div>
  `;
}

function renderGroupsView() {
  const query = els.search.value.trim().toLowerCase();
  const groupsToShow = worldCupGroups.filter((group) => {
    const teams = groupTeams[group].join(" ").toLowerCase();
    const bySearch = !query || group.toLowerCase().includes(query) || teams.includes(query);
    return bySearch;
  });

  els.matchCount.textContent = `${groupsToShow.length} ${groupsToShow.length === 1 ? "grupo" : "grupos"}`;
  if (!groupsToShow.length) {
    els.matchList.innerHTML = `<div class="empty-state">No hay grupos para esa busqueda.</div>`;
    return;
  }

  els.matchList.innerHTML = `
    <div class="groups-grid">
      ${groupsToShow.map(renderGroupCard).join("")}
    </div>
  `;
}

function renderGroupCard(group) {
  const rows = computeStandings(group);
  return `
    <article class="group-card">
      <div class="group-card-head">
        <h3>${group}</h3>
      </div>
      <div class="group-team-list">
        ${rows.map((row, index) => `
          <div class="group-team-row">
            <span class="rank">${index + 1}</span>
            <span class="table-team">${teamSwatch(row.team)}<span>${row.team}</span></span>
            <strong>${row.points}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

function renderTablesInfoView() {
  const query = els.search.value.trim().toLowerCase();
  const groupsToShow = worldCupGroups.filter((group) => {
    const teams = groupTeams[group].join(" ").toLowerCase();
    const bySearch = !query || group.toLowerCase().includes(query) || teams.includes(query);
    return bySearch;
  });

  const localTeams = groupsToShow.flatMap((group) => groupTeams[group]);
  const syncedTeams = apiTeams.map((team) => team.name).filter((team) => !localTeams.includes(team));
  const visibleTeams = [...localTeams, ...syncedTeams].filter((team) => !query || team.toLowerCase().includes(query) || localTeams.includes(team));
  if (!visibleTeams.includes(selectedTeam)) {
    selectedTeam = visibleTeams[0] || allTeams[0];
  }

  els.matchCount.textContent = `${visibleTeams.length} ${visibleTeams.length === 1 ? "seleccion" : "selecciones"}`;
  els.matchList.innerHTML = `
    <div class="tables-info">
      <section class="team-groups-panel">
        <div class="section-heading compact">
          <h3>Resumen grupal</h3>
          <div class="api-actions">
            <span>${zafronixStatus}</span>
            <span>${openFootballStatus}</span>
          </div>
        </div>
        <div class="team-group-grid">
          ${groupsToShow.map(renderTeamStatsGroup).join("")}
          ${syncedTeams.length ? renderSyncedTeamStatsGroup(syncedTeams) : ""}
        </div>
      </section>
      ${renderTeamDetail(selectedTeam)}
    </div>
  `;
}

function renderSyncedTeamStatsGroup(teams) {
  return `
    <article class="team-stats-group">
      <div class="team-stats-head">
        <h3>API</h3>
        <span>${teams.length} equipos</span>
      </div>
      ${teams.map((team) => renderTeamStatButton(team, createEmptyTeamRow(team), true)).join("")}
    </article>
  `;
}

function renderTeamStatsGroup(group) {
  const rows = computeStandings(group);
  return `
    <article class="team-stats-group">
      <div class="team-stats-head">
        <h3>${group}</h3>
        <span>${rows.length} equipos</span>
      </div>
      ${rows.map((row) => {
        return renderTeamStatButton(row.team, row, false);
      }).join("")}
    </article>
  `;
}

function renderTeamStatButton(team, row, isSyncedOnly) {
  const profile = teamProfiles[team] || createTeamProfiles()[allTeams[0]];
  const cards = getTeamCards(profile);
  const goalsPerMatch = row.played ? (row.goalsFor / row.played).toFixed(2) : "0.00";
  return `
    <button class="team-stat-row ${team === selectedTeam ? "selected" : ""}" data-team-detail="${team}" type="button">
      <span class="table-team">${teamSwatch(team)}<span>${team}</span></span>
      <span>${isSyncedOnly ? "API" : `${row.points} pts`}</span>
      <span>${goalsPerMatch} G/P</span>
      <span>${cards.yellowCards} A</span>
      <span>${cards.redCards} R</span>
    </button>
  `;
}

function renderTeamDetail(team) {
  const profile = teamProfiles[team] || createTeamProfiles()[allTeams[0]];
  const group = getTeamGroup(team);
  const stats = computeStandings(group).find((row) => row.team === team) || createEmptyTeamRow(team);
  const cards = getTeamCards(profile);
  const goalsPerMatch = stats.played ? (stats.goalsFor / stats.played).toFixed(2) : "0.00";

  return `
    <section class="team-detail-panel">
      <div class="team-detail-head">
      <div>
        <span class="group-tag">${group}</span>
        <h3>${team}</h3>
        <p>${profile.coach}${profile.source ? ` · ${profile.source}` : ""}</p>
      </div>
        ${teamSwatch(team)}
      </div>
      <div class="metric-grid">
        <div><span>Puntos</span><strong>${stats.points}</strong></div>
        <div><span>Goles por partido</span><strong>${goalsPerMatch}</strong></div>
        <div><span>Amarillas</span><strong>${cards.yellowCards}</strong></div>
        <div><span>Rojas</span><strong>${cards.redCards}</strong></div>
      </div>
      <div class="player-block">
        <div class="section-heading compact">
          <h3>Jugadores</h3>
          <span>Club · Goles · Amarillas · Rojas</span>
        </div>
        <div class="player-table">
          <div class="player-row header"><span>Jugador</span><span>Pos</span><span>Club</span><span>G</span><span>A</span><span>R</span></div>
          ${profile.players.map((player) => `
            <div class="player-row">
              <span><strong>${player.number}</strong> ${player.name}</span>
              <span>${player.position}</span>
              <span>${player.club || "-"}</span>
              <span>${player.goals}</span>
              <span>${player.yellowCards}</span>
              <span>${player.redCards}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMatchCard(match) {
  const statusText = match.live
    ? `En vivo${match.minute ? ` · ${match.minute}` : ""}`
    : match.manual
      ? "Manual"
      : match.confirmed ? "Confirmado" : "Pendiente";
  const scoreHome = match.scoreHome ?? "";
  const scoreAway = match.scoreAway ?? "";
  const isKnockout = match.group === "Eliminatorias";
  return `
    <article class="match-card">
      <div class="match-meta">
        <span class="group-tag">${match.round || match.group}</span>
        <div>${match.time}</div>
        <div>${formatDate(match.date)}</div>
        <div>${match.venue}</div>
      </div>
      <div class="teams">
        ${teamLine(match.home, match.scoreHome)}
        ${teamLine(match.away, match.scoreAway)}
      </div>
      <div class="score-control result-editor" aria-label="Resultado">
        <input class="score-input" data-score-home type="number" min="0" inputmode="numeric" value="${scoreHome}" aria-label="Goles de ${match.home}" />
        <span class="score-separator">-</span>
        <input class="score-input" data-score-away type="number" min="0" inputmode="numeric" value="${scoreAway}" aria-label="Goles de ${match.away}" />
        ${isKnockout ? renderPenaltyEditor(match, match.home, match.away) : ""}
        <div class="result-actions">
          <button class="result-button accept" type="button" data-save-result="${match.id}">Guardar</button>
          <button class="result-button cancel" type="button" data-clear-result="${match.id}">Quitar</button>
        </div>
        <span class="result-status ${match.confirmed ? "confirmed" : ""} ${match.live ? "live" : ""} ${match.manual ? "manual" : ""}">${statusText}</span>
      </div>
    </article>
  `;
}

function renderPenaltyEditor(match, home, away, disabledAttribute = "") {
  const hasScore = match.scoreHome !== null && match.scoreHome !== undefined
    && match.scoreAway !== null && match.scoreAway !== undefined;
  const tied = hasScore && Number(match.scoreHome) === Number(match.scoreAway);
  const locked = Boolean(disabledAttribute);
  const penaltyDisabled = locked || !tied ? "disabled" : "";
  return `
    <div class="penalty-editor ${tied ? "" : "hidden"}" data-penalty-editor data-locked="${locked}">
      <span>Penales</span>
      <input class="penalty-input" data-penalties-home type="number" min="0" inputmode="numeric" value="${match.penaltiesHome ?? ""}" aria-label="Penales de ${home}" ${penaltyDisabled} />
      <span>-</span>
      <input class="penalty-input" data-penalties-away type="number" min="0" inputmode="numeric" value="${match.penaltiesAway ?? ""}" aria-label="Penales de ${away}" ${penaltyDisabled} />
    </div>
  `;
}

function teamLine(team, score) {
  const result = score === null ? "-" : score;
  return `
    <div class="team-row">
      ${teamSwatch(team)}
      <span>${team}</span>
      <span class="score">${result}</span>
    </div>
  `;
}

function teamSwatch(team) {
  const flagUrl = teamProfiles[team]?.flagUrl;
  if (flagUrl) {
    return `<img class="flag-img" src="${flagUrl}" alt="Bandera de ${team}" loading="lazy" />`;
  }
  const colors = teamColors[team.replace(/\s/g, "")] || teamColors[team] || ["#1e9a5a", "#ffffff"];
  return `<span class="swatch" style="background: linear-gradient(135deg, ${colors[0]} 0 50%, ${colors[1]} 50% 100%)"></span>`;
}

function renderKnockoutFullView() {
  const knockoutMatches = matches
    .filter((match) => match.group === "Eliminatorias")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const roundMatches = {
    round32: knockoutMatches.filter((match) => match.round === "Dieciseisavos"),
    round16: knockoutMatches.filter((match) => match.round === "Octavos"),
    quarterfinals: knockoutMatches.filter((match) => match.round === "Cuartos"),
    semifinals: knockoutMatches.filter((match) => match.round === "Semifinal")
  };
  const thirdPlace = knockoutMatches.filter((match) => match.round === "Tercer puesto");
  const finalMatches = knockoutMatches.filter((match) => match.round === "Final");
  const bracketResolver = createKnockoutResolver(knockoutMatches);
  const guaranteedThirds = getGuaranteedQualifiedThirds();

  els.matchCount.textContent = `${knockoutMatches.length} ${knockoutMatches.length === 1 ? "cruce" : "cruces"}`;
  els.matchList.innerHTML = `
    <div class="bracket-board">
      <div class="bracket-toolbar">
        <div>
          <h3>Llaves eliminatorias</h3>
          <span>Clasifican los dos primeros de cada grupo y los mejores terceros.</span>
        </div>
      </div>
      ${guaranteedThirds.length ? `
        <div class="qualified-thirds">
          <strong><span class="qualified-label-wide">Mejores terceros asegurados</span><span class="qualified-label-mobile">Terceros</span></strong>
          <div class="qualified-thirds-list">
            ${guaranteedThirds.map((row) => `
              <span class="qualified-third">${teamSwatch(row.team)} ${row.team} <small>Grupo ${row.groupLetter}</small></span>
            `).join("")}
          </div>
        </div>
      ` : ""}
      <div class="bracket-scroll">
        <div class="bracket-grid bracket-tree">
          ${renderBracketSide(roundMatches, bracketResolver, "left")}
          ${renderFinalBracketColumn(finalMatches, thirdPlace, bracketResolver)}
          ${renderBracketSide(roundMatches, bracketResolver, "right")}
        </div>
      </div>
    </div>
  `;
}

function renderBracketSide(roundMatches, bracketResolver, side) {
  const matchOrder = side === "left"
    ? {
        round32: [74, 77, 73, 75, 83, 84, 81, 82],
        round16: [89, 90, 93, 94],
        quarterfinals: [97, 98],
        semifinals: [101]
      }
    : {
        round32: [76, 78, 79, 80, 86, 88, 85, 87],
        round16: [91, 92, 95, 96],
        quarterfinals: [99, 100],
        semifinals: [102]
      };
  const orderMatches = (items, numbers) => numbers
    .map((number) => items.find((match) => Number(match.num || match.id) === number))
    .filter(Boolean);
  const rounds = [
    ["16vos", orderMatches(roundMatches.round32, matchOrder.round32)],
    ["8vos", orderMatches(roundMatches.round16, matchOrder.round16)],
    ["4tos", orderMatches(roundMatches.quarterfinals, matchOrder.quarterfinals)],
    ["Semis", orderMatches(roundMatches.semifinals, matchOrder.semifinals)]
  ];
  if (side === "right") rounds.reverse();

  return `
    <div class="bracket-branch bracket-branch-${side}">
      ${rounds.map(([label, games]) => renderBracketTreeRound(label, games, bracketResolver, side)).join("")}
    </div>
  `;
}

function renderBracketTreeRound(label, roundMatches, bracketResolver, side) {
  const roundClass = {
    "16vos": "bracket-round-32",
    "8vos": "bracket-round-16",
    "4tos": "bracket-round-quarter",
    Semis: "bracket-round-semi"
  }[label] || "";
  return `
    <section class="bracket-round bracket-tree-round bracket-tree-round-${side} ${roundClass}" style="--match-count: ${Math.max(roundMatches.length, 1)}">
      <div class="bracket-round-head"><h3>${label}</h3></div>
      <div class="bracket-match-list">
        ${roundMatches.map((match, index) => `
          <div class="bracket-slot ${index % 2 === 0 ? "pair-start" : "pair-end"}">
            ${renderBracketMatch(match, bracketResolver)}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderFinalBracketColumn(finalMatches, thirdPlaceMatches, bracketResolver) {
  return `
    <section class="final-stack bracket-center">
      ${renderBracketRound("Final", finalMatches, bracketResolver)}
      ${thirdPlaceMatches.length ? renderBracketRound("Tercer puesto", thirdPlaceMatches, bracketResolver) : ""}
    </section>
  `;
}

function renderBracketRound(label, roundMatches, bracketResolver) {
  return `
    <section class="bracket-round">
      <div class="bracket-round-head">
        <h3>${label}</h3>
        <span>${roundMatches.length} ${roundMatches.length === 1 ? "partido" : "partidos"}</span>
      </div>
      <div class="bracket-match-list">
        ${roundMatches.map((match) => renderBracketMatch(match, bracketResolver)).join("")}
      </div>
    </section>
  `;
}

function renderBracketMatch(match, bracketResolver) {
  const home = bracketResolver.resolve(match.home);
  const away = bracketResolver.resolve(match.away);
  const homePending = home === match.home && isKnockoutPlaceholder(match.home);
  const awayPending = away === match.away && isKnockoutPlaceholder(match.away);
  const resultDisabled = homePending || awayPending;
  const disabledAttribute = resultDisabled ? "disabled" : "";
  return `
    <article class="bracket-match">
      <div class="bracket-match-meta">
        <span>${formatBracketDate(match.date)}</span>
        <strong>${match.time || "Hora a confirmar"}</strong>
      </div>
      <div class="bracket-team">
        ${renderBracketTeam(match.home, bracketResolver)}
        <input class="bracket-score bracket-score-input" data-score-home type="number" min="0" inputmode="numeric" value="${match.scoreHome ?? ""}" aria-label="Goles de ${home}" ${disabledAttribute} />
      </div>
      <div class="bracket-team">
        ${renderBracketTeam(match.away, bracketResolver)}
        <input class="bracket-score bracket-score-input" data-score-away type="number" min="0" inputmode="numeric" value="${match.scoreAway ?? ""}" aria-label="Goles de ${away}" ${disabledAttribute} />
      </div>
      ${renderPenaltyEditor(match, home, away, disabledAttribute)}
      <div class="bracket-result-actions">
        <button class="result-button accept" type="button" data-save-result="${match.id}" ${disabledAttribute}>Guardar</button>
        <button class="result-button cancel" type="button" data-clear-result="${match.id}" ${disabledAttribute}>Quitar</button>
      </div>
      <span class="bracket-result-status" aria-live="polite"></span>
      <div class="bracket-venue">${match.venue}</div>
    </article>
  `;
}

function isKnockoutPlaceholder(team) {
  return /^[123][A-L](\/|$)|^W\d+|^L\d+/.test(team);
}

function renderBracketTeam(team, bracketResolver) {
  const resolvedTeam = bracketResolver?.resolve(team) || team;
  const isPlaceholder = isKnockoutPlaceholder(team);
  const resolved = resolvedTeam !== team;
  return `
    <span class="bracket-team-name ${isPlaceholder && !resolved ? "placeholder" : ""}">
      ${resolved ? teamSwatch(resolvedTeam) : isPlaceholder ? `<span class="seed-chip">${team}</span>` : teamSwatch(team)}
      <span>${resolved ? resolvedTeam : describeSeed(team)}</span>
    </span>
  `;
}

function createKnockoutResolver(knockoutMatches) {
  const seedMap = createGroupSeedMap();
  const matchesByNumber = new Map(knockoutMatches.map((match) => [String(match.num || match.id), match]));
  const qualifiedThirdMap = createQualifiedThirdMap();
  const resolving = new Set();

  function resolve(seed) {
    if (seedMap.has(seed)) return seedMap.get(seed);

    const thirdSeed = seed.match(/^3([A-L](?:\/[A-L])+?)$/);
    if (thirdSeed) {
      return resolveBestThird(seed, thirdSeed[1].split("/"));
    }

    const matchSeed = seed.match(/^([WL])(\d+)$/);
    if (matchSeed) {
      return resolveMatchSeed(matchSeed[1], matchSeed[2]);
    }

    return seed;
  }

  function resolveBestThird(seed, allowedLetters) {
    const winnerGroup = getWinnerGroupForThirdSeed(allowedLetters);
    const selected = winnerGroup ? qualifiedThirdMap.get(winnerGroup) : null;
    return selected?.team || seed;
  }

  function resolveMatchSeed(kind, number) {
    const key = `${kind}${number}`;
    if (resolving.has(key)) return key;
    const match = matchesByNumber.get(number);
    if (!match || !match.confirmed || match.scoreHome === null || match.scoreAway === null) {
      return key;
    }

    const tied = match.scoreHome === match.scoreAway;
    if (tied && (match.penaltiesHome === null || match.penaltiesAway === null || match.penaltiesHome === match.penaltiesAway)) return key;

    resolving.add(key);
    const home = resolve(match.home);
    const away = resolve(match.away);
    resolving.delete(key);

    const homeWon = tied ? match.penaltiesHome > match.penaltiesAway : match.scoreHome > match.scoreAway;
    if (kind === "W") return homeWon ? home : away;
    return homeWon ? away : home;
  }

  return { resolve };
}

function createQualifiedThirdMap() {
  const qualifiedThirds = getQualifiedThirds();
  if (qualifiedThirds.length !== 8) return new Map();

  const combinationKey = qualifiedThirds
    .map((row) => row.groupLetter)
    .sort()
    .join("");
  const assignments = window.thirdPlaceCombinations?.[combinationKey];
  if (!assignments) return new Map();

  const thirdsByGroup = new Map(qualifiedThirds.map((row) => [row.groupLetter, row]));
  return new Map(Object.entries(assignments).map(([winnerGroup, thirdGroup]) => (
    [winnerGroup, thirdsByGroup.get(thirdGroup)]
  )));
}

function getWinnerGroupForThirdSeed(allowedLetters) {
  const seedKey = [...allowedLetters].sort().join("");
  return {
    ABCDF: "E",
    CDFGH: "I",
    CEFHI: "A",
    EHIJK: "L",
    BEFIJ: "D",
    AEHIJ: "G",
    EFGIJ: "B",
    DEIJL: "K"
  }[seedKey];
}

function createGroupSeedMap() {
  const seeds = new Map();
  worldCupGroups.forEach((group) => {
    const letter = getGroupLetter(group);
    const rows = computeStandings(group);
    if (isGroupComplete(group)) {
      rows.slice(0, 3).forEach((row, index) => {
        seeds.set(`${index + 1}${letter}`, row.team);
      });
      return;
    }

    getLockedGroupSeeds(group, rows).forEach((row, position) => {
      seeds.set(`${position}${letter}`, row.team);
    });
  });
  return seeds;
}

function getLockedGroupSeeds(group, rows) {
  const locked = new Map();
  const first = rows[0];
  const second = rows[1];
  if (!first || !second) return locked;

  if (isLockedFirst(first, rows, group)) {
    locked.set(1, first);
  }
  if (isLockedSecond(first, second, rows, group)) {
    locked.set(2, second);
  }
  return locked;
}

function isLockedFirst(candidate, rows, group) {
  return rows
    .filter((row) => row.team !== candidate.team)
    .every((row) => !canFinishAbove(row, candidate, group));
}

function isLockedSecond(first, candidate, rows, group) {
  if (!isGuaranteedAbove(first, candidate, group)) return false;
  return rows
    .filter((row) => row.team !== first.team && row.team !== candidate.team)
    .every((row) => !canFinishAbove(row, candidate, group));
}

function canFinishAbove(chaser, target, group) {
  const maxPoints = getMaxPossiblePoints(chaser, group);
  if (maxPoints > target.points) return true;
  if (maxPoints < target.points) return false;
  return !hasHeadToHeadAdvantage(target.team, chaser.team, group);
}

function isGuaranteedAbove(leader, target, group) {
  const targetMaxPoints = getMaxPossiblePoints(target, group);
  if (leader.points > targetMaxPoints) return true;
  if (leader.points < targetMaxPoints) return false;
  return hasHeadToHeadAdvantage(leader.team, target.team, group);
}

function getMaxPossiblePoints(row, group) {
  const remainingMatches = matches.filter((match) => (
    match.group === group
    && (match.home === row.team || match.away === row.team)
    && (!match.confirmed || match.scoreHome === null || match.scoreAway === null)
  ));
  return row.points + remainingMatches.length * 3;
}

function hasHeadToHeadAdvantage(team, opponent, group) {
  const directMatch = matches.find((match) => (
    match.group === group
    && match.confirmed
    && match.scoreHome !== null
    && match.scoreAway !== null
    && ((match.home === team && match.away === opponent) || (match.home === opponent && match.away === team))
  ));
  if (!directMatch || directMatch.scoreHome === directMatch.scoreAway) return false;
  return directMatch.home === team
    ? directMatch.scoreHome > directMatch.scoreAway
    : directMatch.scoreAway > directMatch.scoreHome;
}

function getQualifiedThirds() {
  if (!isGroupStageComplete()) return [];
  return worldCupGroups
    .map((group) => ({
      ...computeStandings(group)[2],
      group,
      groupLetter: getGroupLetter(group)
    }))
    .filter((row) => row.team && row.played > 0)
    .sort(compareTotalStandingsRows)
    .slice(0, 8);
}

function getGuaranteedQualifiedThirds() {
  const completedThirds = worldCupGroups
    .filter(isGroupComplete)
    .map((group) => ({
      ...computeStandings(group)[2],
      group,
      groupLetter: getGroupLetter(group)
    }))
    .filter((row) => row.team);

  return completedThirds
    .filter((candidate) => {
      const possibleTeamsAbove = worldCupGroups
        .filter((group) => group !== candidate.group)
        .filter((group) => {
          if (!isGroupComplete(group)) {
            return getMaxPossibleThirdPoints(group) >= candidate.points;
          }
          const third = computeStandings(group)[2];
          return third && compareTotalStandingsRows(third, candidate) < 0;
        }).length;
      return possibleTeamsAbove < 8;
    })
    .sort(compareTotalStandingsRows);
}

function getMaxPossibleThirdPoints(group) {
  const teams = groupTeams[group] || [];
  const currentRows = computeStandings(group);
  const initialPoints = new Map(currentRows.map((row) => [row.team, row.points]));
  const remainingMatches = matches.filter((match) => (
    match.group === group
    && (!match.confirmed || match.scoreHome === null || match.scoreAway === null)
  ));
  let maximum = 0;

  function explore(index, points) {
    if (index === remainingMatches.length) {
      const orderedPoints = teams.map((team) => points.get(team) || 0).sort((a, b) => b - a);
      maximum = Math.max(maximum, orderedPoints[2] || 0);
      return;
    }

    const match = remainingMatches[index];
    [[3, 0], [1, 1], [0, 3]].forEach(([homePoints, awayPoints]) => {
      const next = new Map(points);
      next.set(match.home, (next.get(match.home) || 0) + homePoints);
      next.set(match.away, (next.get(match.away) || 0) + awayPoints);
      explore(index + 1, next);
    });
  }

  explore(0, initialPoints);
  return maximum;
}

function isGroupComplete(group) {
  const groupMatches = matches.filter((match) => match.group === group);
  return groupMatches.length > 0 && groupMatches.every((match) => (
    match.confirmed && match.scoreHome !== null && match.scoreAway !== null
  ));
}

function isGroupStageComplete() {
  return worldCupGroups.every(isGroupComplete);
}

function getGroupLetter(group) {
  return group.replace("Grupo ", "").trim();
}

function describeSeed(seed) {
  const groupSeed = seed.match(/^([123])([A-L])$/);
  if (groupSeed) {
    const position = { 1: "1°", 2: "2°", 3: "3°" }[groupSeed[1]];
    return `${position} Grupo ${groupSeed[2]}`;
  }
  if (/^W\d+$/.test(seed)) return `Ganador ${seed.slice(1)}`;
  if (/^L\d+$/.test(seed)) return `Perdedor ${seed.slice(1)}`;
  if (/^3[A-L](\/[A-L])+/.test(seed)) return `Mejor tercero ${seed.slice(1)}`;
  return seed;
}

function renderStandings() {
  const selectedGroup = els.groupSelect.value;
  const rows = computeStandings(selectedGroup);
  els.standings.innerHTML = `
    <div class="table-row header">
      <span>Equipo</span><span>PJ</span><span>DG</span><span>GF</span><span>PTS</span>
    </div>
    ${rows.map((row) => `
      <div class="table-row">
        <span class="table-team">${teamSwatch(row.team)}<span>${row.team}</span></span>
        <span>${row.played}</span>
        <span>${row.goalDiff}</span>
        <span>${row.goalsFor}</span>
        <strong>${row.points}</strong>
      </div>
    `).join("")}
  `;
}

function computeStandings(group) {
  const table = new Map();
  (groupTeams[group] || []).forEach((team) => ensureTeam(table, team));
  const groupMatches = matches.filter((match) => match.group === group);

  groupMatches.forEach((match) => {
    ensureTeam(table, match.home);
    ensureTeam(table, match.away);
    if (!match.confirmed || match.scoreHome === null || match.scoreAway === null) return;
    applyResult(table.get(match.home), match.scoreHome, match.scoreAway);
    applyResult(table.get(match.away), match.scoreAway, match.scoreHome);
  });
  return sortGroupStandings([...table.values()], groupMatches);
}

function sortGroupStandings(rows, groupMatches) {
  const pointGroups = new Map();
  rows.forEach((row) => {
    const tiedRows = pointGroups.get(row.points) || [];
    tiedRows.push(row);
    pointGroups.set(row.points, tiedRows);
  });

  return [...pointGroups.keys()]
    .sort((a, b) => b - a)
    .flatMap((points) => {
      const tiedRows = pointGroups.get(points);
      if (tiedRows.length === 1) return tiedRows;
      const headToHead = computeHeadToHeadStats(tiedRows, groupMatches);
      return tiedRows.sort((a, b) => compareTiedRows(a, b, headToHead));
    });
}

function computeHeadToHeadStats(tiedRows, groupMatches) {
  const tiedTeams = new Set(tiedRows.map((row) => row.team));
  const stats = new Map(tiedRows.map((row) => [row.team, createEmptyTeamRow(row.team)]));

  groupMatches.forEach((match) => {
    if (!match.confirmed || match.scoreHome === null || match.scoreAway === null) return;
    if (!tiedTeams.has(match.home) || !tiedTeams.has(match.away)) return;
    applyResult(stats.get(match.home), match.scoreHome, match.scoreAway);
    applyResult(stats.get(match.away), match.scoreAway, match.scoreHome);
  });

  return stats;
}

function compareTiedRows(a, b, headToHead) {
  const h2hA = headToHead.get(a.team);
  const h2hB = headToHead.get(b.team);
  return h2hB.points - h2hA.points
    || h2hB.goalDiff - h2hA.goalDiff
    || h2hB.goalsFor - h2hA.goalsFor
    || compareTotalStandingsRows(a, b);
}

function compareTotalStandingsRows(a, b) {
  return b.points - a.points
    || b.goalDiff - a.goalDiff
    || b.goalsFor - a.goalsFor
    || getFifaRanking(a.team) - getFifaRanking(b.team)
    || a.team.localeCompare(b.team);
}

function getFifaRanking(team) {
  return fifaRankings[team] || 999;
}

function ensureTeam(table, team) {
  if (!table.has(team)) {
    table.set(team, createEmptyTeamRow(team));
  }
}

function createEmptyTeamRow(team) {
  return { team, played: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
}

function getTeamGroup(team) {
  return worldCupGroups.find((group) => groupTeams[group].includes(team)) || "Grupo A";
}

function getTeamCards(profile) {
  return profile.players.reduce((totals, player) => {
    totals.yellowCards += player.yellowCards;
    totals.redCards += player.redCards;
    return totals;
  }, { yellowCards: 0, redCards: 0 });
}

function applyResult(row, goalsFor, goalsAgainst) {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  row.goalDiff = row.goalsFor - row.goalsAgainst;
  row.points += goalsFor > goalsAgainst ? 3 : goalsFor === goalsAgainst ? 1 : 0;
}

function renderKnockout() {
  if (!els.knockout) return;
  const groupA = computeStandings("Grupo A");
  const groupB = computeStandings("Grupo B");
  const groupC = computeStandings("Grupo C");
  const ties = [
    ["Octavos 1", groupA[0]?.team || "1 Grupo A", groupB[1]?.team || "2 Grupo B"],
    ["Octavos 2", groupB[0]?.team || "1 Grupo B", groupA[1]?.team || "2 Grupo A"],
    ["Octavos 3", groupC[0]?.team || "1 Grupo C", groupA[2]?.team || "Mejor tercero"]
  ];
  els.knockout.innerHTML = ties.map(([label, home, away]) => `
    <div class="tie">
      <span>${label}</span>
      <strong>${home}</strong>
      <span>${away}</span>
    </div>
  `).join("");
}

function renderProgress() {
  const played = matches.filter((match) => match.confirmed && match.scoreHome !== null && match.scoreAway !== null).length;
  const total = matches.length;
  const percent = total ? Math.round((played / total) * 100) : 0;
  els.progressText.textContent = `${played}/${total}`;
  els.progressBar.style.width = `${percent}%`;
}

function groupBy(items, getter) {
  return items.reduce((groups, item) => {
    const key = getter(item);
    groups[key] ||= [];
    groups[key].push(item);
    return groups;
  }, {});
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function formatBracketDate(value) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" })
    .format(new Date(`${value}T12:00:00`))
    .replace(".", "");
}

function render() {
  updateToolbar();
  renderMatches();
  renderStandings();
  renderKnockout();
  renderProgress();
}

document.body.dataset.view = activeView;
render();
syncOpenFootball();
if (!cachedTeamProfiles) {
  syncZafronix();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
