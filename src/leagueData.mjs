import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.mjs';
import { log } from './log.mjs';
import { m, localizeRankName } from './i18n.mjs';

const CACHE_DIR = path.join(ROOT, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'catalog.json');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Bumped when the shape of the cached catalog changes, to discard old ones. */
const CACHE_VERSION = 2;

const DDRAGON = 'https://ddragon.leagueoflegends.com';
const GAME_DATA =
  'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';

/** Tiers that are split into four divisions, from the bottom up. */
const DIVISIONAL = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'];
/** Tiers above Diamond, which have league points but no divisions. */
const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];
const DIVISIONS = ['IV', 'III', 'II', 'I'];

/** Comparison key that ignores accents, spacing and punctuation. */
function normalizeKey(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Every Turkish letter decomposes into a Latin one plus an accent except
    // the dotless i, which is a letter in its own right and would otherwise be
    // dropped entirely \u2014 turning "Alt\u0131n" into "altn".
    .replace(/\u0131/g, 'i')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Comparison key for a rank, with the division numeral folded to a digit so
 * "Gold II", "Gold 2" and "altin ii" all match.
 */
function rankKey(value) {
  const parts = String(value).trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  const roman = DIVISIONS.indexOf(last);
  if (roman >= 0) parts[parts.length - 1] = String(DIVISIONS.length - roman);
  return normalizeKey(parts.join(' '));
}

/**
 * The ladder as one flat, ordered list: Unranked is 0, Iron IV is 1 and
 * Challenger is 31. A single number is enough to name any rank, which is what
 * makes both config.json and the wizard able to take one.
 *
 * Unlike the champions this needs no network — Riot has not added a tier since
 * Emerald in 2023 — but it is written into the cache anyway so an offline copy
 * of the catalog is complete on its own.
 */
function buildRanks() {
  const ranks = [{ tier: 0, name: 'UNRANKED' }];

  for (const tier of DIVISIONAL) {
    for (const division of DIVISIONS) {
      ranks.push({ tier: ranks.length, name: `${tier} ${division}` });
    }
  }
  for (const tier of APEX) {
    ranks.push({ tier: ranks.length, name: tier });
  }
  return ranks;
}

/** The two tiers whose file name is not just the tier in title case. */
const REGALIA_FILES = { UNRANKED: 'Provisional', GRANDMASTER: 'GrandMaster' };

/**
 * The crest for a tier.
 *
 * Data Dragon's tft-regalia set is used rather than the client's own
 * ranked-emblem images, and despite the name it is the same League crest art.
 * What differs is the framing: the client images are 1280x720 with the crest
 * floating in the middle at about a tenth of the width, so once Discord fits
 * one into a badge there is almost nothing left to see. These are square and
 * tightly cropped, and unlike the client's mini crests the set is complete —
 * that one is missing Emerald entirely.
 */
function regaliaUrl(version, rankName) {
  const tier = String(rankName).split(/\s+/)[0].toUpperCase();
  const file = REGALIA_FILES[tier] ?? tier.charAt(0) + tier.slice(1).toLowerCase();
  return `${DDRAGON}/cdn/${version}/img/tft-regalia/TFT_Regalia_${file}.png`;
}

/**
 * Riot writes asset paths as they look inside the client; Community Dragon
 * serves the same files lowercased under its own root.
 */
function gameAssetUrl(assetPath) {
  return `${GAME_DATA}${String(assetPath).replace(/^\/lol-game-data\/assets/i, '').toLowerCase()}`;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function downloadCatalog() {
  // Data Dragon is versioned per patch and the newest one is first.
  const versions = await getJson(`${DDRAGON}/api/versions.json`);
  const version = versions[0];

  const [champions, skins] = await Promise.all([
    getJson(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`),
    // Where the square tile art lives. The file names behind it are irregular
    // enough that guessing them is not an option — a reworked champion keeps
    // the old name ("XinZhaoRework"), and a recent one sits under Skin0 rather
    // than Base — so the only reliable source is Riot's own index.
    getJson(`${GAME_DATA}/v1/skins.json`),
  ]);

  return {
    cacheVersion: CACHE_VERSION,
    fetchedAt: Date.now(),
    version,
    ranks: buildRanks(),
    champions: Object.values(champions.data).map((c) => {
      const key = Number(c.key);
      // A champion's base skin is its key followed by three zeroes.
      const tilePath = skins[String(key * 1000)]?.tilePath;
      return { key, id: c.id, name: c.name, tile: tilePath ? gameAssetUrl(tilePath) : '' };
    }),
  };
}

function readCache() {
  try {
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    // A cache written by an older layout is dropped rather than patched.
    return cached?.cacheVersion === CACHE_VERSION ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(catalog) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(catalog), 'utf8');
  } catch (err) {
    log.warn(m('catalog.writeFailed', err.message));
  }
}

/**
 * Loads the catalog, skipping the network while the cache is fresh and falling
 * back to a stale cache when the request fails, so it still works offline.
 */
export async function loadCatalog({ force = false } = {}) {
  const cached = readCache();
  const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;

  if (fresh && !force) {
    log.debug(m('catalog.fromCache'));
    return new Catalog(cached);
  }

  try {
    const catalog = await downloadCatalog();
    writeCache(catalog);
    log.ok(m('catalog.updated', catalog.version, catalog.champions.length));
    return new Catalog(catalog);
  } catch (err) {
    if (cached) {
      log.warn(m('catalog.offline', err.message));
      return new Catalog(cached);
    }
    throw new Error(m('catalog.unavailable', err.message));
  }
}

class Catalog {
  constructor(data) {
    this.raw = data;
    this.version = data.version;
    this.ranksByTier = new Map(data.ranks.map((r) => [r.tier, r]));

    // Champions arrive from two directions: the client reports a numeric id,
    // the in-game API reports a display name.
    this.championsByKey = new Map(data.champions.map((c) => [c.key, c]));

    // Data Dragon also carries alternate-mode copies of a champion — same
    // display name, its own id and a far higher key. Names are claimed in key
    // order and never reassigned, so the original wins and a copy can still be
    // reached by its own id.
    this.championsByName = new Map();
    for (const champion of [...data.champions].sort((a, b) => a.key - b.key)) {
      for (const key of [normalizeKey(champion.name), normalizeKey(champion.id)]) {
        if (!this.championsByName.has(key)) this.championsByName.set(key, champion);
      }
    }
  }

  rank(tier) {
    const found = this.ranksByTier.get(Number(tier));
    return found ? { ...found, icon: regaliaUrl(this.version, found.name) } : null;
  }

  /** Accepts either a numeric champion id (103) or a display name ("Ahri"). */
  champion(value) {
    if (value === null || value === undefined || value === '' || value === 0) return null;

    const found =
      typeof value === 'number' || /^\d+$/.test(String(value).trim())
        ? this.championsByKey.get(Number(value))
        : this.championsByName.get(normalizeKey(value));
    if (!found) return null;

    const icon = `${DDRAGON}/cdn/${this.version}/img/champion/${found.id}.png`;
    return {
      key: found.key,
      id: found.id,
      name: found.name,
      icon,
      // The tile is square and cropped close, which is what a card wants;
      // splash art is 16:9 and letterboxes into something distant. The icon
      // stands in when a champion is too new to have one indexed yet.
      tile: found.tile || icon,
    };
  }

  profileIcon(id) {
    if (!id && id !== 0) return null;
    return `${DDRAGON}/cdn/${this.version}/img/profileicon/${id}.png`;
  }

  /** Everything above Unranked, which is where league points mean something. */
  isRanked(tier) {
    return Number(tier) > 0;
  }

  /**
   * Turns a ranked entry from the client — { tier: "GOLD", division: "II" } —
   * into a tier number. Apex tiers report a division of "I" they do not have,
   * so it is dropped for them.
   */
  tierOf(entry) {
    const tier = String(entry?.tier ?? '').toUpperCase();
    if (!tier || tier === 'NONE' || tier === 'UNRANKED') return 0;

    const division = String(entry?.division ?? '').toUpperCase();
    const name = APEX.includes(tier) || !DIVISIONS.includes(division) ? tier : `${tier} ${division}`;
    return this.resolveRank(name) ?? 0;
  }

  /**
   * Turns whatever the user wrote in config into a tier number. Accepts a
   * number ("31"), the English name ("Gold II" or "Gold 2") or a localized one
   * ("Altın 2"), with or without accents.
   */
  resolveRank(input, lang = 'en') {
    if (input === null || input === undefined || input === '') return null;

    if (typeof input === 'number' || /^\d+$/.test(String(input).trim())) {
      const tier = Number(input);
      return this.ranksByTier.has(tier) ? tier : null;
    }

    const wanted = rankKey(input);
    for (const rank of this.raw.ranks) {
      if (rankKey(rank.name) === wanted) return rank.tier;
      if (rankKey(localizeRankName(rank.name, lang)) === wanted) return rank.tier;
      if (rankKey(localizeRankName(rank.name, 'tr')) === wanted) return rank.tier;
    }
    return null;
  }

  /** Backing data for --list-ranks. */
  listRanks(lang = 'en') {
    return this.raw.ranks.map((r) => ({
      tier: r.tier,
      name: r.name,
      localized: localizeRankName(r.name, lang),
    }));
  }
}

export { normalizeKey, rankKey, buildRanks, regaliaUrl, gameAssetUrl, Catalog };
