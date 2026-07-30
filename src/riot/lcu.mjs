import https from 'node:https';
import { readLockfile } from './lockfile.mjs';
import { m } from '../i18n.mjs';

// Both local APIs are served over a self-signed certificate, so verification
// has to be off. Everything stays on 127.0.0.1 — nothing leaves the machine.
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

/** The running match serves its own API here, on a port that never changes. */
const LIVE_GAME_PORT = 2999;

class LeagueClientClosedError extends Error {
  constructor() {
    super(m('league.clientClosed'));
    this.name = 'LeagueClientClosedError';
  }
}

/**
 * Resolves to the parsed body, or to null on 404.
 *
 * Most of what is asked for here only exists during part of a game — there is
 * no lobby on the main menu and no champion select once the game starts — and
 * both APIs answer 404 for those. That is an expected state rather than a
 * failure, so it is not worth an exception.
 */
function request({ port, endpoint, auth, timeout }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: '127.0.0.1',
        port,
        path: endpoint,
        method: 'GET',
        agent,
        headers: auth
          ? { Authorization: auth, Accept: 'application/json' }
          : { Accept: 'application/json' },
        timeout,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode === 404) {
            resolve(null);
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`${endpoint} -> HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`${endpoint} -> invalid JSON`));
          }
        });
      },
    );

    req.on('timeout', () => req.destroy(new Error(`${endpoint} -> timed out`)));
    req.on('error', reject);
    req.end();
  });
}

/** A call against the League Client itself, authenticated with the lockfile. */
export async function lcu(endpoint) {
  const lock = readLockfile();
  if (!lock) throw new LeagueClientClosedError();
  return request({ port: lock.port, endpoint, auth: lock.auth, timeout: 5000 });
}

/**
 * A call against the Live Client Data API, which the game process — not the
 * client — exposes without any authentication.
 *
 * It exists only while a match is actually on screen, so a refused connection
 * is the normal answer between games. Every failure is reported as "no live
 * data" rather than propagated, and the timeout is short so a game that is
 * still loading cannot stall the poll loop.
 */
export async function liveGame(endpoint) {
  try {
    return await request({ port: LIVE_GAME_PORT, endpoint, timeout: 2000 });
  } catch {
    return null;
  }
}

export { LeagueClientClosedError, LIVE_GAME_PORT };
