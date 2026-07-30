import test from 'node:test';
import assert from 'node:assert/strict';

import { findSelf, myChampionId, rankedEntry } from '../src/riot/presence.mjs';
import { buildActivity, resolveDisplayRank, clamp } from '../src/activity.mjs';
import { Catalog, buildRanks } from '../src/leagueData.mjs';
import { createTranslator, localizeRankName, setLanguage, m } from '../src/i18n.mjs';
import { isValidClientId } from '../src/config.mjs';

/**
 * A hand-built catalog keeps these tests offline and deterministic — the real
 * one is fetched from Data Dragon. The ladder is the genuine one, since it is
 * built locally anyway.
 */
const catalog = new Catalog({
  fetchedAt: Date.now(),
  version: '15.1.1',
  ranks: buildRanks(),
  champions: [
    // Deliberately out of order, and with the alternate-mode copy of Ahri that
    // Data Dragon ships under the same display name.
    { key: 60103, id: 'Jade_Ahri', name: 'Ahri' },
    { key: 103, id: 'Ahri', name: 'Ahri' },
    { key: 62, id: 'MonkeyKing', name: 'Wukong' },
    { key: 145, id: 'Kaisa', name: "Kai'Sa" },
  ],
});

const baseConfig = () => ({
  discordClientId: '12345678901234567',
  language: 'en',
  pollIntervalMs: 3000,
  leaguePath: '',
  rank: { mode: 'real', override: 'Challenger', leaguePoints: 0, queue: 'solo' },
  display: {
    showKda: true,
    showParty: true,
    showLevel: false,
    showRankInMenus: true,
    showRankInText: false,
    largeImage: 'champion',
    buttons: [],
  },
  idle: { showWhenGameClosed: false, text: 'closed' },
});

const inGame = {
  phase: 'InProgress',
  queueId: 420,
  gameMode: 'CLASSIC',
  championId: 103,
  championName: 'Ahri',
  partySize: 0,
  maxPartySize: 0,
  ranked: {
    solo: { tier: 'GOLD', division: 'II', leaguePoints: 45 },
    flex: { tier: 'SILVER', division: 'I', leaguePoints: 12 },
  },
  gameName: 'demo',
  tagLine: '0000',
  summonerLevel: 412,
  profileIconId: 29,
  kills: 9,
  deaths: 2,
  assists: 14,
  creepScore: 178,
  liveData: true,
  gameTimeMs: 900000,
};

const inMenus = {
  ...inGame,
  phase: 'None',
  queueId: -1,
  gameMode: '',
  championId: 0,
  championName: '',
  kills: 0,
  deaths: 0,
  assists: 0,
  creepScore: 0,
  liveData: false,
  gameTimeMs: 0,
};

test('presence: the active player is found by either name', () => {
  const live = {
    activePlayer: { riotId: 'demo#0000' },
    allPlayers: [
      { riotId: 'someone#1111', championName: 'Garen' },
      { riotId: 'demo#0000', championName: 'Ahri' },
    ],
  };
  assert.equal(findSelf(live).championName, 'Ahri');

  const legacy = {
    activePlayer: { summonerName: 'demo' },
    allPlayers: [{ summonerName: 'demo', championName: 'Wukong' }],
  };
  assert.equal(findSelf(legacy).championName, 'Wukong');
});

test('presence: no active player means no scoreboard row', () => {
  assert.equal(findSelf(null), null);
  assert.equal(findSelf({}), null);
  // Spectating: there are players, but none of them is us.
  assert.equal(findSelf({ activePlayer: {}, allPlayers: [{ riotId: 'other#1' }] }), null);
});

test('presence: the locked champion wins over the intent', () => {
  const session = {
    localPlayerCellId: 2,
    myTeam: [
      { cellId: 1, championId: 62, championPickIntent: 0 },
      { cellId: 2, championId: 103, championPickIntent: 145 },
    ],
  };
  assert.equal(myChampionId(session), 103);

  // Before locking in, only the intent is set.
  session.myTeam[1].championId = 0;
  assert.equal(myChampionId(session), 145);

  session.myTeam[1].championPickIntent = 0;
  assert.equal(myChampionId(session), 0);
  assert.equal(myChampionId(null), 0);
});

