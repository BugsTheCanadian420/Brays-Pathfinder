// Slim top bar, like DIM: logo, tabs and the vault search sit on one row.
// Tabs are renamed and grouped so the bar stays short: the everyday ones stay on the bar,
// the rest live under "More". On a narrow window everything moves into one menu.
(() => {
  const nav = document.getElementById('nav'), hd = document.querySelector('header');
  if (!nav || !hd) return;
  const html = document.documentElement;
  const NAME = { home: 'Home', vault: 'Inventory', loadouts: 'Loadouts', organizer: 'Organizer', optimizer: 'Optimizer', triumphs: 'Triumphs', activity: 'Activity', targets: 'Farming', check: 'Checklist', notes: 'Notes', wish: 'Roll Tracker', guides: 'Helpful', hub: 'Hub', settings: 'Settings' };
  const TIP = { home: 'Resets, goals and season at a glance', vault: 'Your characters and vault', loadouts: 'Save and equip sets of gear', organizer: 'Sort and compare every weapon and armor piece', optimizer: 'Find the best armor for a build', triumphs: 'Records, seals and titles', activity: 'What you have played lately', targets: 'Farm for the exact rolls and armor you want', reset: 'Daily and weekly reset timers, Xur', check: 'Weekly and daily to-do list', notes: 'Your own notes', wish: 'Track the weapon rolls you are hunting', guides: 'How-to guides for activities', hub: 'Light.gg, DIM and other Destiny sites inside the app' };
  const PRIMARY = ['home', 'vault', 'loadouts', 'triumphs', 'activity', 'targets'];
  const GROUPS = [['Gear', ['home', 'vault', 'loadouts']], ['Progress', ['triumphs', 'activity', 'targets']], ['Learn', ['guides', 'hub']], ['Weekly', ['check']], ['Your lists', ['notes']], ['Gear tools', ['organizer', 'optimizer']]];
  const EXTRA = ['guides', 'hub', 'check', 'notes', 'organizer', 'optimizer']; // join the bar one by one as the window gets wider

  // The old hamburger menu is replaced by the one below.
  ['gtmenu', 'gtmenup', 'gtcur'].forEach((id) => { const n = document.getElementById(id); if (n) n.remove(); });

  hd.classList.add('gtbar');
  hd.title = 'Pathfinder';
  const sub = hd.querySelector('h1 small'); if (sub) sub.remove();
  hd.appendChild(nav); // nav lives inside the bar now; its buttons are laid out by the bar itself
  const slot = document.createElement('div'); slot.id = 'gtsrch'; hd.appendChild(slot);
  // If the vault finished drawing before this file ran, its search bar is still in the page: move it up.
  { const ex = document.querySelector('#vault .vcard .vbar'), v = document.getElementById('vault');
    if (ex && v) { slot.appendChild(ex); ex.onclick = (e) => v.onclick(e); const c = v.querySelector('.vcard'); if (c) c.remove(); } }

  const btn = (id) => nav.querySelector('button[data-t="' + id + '"]');
  PRIMARY.slice().reverse().forEach((id) => { const b = btn(id); if (b) { nav.insertBefore(b, nav.firstChild); b.classList.add('gtp'); } });
  Object.keys(NAME).forEach((id) => { const b = btn(id); if (!b) return; if (id !== 'settings') b.textContent = NAME[id]; if (TIP[id]) b.title = TIP[id]; if (!PRIMARY.includes(id) && id !== 'settings') b.classList.add('gtx'); });
  { let ref = btn(PRIMARY[PRIMARY.length - 1]); EXTRA.forEach((id) => { const b = btn(id); if (b && ref) { ref.after(b); ref = b; } }); }
  const set = btn('settings');
  if (set) {
    set.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
    set.title = 'Settings'; set.setAttribute('aria-label', 'Settings'); set.classList.add('gtset'); nav.appendChild(set);
  }
  const more = document.createElement('button');
  more.id = 'gtmore'; more.type = 'button'; more.setAttribute('aria-haspopup', 'true'); more.setAttribute('aria-expanded', 'false');
  more.innerHTML = '<span id="gtml">More</span><svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4l4 4 4-4"/></svg>';
  nav.insertBefore(more, set || null);
  const pan = document.createElement('div'); pan.id = 'gtmp'; pan.setAttribute('role', 'menu'); document.body.appendChild(pan);

  const narrow = window.matchMedia ? window.matchMedia('(max-width:1100px)') : { matches: false, addEventListener() {} };
  // Tabs you hid in Settings > Tabs: gone from the bar, from More and from the phone menu.
  const HIDK = 'gt.nav.hide';
  const hidSet = () => { try { const a = JSON.parse(localStorage.getItem(HIDK)); return new Set(Array.isArray(a) ? a : []); } catch (e) { return new Set(); } };
  let HID = hidSet();
  const hidden = (id) => HID.has(id) && id !== 'vault' && id !== 'settings';
  const shownExtra = () => EXTRA.filter((id) => !hidden(id));
  function applyHide() { nav.querySelectorAll('button[data-t]').forEach((b) => b.classList.toggle('gthide', hidden(b.dataset.t))); }
  applyHide();
  let nProm = 0;
  const barIds = () => (narrow.matches ? new Set() : new Set([...PRIMARY.filter((id) => !hidden(id)), ...shownExtra().slice(0, nProm)]));
  function applyProm(n) {
    nProm = n;
    const ex = shownExtra();
    EXTRA.forEach((id) => { const b = btn(id); if (!b) return; const i = ex.indexOf(id), on = i >= 0 && i < n; b.classList.toggle('gtx', !on); b.classList.toggle('gtp', on); });
    const anyInMore = GROUPS.some(([, ids]) => ids.some((id) => btn(id) && !hidden(id) && !PRIMARY.includes(id) && !(ex.indexOf(id) >= 0 && ex.indexOf(id) < n)));
    more.classList.toggle('gtnone', !narrow.matches && (n >= ex.length || !anyInMore)); // a class: the bar's button rule uses !important, which beats an inline style
  }
  // Show as many tabs on the bar as fit while keeping room for the search box; the rest stay under "More".
  function fit() {
    applyHide();
    if (narrow.matches) { applyProm(0); sync(); return; }
    let best = 0;
    // On Inventory, keep room for the search box (about 240px) plus its buttons. Elsewhere the bar has no search box, so every tab that fits goes on it.
    const onVault = html.dataset.gtab === 'vault' || !html.dataset.gtab;
    const nb = slot.querySelectorAll('.vbar button').length || 7, need = onVault ? 240 + nb * 37 : 0;
    html.classList.toggle('gtwide', !onVault);
    const ex = shownExtra();
    for (let n = 0; n <= ex.length; n++) {
      applyProm(n);
      if ((!need || slot.getBoundingClientRect().width >= need) && hd.scrollWidth <= hd.clientWidth + 1) best = n; else break;
    }
    applyProm(best); sync();
  }
  let fitq = 0;
  const fitSoon = () => { if (fitq) return; fitq = requestAnimationFrame(() => { fitq = 0; fit(); }); };
  const active = () => nav.querySelector('button.on[data-t]');
  function sync() {
    const a = active(), id = a ? a.dataset.t : '';
    if (html.dataset.gtab !== id) { html.dataset.gtab = id; fitSoon(); }
    { const sx = id && document.getElementById(id), dk = sx && sx.classList.contains('gdark') ? '1' : '0'; if (id && html.dataset.gsec !== id) html.dataset.gsec = id; if (html.dataset.dark !== dk) html.dataset.dark = dk; }
    const inMore = !!a && !barIds().has(id) && id !== 'settings';
    const label = narrow.matches && a ? (id === 'settings' ? 'Settings' : a.textContent) : 'More';
    const l = document.getElementById('gtml'); if (l && l.textContent !== label) l.textContent = label;
    if (more.classList.contains('has') !== (inMore || (narrow.matches && !!a))) more.classList.toggle('has', inMore || (narrow.matches && !!a));
  }
  new MutationObserver(sync).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
  sync();
  if (narrow.addEventListener) narrow.addEventListener('change', () => { close(); fit(); });
  const close = () => { pan.classList.remove('open'); more.classList.remove('open'); more.setAttribute('aria-expanded', 'false'); };
  function open() {
    const bar = barIds(), a = active();
    const gs = GROUPS.map(([label, ids]) => [label, ids.filter((id) => btn(id) && !bar.has(id) && !hidden(id))]).filter(([, ids]) => ids.length);
    pan.innerHTML = gs.map(([label, ids]) => `<div class="gl">${label}</div>` + ids.map((id) => `<div class="gi${a && a.dataset.t === id ? ' on' : ''}" role="menuitem" data-go="${id}"><b>${NAME[id]}</b>${TIP[id] ? `<small>${TIP[id]}</small>` : ''}</div>`).join('')).join('') + (narrow.matches ? '<div class="gl"></div><div class="gi" role="menuitem" data-go="settings"><b>Settings</b><small>Display, inventory and wish list options</small></div>' : '');
    const r = more.getBoundingClientRect();
    pan.style.top = Math.round(r.bottom + 4) + 'px';
    pan.style.left = Math.max(6, Math.min(Math.round(r.left), window.innerWidth - 300)) + 'px';
    pan.classList.add('open'); more.classList.add('open'); more.setAttribute('aria-expanded', 'true');
  }
  more.onclick = (e) => { e.stopPropagation(); if (pan.classList.contains('open')) close(); else open(); };
  pan.onclick = (e) => { const d = e.target.closest('[data-go]'); if (!d) return; const b = btn(d.dataset.go); close(); if (b) b.click(); };
  document.addEventListener('click', (e) => { if (!pan.contains(e.target) && !more.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { close(); fitSoon(); });
  if (window.ResizeObserver) new ResizeObserver(fitSoon).observe(hd);
  window.__gtnav = {
    list: () => [...nav.querySelectorAll('button[data-t]')].map((b) => b.dataset.t).filter((id) => NAME[id] && id !== 'settings').map((id) => [id, NAME[id], hidden(id), id === 'vault']),
    set(id, hide) {
      const a = hidSet(); if (hide) a.add(id); else a.delete(id);
      try { localStorage.setItem(HIDK, JSON.stringify([...a])); } catch (e) { /* storage off */ }
      HID = a; applyHide(); fit(); window.dispatchEvent(new Event('gtnavchange'));
    },
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);

  const st = document.createElement('style');
  st.textContent = `
:root header.gtbar,:root[data-dark="1"] header.gtbar{position:sticky!important;top:0;z-index:40;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;text-align:left!important;gap:4px!important;height:48px;max-width:none!important;margin:0!important;padding:0 10px!important;background:var(--g-panel,#1a1c20)!important;background-image:none!important;border-bottom:1px solid var(--g-line,#2b2e33)!important;box-shadow:0 2px 10px rgba(0,0,0,.35)}
:root header.gtbar::after,:root[data-dark="1"] header.gtbar::after{display:none!important}
header.gtbar>svg,header.gtbar>.plogo{width:30px!important;height:30px!important;flex:none;order:0;margin-right:4px}
header.gtbar>.plogo{content:url(logo-s.png);object-fit:contain;filter:drop-shadow(0 1px 3px rgba(0,0,0,.45))}
header.gtbar nav svg{width:auto!important;height:auto!important;color:inherit!important;filter:none!important}
header.gtbar nav button.gtset svg{width:18px!important;height:18px!important}
header.gtbar nav #gtmore svg{width:9px!important;height:9px!important}
header.gtbar h1{order:1;margin:0 10px 0 0!important;font-size:13px!important;letter-spacing:3px!important;font-weight:600;text-transform:uppercase;white-space:nowrap;color:#fff;display:none}
@media (min-width:2400px){header.gtbar h1{display:block}}
header.gtbar nav{display:contents!important}
header.gtbar nav button{order:2;flex:none;position:relative;height:48px;margin:0;padding:0 clamp(8px,.72vw,12px)!important;padding-top:0!important;padding-bottom:0!important;display:inline-flex!important;align-items:center;justify-content:center;line-height:1!important;border:0!important;border-radius:0!important;background:none!important;color:#9b9ea5!important;font-family:inherit;font-size:clamp(11px,.74vw,12.5px)!important;font-weight:600;letter-spacing:clamp(.8px,.1vw,1.6px)!important;text-transform:uppercase;cursor:pointer;white-space:nowrap;box-shadow:inset 0 -2px 0 transparent;transition:color .12s,background .12s}
header.gtbar nav button:hover{color:#fff!important;background:rgba(255,255,255,.05)!important}
header.gtbar nav button.on{color:#fff!important;background:rgba(255,255,255,.04)!important;box-shadow:inset 0 -2px 0 var(--g-accent,#7ab8e8)}
header.gtbar nav button.on::after{display:none!important}
header.gtbar nav button.gtx{display:none!important}
header.gtbar nav #gtmore{order:3;display:inline-flex;align-items:center;gap:6px}
header.gtbar nav #gtmore.has,header.gtbar nav #gtmore.open{color:#fff!important}
header.gtbar nav #gtmore.has{box-shadow:inset 0 -2px 0 var(--g-accent,#7ab8e8)}
header.gtbar nav #gtmore svg{opacity:.7;transition:transform .15s}
header.gtbar nav #gtmore.open svg{transform:rotate(180deg)}
header.gtbar nav button.gthide,header.gtbar nav #gtmore.gtnone{display:none!important}
html.gtwide header.gtbar nav button.gtp:not(.gthide),html.gtwide header.gtbar nav #gtmore{flex:1 1 0!important;max-width:210px}
html.gtwide #gtsrch{flex:1 1 0!important;margin-left:0!important}
header.gtbar nav button.gtset{order:6;width:42px;padding:0!important;display:inline-flex;align-items:center;justify-content:center;margin-left:2px}
#gtsrch{order:5;flex:1 1 200px;min-width:0;display:flex;justify-content:flex-end;align-items:center;margin-left:8px}
#gtsrch .vbar{display:none;align-items:center;gap:5px;width:100%;max-width:680px}
html[data-gtab="vault"] #gtsrch .vbar{display:flex}
#gtsrch .vbar input{flex:1;min-width:70px;width:auto;margin:0;height:32px;padding:0 10px 0 32px;font-size:13.5px;color:#fff;background:var(--g-deep,#0f1012) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239b9ea5' stroke-width='2.4' stroke-linecap='round'%3E%3Ccircle cx='10.5' cy='10.5' r='6.5'/%3E%3Cpath d='M15.5 15.5L21 21'/%3E%3C/svg%3E") no-repeat 10px center/15px;border:1px solid #3a3d43;border-radius:3px}
#gtsrch .vbar input:focus{outline:0;border-color:var(--g-accent,#7ab8e8)}
#gtsrch .vbar .vnm{display:none;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8d9097;margin-right:4px}
@media (min-width:2400px){#gtsrch .vbar .vnm{display:block}}
#gtsrch .vbar .vtg{display:inline-flex;flex:none;background:var(--g-btn,#1b1d21);border:1px solid #33363c;border-radius:6px;padding:2px;gap:2px}
#gtsrch .vbar button.g{flex:none;width:30px;height:28px;padding:0!important;display:inline-flex;align-items:center;justify-content:center;line-height:1;background:transparent!important;border:0!important;border-radius:4px!important;color:#b4b8bf!important;box-shadow:none!important;min-width:0!important;transition:background .12s,color .12s}
#gtsrch .vbar button.g svg{display:block;pointer-events:none;width:16px!important;height:16px!important;filter:none!important}
#gtsrch .vbar button.g:hover{background:rgba(255,255,255,.09)!important;color:#fff!important}
#gtsrch .vbar button.g.on{background:var(--g-accent2,#2b4a6b)!important;color:var(--g-on-accent,#fff)!important}
#gtmp{position:fixed;z-index:70;min-width:260px;max-width:320px;max-height:calc(100vh - 70px);overflow:auto;background:var(--g-panel,#1a1c20);border:1px solid #4a4d54;box-shadow:0 12px 34px rgba(0,0,0,.65);padding:4px 0 6px;display:none}
#gtmp.open{display:block}
#gtmp .gl{padding:10px 16px 3px;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#6f737b}
#gtmp .gl:empty{padding:0;margin:4px 12px;border-top:1px solid var(--g-line,#2b2e33)}
#gtmp .gi{padding:7px 16px;cursor:pointer;border-left:3px solid transparent}
#gtmp .gi:hover{background:rgba(255,255,255,.07)}
#gtmp .gi b{display:block;font-size:13.5px;font-weight:600;letter-spacing:1px;color:#dfe1e4}
#gtmp .gi small{display:block;font-size:11.5px;color:#8d9097;margin-top:1px}
#gtmp .gi.on{border-left-color:var(--g-accent,#7ab8e8);background:rgba(255,255,255,.04)}#gtmp .gi.on b{color:#fff}
@media (max-width:1100px){header.gtbar nav button.gtp{display:none!important}header.gtbar nav #gtmore{margin-left:2px;border:1px solid #3a3d43!important;border-radius:3px!important;height:32px;padding:0 12px!important}}
@media (max-width:760px){#gtsrch .vbar button.g[data-act=junk],#gtsrch .vbar button.g[data-f=bulk],#gtsrch .vbar button.g[data-act=help]{display:none}header.gtbar>svg,header.gtbar>.plogo{width:26px!important;height:26px!important}}
`;
  document.head.appendChild(st);
  sync(); fit(); setTimeout(fitSoon, 600);
})();
