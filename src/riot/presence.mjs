import { lcu, liveGame } from './lcu.mjs';

/** Phases where a match is on screen and the Live Client Data API answers. */
const IN_GAME_PHASES = new Set(['GameStart', 'InProgress', 'Reconnect']);
/** Phases where a lobby exists, and so a party size can be reported. */
const LOBBY_PHASES = new Set(['None', 'Lobby', 'Matchmaking', 'ReadyCheck']);

/**
 * The one thing the client will not tell us mid-game: which champion we picked.
 * Champion select is gone by then, and the Live Client Data API is not up until
 * the match window is. Remembering the pick covers the gap, and the live data
 * takes over as soon as it exists — which is also what makes a mid-game start
 * work at all.
 */
let lastChampionId = 0;

/** The summoner never changes while the client runs, so it is read once. */
let cachedSummoner = null;

export function resetSessionCache() {
  cachedSummoner = null;
  lastChampionId = 0;
}

/** Solo and flex are read separately so config decides which one is shown. */
function rankedEntry(ranked, queueKey) {
  const entry = ranked?.queueMap?.[queueKey];
  if (!entry) return null;
  return {
    tier: entry.tier ?? '',
    division: entry.division ?? '',
    leaguePoints: Number(entry.leaguePoints) || 0,
  };
}

/**
 * Finds our own row in the scoreboard. The active player is identified by name
 * rather than by an id, and which name it is has changed across patches, so
 * both the Riot ID and the summoner name are accepted.
 */
function findSelf(live) {
  const players = Array.isArray(live?.allPlayers) ? live.allPlayers : [];
  const active = live?.activePlayer ?? {};

  const names = new Set(
    [active.riotId, active.summonerName].filter(Boolean).map((v) => String(v).toLowerCase()),
  );
  if (names.size === 0) return null;

  return (
    players.find(
      (p) =>
        names.has(String(p.riotId ?? '').toLowerCase()) ||
        names.has(String(p.summonerName ?? '').toLowerCase()),
    ) ?? null
  );
}

function myChampionId(champSelect) {
  const me = champSelect?.myTeam?.find((p) => p.cellId === champSelect.localPlayerCellId);
  // Before locking in, only the intent is set — which is what the client shows
  // to everyone else too.
  return Number(me?.championId) || Number(me?.championPickIntent) || 0;
}

/**
 * Everything the rest of the app needs about the current session, flattened
 * into one object. Throws LeagueClientClosedError when the client is closed.
 *
 * The gameflow session carries the phase and the queue, and the phase then
 * decides what else is worth asking for: there is no lobby during a game and
 * no scoreboard outside one.
 */
export async function fetchLeaguePresence() {
  const session = await lcu('/lol-gameflow/v1/session');
  const phase = session?.phase ?? (await lcu('/lol-gameflow/v1/gameflow-phase')) ?? 'None';

  if (!cachedSummoner) {
    cachedSummoner = await lcu('/lol-summoner/v1/current-summoner');
  }

  const inGame = IN_GAME_PHASES.has(phase);
  const [ranked, lobby, champSelect, live] = await Promise.all([
    lcu('/lol-ranked/v1/current-ranked-stats'),
    LOBBY_PHASES.has(phase) ? lcu('/lol-lobby/v2/lobby') : null,
    phase === 'ChampSelect' ? lcu('/lol-champ-select/v1/session') : null,
    inGame ? liveGame('/liveclientdata/allgamedata') : null,
  ]);

  if (champSelect) {
    const picked = myChampionId(champSelect);
    if (picked) lastChampionId = picked;
  } else if (!inGame) {
    lastChampionId = 0;
  }

  const me = findSelf(live);
  const scores = me?.scores ?? {};
  const queue = session?.gameData?.queue ?? {};

  return {
    phase,
    // -1 is the client's way of saying "no queue", which is not the same as
    // queue 0, the custom game.
    queueId: Number(queue.id ?? lobby?.gameConfig?.queueId ?? -1),
    gameMode: queue.gameMode ?? live?.gameData?.gameMode ?? '',

    championId: lastChampionId,
    championName: me?.championName ?? '',

    partySize: Array.isArray(lobby?.members) ? lobby.members.length : 0,
    maxPartySize: Number(lobby?.gameConfig?.maxLobbySize) || 0,

    ranked: {
      solo: rankedEntry(ranked, 'RANKED_SOLO_5x5'),
      flex: rankedEntry(ranked, 'RANKED_FLEX_SR'),
    },

    gameName: cachedSummoner?.gameName ?? cachedSummoner?.displayName ?? '',
    tagLine: cachedSummoner?.tagLine ?? '',
    summonerLevel: Number(cachedSummoner?.summonerLevel) || 0,
    profileIconId: Number(cachedSummoner?.profileIconId) || 0,

    kills: Number(scores.kills) || 0,
    deaths: Number(scores.deaths) || 0,
    assists: Number(scores.assists) || 0,
    creepScore: Number(scores.creepScore) || 0,
    liveData: Boolean(me),
    // How long the match has actually been running, which lets the Discord
    // timer show game time instead of time since this process noticed.
    gameTimeMs: Math.max(0, Math.round(Number(live?.gameData?.gameTime) * 1000) || 0),
  };
}

export { findSelf, myChampionId, rankedEntry };
