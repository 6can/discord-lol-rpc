/**
 * Every piece of text in the project lives here, in one table per language.
 *
 * Adding a language means adding one entry to each of the five tables below.
 * Missing keys fall back to English, so a partial translation still runs.
 */

/** Console output. */
const MESSAGES = {
  en: {
    'config.unreadable': 'Could not read config.json (invalid JSON?): {0}',
    'config.badRankMode': 'rank.mode "{0}" is not valid, falling back to "real".',
    'config.badRankQueue': 'rank.queue "{0}" is not valid, falling back to "solo".',

    'catalog.fromCache': 'Catalog loaded from cache.',
    'catalog.updated': 'Catalog updated (patch {0}, {1} champions, {2} skins).',
    'catalog.writeFailed': 'Could not write the catalog cache: {0}',
    'catalog.offline': 'ddragon.leagueoflegends.com is unreachable ({0}), using the cached catalog.',
    'catalog.unavailable': 'Catalog download failed and no cache exists: {0}',

    'league.clientClosed': 'League Client is not running (no lockfile).',
    'league.notInstalled':
      'Could not find the League of Legends install directory. Set "leaguePath" in config.json ' +
      'to the folder that contains LeagueClient.exe.',
    'league.presenceFailed': 'Could not read the client: {0}',
    'league.backOnline': 'League Client is reachable again.',

    'discord.noSocket':
      'No Discord IPC socket found. The Discord desktop app has to be running ' +
      '(the browser version has no Rich Presence). Run "npm run doctor" to find out why.',

    'doctor.title': 'Discord connection report',
    'doctor.verdict': 'Verdict',
    'doctor.allGood': 'Everything works — Discord is reachable.',
    'doctor.notRunning':
      'Discord is not running. Start the desktop app; the browser version has no Rich Presence.',
    'doctor.badClientId':
      'Discord rejected the Application ID. The socket is fine — the id in config.json is wrong. ' +
      'Copy it again from General Information, and run "npm run setup" to replace it.',
    'doctor.noClientId': 'No Application ID set yet. Run "npm run setup" first.',
    'doctor.storeBuild':
      'This is the Microsoft Store build of Discord. It runs sandboxed and does not expose the ' +
      'Rich Presence socket. Uninstall it and install Discord from discord.com/download.',
    'doctor.noPipe':
      'Discord is running but has not opened its Rich Presence socket. Give it a moment after ' +
      'launch, or fully quit it from the tray and reopen it.',
    'doctor.elevation':
      'The socket exists but could not be opened. This usually means one side is elevated: ' +
      'run this and Discord both as administrator, or both as a normal user.',
    'discord.closed': 'Discord closed the connection',
    'discord.socketClosed': 'socket closed',
    'discord.handshakeTimeout': 'handshake timed out',
    'discord.rejected': 'Discord rejected the request: {0}',
    'discord.badFrame': 'discord: skipped a non-JSON frame',
    'discord.connected': 'Connected as {0}',
    'discord.lost': 'Lost the Discord connection ({0}). Will retry.',
    'discord.unknownUser': 'unknown user',

    'rank.unknownOverride':
      'rank.override value "{0}" was not recognised, showing the real rank instead. ' +
      'Run "npm run ranks" for the accepted names.',

    'app.running': 'discord-lol-rpc is running. Press Ctrl+C to stop. (polling every {0} ms)',
    'app.demo': 'DEMO mode: sending synthetic presence instead of the real one.',
    'app.rankOverride': 'Rank mode: override -> "{0}"',
    'app.rankMode': 'Rank mode: {0}',
    'app.tooltipOnly':
      'rank.leaguePoints is set, but the rank only appears in the badge tooltip. ' +
      'Set display.showRankInText to true to put it on the card itself.',
    'app.lpNeedsRank':
      'rank.leaguePoints is set but ignored: LP belongs to a ranked tier, and the chosen ' +
      'rank is {0}.',
    'app.cleared': 'Presence cleared (the League Client is not running).',
    'app.shuttingDown': 'Shutting down, clearing the Discord presence...',

    'ranks.header': 'Available rank values (config.json -> rank.override):',
    'ranks.footer': 'Numbers and names both work: 31, "Challenger", "Gold 2", "Gold II".',

    'setup.title': 'Setup',
    'setup.intro': 'Answer three questions and you are done. Re-run any time with --setup.',
    'setup.step': 'Step {0}/{1}',
    'setup.clientId': 'Discord Application ID',
    'setup.clientIdHelp':
      'Open https://discord.com/developers/applications, click New Application and\n' +
      '     name it League of Legends (that name becomes the title Discord shows).\n' +
      '     Copy the Application ID from General Information.',
    'setup.clientIdInvalid': 'That does not look like an Application ID (17-20 digits). Try again.',
    'setup.language': 'Language',
    'setup.rankTitle': 'Which rank should Discord show?',
    'setup.rankReal': 'My real rank',
    'setup.rankChoose': 'A rank I choose',
    'setup.rankHide': 'No rank badge',
    'setup.rankPrompt': 'Rank name or tier number (e.g. Challenger, Gold II, 31)',
    'setup.rankInvalid': 'Unknown rank. Some valid values: Challenger, Diamond IV, Gold 2, 31.',
    'setup.lpPrompt': 'League points to show? (Enter to skip)',
    'setup.lpInvalid': 'Enter a positive number, or press Enter to skip.',
    'setup.rankNow': 'Rank is now: {0}',
    'setup.saved': 'Saved to {0}',
    'setup.invalidChoice': 'Pick one of the numbers above.',
    'setup.hotkeys': 'Press [r] to change the rank, [q] to quit.',
  },

  tr: {
    'config.unreadable': 'config.json okunamadi (gecersiz JSON olabilir): {0}',
    'config.badRankMode': 'rank.mode "{0}" gecersiz, "real" kullaniliyor.',
    'config.badRankQueue': 'rank.queue "{0}" gecersiz, "solo" kullaniliyor.',

    'catalog.fromCache': 'Katalog onbellekten yuklendi.',
    'catalog.updated': 'Katalog guncellendi ({0} yamasi, {1} sampiyon, {2} kostum).',
    'catalog.writeFailed': 'Katalog onbellege yazilamadi: {0}',
    'catalog.offline': "ddragon.leagueoflegends.com'a ulasilamadi ({0}), onbellek kullaniliyor.",
    'catalog.unavailable': 'Katalog indirilemedi ve onbellek yok: {0}',

    'league.clientClosed': 'League Client kapali (lockfile yok).',
    'league.notInstalled':
      'League of Legends kurulum klasoru bulunamadi. config.json icindeki "leaguePath" ' +
      'degerini LeagueClient.exe dosyasinin bulundugu klasore ayarla.',
    'league.presenceFailed': 'Istemci okunamadi: {0}',
    'league.backOnline': 'League Client tekrar erisilebilir.',

    'discord.noSocket':
      'Discord IPC soketi bulunamadi. Discord masaustu uygulamasi acik olmali ' +
      '(tarayici surumunde Rich Presence yok). Sebebini ogrenmek icin: npm run doctor',

    'doctor.title': 'Discord baglanti raporu',
    'doctor.verdict': 'Sonuc',
    'doctor.allGood': 'Her sey calisiyor - Discord erisilebilir durumda.',
    'doctor.notRunning':
      'Discord calismiyor. Masaustu uygulamasini ac; tarayici surumunde Rich Presence yok.',
    'doctor.badClientId':
      "Discord Application ID'yi reddetti. Soket saglam - config.json'daki id yanlis. " +
      'General Information sekmesinden tekrar kopyala, degistirmek icin: npm run setup',
    'doctor.noClientId': 'Henuz Application ID girilmemis. Once: npm run setup',
    'doctor.storeBuild':
      "Bu Discord'un Microsoft Store surumu. Sandbox icinde calistigi icin Rich Presence " +
      'soketini disariya acmiyor. Kaldirip discord.com/download adresinden kur.',
    'doctor.noPipe':
      'Discord calisiyor ama Rich Presence soketini henuz acmamis. Acilistan sonra biraz bekle, ' +
      'ya da tepsiden tamamen kapatip yeniden ac.',
    'doctor.elevation':
      'Soket var ama acilamadi. Genelde taraflardan birinin yonetici olarak calismasindan olur: ' +
      'ikisini de yonetici olarak ya da ikisini de normal kullanici olarak calistir.',
    'discord.closed': 'Discord baglantiyi kapatti',
    'discord.socketClosed': 'soket kapandi',
    'discord.handshakeTimeout': 'handshake zaman asimi',
    'discord.rejected': 'Discord istegi reddetti: {0}',
    'discord.badFrame': 'discord: JSON olmayan cerceve atlandi',
    'discord.connected': 'Baglandi: {0}',
    'discord.lost': 'Discord baglantisi koptu ({0}). Yeniden denenecek.',
    'discord.unknownUser': 'bilinmeyen kullanici',

    'rank.unknownOverride':
      'rank.override degeri "{0}" taninmadi, gercek rank gosteriliyor. ' +
      'Gecerli isimler icin: npm run ranks',

    'app.running': 'discord-lol-rpc calisiyor. Cikmak icin Ctrl+C. ({0} ms araliklarla)',
    'app.demo': 'DEMO modu: gercek presence yerine sahte veri gonderiliyor.',
    'app.rankOverride': 'Rank modu: override -> "{0}"',
    'app.rankMode': 'Rank modu: {0}',
    'app.tooltipOnly':
      'rank.leaguePoints ayarli ama rank yalnizca rozetin tooltipinde gorunuyor. ' +
      'Kartta yazi olarak gorunmesi icin display.showRankInText degerini true yap.',
    'app.lpNeedsRank':
      'rank.leaguePoints ayarli ama yok sayiliyor: LP dereceli bir kademeye ait, secilen ' +
      'rank ise {0}.',
    'app.cleared': 'Durum temizlendi (League Client calismiyor).',
    'app.shuttingDown': 'Kapaniyor, Discord durumu temizleniyor...',

    'ranks.header': 'Kullanilabilir rank degerleri (config.json -> rank.override):',
    'ranks.footer': 'Sayiyi da ismi de yazabilirsin: 31, "Challenger", "Altin 2", "Altin II".',

    'setup.title': 'Kurulum',
    'setup.intro': 'Uc soru, hepsi bu. Sonradan --setup ile tekrar acabilirsin.',
    'setup.step': 'Adim {0}/{1}',
    'setup.clientId': 'Discord Application ID',
    'setup.clientIdHelp':
      'https://discord.com/developers/applications adresini ac, New Application de ve\n' +
      "     adini League of Legends yap (bu ad Discord'da baslik olarak gorunur).\n" +
      '     General Information sekmesindeki Application ID degerini kopyala.',
    'setup.clientIdInvalid': 'Bu bir Application ID gibi gorunmuyor (17-20 hane). Tekrar dene.',
    'setup.language': 'Dil',
    'setup.rankTitle': "Discord hangi rank'i gostersin?",
    'setup.rankReal': "Gercek rank'im",
    'setup.rankChoose': 'Sectigim bir rank',
    'setup.rankHide': 'Rank gosterme',
    'setup.rankPrompt': 'Rank adi veya tier numarasi (orn. Challenger, Altin II, 31)',
    'setup.rankInvalid': 'Bilinmeyen rank. Gecerli ornekler: Challenger, Elmas IV, Altin 2, 31.',
    'setup.lpPrompt': 'Kac LP yazsin? (Gecmek icin Enter)',
    'setup.lpInvalid': 'Pozitif bir sayi gir, ya da gecmek icin Enter.',
    'setup.rankNow': 'Rank artik: {0}',
    'setup.saved': '{0} dosyasina kaydedildi',
    'setup.invalidChoice': 'Yukaridaki numaralardan birini sec.',
    'setup.hotkeys': 'Rank degistirmek icin [r], cikmak icin [q].',
  },
};

