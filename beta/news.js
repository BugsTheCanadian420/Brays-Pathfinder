// What's new after an update, a log of problems (to copy into a bug report), and the About & help card in Settings.
// Works the same in the PC app and on the website.
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off */ } };
  const SITE = 'https://d2pathfinder.com';

  // ---- what changed: newest first ----
  // Small changes collect in one entry marked draft: true. Nobody sees a draft (no pop-up, no "new" badge, not in the list).
  // Only when Bray says an actual update is rolling out does the draft lose its draft mark and get posted. Never add an
  // entry for every small change.
  const ALL = [
    { id: 20, draft: true, date: 'Nov 2026', items: [
      'A new look for God rolls: big filter tiles for God rolls, S rated, Keepers, Not keepers and Not rated yet, search and sort, and a card for each weapon with its grade, main perks and which perks your wish list wants.',
      'The Helpful tab is now called Guides.',
      'Your account in the top right: your profile picture (add one in Settings > Accounts, then drag, zoom and turn it to fit the circle) and display name. Click it for Settings, Help & support, Get the app and Sign out. The gear button is gone, and the Beta switch sits next to your account.',
      'A lock by the accent colours in Settings > Appearance keeps your look as it is. Bray and Manta unlock their own styles to change anything about them, and locking sends the new look to everyone using that style.',
      'Hidden login names and passwords always show 12 dots, whatever their length.',
      'A headphones button next to Notes opens Help from any tab (turn it off in Settings > About & help). Help now comes before Problems there.',
      'Keyboard shortcuts can be switched off in Settings > Shortcuts. Quick notes open with Shift+N (Ctrl+Shift+N opens a private window in browsers).',
      'The Weapon pop-up option "God roll style" is now called Pathfinder Style, Settings sections are in a new order (Appearance comes second), and Keyboard shortcuts and Founder panel are now just Shortcuts and Founder.',
      'Help desk (team): an open request updates by itself every few seconds, shows who else on the team has it open and whether they are typing, and a reply you send after someone else already answered waits so you can read theirs first (Send anyway sends it).',
      'Phones: the weapon views (Finder and God rolls) start below the status bar so their X can always be reached, cover the tab bar, and close when you switch tabs. Signing in to Bungie from Pathfinder on the home screen no longer waits for ever: Get my accounts brings your Bungie accounts in from your Pathfinder account.',
      'Finder: How to get says what to do, not just where (finish the raid or dungeon encounters, Master for Adept copies, the weekly Nightfall weapon, Trials Flawless and so on), lists what has to be done before an exotic quest opens (like finishing a campaign), and weapons that no longer drop are tagged on the card and in the weapon view.',
      'Loadout pictures have a QR code of the share link: point your phone camera at it to open the loadout in Pathfinder, or paste the picture into Import loadout on PC as before. On a phone\'s browser, the shared loadout has a Copy link button for pasting it into Pathfinder on your home screen. Older pictures still import.',
      'Sync across devices keeps each setting you change: changing one setting on one device no longer puts back your other settings from that device (like the weapon pop-up going back to Classic).',
      'Inventory: what you search for now shows up in its own results panel in the vault column, beside the Postmaster (click, drag or move them from there), while the rest of your inventory still fades what does not match. The vault counts move onto one line with the results count, the panel grows with the results and then scrolls, and an × clears the search. The magnifier button by the vault is gone; G still opens the God roll finder.',
      'Loadout pictures now import even after Discord or another app re-saves them: copy the picture in Discord and paste it into Import loadout (Ctrl+V or the Paste button). New pictures have a small black-and-white code in the bottom corner for this.',
      'The Hub is now Community sites, with a Join our Discord button. You can also join from Settings, About & help.',
      'About Pathfinder: who makes it and the people who helped, in Settings, About & help and on d2pathfinder.com.',
      'Loadouts: choose mods while you build or edit a loadout. Select mods picks from every mod that fits your armor (the same one more than once if you like) and puts each in a free socket when you apply it, or click one socket to pick exactly what goes there.',
      'DIM loadout links keep their armor mods now (before, a link that also had shaders or ornaments lost its mods).',
      'Loadout pictures can be imported: a picture made with Pathfinder carries its loadout, so choose or drop it in Import. Each picture also shows a short link for when an app re-saved it or someone took a screenshot. Sharing an in-game loadout now brings its mods, subclass and your artifact too.',
      'Drag the tabs along the top bar to put them in your own order (drop one on More to send it to the end).',
      'Settings uses more of a big screen, and still fits phones.',
      'Phones: a search button in the top bar opens a full-width search, text boxes no longer zoom the page in on iPhone, bigger buttons for fingers, and Notes, Home, the Optimizer, the Organizer, the loadout editor and the item pop-up all fit small screens properly.',
      'Help: when you are not signed in to a Pathfinder account, the help form offers to sign you in so the team knows who they are talking to.',
      'Checklist ticks itself: this week\'s and today\'s activities from the game get their own sections and tick on each character as you finish them, and Weekly Nightfall ticks itself too. Click any item to choose an in-game activity that ticks it.',
      'New Clan tab: your clan\'s banner, level and weekly clan XP, the full roster with ranks, who is online and what they are playing, power and when they joined, and how much clan XP each member earned this week.',
      'Clan admins can promote, demote, remove and ban members, hand over founder, approve or decline join requests, invite players by Bungie name, cancel invites, unban, and edit the clan\'s name, tag, motto, about text and who can join. Not in a clan? Search for one by name.',
      'Guides: five more exotic missions (Derealize, Heliostat, Fire and Ice, Dual Destiny and the Oblation missions), much fuller walkthroughs for Seraph\'s Shield, Starcrossed (with its hidden chests), Vox Obscura and Presage, and guide cards now show their pictures instead of plain colour.',
      'The top bar no longer moves when you switch tabs, and the search box is on every page: type in it from anywhere to search your Inventory.',
      'No more flash when the app opens: it goes straight to your start page instead of showing Inventory for a moment or fading the page in twice, and pages no longer shift sideways when a scrollbar appears.',
      'Loadouts: if your browser blocks copying a share link, Pathfinder now says so and selects the link for you to copy.',
      'Polish everywhere: clearer stats on phones (Crucible, Play time, Personal bests), a cleaner Xûr countdown, a tidier Checklist on phones, and the Checklist, Roll Tracker and Organizer on the same glass panels as the rest of the beta look.',
      'God rolls: clicking a weapon opens its own God roll view (in the same style as the cards) with every perk column, which perks your wish list wants and what is in now. Pick perks or press Pick my wish list perks, then Apply. Tag, move, equip and lock from the same view.',
      'Changing perks now checks with Bungie: Pathfinder only shows the new perk once Bungie confirms it, and tells you if the change did not go through (perk changes only work in orbit, a social space or offline). The God roll card updates straight away too.',
      'Stricter God rolls: a weapon is only a god roll when the perk in every column right now (barrel, magazine, both traits; rail and bolts on combat bows; the origin trait when it matters) is the top pick from a best-perk-per-column list for an S tier weapon (Aegis), or from a roll its curator tags as a god roll. S tier weapons that are not there yet go in the new S rated group (search is:srated), and the God roll view says which columns miss the top perk and whether Apply can fix it.',
      'New option in Settings > Appearance: Weapon pop-up in Inventory. Pick Pathfinder Style and clicking a weapon in your inventory opens the God roll view (every perk column, wish list picks, Apply, tag, move, equip). Its Classic details button still opens the full pop-up, and armour keeps the classic one.',
      'Pathfinder account: a Bungie account you add on the website now also works in the PC app and the other way round (no second sign-in), and your Pathfinder account syncs every time Pathfinder opens or you come back to it, so new accounts show up on your other devices straight away.',
      'New Finder tab (like destiny.report): search any weapon in the game to see every perk it can roll today, column by column (perks that no longer drop are left out), or search a perk to see every weapon that can roll it and in which column. Filter by weapon type, see which ones you own, and jump to your copies or the Wish list maker.',
      'God rolls: every God roll and S rated weapon now says whether it is a PvE or PvP roll, and a new All / PvE / PvP switch at the top shows only the ones you are hunting for (Aegis lists count as PvE; other lists go by their pve/pvp tags).',
      'Five new background pictures in Settings > Appearance: Shrouded Statue, Frozen Array, Europa Pyramid, Tower Sunrise and Open Valley.',
      'Pathfinder accounts now work like Steam: a display name everyone sees and a private login name you sign in with. Click your name at the top for Account settings, where you can change your display name, login name and password. Your login name stays hidden as dots unless you press the eye (handy on stream).',
      'Forgot your password? The Accounts page now sends you to the Help Desk, where the team can reset it for you.',
    ] },
    { id: 19, date: 'Nov 2026', items: [
      'When Bungie is down, the vault you loaded last stays on screen (read-only) with a line saying when it is from, and Pathfinder tries again every 2 minutes. A bar under the tabs shows Bungie\'s maintenance timeline in your own time.',
      'Help: ask a question, report a bug or suggest an idea in Settings, About & help. The team answers right there; open conversations update by themselves.',
      'A notification when the team answers your help request (PC app, and the website while it is open).',
      'Optimizer: stat mods can be +5 or +10, and when no set reaches every minimum you get the closest ones, with how far short each stat is.',
      'A short tour for new players, and this list can now be switched off (Settings, About & help).',
      'The status page shows Bungie\'s maintenance timeline. Announcements from the Pathfinder team show at the top of the app.',
    ] },
    { id: 18, date: 'Nov 2026', items: [
      'Beta interface style, second pass: rounded glass panels with depth, modern lettering, the current tab as a soft pill, and gentle accent light over the contour map.',
      'A beta copy of the website can now be published at d2pathfinder.com/beta to try changes before everyone gets them. When one is up, Settings, About and help shows "Try the beta".',
    ] },
    { id: 17, date: 'Nov 2026', items: [
      'More small animations: buttons give a little when pressed, cards rise slightly under the pointer, item tiles brighten, windows like the god roll finder and What\'s new settle into place, menus fade in, and the progress bars on Home fill up. Settings, Appearance, Animations: Off, Subtle or Full.',
      'Fixed: a dragged item trailed slightly behind the pointer. It follows exactly again.',
    ] },
    { id: 16, date: 'Nov 2026', items: [
      'Pop-ups fit and sit in the right place at any Interface scale, window size and position: the item pop-up opens next to its item, stays below the top bar and above the phone tab bar, and shrinks to fit a small window instead of running off the edge.',
      'Menus and info boxes (right-click menu, search suggestions, mod info, equip picker) are always kept inside the window.',
      'Interface scale above 100% no longer makes a page wider than the window. Phones and tablets used to shrink the whole page to compensate, so everything came out smaller; now the page is shown as large as fits.',
    ] },
    { id: 15, date: 'Nov 2026', items: [
      'Postmaster: send an item straight to the vault or to another character, from its pop-up, the right-click menu or by dragging it. Pathfinder pulls it out first (making room in that slot if it is full) and then moves it on, like DIM.',
      'New drops over the game (PC app): a small card in the bottom-right corner for a few seconds while the game is in front, in windowed or borderless mode. Switch it off in Settings, Wish lists.',
      'Status page: d2pathfinder.com/status shows whether Pathfinder, its sign-in service and Bungie\'s API are working (About and help, Status).',
    ] },
    { id: 14, date: 'Nov 2026', items: [
      'Beta interface style is now Pathfinder\'s own look, "Trail map": a contour-map background, a route line with a diamond waypoint on the tab you are on and on every section heading, and road-sign lettering. Settings, Appearance, Interface style, Beta.',
      'Loadouts: on the Equipped card, click a subclass ability, aspect or fragment to see the options and equip another one right there.',
      'Keyboard shortcuts you can change (Settings, Keyboard shortcuts). New ones: H, I, O and A switch tabs, G opens the god roll finder.',
      'Rotations: the page reloads by itself when a reset happens, and last week\'s featured raid or dungeon can no longer linger after the weekly reset.',
      'Fixed: an armor stat that tuning takes to -5 showed as 0 in the item pop-up, which made the total 5 too high.',
    ] },
    { id: 13, date: 'Nov 2026', items: [
      'God roll finder (thumbs-up button above the vault): every legendary weapon graded with your wish lists. S = god roll, A = keeper, C/D = safe to dismantle, ? = not rated yet.',
      'Weapons that no wish list mentions get a small ? instead of nothing, so a blank tile always means "not a keeper". Search is:unrated, is:godroll, is:keeper or is:notkeeper.',
      'New drop alerts: while you are in the game, Pathfinder checks every 10 seconds and pops up each new weapon as God roll, Keeper, Not a keeper or Not yet rated. Bungie\'s API only, like DIM.',
      'Collect Postmaster now makes room like DIM (moves your least wanted gear in that slot to the vault first) and pulls engrams too. Phones now show the status line above the tab bar.',
      'Subclass pop-up laid out like DIM: super, abilities, aspects and fragments. Click one to see the options, click an option to equip it.',
      'Arc, Solar and Void marks on item tiles are in their element colors. A refreshed Hub, activity-colored glows and new Settings: animations, activity pictures, glow strength and the tab the app opens on.',
    ] },
    { id: 12, date: 'Nov 2026', items: [
      'Wish lists now pick the same roll as DIM (the first roll in your lists that fits), so the thumbs, the note and Preview Wishlist Perks match DIM.',
      'Item pop-up: weapon perks in DIM\'s order (traits at the top, barrel at the bottom), only real perks in the list, and mods and cosmetics in one row at the bottom. Tier 5 armor shows its tuning (+5 / -5), including a stat that goes to -5.',
      'Loadouts: click an item to open its pop-up, or an ability, mod or artifact perk to see what it does.',
      'Loadout picture: all six stats for every armor piece in the game\'s order, with the tuning marked; the subclass in the game\'s order.',
      'Settings: two columns, faster, Tabs inside Display, My wish list inside Wish lists, Updates and help@d2pathfinder.com in About & help.',
      'Moves made in the game or in DIM show up as soon as Bungie has them (they could stay hidden for minutes). No more flash of the plain page when it loads.',
    ] },
    { id: 11, date: 'Nov 2026', items: [
      'Sharing Equipped (link, picture or code) now includes your armor mods, subclass setup and artifact, like a saved loadout.',
      'Fragments in slots your aspects do not open (greyed out in game) no longer show up in loadouts, pictures or shares. Older saved loadouts are cleaned up automatically.',
      'The loadout picture has a card for each armor piece: its archetype (Paragon, Brawler...), tier, set, its own stats and its mods, plus a bigger stats panel and larger perk icons.',
    ] },
    { id: 10, date: 'Nov 2026', items: [
      'Website: on a phone, Pathfinder offers to install itself to your home screen so it opens full-screen like an app.',
      'Website on a Windows PC: a Get the app button downloads the newest PC app from d2pathfinder.com/download.',
    ] },
    { id: 9, date: 'Nov 2026', items: [
      'Share links show a preview card in Discord and other apps: the loadout picture, its name and a summary of the gear.',
      'Vault cleanup (the bin button in Inventory) replaces the junk finder: tabs for trash rolls and duplicates, low armor stats, low power and tagged junk, with checkboxes and bulk Tag junk, Move to vault and Keep.',
      'About & help in Settings: this list, a log of problems you can copy into a bug report, and the privacy page.',
      'Windows: the taskbar right-click menu gets the new Pathfinder icon (it can take a restart of the app to show).',
    ] },
    { id: 8, date: 'Nov 2026', items: [
      'Equipped weapons and armor can be dragged to another character or the vault: something else is equipped in their place first, like DIM.',
      'Moves stay correct while Bungie catches up, even after a restart.',
      'The loadout picture gives every subclass icon a background in your element colour.',
    ] },
    { id: 7, date: 'Nov 2026', items: [
      'Wish lists sync between the PC app and the website (links, pasted lists and My wish list).',
      'The website no longer crashes on phones while it downloads item data.',
      'The item popup fits phone screens.',
    ] },
    { id: 6, date: 'Nov 2026', items: [
      'Settings are laid out in balanced columns, and Appearance is split into Appearance and Display.',
      'Removed: the pinned quests strip, the This Week tab and App open for.',
      'Crucible play time counts your matches even when Bungie\'s summary is empty.',
    ] },
  ];
  const CHANGES = ALL.filter((c) => !c.draft);
  const LATEST = CHANGES[0].id;

  // ---- problem log ----
  const LOGK = 'gt_errlog', MAXLOG = 60;
  function log(msg, where) {
    const m = String((msg && (msg.message || msg)) || '').replace(/\s+/g, ' ').trim().slice(0, 400); if (!m) return;
    const L = lsGet(LOGK, []), last = L[L.length - 1];
    if (last && last.m === m) { last.n = (last.n || 1) + 1; last.t = Date.now(); } else L.push({ t: Date.now(), m, w: String(where || '').slice(0, 40) });
    while (L.length > MAXLOG) L.shift();
    lsSet(LOGK, L);
    const c = document.getElementById('gtab'); if (c && document.getElementById('settings') && document.getElementById('settings').classList.contains('on')) drawCard();
  }
  window.__gtLog = log;
  window.addEventListener('error', (e) => { if (e && (e.message || e.error)) log((e.error && e.error.message) || e.message, (e.filename || '').split('/').pop() + (e.lineno ? ':' + e.lineno : '')); });
  window.addEventListener('unhandledrejection', (e) => { const r = e && e.reason; log((r && r.message) || r || 'Unknown error', 'promise'); });

  let VER = window.__GT_VER__ || '', UPD = {};
  // Testers and up, in the regular PC app: a button to the PC beta (Pathfinder Beta) installer on the GitHub releases page.
  const BETA_APP_URL = 'https://github.com/BugsTheCanadian420/Brays-Pathfinder/releases/tag/beta';
  const betaAppBtn = () => (!isWeb() && !/-beta/i.test(VER) && (document.documentElement.hasAttribute('data-gttester') || document.documentElement.hasAttribute('data-gtdev')) ? '<button class="g" data-ab="betaapp" title="Pathfinder Beta: the next version early, as its own app next to this one. It copies your settings the first time.">Get the beta app</button> ' : '');
  const isWeb = () => !!window.__GT_WEB__ || document.documentElement.classList.contains('gtweb');
  const HELP = 'help@d2pathfinder.com';
  if (window.gt && window.gt.updInfo) {
    window.gt.updInfo().then((u) => { UPD = { ...UPD, ...(u || {}) }; if (!VER) VER = (u && u.current) || ''; drawCard(); }).catch(() => {});
    if (window.gt.onUpdate && !isWeb()) window.gt.onUpdate((u) => { UPD = { ...UPD, ...(u || {}) }; const c = document.getElementById('gtab'); if (c) drawCard(); });
  }
  function updLine() {
    if (isWeb()) return 'This is the website: it is always the newest version when you open or reload it.';
    if (!UPD.canUpdate) return 'Updates work in the installed app.';
    return { idle: 'Up to date.', current: 'You have the newest version.', checking: 'Checking for updates...', downloading: 'Downloading the update ' + (UPD.pct || 0) + '%...', ready: 'Update ready. Restart to install it.', error: 'Could not check: ' + (UPD.error || 'unknown error') }[UPD.state] || 'Up to date.';
  }
  function report() {
    const L = lsGet(LOGK, []);
    const lines = ['Pathfinder ' + (VER || '?') + ' (' + (isWeb() ? 'website' : 'PC app') + ')', navigator.userAgent, 'Screen ' + innerWidth + 'x' + innerHeight + ' @' + (window.devicePixelRatio || 1), ''];
    if (!L.length) lines.push('No problems logged.');
    L.slice(-30).forEach((x) => lines.push(new Date(x.t).toISOString().replace('T', ' ').slice(0, 19) + '  ' + x.m + (x.n > 1 ? '  (x' + x.n + ')' : '') + (x.w ? '  [' + x.w + ']' : '')));
    return lines.join('\n');
  }
  async function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); return true; } } catch (e) { /* try the app */ }
    try { if (window.gt && window.gt.writeClipboard) { await window.gt.writeClipboard(t); return true; } } catch (e) { /* no clipboard */ }
    return false;
  }
  const openLink = (u) => { try { window.open(u, '_blank', 'noopener'); } catch (e) { /* blocked */ } };

  // ---- What's new popup ----
  function showNews(all) {
    let m = document.getElementById('gtnews'); if (m) m.remove();
    const seen = +lsGet('gt_news_seen', 0) || 0;
    const list = all ? CHANGES : CHANGES.filter((c) => c.id > seen).slice(0, 3);
    if (!list.length) return;
    m = document.createElement('div'); m.id = 'gtnews';
    m.innerHTML = `<div class="gtn" role="dialog" aria-label="What's new"><div class="gtnh"><b>What's new in Pathfinder</b><button class="g" data-nw="x" title="Close">&#10005;</button></div>
${list.map((c) => `<div class="gtnv"><small>${esc(c.date)}</small><ul>${c.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')}
<p class="gtnb"><button class="b" data-nw="ok">Got it</button>${all ? '' : ' <button class="g" data-nw="all">Older changes</button>'}</p></div>`;
    m.onclick = (e) => {
      const b = e.target.closest('[data-nw]');
      if (e.target === m || (b && (b.dataset.nw === 'x' || b.dataset.nw === 'ok'))) { lsSet('gt_news_seen', LATEST); m.remove(); if (document.getElementById('gtab')) drawCard(); return; }
      if (b && b.dataset.nw === 'all') { lsSet('gt_news_seen', LATEST); showNews(true); }
    };
    document.body.appendChild(m);
  }
  // After an update, once the app is on screen. Someone who has never seen this list gets only the newest entry.
  // About & help > "Show What's new after updates" turns this off (the What's new button still works, marked when there is news).
  const auto = () => lsGet('gt_news_auto', true) !== false;
  setTimeout(() => {
    const seen = lsGet('gt_news_seen', null);
    if (seen == null) { lsSet('gt_news_seen', LATEST); return; } // someone new gets the tour (below), not a list of changes
    if (auto() && (+lsGet('gt_news_seen', 0) || 0) < LATEST && !/Welcome to Pathfinder/.test((document.getElementById('vault') || {}).textContent || '')) showNews(false);
  }, 2500);


  // ---- first-time tour ----
  // Five short stops, shown once after the first vault loads (About & help > Take the tour shows it again). Each stop points at
  // the real thing on screen; a stop whose thing is hidden (a tab bar on a phone, say) is skipped. Esc or Skip ends it.
  const STOPS = [
    ['header.gtbar', 'Tabs', 'Inventory is your vault and characters. Loadouts, Triumphs, Farming and the rest are up here. Reorder or hide tabs in Settings, Appearance.'],
    ['#vq', 'Search', 'Search like DIM: names, perks, or filters such as is:handcannon, is:godroll or tag:junk.'],
    [['#vgrid .eq [data-id]', '#vgrid [data-id]'], 'Items', 'Click an item for its perks, stats and wish list grade. Drag it onto a character or the vault to move it.'],
    ['#gtpfn', 'Settings and your account', 'Click here for Settings (accounts, looks, wish lists, shortcuts), help from the Pathfinder team and signing in or out.'],
    ['#gtnfab', 'Notes', 'A notepad that stays open on any tab (Shift+N).'],
  ];
  const pick = (q) => [].concat(q).map((x) => document.querySelector(x)).find((el) => seenEl(el)) || null; // the first selector whose thing is on screen
  const seenEl = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(el).visibility !== 'hidden'; };
  function tour(i) {
    let t = document.getElementById('gttour'); if (t) t.remove();
    while (i < STOPS.length && !pick(STOPS[i][0])) i++;
    if (i >= STOPS.length) { lsSet('gt_tour_done', 1); return; }
    const el = pick(STOPS[i][0]), left = STOPS.slice(i + 1).filter((x) => pick(x[0])).length;
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect(), pad = 6;
    t = document.createElement('div'); t.id = 'gttour';
    t.innerHTML = `<div class="gtth" style="left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px"></div><div class="gttc" role="dialog" aria-label="Tour: ${esc(STOPS[i][1])}"><b>${esc(STOPS[i][1])}</b><p>${esc(STOPS[i][2])}</p><div class="gttb"><button class="g" data-tt="skip">${left ? 'Skip the tour' : 'Close'}</button><button class="b" data-tt="next">${left ? 'Next' : 'Done'}</button></div></div>`;
    document.body.appendChild(t);
    const c = t.querySelector('.gttc'), cr = c.getBoundingClientRect(), below = r.bottom + 12 + cr.height < innerHeight;
    c.style.top = Math.max(8, below ? r.bottom + 12 : r.top - cr.height - 12) + 'px';
    c.style.left = Math.max(8, Math.min(innerWidth - cr.width - 8, r.left + r.width / 2 - cr.width / 2)) + 'px';
    const end = () => { lsSet('gt_tour_done', 1); t.remove(); document.removeEventListener('keydown', key, true); };
    const key = (e) => { if (!document.getElementById('gttour')) { document.removeEventListener('keydown', key, true); return; } if (e.key === 'Escape') { e.preventDefault(); end(); } else if (e.key === 'Enter') { e.preventDefault(); document.removeEventListener('keydown', key, true); left ? tour(i + 1) : end(); } };
    document.addEventListener('keydown', key, true);
    t.onclick = (e) => { const b = e.target.closest('[data-tt]'); if (!b) return; document.removeEventListener('keydown', key, true); if (b.dataset.tt === 'next' && left) tour(i + 1); else end(); };
    setTimeout(() => { const n = t.querySelector('[data-tt=next]'); if (n) n.focus(); }, 0);
  }
  window.__gttour = () => tour(0);
  // Start once the vault has items on screen and nothing else is in front (the welcome page, What's new, the landing page).
  if (!lsGet('gt_tour_done', 0)) {
    let tries = 0; const tw = setInterval(() => {
      if (++tries > 150 || lsGet('gt_tour_done', 0)) { clearInterval(tw); return; }
      const v = document.getElementById('vault');
      if (!v || !v.classList.contains('on') || !document.querySelector('#vgrid [data-id]') || document.getElementById('gtnews') || seenEl(document.getElementById('pfl'))) return;
      clearInterval(tw); setTimeout(() => tour(0), 800);
    }, 2000);
  }

  // ---- About & help card in Settings ----
  const setEl = document.getElementById('settings');
  function cardHTML() {
    return `<div class="card sc" id="gtab"><h2>About &amp; help</h2><p class="mute">Pathfinder ${esc(VER || '')} &middot; ${isWeb() ? 'website' : 'PC app'}. Not made by or affiliated with Bungie.</p>
<h3 class="gth">Updates</h3><p class="mute">${esc(updLine())}</p>${!isWeb() && UPD.canUpdate ? `<p>${UPD.state === 'ready' ? '<button class="b" data-ab="install">Restart to install</button>' : '<button class="g" data-ab="check">Check for updates</button>'}</p>` : ''}
<h3 class="gth">About Pathfinder</h3>
<p class="gtabout">Hey, I'm Bray, the owner of Pathfinder. We built this as Destiny players, for Destiny players: the companion we wanted for our own vaults, loadouts and god rolls, kept free and shaped by the people who use it.</p>
<p class="gtabout">A big thank you to <b>Frosty</b> (Founder), <b>Manta</b> (Founder), <b>Zeb</b> (Dev), <b>BabyJosephSayer</b> (Feedback and Ideas), <b>Ryu</b> (Feedback and Ideas) and everyone else who helped with ideas, input and testing. Pathfinder is what it is because of you.</p>
<p><a class="gtdisc" href="https://discord.gg/rJXsgHdcMY" target="_blank" rel="noopener" data-ab="discord">Join our Discord</a></p>
<h3 class="gth">Help</h3><p class="mute">Questions, bugs or ideas: <a href="mailto:${HELP}" data-ab="mail">${HELP}</a></p>
<p><button class="g" data-ab="tour">Take the tour</button> <button class="g" data-ab="news">What's new${(+lsGet('gt_news_seen', 0) || 0) < LATEST ? ' <em class="gtnd">new</em>' : ''}</button> ${window.__gtbetaInfo ? '<button class="g" data-ab="beta" title="Try the next version early. Same sign-in and settings; you can come back any time.">Try the beta</button> ' : window.__GT_BETA__ ? '<button class="g" data-ab="unbeta">Back to the regular site</button> ' : ''}${betaAppBtn()}<button class="g" data-ab="status" title="Is Pathfinder, its sign-in service and Bungie's API working right now?">Status</button> <button class="g" data-ab="privacy">Privacy</button>${isWeb() && window.__GT_DL__ ? ' <button class="g" data-ab="pcapp">Get the PC app</button>' : ''}</p>
<div class="sx gtna"><div class="sxt"><b>Show What's new after updates</b><small>The list of changes after each update. What's new above always shows it.</small></div><div class="sxc"><label class="tgl"><input type="checkbox" data-ab="auto"${auto() ? ' checked' : ''}><i></i></label></div></div></div>`;
  }
  // Problems (the error log) is its own card under About & help, after Help, so asking the team comes first.
  function probHTML() {
    const L = lsGet(LOGK, []).slice(-6).reverse();
    const rows = L.length ? `<div class="gtl">${L.map((x) => `<div><small>${esc(new Date(x.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}${x.n > 1 ? ' &middot; ' + x.n + ' times' : ''}</small>${esc(x.m)}</div>`).join('')}</div>` : '<p class="mute">No problems logged.</p>';
    return `<div class="card sc" id="gtprob"><h2>Problems</h2><p class="mute">Errors the app ran into, newest first. If something breaks, copy the report and send it along with what you were doing.</p>${rows}
<p><button class="b" data-ab="copy">Copy problem report</button> <button class="g" data-ab="clear"${L.length ? '' : ' disabled'}>Clear</button> <span class="mute" id="gtabm"></span></p></div>`;
  }
  function drawCard() {
    if (!setEl) return;
    [['gtab', cardHTML], ['gtprob', probHTML]].forEach(([id, f]) => { const old = document.getElementById(id), tmp = document.createElement('div'); tmp.innerHTML = f(); if (old) old.replaceWith(tmp.firstChild); else setEl.appendChild(tmp.firstChild); });
  }
  if (setEl) {
    new MutationObserver(() => { if ((!document.getElementById('gtab') || !document.getElementById('gtprob')) && setEl.querySelector('.card')) drawCard(); }).observe(setEl, { childList: true });
    setEl.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ab]'); if (!b) return;
      const a = b.dataset.ab, msg = (t) => { const s = document.getElementById('gtabm'); if (s) s.textContent = t; };
      if (a === 'news') { showNews((+lsGet('gt_news_seen', 0) || 0) >= LATEST); setTimeout(drawCard, 0); return; }
      if (a === 'tour') { if (window.show) window.show('vault'); setTimeout(() => tour(0), 400); return; }
      if (a === 'auto') { lsSet('gt_news_auto', !!b.checked); return; }
      if (a === 'beta') { location.href = 'beta/'; return; }
      if (a === 'betaapp') { window.open(BETA_APP_URL, '_blank', 'noopener'); return; }
      if (a === 'unbeta') { location.href = '../'; return; }
      if (a === 'status') { openLink(SITE + '/status'); return; }
      if (a === 'privacy') { openLink(SITE + '/privacy'); return; }
      if (a === 'discord') { e.preventDefault(); openLink('https://discord.gg/rJXsgHdcMY'); return; }
      if (a === 'pcapp') { location.href = window.__GT_DL__; return; }
      if (a === 'clear') { lsSet(LOGK, []); drawCard(); return; }
      if (a === 'copy') { msg((await copyText(report())) ? 'Copied. Send it to ' + HELP + '.' : 'Could not copy.'); }
      if (a === 'check' && window.gt && window.gt.updCheck) { UPD.state = 'checking'; drawCard(); window.gt.updCheck().catch(() => {}); }
      if (a === 'install' && window.gt && window.gt.updInstall) window.gt.updInstall();
      if (a === 'mail') { e.preventDefault(); openLink('mailto:' + HELP + '?subject=' + encodeURIComponent('Pathfinder ' + (VER || '') + ' (' + (isWeb() ? 'website' : 'PC app') + ')')); }
    });
  }

  const css = document.createElement('style');
  css.textContent = '#gtnews{position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:10vh 16px}'
    + '#gtnews .gtn{background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);width:min(560px,100%);max-height:78vh;overflow:auto;padding:16px 20px;box-shadow:0 10px 40px rgba(0,0,0,.6)}'
    + '#gtnews .gtnh{display:flex;align-items:center;gap:12px}#gtnews .gtnh b{font-size:17px;color:#fff}#gtnews .gtnh button{margin-left:auto}'
    + '#gtnews .gtnv{margin-top:12px}#gtnews .gtnv small{color:var(--acc,#e8b84a);font-size:11.5px;letter-spacing:.08em;text-transform:uppercase}#gtnews ul{margin:6px 0 0;padding-left:20px}#gtnews li{margin:5px 0;line-height:1.45;color:#d7dae0}'
    + '#gtnews .gtnb{margin:16px 0 0}'
    + ':is(#gtab,#gtprob) a{color:var(--acc,#e8b84a)}#gtab .gth{font-size:13px;margin:14px 0 2px;color:#fff;letter-spacing:.04em}#gtprob .gtl{display:flex;flex-direction:column;gap:6px;margin:8px 0;max-height:220px;overflow:auto}'
    + '#gtprob .gtl div{font-size:12.5px;color:#d7dae0;border-left:2px solid #d9534f;padding:2px 8px;word-break:break-word}#gtprob .gtl small{display:block;color:#9aa0a8;font-size:11px}'
    + '#gtab .gtabout{color:#cfd3da;font-size:13.5px;line-height:1.6;margin:6px 0;max-width:720px}#gtab .gtabout b{color:#fff}#gtab a.gtdisc{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:#5865f2;color:#fff;font-weight:700;font-size:13.5px;text-decoration:none}#gtab a.gtdisc:hover{background:#4752c4}'
    + ':is(#gtab,#gtprob) button[disabled]{opacity:.4;pointer-events:none}#gtab .gtnd{font-style:normal;font-size:10.5px;font-weight:700;color:#111;background:var(--g-accent,#e8b84a);border-radius:8px;padding:1px 6px;margin-left:4px}#gtab .sx.gtna{margin:8px 0 2px}'
    + '#gttour{position:fixed;inset:0;z-index:9650}#gttour .gtth{position:fixed;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,.6),0 0 0 2px var(--g-accent,#e8b84a);pointer-events:none;transition:all .2s}'
    + '#gttour .gttc{position:fixed;width:min(340px,calc(100vw - 16px));background:var(--g-panel,#1a1c20);border:1px solid var(--g-accent,#e8b84a);border-radius:12px;padding:14px 16px;box-shadow:0 12px 40px rgba(0,0,0,.6)}#gttour .gttc b{color:#fff;font-size:15px}#gttour .gttc p{margin:6px 0 12px;color:#d7dae0;font-size:13.5px;line-height:1.5}#gttour .gttb{display:flex;justify-content:space-between;gap:8px}'
    + '@media (prefers-reduced-motion:reduce){#gttour .gtth{transition:none}}'
    + '@media (max-width:640px){#gtnews{padding:12px 8px}#gtnews .gtn{max-height:calc(100dvh - 110px);padding:14px}}';
  document.head.appendChild(css);
  window.__gtnews = { show: showNews, log, report, CHANGES };
})();
