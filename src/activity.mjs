import { log } from './log.mjs';
import { m, localizeRankName } from './i18n.mjs';

const MAX_FIELD = 128;

/** Phases where a match is on screen; champion select counts as part of one. */
const MATCH_PHASES = new Set(['ChampSelect', 'GameStart', 'InProgress', 'Reconnect']);
const OVER_PHASES = new Set(['WaitingForStats', 'PreEndOfGame', 'EndOfGame']);

/** Discord rejects details/state longer than 128 characters, and shorter than 2. */
function clamp(text) {
  if (!text) return undefined;
  const value = String(text).trim();
  if (value.length === 0) return undefined;
  if (value.length === 1) return `${value} `;
  return value.length > MAX_FIELD ? `${value.slice(0, MAX_FIELD - 1)}…` : value;
}

let overrideWarned = false;

/** Called after the rank is reconfigured, so a new bad value warns again. */
export function resetOverrideWarning() {
  overrideWarned = false;
}

/** The tier and points the client reports, for whichever queue config asks for. */
function realRank(presence, config, catalog) {
  const entry = presence.ranked?.[config.rank.queue === 'flex' ? 'flex' : 'solo'] ?? null;
  return { tier: catalog.tierOf(entry), points: entry?.leaguePoints ?? 0 };
}

/**
 * Decides which rank to display.
 *   real     -> the tier the client reports for rank.queue
 *   override -> a fixed tier from config, regardless of the real one
 *   hide     -> no rank badge at all
 *
 * League points follow the same split, with one asymmetry: in real mode
 * whatever the client reports is trusted as-is, but a configured number is
 * dropped for Unranked, which has no points to have. Either is shown only when
 * above zero.
 */
export function resolveDisplayRank(presence, config, catalog, lang) {
  if (config.rank.mode === 'hide') return null;

  let tier;
  let points;

  if (config.rank.mode === 'override') {
    tier = catalog.resolveRank(config.rank.override, lang);
    if (tier === null) {
      if (!overrideWarned) {
        overrideWarned = true;
        log.warn(m('rank.unknownOverride', config.rank.override));
      }
      ({ tier, points } = realRank(presence, config, catalog));
    } else {
      points = catalog.isRanked(tier) ? config.rank.leaguePoints : 0;
    }
  } else {
    ({ tier, points } = realRank(presence, config, catalog));
  }

  const rank = catalog.rank(tier ?? 0);
  if (!rank) return null;

  let label = localizeRankName(rank.name, lang);
  const lp = Number(points) || 0;
  if (lp > 0 && catalog.isRanked(tier)) label += ` ${lp} LP`;

  return { icon: rank.icon, label };
}

function partyText(presence, t) {
  const size = Number(presence.partySize) || 1;
  const max = Number(presence.maxPartySize) || 5;
  return `${t('party')} ${size}/${max}`;
}

/** The scoreboard line: "9 / 2 / 14 • 178 CS". */
function kdaText(presence) {
  const kda = `${presence.kills} / ${presence.deaths} / ${presence.assists}`;
  // Modes without minions report zero, where a CS counter is just noise.
  return presence.creepScore > 0 ? `${kda} • ${presence.creepScore} CS` : kda;
}

/**
 * The queue by name. The practice tool is checked first because it reports
 * queue 0, which is otherwise the custom game.
 */
function queueName(presence, t) {
  if (String(presence.gameMode).toUpperCase() === 'PRACTICETOOL') return t('practiceTool');
  return t.queue(presence.queueId) ?? t.mode(presence.gameMode) ?? t('customGame');
}

/**
 * presence + config -> a Discord activity object.
 *
 * Images are plain Data Dragon and Community Dragon URLs: Discord re-hosts
 * whatever it is given through its own proxy, so nothing has to be uploaded to
 * the application.
 *
 * startedAt is tracked by the main loop so the elapsed timer survives polls.
 */