/** Text that ends up in the Discord presence itself. */
const PRESENCE = {
  en: {
    mainMenu: 'Main Menu',
    inLobby: 'In Lobby',
    inQueue: 'In Queue',
    matchFound: 'Match Found',
    champSelect: 'Champion Select',
    reconnecting: 'Reconnecting',
    endOfGame: 'End of Game',
    customGame: 'Custom Game',
    practiceTool: 'Practice Tool',
    party: 'Party',
    level: 'Level',
    playing: 'League of Legends',
  },
  tr: {
    mainMenu: 'Ana Menü',
    inLobby: 'Lobide',
    inQueue: 'Sırada',
    matchFound: 'Maç Bulundu',
    champSelect: 'Şampiyon Seçimi',
    reconnecting: 'Yeniden Bağlanıyor',
    endOfGame: 'Maç Sonu',
    customGame: 'Özel Oyun',
    practiceTool: 'Antrenman Aracı',
    party: 'Grup',
    level: 'Seviye',
    playing: 'League of Legends',
  },
};

/**
 * Queue ids come from the client's gameflow session. Riot publishes a table at
 * static.developer.riotgames.com, but it is English-only and lists every queue
 * ever run, so the handful that are actually playable are kept here instead.
 * Anything missing falls through to the game mode below.
 */
