/* Pathfinder website: "install the app".
   - Phones: a banner offering to add Pathfinder to the home screen, so it opens full-screen like an app. Android gets a real
     Install button when the browser allows it; iPhone and iPad get the two taps to make (Safari has no install button).
   - Windows PCs: a "Get the app" button in the top bar that downloads the newest PC app (d2pathfinder.com/download).
   Neither shows inside the installed app, and both can be dismissed. */
(function () {
  'use strict';
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage off */ } } };
  const UA = navigator.userAgent || '';
  const standalone = () => (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone === true;
  const isIOS = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1); // iPadOS says it is a Mac
  const isAndroid = /Android/.test(UA);
  const inApp = /FBAN|FBAV|Instagram|Discord|Line\/|Snapchat|Twitter|TikTok|GSA\//.test(UA); // in-app browsers cannot install
  const phone = () => isIOS || isAndroid || (window.matchMedia && matchMedia('(pointer: coarse)').matches && innerWidth < 900);
  const isWin = /Windows NT/.test(UA) || (navigator.userAgentData && navigator.userAgentData.platform === 'Windows');
  const DL = window.__GT_DL__ || '';
  const DAY = 86400000;
  let deferred = null; // Android/Chrome's install prompt, kept until the button is tapped

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; const b = document.getElementById('gtinstb'); if (b) draw(b); });
  window.addEventListener('appinstalled', () => { ls.set('gt_inst_done', '1'); const b = document.getElementById('gtinstb'); if (b) b.remove(); });

  const css = document.createElement('style');
  css.textContent = '#gtinstb{position:fixed;left:8px;right:8px;bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:8800;background:#1b1e24;border:1px solid #343841;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.55);padding:12px 12px 12px 14px;display:flex;gap:12px;align-items:center;color:#e6e8ec;font:14px/1.35 system-ui,-apple-system,sans-serif;animation:gtinup .25s ease-out}'
    + '@keyframes gtinup{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}'
    + '#gtinstb img{width:44px;height:44px;border-radius:10px;flex:none}#gtinstb .tx{flex:1;min-width:0}#gtinstb b{display:block;font-size:15px;color:#fff}#gtinstb small{display:block;color:#aeb3bb;font-size:12.5px;margin-top:2px}'
    + '#gtinstb .sh{display:inline-block;vertical-align:-3px;width:16px;height:16px}#gtinstb .go{flex:none;background:#e8b84a;color:#16130a;border:0;border-radius:9px;padding:9px 14px;font:600 14px system-ui,sans-serif}'
    + '#gtinstb .x{flex:none;background:transparent;border:0;color:#9aa0a8;font-size:20px;line-height:1;padding:4px 2px 4px 6px;align-self:flex-start}'
    + '#gtdl{order:5;flex:none;margin-left:8px;background:transparent;border:1px solid var(--g-line,#3a3d43);color:#e6e8ec;border-radius:16px;padding:5px 12px;font:600 12px system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;white-space:nowrap;display:flex;gap:6px;align-items:center}'
    + '#gtdl:hover{border-color:var(--acc,#e8b84a);color:#fff}#gtdl svg{width:14px;height:14px}'
    + '#gtdlp{position:fixed;z-index:9500;width:300px;background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);box-shadow:0 10px 30px rgba(0,0,0,.55);padding:14px 16px;color:#d7dae0;font:13.5px/1.45 system-ui,sans-serif}'
    + '#gtdlp b{color:#fff;font-size:15px}#gtdlp p{margin:6px 0}#gtdlp .mute{color:#9aa0a8;font-size:12.5px}#gtdlp a.dl{display:block;text-align:center;margin:10px 0 6px;background:#e8b84a;color:#16130a;text-decoration:none;font-weight:700;padding:9px;border-radius:4px}'
    + '#gtdlp button.hide{background:transparent;border:0;color:#9aa0a8;font-size:12px;padding:0;cursor:pointer;text-decoration:underline}';
  document.head.appendChild(css);

  // ---------- phones ----------
  const SHARE = '<svg class="sh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  function howText() {
    if (inApp) return 'Open this page in ' + (isIOS ? 'Safari' : 'Chrome') + ' first, then add it to your home screen.';
    if (isIOS) return 'Tap ' + SHARE + ' Share, then <b style="display:inline;font-size:inherit">Add to Home Screen</b>.';
    if (deferred) return 'Opens full-screen from your home screen, like an app.';
    return 'Tap the &#8942; menu, then <b style="display:inline;font-size:inherit">Install app</b> or <b style="display:inline;font-size:inherit">Add to Home screen</b>.';
  }
  function draw(b) {
    b.innerHTML = '<img src="icon-192.png" alt=""><div class="tx"><b>Install Pathfinder</b><small>' + howText() + '</small></div>'
      + (deferred ? '<button class="go" data-in="go">Install</button>' : '') + '<button class="x" data-in="x" aria-label="Not now">&times;</button>';
  }
  function banner() {
    if (document.getElementById('gtinstb') || standalone() || !phone() || ls.get('gt_inst_done')) return;
    const hid = +ls.get('gt_inst_hide') || 0; if (hid && Date.now() - hid < 21 * DAY) return; // "not now" lasts three weeks
    if (document.querySelector('#gtnews, #junkm, #vsheet .dp, #loimg, #dlmod')) { setTimeout(banner, 8000); return; } // never on top of something open
    const b = document.createElement('div'); b.id = 'gtinstb'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Install Pathfinder');
    draw(b);
    b.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-in]'); if (!t) return;
      if (t.dataset.in === 'x') { ls.set('gt_inst_hide', String(Date.now())); b.remove(); return; }
      if (t.dataset.in === 'go' && deferred) {
        const p = deferred; deferred = null;
        try { p.prompt(); const r = await p.userChoice; if (r && r.outcome === 'accepted') { ls.set('gt_inst_done', '1'); b.remove(); return; } } catch (er) { /* the browser said no */ }
        draw(b);
      }
    });
    document.body.appendChild(b);
  }

  // ---------- Windows PCs ----------
  const DLI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>';
  let info = null;
  const mb = (n) => (n ? Math.round(n / 1048576) + ' MB' : '');
  function pop(btn) {
    let p = document.getElementById('gtdlp'); if (p) { p.remove(); return; }
    p = document.createElement('div'); p.id = 'gtdlp';
    const r = btn.getBoundingClientRect(); p.style.top = (r.bottom + 6) + 'px'; p.style.left = Math.max(8, Math.min(innerWidth - 308, r.right - 300)) + 'px';
    const body = () => '<b>Pathfinder for Windows</b><p>The full app: everything on this site plus farming mode, desktop alerts and automatic updates.</p>'
      + '<p class="mute">' + (info && info.v ? 'Version ' + info.v + (info.size ? ' &middot; ' + mb(info.size) : '') : 'The newest version') + '. Free, no account needed beyond your Bungie sign-in. Windows may ask you to confirm because the app is new.</p>'
      + '<a class="dl" href="' + DL + '" data-dl="go">' + DLI.replace('<svg', '<svg width="14" height="14" style="vertical-align:-2px;margin-right:6px"') + 'Download for Windows</a>'
      + '<button class="hide" data-dl="hide">Hide this button</button>';
    p.innerHTML = body();
    p.addEventListener('click', (e) => {
      const t = e.target.closest('[data-dl]'); if (!t) return;
      if (t.dataset.dl === 'hide') { ls.set('gt_dl_hide', '1'); p.remove(); btn.remove(); window.dispatchEvent(new Event('resize')); }
      if (t.dataset.dl === 'go') setTimeout(() => p.remove(), 300);
    });
    document.body.appendChild(p);
    const close = (e) => { if (!p.contains(e.target) && e.target !== btn && !btn.contains(e.target)) { p.remove(); document.removeEventListener('mousedown', close, true); } };
    setTimeout(() => document.addEventListener('mousedown', close, true), 0);
    if (!info) fetch(DL + '/info').then((x) => (x.ok ? x.json() : null)).then((j) => { if (j && j.v) { info = j; if (p.isConnected) p.innerHTML = body(); } }).catch(() => {});
  }
  function pcButton() {
    if (!DL || !isWin || phone() || standalone() || ls.get('gt_dl_hide') || document.getElementById('gtdl')) return;
    const hd = document.querySelector('header.gtbar') || document.querySelector('header'); if (!hd) return;
    const b = document.createElement('button'); b.id = 'gtdl'; b.type = 'button'; b.title = 'Download the Pathfinder app for Windows';
    b.innerHTML = DLI + '<span>Get the app</span>';
    b.addEventListener('click', () => pop(b));
    hd.appendChild(b);
    window.dispatchEvent(new Event('resize')); // the top bar re-fits its tabs around the new button
  }

  const start = () => { pcButton(); setTimeout(banner, 4000); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.__gtinstall = { banner, pcButton, state: () => ({ deferred: !!deferred, standalone: standalone(), phone: phone(), isIOS, isAndroid, inApp, isWin }) };
})();