export function buildActivity({ presence, catalog, config, t, startedAt }) {
  const lang = t.lang;
  const queue = queueName(presence, t);
  const rank = resolveDisplayRank(presence, config, catalog, lang);
  // In champion select the id is known; in game the name comes off the
  // scoreboard, which is the only source once champion select is gone.
  const champion = catalog.champion(presence.championName || presence.championId);
  const inMatch = MATCH_PHASES.has(presence.phase);

  let details;
  let state;

  switch (presence.phase) {
    case 'ChampSelect': {
      details = t('champSelect');
      state = champion ? `${queue} — ${champion.name}` : queue;
      break;
    }

    case 'GameStart':
    case 'InProgress':
    case 'Reconnect': {
      details = champion ? `${queue} — ${champion.name}` : queue;
      if (presence.phase === 'Reconnect') {
        state = t('reconnecting');
      } else if (config.display.showKda && presence.liveData) {
        state = kdaText(presence);
      }
      break;
    }

    case 'Lobby': {
      details = `${t('inLobby')} — ${queue}`;
      if (config.display.showParty) state = partyText(presence, t);
      break;
    }

    case 'Matchmaking': {
      details = `${t('inQueue')} — ${queue}`;
      if (config.display.showParty) state = partyText(presence, t);
      break;
    }

    case 'ReadyCheck': {
      details = t('matchFound');
      state = queue;
      break;
    }

    default: {
      // None, TerminatedInError, and the three phases the client passes through
      // between the last kill and the honour screen.
      if (OVER_PHASES.has(presence.phase)) {
        details = t('endOfGame');
        state = queue;
      } else {
        details = t('mainMenu');
        // There is no lobby on the main menu, so there is nothing to count.
        if (config.display.showParty && presence.partySize > 0) {
          state = partyText(presence, t);
        }
      }
      break;
    }
  }

  // The badge only carries its label in a tooltip, which nobody hovers. This
  // puts the rank — and any league points — on the visible state line.
  if (config.display.showRankInText && rank) {
    state = state ? `${state} • ${rank.label}` : rank.label;
  }

  if (config.display.showLevel && presence.summonerLevel) {
    const level = `${t('level')} ${presence.summonerLevel}`;
    state = state ? `${state} • ${level}` : level;
  }

  // Large image: the champion once one is picked, the profile icon otherwise.
  const iconUrl = catalog.profileIcon(presence.profileIconId);
  const showRankLarge = config.display.largeImage === 'rank' && rank;
  const showChampionLarge = config.display.largeImage === 'champion' && champion;

  let largeImage;
  let largeText;
  if (showRankLarge) {
    largeImage = rank.icon;
    largeText = rank.label;
  } else if (showChampionLarge) {
    largeImage = champion.splash;
    largeText = champion.name;
  } else if (iconUrl) {
    largeImage = iconUrl;
    largeText = t('playing');
  }

  const assets = {};
  if (largeImage) {
    assets.large_image = largeImage;
    assets.large_text = clamp(largeText);
  }
  // The badge would be redundant when the rank is already the large image.
  if (rank && !showRankLarge && (inMatch || config.display.showRankInMenus)) {
    assets.small_image = rank.icon;
    assets.small_text = clamp(rank.label);
  }

  const activity = {
    type: 0,
    details: clamp(details),
    state: clamp(state),
    timestamps: { start: startedAt },
  };
  if (Object.keys(assets).length > 0) activity.assets = assets;

  const buttons = (config.display.buttons ?? [])
    .filter((b) => b?.label && b?.url)
    .slice(0, 2)
    .map((b) => ({ label: String(b.label).slice(0, 31), url: String(b.url) }));
  if (buttons.length > 0) activity.buttons = buttons;

  return activity;
}

/** Optional presence shown while the client is closed. */
export function buildIdleActivity({ config, t, startedAt }) {
  return {
    type: 0,
    details: clamp(config.idle.text) ?? t('playing'),
    timestamps: { start: startedAt },
  };
}

export { clamp, kdaText, queueName };
