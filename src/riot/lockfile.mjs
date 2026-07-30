import fs from 'node:fs';
import path from 'node:path';

/**
 * While the League Client is running it writes its local API credentials to a
 * lockfile in its own install directory:
 *   <install>\lockfile
 * Format: name:pid:port:password:protocol
 *
 * The file is deleted on exit, so its presence doubles as "client is running".
 *
 * Unlike the Riot Client, League has no fixed home under %LOCALAPPDATA% — it
 * can sit on any drive — so the directory is looked up rather than assumed.
 */

const METADATA_PATH = path.join(
  process.env.ProgramData ?? 'C:\\ProgramData',
  'Riot Games',
  'Metadata',
  'league_of_legends.live',
  'league_of_legends.live.product_settings.yaml',
);

const DEFAULT_DIR = 'C:\\Riot Games\\League of Legends';

let configuredDir = '';

/** Lets config.json point at an install the lookup below cannot find. */
export function setLeaguePath(dir) {
  configuredDir = String(dir ?? '').trim();
}

/**
 * The installer records where it put the game. Only one line is needed, so the
 * file is read with a regex instead of pulling in a YAML parser:
 *   product_install_full_path: "D:/Riot Games/League of Legends"
 */
function installDirFromMetadata() {
  try {
    const yaml = fs.readFileSync(METADATA_PATH, 'utf8');
    const match = /^product_install_full_path:\s*"?(.+?)"?\s*$/m.exec(yaml);
    return match ? path.normalize(match[1]) : null;
  } catch {
    return null;
  }
}

/** Every place the lockfile could be, in the order they are tried. */
export function candidatePaths() {
  const dirs = [configuredDir, installDirFromMetadata(), DEFAULT_DIR].filter(Boolean);
  return [...new Set(dirs)].map((dir) => path.join(dir, 'lockfile'));
}

export function findLockfile() {
  return candidatePaths().find((file) => fs.existsSync(file)) ?? null;
}

export function readLockfile() {
  const file = findLockfile();
  if (!file) return null;

  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8').trim();
  } catch {
    return null;
  }

  const parts = raw.split(':');
  if (parts.length < 5) return null;

  const [name, pid, port, password, protocol] = parts;
  return {
    name,
    pid: Number(pid),
    port: Number(port),
    password,
    protocol,
    auth: 'Basic ' + Buffer.from(`riot:${password}`).toString('base64'),
  };
}

export { METADATA_PATH, DEFAULT_DIR };