test('presence: ranked entries are read per queue', () => {
  const ranked = {
    queueMap: {
      RANKED_SOLO_5x5: { tier: 'GOLD', division: 'II', leaguePoints: 45 },
      RANKED_FLEX_SR: { tier: 'NONE', division: 'NA', leaguePoints: 0 },
    },
  };
  assert.deepEqual(rankedEntry(ranked, 'RANKED_SOLO_5x5'), {
    tier: 'GOLD',
    division: 'II',
    leaguePoints: 45,
  });
  assert.equal(rankedEntry(ranked, 'RANKED_TFT'), null);
  assert.equal(rankedEntry(null, 'RANKED_SOLO_5x5'), null);
});

test('catalog: the ladder runs from Unranked to Challenger', () => {
  const ranks = buildRanks();
  assert.equal(ranks.length, 32);
  assert.equal(ranks[0].name, 'UNRANKED');
  assert.equal(ranks[1].name, 'IRON IV');
  assert.equal(ranks[31].name, 'CHALLENGER');
  assert.ok(!catalog.isRanked(0));
  assert.ok(catalog.isRanked(1));
});

test('catalog: resolveRank accepts numbers, numerals and Turkish names', () => {
  assert.equal(catalog.resolveRank(31), 31);
  assert.equal(catalog.resolveRank('31'), 31);
  assert.equal(catalog.resolveRank('Challenger'), 31);
  assert.equal(catalog.resolveRank('challenger'), 31);
  assert.equal(catalog.resolveRank('Gold II'), 15);
  assert.equal(catalog.resolveRank('gold 2'), 15);
  assert.equal(catalog.resolveRank('Altın 2', 'tr'), 15);
  assert.equal(catalog.resolveRank('altin ii', 'tr'), 15);
  assert.equal(catalog.resolveRank('nonsense'), null);
  assert.equal(catalog.resolveRank(99), null);
  assert.equal(catalog.resolveRank(''), null);
});

test('catalog: tierOf reads what the client reports', () => {
  assert.equal(catalog.tierOf({ tier: 'GOLD', division: 'II' }), 15);
  assert.equal(catalog.tierOf({ tier: 'IRON', division: 'IV' }), 1);
  // Apex tiers report a division they do not have.
  assert.equal(catalog.tierOf({ tier: 'CHALLENGER', division: 'I' }), 31);
  assert.equal(catalog.tierOf({ tier: 'NONE', division: 'NA' }), 0);
  assert.equal(catalog.tierOf(null), 0);
});

test('catalog: champions resolve by id and by display name', () => {
  assert.equal(catalog.champion(103).name, 'Ahri');
  assert.equal(catalog.champion('103').name, 'Ahri');
  // The scoreboard reports display names, which are not the asset names.
  assert.equal(catalog.champion('Wukong').id, 'MonkeyKing');
  assert.equal(catalog.champion("Kai'Sa").id, 'Kaisa');
  assert.match(catalog.champion(103).splash, /\/Ahri_0\.jpg$/);
  assert.equal(catalog.champion(0), null);
  assert.equal(catalog.champion(''), null);
  assert.equal(catalog.champion('Nobody'), null);
});

test('catalog: an alternate-mode copy never shadows the champion', () => {
  // The scoreboard says "Ahri", and that has to be the real one whichever
  // order Data Dragon listed them in.
  assert.equal(catalog.champion('Ahri').id, 'Ahri');
  assert.equal(catalog.champion('Jade_Ahri').id, 'Jade_Ahri');
  assert.equal(catalog.champion(60103).id, 'Jade_Ahri');
});

test('rank: override replaces the real tier', () => {
  const config = baseConfig();
  config.rank.mode = 'override';
  config.rank.override = 'Challenger';

  const rank = resolveDisplayRank(inGame, config, catalog, 'en');
  assert.equal(rank.label, 'Challenger');
  assert.match(rank.icon, /emblem-challenger\.png$/);
});

