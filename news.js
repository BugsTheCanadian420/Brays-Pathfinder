// What's new after an update, a log of problems (to copy into a bug report), and the About & help card in Settings.
// Works the same in the PC app and on the website.
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off */ } };
  const SITE = 'https://d2pathfinder.com';

  // ---- what changed: newest first. Add an entry (next id) with every update. ----
  const CHANGES = [
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
      if (e.target === m || (b && (b.dataset.nw === 'x' || b.dataset.nw === 'ok'))) { lsSet('gt_news_seen', LATEST); m.remove(); return; }
      if (b && b.dataset.nw === 'all') { lsSet('gt_news_seen', LATEST); showNews(true); }
    };
    document.body.appendChild(m);
  }
  // After an update, once the app is on screen. Someone who has never seen this list gets only the newest entry.
  setTimeout(() => {
    const seen = lsGet('gt_news_seen', null);
    if (seen == null) { lsSet('gt_news_seen', LATEST - 1); }
    if ((+lsGet('gt_news_seen', 0) || 0) < LATEST && !/Welcome to Pathfinder/.test((document.getElementById('vault') || {}).textContent || '')) showNews(false);
  }, 2500);

  // ---- About & help card in Settings ----
  const setEl = document.getElementById('settings');
  function cardHTML() {
    const L = lsGet(LOGK, []).slice(-6).reverse();
    const rows = L.length ? `<div class="gtl">${L.map((x) => `<div><small>${esc(new Date(x.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}${x.n > 1 ? ' &middot; ' + x.n + ' times' : ''}</small>${esc(x.m)}</div>`).join('')}</div>` : '<p class="mute">No problems logged.</p>';
    return `<div class="card sc" id="gtab"><h2>About &amp; help</h2><p class="mute">Pathfinder ${esc(VER || '')} &middot; ${isWeb() ? 'website' : 'PC app'}. Not made by or affiliated with Bungie.</p>
<h3 class="gth">Updates</h3><p class="mute">${esc(updLine())}</p>${!isWeb() && UPD.canUpdate ? `<p>${UPD.state === 'ready' ? '<button class="b" data-ab="install">Restart to install</button>' : '<button class="g" data-ab="check">Check for updates</button>'}</p>` : ''}
<h3 class="gth">Help</h3><p class="mute">Questions, bugs or ideas: <a href="mailto:${HELP}" data-ab="mail">${HELP}</a></p>
<p><button class="g" data-ab="news">What's new</button> <button class="g" data-ab="privacy">Privacy</button>${isWeb() && window.__GT_DL__ ? ' <button class="g" data-ab="pcapp">Get the PC app</button>' : ''}</p>
<h3 class="gth">Problems</h3><p class="mute">Errors the app ran into, newest first. If something breaks, copy the report and send it along with what you were doing.</p>${rows}
<p><button class="b" data-ab="copy">Copy problem report</button> <button class="g" data-ab="clear"${L.length ? '' : ' disabled'}>Clear</button> <span class="mute" id="gtabm"></span></p></div>`;
  }
  function drawCard() {
    if (!setEl) return;
    const old = document.getElementById('gtab'), tmp = document.createElement('div'); tmp.innerHTML = cardHTML();
    if (old) old.replaceWith(tmp.firstChild); else setEl.appendChild(tmp.firstChild);
  }
  if (setEl) {
    new MutationObserver(() => { if (!document.getElementById('gtab') && setEl.querySelector('.card')) drawCard(); }).observe(setEl, { childList: true });
    setEl.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-ab]'); if (!b) return;
      const a = b.dataset.ab, msg = (t) => { const s = document.getElementById('gtabm'); if (s) s.textContent = t; };
      if (a === 'news') { showNews(true); return; }
      if (a === 'privacy') { openLink(SITE + '/privacy'); return; }
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
    + '#gtab a{color:var(--acc,#e8b84a)}#gtab .gth{font-size:13px;margin:14px 0 2px;color:#fff;letter-spacing:.04em}#gtab .gtl{display:flex;flex-direction:column;gap:6px;margin:8px 0;max-height:220px;overflow:auto}'
    + '#gtab .gtl div{font-size:12.5px;color:#d7dae0;border-left:2px solid #d9534f;padding:2px 8px;word-break:break-word}#gtab .gtl small{display:block;color:#9aa0a8;font-size:11px}'
    + '#gtab button[disabled]{opacity:.4;pointer-events:none}'
    + '@media (max-width:640px){#gtnews{padding:12px 8px}#gtnews .gtn{max-height:calc(100dvh - 110px);padding:14px}}';
  document.head.appendChild(css);
  window.__gtnews = { show: showNews, log, report, CHANGES };
})();