const QUEUES = {
  en: {
    0: 'Custom Game',
    400: 'Normal Draft',
    420: 'Ranked Solo/Duo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM',
    480: 'Swiftplay',
    490: 'Quickplay',
    700: 'Clash',
    720: 'ARAM Clash',
    870: 'Co-op vs. AI Intro',
    880: 'Co-op vs. AI Beginner',
    890: 'Co-op vs. AI Intermediate',
    900: 'ARURF',
    1020: 'One for All',
    1090: 'TFT Normal',
    1100: 'TFT Ranked',
    1130: 'TFT Hyper Roll',
    1160: 'TFT Double Up',
    1300: 'Nexus Blitz',
    1400: 'Ultimate Spellbook',
    1700: 'Arena',
    1710: 'Arena',
    1900: 'URF',
    2000: 'Tutorial',
    2010: 'Tutorial',
    2020: 'Tutorial',
  },
  tr: {
    0: 'Özel Oyun',
    400: 'Normal Seçmeli',
    420: 'Dereceli Tek/Çift',
    430: 'Normal Kör Seçim',
    440: 'Dereceli Esnek',
    450: 'ARAM',
    480: 'Hızlı Oyun',
    490: 'Çabuk Oyun',
    700: 'Clash',
    720: 'ARAM Clash',
    870: 'Yapay Zekâya Karşı: Giriş',
    880: 'Yapay Zekâya Karşı: Acemi',
    890: 'Yapay Zekâya Karşı: Orta',
    900: 'ARURF',
    1020: 'Herkes Bir İçin',
    1090: 'TFT Normal',
    1100: 'TFT Dereceli',
    1130: 'TFT Hiper Tur',
    1160: 'TFT Çiftli',
    1300: 'Nexus Blitz',
    1400: 'Kader Kitabı',
    1700: 'Arena',
    1710: 'Arena',
    1900: 'URF',
    2000: 'Eğitim',
    2010: 'Eğitim',
    2020: 'Eğitim',
  },
};