test('rank: real mode reads the queue config asks for', () => {
  const config = baseConfig();
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en').label, 'Gold II 45 LP');

  config.rank.queue = 'flex';
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en').label, 'Silver I 12 LP');
});

test('rank: hide mode returns nothing', () => {
  const config = baseConfig();
  config.rank.mode = 'hide';
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en'), null);
});

test('rank: league points are appended only when above zero', () => {
  const config = baseConfig();
  config.rank.mode = 'override';
  config.rank.override = 'Diamond IV';
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en').label, 'Diamond IV');

  config.rank.leaguePoints = 78;
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en').label, 'Diamond IV 78 LP');
});

test('rank: a configured number is ignored for Unranked', () => {
  const config = baseConfig();
  config.rank.mode = 'override';
  config.rank.leaguePoints = 78;

  config.rank.override = 'Unranked';
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en').label, 'Unranked');

  config.rank.override = 'Diamond IV';
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en').label, 'Diamond IV 78 LP');
});

test('rank: real mode trusts whatever the client reports', () => {
  const config = baseConfig();
  config.rank.leaguePoints = 999; // override-only, must not leak in
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en').label, 'Gold II 45 LP');
});

test('rank: unknown override falls back to the real tier', () => {
  const config = baseConfig();
  config.rank.mode = 'override';
  config.rank.override = 'Totally Not A Rank';
  assert.equal(resolveDisplayRank(inGame, config, catalog, 'en').label, 'Gold II 45 LP');
});

test('activity: in game shows queue, champion and the scoreboard', () => {
  const activity = buildActivity({
    presence: inGame,
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1000,
  });

  assert.equal(activity.details, 'Ranked Solo/Duo — Ahri');
  assert.equal(activity.state, '9 / 2 / 14 • 178 CS');
  assert.match(activity.assets.large_image, /Ahri_0\.jpg$/);
  assert.match(activity.assets.small_image, /emblem-gold\.png$/);
  assert.equal(activity.timestamps.start, 1000);
});

