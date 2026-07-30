<div align="center">

# discord-lol-rpc

**Discord Rich Presence for League of Legends — and you pick the rank it shows.**

[![CI](https://github.com/6can/discord-lol-rpc/actions/workflows/ci.yml/badge.svg)](https://github.com/6can/discord-lol-rpc/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/6can/discord-lol-rpc?color=1f6feb)](https://github.com/6can/discord-lol-rpc/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/6can/discord-lol-rpc/total?color=2da44e)](https://github.com/6can/discord-lol-rpc/releases)
[![License](https://img.shields.io/badge/license-MIT-1f6feb)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white)](#)
[![Dependencies](https://img.shields.io/badge/dependencies-0-2da44e)](package.json)

</div>

No dependencies, no build step, no Riot login. Set it up once from the console
and forget about it.

## Install

### Download (easiest)

1. Grab the latest zip from [**Releases**](https://github.com/6can/discord-lol-rpc/releases/latest) and extract it anywhere.
2. Double-click **`start.bat`**. If Node.js is missing it offers to install it for you.
3. The console walks you through the rest — Application ID, language, rank.

### From source

```bash
git clone https://github.com/6can/discord-lol-rpc
cd discord-lol-rpc
npm start
```

## First run

Everything happens in the console except creating the Discord application, which
takes a minute in the browser.

**1. Create the app.** Go to
[discord.com/developers/applications](https://discord.com/developers/applications)
→ **New Application** and name it **`League of Legends`**. That name is the title
Discord displays, so anything else will show up instead.

**2. Copy the Application ID** from *General Information*. It is the long number
— not a bot token, not the public key.

**3. Run it.** The wizard asks for that ID, then your language and which rank to
show.

That's it. Re-run the wizard any time with `npm run setup`.

## What it shows

| Where you are | Card reads |
| --- | --- |
| Main menu | `Main Menu` |
| Lobby or queue | `In Queue — Ranked Solo/Duo` · `Party 2/5` |
| Champion select | `Champion Select` · `Ranked Solo/Duo — Ahri` |
| In a game | `Ranked Solo/Duo — Ahri` · `9 / 2 / 14 • 178 CS` |

The champion's tile art is the large image, your rank crest the small one, and
the timer counts the match — not how long this has been running, so it is still
right if you start it mid-game.

## Changing the rank

While it's running, press **`r`**. Pick a new rank, and Discord updates
immediately — no restart.

| Mode | Shows |
| --- | --- |
| My real rank | Whatever the client reports |
| A rank I choose | Any tier, from Unranked to Challenger |
| No rank badge | Nothing |

Rank names and tier numbers both work, and the division can be a numeral or a
digit: `Challenger`, `Diamond IV`, `Gold 2`, `31`. `npm run ranks` lists them
all.

Press **`q`** to quit.

## Settings

Everything the wizard writes lives in `config.json`, and there are a few extras
you can only set by editing it:

```json
{
  "discordClientId": "1234567890123456789",
  "language": "en",
  "pollIntervalMs": 3000,
  "leaguePath": "",

  "rank": {
    "mode": "real",
    "override": "Challenger",
    "leaguePoints": 0,
    "queue": "solo"
  },

  "display": {
    "showKda": true,
    "showParty": true,
    "showLevel": false,
    "showRankInMenus": true,
    "showRankInText": false,
    "largeImage": "champion",
    "buttons": []
  },

  "idle": {
    "showWhenGameClosed": false,
    "text": "League closed"
  }
}
```

- **`display.showRankInText`** — writes the rank onto the card as text
- **`rank.queue`** — `solo` or `flex`, which ladder the real rank comes from
- **`rank.leaguePoints`** — an LP number to show; see below
- **`display.largeImage`** — `champion` (champion in a game, profile icon
  otherwise), `icon`, or `rank`
- **`display.buttons`** — up to two: `[{ "label": "Profile", "url": "https://..." }]`
- **`language`** — `en` or `tr`, applies to both Discord and the console
- **`leaguePath`** — only needed if League is installed somewhere the lookup
  misses; the folder that contains `LeagueClient.exe`

### League points

Pick a rank in the wizard and it asks for an LP number; press Enter to skip:

```
     Rank name or tier number (e.g. Challenger, Gold II, 31)
  > Challenger
     League points to show? (Enter to skip)
  > 1204
  Rank is now: Challenger 1204 LP
```

Unranked is not asked and clears whatever was there, so `1204 LP` never ends up
stuck to an Unranked badge. In `real` mode the number the client reports is used
as-is.

By default it shows in the badge tooltip, together with the rank name — hover
the badge and you get `Challenger 1204 LP`. To put it on the card as text
instead, where it is visible without hovering, turn on `showRankInText`:

```json
"display": { "showRankInText": true }
```

```
League of Legends
Ranked Solo/Duo — Ahri
9 / 2 / 14 • 178 CS • Challenger 1204 LP
```

## Commands

```bash
npm start          # run it
npm run setup      # re-run the wizard
npm run ranks      # list every rank name
npm run doctor     # diagnose Discord connection problems
npm run demo       # preview in Discord without launching League
npm run debug      # verbose output
npm test           # run the test suite
```

## Troubleshooting

**Nothing appears in Discord.** Discord → Settings → **Activity Privacy** →
"Share your detected activities" has to be on. You also can't see your own Rich
Presence — check from another account or a server member list.

**"No Discord IPC socket found".** Run `npm run doctor` — it checks which
Discord build is running, whether the socket exists and whether a handshake
gets through, then tells you which of these it is:

- Discord is not running, or only the browser version is — that one has no
  Rich Presence at all.
- Discord came from the **Microsoft Store**. That build is sandboxed and never
  exposes the socket. Uninstall it and use the installer from
  [discord.com/download](https://discord.com/download).
- Discord just started and has not opened the socket yet.
- One side is elevated. Run both as administrator, or both as a normal user.

**"League Client is not running".** `npm run doctor` also prints every path the
lockfile was looked for in. League can be installed on any drive, so if none of
them is where yours actually is, set `leaguePath` in `config.json`.

**"Invalid Client ID".** That's the Application ID (17–20 digits), not a bot
token.

**No K/D/A during a game.** The scoreboard comes from the game itself, which
only answers once the match window is up — during loading, and while
spectating, there is nothing to read. Everything else keeps working.

Run `npm run debug` to see exactly what is being sent.

## How it works

While the League Client runs it writes its local API port and password to a
lockfile in its install folder. discord-lol-rpc reads those and asks
`127.0.0.1` for the gameflow phase, the lobby, champion select, your ranked
stats and your summoner — then writes it to Discord's IPC named pipe as Rich
Presence. During a game the scoreboard comes from the Live Client Data API the
game itself serves on port 2999.

Rank crests and profile icons come from
[Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon), champion
tiles from [Community Dragon](https://communitydragon.org), fetched once a week
and cached to disk so it also works offline. Both are picked for shape: Discord
fits a card image into a square, so anything 16:9 comes out small and far away.
Nothing else leaves your machine: no Riot login, no credentials, no game files
touched.

## Notes

The rank override is cosmetic and local. It changes the badge on your own
Discord presence and nothing else — not the game, not your account, not your
actual rank.

Not affiliated with Riot Games.

## License

[MIT](LICENSE)