/**
 * Fallback for queue ids that are not in the table — a rotating game mode or a
 * queue added after this was written still gets a readable name instead of
 * "Custom Game".
 */
const MODES = {
  en: {
    CLASSIC: "Summoner's Rift",
    ARAM: 'ARAM',
    CHERRY: 'Arena',
    URF: 'URF',
    ONEFORALL: 'One for All',
    NEXUSBLITZ: 'Nexus Blitz',
    ULTBOOK: 'Ultimate Spellbook',
    TFT: 'Teamfight Tactics',
    PRACTICETOOL: 'Practice Tool',
    TUTORIAL: 'Tutorial',
  },
  tr: {
    CLASSIC: 'Sihirdar Vadisi',
    ARAM: 'ARAM',
    CHERRY: 'Arena',
    URF: 'URF',
    ONEFORALL: 'Herkes Bir İçin',
    NEXUSBLITZ: 'Nexus Blitz',
    ULTBOOK: 'Kader Kitabı',
    TFT: 'Teamfight Tactics',
    PRACTICETOOL: 'Antrenman Aracı',
    TUTORIAL: 'Eğitim',
  },
};

/**
 * Rank tier words. Only languages that actually rename the tiers need an entry,
 * and only for the tiers they rename: the Turkish community says "Master" and
 * "Challenger" in English, so those are left alone rather than invented.
 */