test('activity: the scoreboard needs live data', () => {
  const activity = buildActivity({
    presence: { ...inGame, liveData: false, kills: 0, deaths: 0, assists: 0, creepScore: 0 },
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(activity.details, 'Ranked Solo/Duo — Ahri');
  assert.equal(activity.state, undefined);
});

test('activity: modes without minions drop the CS counter', () => {
  const activity = buildActivity({
    presence: { ...inGame, queueId: 450, gameMode: 'ARAM', creepScore: 0 },
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(activity.details, 'ARAM — Ahri');
  assert.equal(activity.state, '9 / 2 / 14');
});

test('activity: menus show the profile icon and nothing to count', () => {
  const activity = buildActivity({
    presence: inMenus,
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1,
  });

  assert.equal(activity.details, 'Main Menu');
  assert.equal(activity.state, undefined);
  assert.match(activity.assets.large_image, /profileicon\/29\.png$/);
});

test('activity: a lobby and a queue both report the party', () => {
  const lobby = { ...inMenus, phase: 'Lobby', queueId: 420, partySize: 2, maxPartySize: 5 };
  const inLobby = buildActivity({
    presence: lobby,
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(inLobby.details, 'In Lobby — Ranked Solo/Duo');
  assert.equal(inLobby.state, 'Party 2/5');

  const searching = buildActivity({
    presence: { ...lobby, phase: 'Matchmaking' },
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(searching.details, 'In Queue — Ranked Solo/Duo');
});

test('activity: champion select names the pick', () => {
  const activity = buildActivity({
    presence: { ...inMenus, phase: 'ChampSelect', queueId: 420, championId: 62 },
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(activity.details, 'Champion Select');
  assert.equal(activity.state, 'Ranked Solo/Duo — Wukong');
});

test('activity: an unlisted queue falls back to the game mode', () => {
  const activity = buildActivity({
    presence: { ...inGame, queueId: 1234, gameMode: 'CHERRY' },
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(activity.details, 'Arena — Ahri');
});

test('activity: the practice tool is not a custom game', () => {
  const activity = buildActivity({
    presence: { ...inGame, queueId: 0, gameMode: 'PRACTICETOOL' },
    catalog,
    config: baseConfig(),
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(activity.details, 'Practice Tool — Ahri');
});

test('activity: largeImage "rank" drops the redundant small badge', () => {
  const config = baseConfig();
  config.display.largeImage = 'rank';
  const activity = buildActivity({
    presence: inGame,
    catalog,
    config,
    t: createTranslator('en'),
    startedAt: 1,
  });

  assert.match(activity.assets.large_image, /emblem-gold\.png$/);
  assert.equal(activity.assets.small_image, undefined);
});

test('activity: rank stays out of the text unless asked for', () => {
  const config = baseConfig();
  config.rank.mode = 'override';
  config.rank.override = 'Challenger';
  config.rank.leaguePoints = 1204;

  // Off by default: the label is tooltip-only, which is what made a set
  // leaguePoints look like it did nothing at all.
  const hidden = buildActivity({
    presence: inGame,
    catalog,
    config,
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(hidden.state, '9 / 2 / 14 • 178 CS');
  assert.equal(hidden.assets.small_text, 'Challenger 1204 LP');

  config.display.showRankInText = true;
  const shown = buildActivity({
    presence: inGame,
    catalog,
    config,
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(shown.state, '9 / 2 / 14 • 178 CS • Challenger 1204 LP');
});

test('activity: rank text stands alone when there is nothing else', () => {
  const config = baseConfig();
  config.display.showRankInText = true;
  const activity = buildActivity({
    presence: inMenus,
    catalog,
    config,
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(activity.state, 'Gold II 45 LP');
});

test('activity: at most two buttons survive', () => {
  const config = baseConfig();
  config.display.buttons = [
    { label: 'a', url: 'https://a' },
    { label: 'b', url: 'https://b' },
    { label: 'c', url: 'https://c' },
    { label: 'no url' },
  ];
  const activity = buildActivity({
    presence: inGame,
    catalog,
    config,
    t: createTranslator('en'),
    startedAt: 1,
  });
  assert.equal(activity.buttons.length, 2);
});

test('activity: Turkish presence text', () => {
  const config = baseConfig();
  config.language = 'tr';
  const activity = buildActivity({
    presence: { ...inMenus, phase: 'Lobby', queueId: 450, partySize: 2, maxPartySize: 5 },
    catalog,
    config,
    t: createTranslator('tr'),
    startedAt: 1,
  });
  assert.equal(activity.details, 'Lobide — ARAM');
  assert.equal(activity.state, 'Grup 2/5');
});

test('clamp: enforces Discord field limits', () => {
  assert.equal(clamp(''), undefined);
  assert.equal(clamp(undefined), undefined);
  assert.equal(clamp('x'), 'x ');
  assert.equal(clamp('  hello  '), 'hello');
  assert.equal(clamp('a'.repeat(200)).length, 128);
});

test('i18n: rank names localize and fall back', () => {
  assert.equal(localizeRankName('GOLD II', 'en'), 'Gold II');
  assert.equal(localizeRankName('GOLD II', 'tr'), 'Altın II');
  assert.equal(localizeRankName('CHALLENGER', 'tr'), 'Challenger');
  assert.equal(localizeRankName('IRON IV', 'de'), 'Iron IV');
});

test('i18n: messages interpolate and fall back to English', () => {
  setLanguage('en');
  assert.equal(m('discord.connected', 'hix7'), 'Connected as hix7');
  setLanguage('tr');
  assert.equal(m('discord.connected', 'hix7'), 'Baglandi: hix7');
  setLanguage('nope');
  assert.match(m('discord.connected', 'x'), /Connected as x/);
  setLanguage('en');
});

test('config: client id validation', () => {
  assert.ok(isValidClientId('1532060398969294898'));
  assert.ok(!isValidClientId('123'));
  assert.ok(!isValidClientId(''));
  assert.ok(!isValidClientId(undefined));
  assert.ok(!isValidClientId('abcdefghijklmnopqr'));
});
