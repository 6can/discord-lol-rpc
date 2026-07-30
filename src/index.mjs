import { stdin } from 'node:process';
import { loadConfig } from './config.mjs';
import { loadCatalog } from './leagueData.mjs';
import { setLeaguePath } from './riot/lockfile.mjs';
import { fetchLeaguePresence, resetSessionCache } from './riot/presence.mjs';
import { DiscordIPC } from './discord/ipc.mjs';
import { buildActivity, buildIdleActivity, resetOverrideWarning } from './activity.mjs';
import { nextDemoPresence } from './demoPresence.mjs';
import { runSetup, changeRank, describeRank } from './setup.mjs';
import { runDoctor } from './doctor.mjs';
import { log, setDebug, COLORS } from './log.mjs';
import { m, setLanguage, createTranslator, localizeRankName } from './i18n.mjs';

const RECONNECT_DELAY_MS = 15000;
const CTRL_C = '\u0003';

function printRanks(catalog, lang) {
  console.log(`\n${m('ranks.header')}\n`);
  for (const r of catalog.listRanks(lang)) {
    const tier = String(r.tier).padStart(2);
    console.log(
      `  ${COLORS.dim}${tier}${COLORS.reset}  ${r.localized.padEnd(16)} ${COLORS.dim}${r.name}${COLORS.reset}`,
    );
  }
  console.log(`\n${m('ranks.footer')}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--debug')) setDebug(true);

  const { config, needsSetup } = loadConfig();
  setLeaguePath(config.leaguePath);
  const catalog = await loadCatalog();

  if (args.includes('--list-ranks')) {
    printRanks(catalog, config.language);
    return;
  }

  if (args.includes('--doctor')) {
    await runDoctor(config);
    return;
  }

  if (needsSetup || args.includes('--setup')) {
    await runSetup(config, catalog);
    setLanguage(config.language);
  }

  const demoMode = args.includes('--demo');
  const t = createTranslator(config.language);

  const ipc = new DiscordIPC(config.discordClientId);
  let connected = false;
  let nextConnectAttempt = 0;

  ipc.on('disconnect', (err) => {
    connected = false;
    nextConnectAttempt = Date.now() + RECONNECT_DELAY_MS;
    log.warn(m('discord.lost', err.message));
  });

  async function ensureDiscord() {
    if (connected) return true;
    if (Date.now() < nextConnectAttempt) return false;

    try {
      const user = await ipc.connect();
      connected = true;
      log.discord(m('discord.connected', user?.username ?? m('discord.unknownUser')));
      return true;
    } catch (err) {
      nextConnectAttempt = Date.now() + RECONNECT_DELAY_MS;
      log.warn(err.message);
      return false;
    }
  }

  let lastPayload;
  let lastSignature;
  let startedAt = Date.now();
  let clockSynced = false;
  let leagueWasUp = true;
  let paused = false;

  async function tick() {
    if (paused) return;
    if (!(await ensureDiscord())) return;

    let presence = null;
    if (demoMode) {
      presence = nextDemoPresence();
    } else {
      try {
        presence = await fetchLeaguePresence();
        if (!leagueWasUp) {
          leagueWasUp = true;
          log.league(m('league.backOnline'));
        }
      } catch (err) {
        if (leagueWasUp) {
          leagueWasUp = false;
          log.league(m('league.presenceFailed', err.message));
        }
        // The summoner and the picked champion belong to one client session,
        // so both are dropped when the client goes away.
        resetSessionCache();
      }
    }

    // A state signature drives the elapsed timer: when it changes the counter
    // in Discord restarts, so it measures the match rather than the process.
    const signature = presence
      ? [presence.phase, presence.queueId, presence.championId, presence.championName].join('|')
      : 'offline';

    if (signature !== lastSignature) {
      lastSignature = signature;
      startedAt = Date.now();
      clockSynced = false;
    }

    // Once the match reports its own clock, the timer is rewound to match it.
    // That is what makes the count right after a mid-game start, and it is
    // done once per state so the payload does not drift on every poll.
    if (!clockSynced && presence?.gameTimeMs > 0) {
      startedAt = Date.now() - presence.gameTimeMs;
      clockSynced = true;
    }

    let activity = null;
    if (presence) {
      activity = buildActivity({ presence, catalog, config, t, startedAt });
    } else if (config.idle.showWhenGameClosed) {
      activity = buildIdleActivity({ config, t, startedAt });
    }

    const payload = JSON.stringify(activity);
    if (payload === lastPayload) return;
    lastPayload = payload;

    ipc.setActivity(activity);
    if (activity) {
      log.info(`${activity.details ?? ''}${activity.state ? ` | ${activity.state}` : ''}`);
      log.debug(JSON.stringify(activity));
    } else {
      log.info(m('app.cleared'));
    }
  }

  log.ok(m('app.running', config.pollIntervalMs));
  if (demoMode) log.warn(m('app.demo'));
  log.info(
    config.rank.mode === 'override'
      ? m('app.rankOverride', describeRank(config, catalog))
      : m('app.rankMode', config.rank.mode),
  );
  // Setting league points and seeing nothing change is a dead end, so both
  // reasons it can be a no-op are called out explicitly.
  if (Number(config.rank.leaguePoints) > 0) {
    const overriddenTier =
      config.rank.mode === 'override'
        ? catalog.resolveRank(config.rank.override, config.language)
        : null;

    if (overriddenTier !== null && !catalog.isRanked(overriddenTier)) {
      const chosen = localizeRankName(catalog.rank(overriddenTier).name, config.language);
      log.warn(m('app.lpNeedsRank', chosen));
    } else if (!config.display.showRankInText) {
      log.warn(m('app.tooltipOnly'));
    }
  }

  await tick();
  const timer = setInterval(() => {
    tick().catch((err) => log.error(err.stack ?? err.message));
  }, config.pollIntervalMs);

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(timer);
    detachHotkeys();
    log.info(m('app.shuttingDown'));
    if (connected) ipc.clearActivity();
    // Give the clearing frame a moment to reach the pipe.
    setTimeout(() => {
      ipc.destroy();
      process.exit(0);
    }, 300);
  };

  /**
   * Raw mode lets a single keypress act without Enter, which is what makes
   * changing the rank feel immediate. It also swallows Ctrl+C, so that has
   * to be handled by hand. The listener is detached while a prompt is open,
   * because readline needs stdin back in line mode.
   */
  async function onKey(key) {
    if (key === CTRL_C || key === 'q' || key === 'Q') {
      shutdown();
      return;
    }
    if (key !== 'r' && key !== 'R') return;

    paused = true;
    detachHotkeys();
    try {
      await changeRank(config, catalog);
      resetOverrideWarning();
      lastPayload = undefined; // force the next tick to resend
    } catch (err) {
      log.error(err.message);
    } finally {
      paused = false;
      attachHotkeys();
    }
    await tick();
  }

  function attachHotkeys() {
    if (!stdin.isTTY) return;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onKey);
  }

  function detachHotkeys() {
    stdin.off('data', onKey);
    if (stdin.isTTY) stdin.setRawMode(false);
    stdin.pause();
  }

  attachHotkeys();
  if (stdin.isTTY) log.info(m('setup.hotkeys'));

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  log.error(err.message);
  log.debug(err.stack);
  process.exitCode = 1;
});