const RANK_NAMES = {
  tr: {
    UNRANKED: 'Derecesiz',
    IRON: 'Demir',
    BRONZE: 'Bronz',
    SILVER: 'Gümüş',
    GOLD: 'Altın',
    PLATINUM: 'Platin',
    EMERALD: 'Zümrüt',
    DIAMOND: 'Elmas',
    MASTER: 'Master',
    GRANDMASTER: 'Grandmaster',
    CHALLENGER: 'Challenger',
  },
};

const FALLBACK = 'en';
let current = FALLBACK;

export function setLanguage(language) {
  current = language in MESSAGES ? language : FALLBACK;
  return current;
}

export function getLanguage() {
  return current;
}

export function availableLanguages() {
  return Object.keys(MESSAGES);
}

/** Console message: m('discord.connected', 'hix7') -> "Connected as hix7" */
export function m(key, ...args) {
  const template = MESSAGES[current][key] ?? MESSAGES[FALLBACK][key] ?? key;
  return template.replace(/\{(\d+)\}/g, (match, index) => {
    const value = args[Number(index)];
    return value === undefined ? match : String(value);
  });
}

/** Presence text: t('mainMenu'), t.queue(420) and t.mode('ARAM'). */
export function createTranslator(language) {
  const lang = language in PRESENCE ? language : FALLBACK;
  const t = (key) => PRESENCE[lang][key] ?? PRESENCE[FALLBACK][key] ?? key;
  t.queue = (queueId) => {
    if (queueId === null || queueId === undefined || Number(queueId) < 0) return null;
    return QUEUES[lang][queueId] ?? QUEUES[FALLBACK][queueId] ?? null;
  };
  t.mode = (gameMode) => {
    if (!gameMode) return null;
    const key = String(gameMode).toUpperCase();
    return MODES[lang][key] ?? MODES[FALLBACK][key] ?? null;
  };
  t.lang = lang;
  return t;
}

/**
 * The catalog stores names like "GOLD II". Translates the tier word when the
 * language renames it, otherwise normalises it to Title Case. The division
 * numeral is left exactly as it is.
 */
export function localizeRankName(rawName, lang) {
  if (!rawName) return null;
  const [tierWord, ...rest] = rawName.trim().split(/\s+/);
  const division = rest.join(' ');

  const translated = RANK_NAMES[lang]?.[tierWord.toUpperCase()];
  if (translated) return division ? `${translated} ${division}` : translated;

  const titled = tierWord.charAt(0) + tierWord.slice(1).toLowerCase();
  return division ? `${titled} ${division}` : titled;
}

export { MESSAGES, PRESENCE, QUEUES, MODES, RANK_NAMES };
