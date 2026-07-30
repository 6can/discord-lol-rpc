/**
 * --demo mode: synthetic presence fed in place of the real one, so the Discord
 * output (and especially the rank override) can be checked without launching
 * the game. The scoreboard advances on every call to prove updates get through.
 */
const SCENES = [
  { phase: 'None', queueId: -1, gameMode: '', championId: 0, partySize: 0, maxPartySize: 0 },
  { phase: 'Lobby', queueId: 420, gameMode: 'CLASSIC', championId: 0, partySize: 2, maxPartySize: 5 },
  {
    phase: 'Matchmaking',
    queueId: 420,
    gameMode: 'CLASSIC',
    championId: 0,
    partySize: 2,
    maxPartySize: 5,
  },
  {
    phase: 'ChampSelect',
    queueId: 420,
    gameMode: 'CLASSIC',
    championId: 103,
    partySize: 2,
    maxPartySize: 5,
  },
  {
    phase: 'InProgress',
    queueId: 420,
    gameMode: 'CLASSIC',
    championId: 103,
    partySize: 0,
    maxPartySize: 0,
  },
];

const BASE = {
  championName: '',
  ranked: {
    solo: { tier: 'GOLD', division: 'II', leaguePoints: 45 },
    flex: { tier: 'SILVER', division: 'I', leaguePoints: 12 },
  },
  gameName: 'demo',
  tagLine: '0000',
  summonerLevel: 412,
  profileIconId: 29,
  kills: 0,
  deaths: 0,
  assists: 0,
  creepScore: 0,
  liveData: false,
  gameTimeMs: 0,
};

let step = 0;

export function nextDemoPresence({ holdTicks = 4 } = {}) {
  const scene = SCENES[Math.floor(step / holdTicks) % SCENES.length];
  const inGameTicks = scene.phase === 'InProgress' ? step % holdTicks : 0;
  step += 1;

  return {
    ...BASE,
    ...scene,
    // Only a running match reports a scoreboard, so only that scene gets one.
    liveData: scene.phase === 'InProgress',
    championName: scene.phase === 'InProgress' ? 'Ahri' : '',
    kills: inGameTicks * 3,
    deaths: inGameTicks,
    assists: inGameTicks * 2,
    creepScore: inGameTicks * 41,
  };
}

export function resetDemo() {
  step = 0;
}
