/* Look and feel shared by every page: activity colors (raids purple, dungeons bronze...), the soft glow around activity
   cards, page fades and card entrances, and which tab the app opens on. Settings > Appearance > Motion and cards controls
   it (vault.js puts data-anim, data-cardart and --gt-glow on <html>). Kept quiet on purpose: small, quick, professional. */
(function () {
  'use strict';
  const css = document.createElement('style'); css.id = 'gtpolish';
  css.textContent = `
:root{--ak-raid:#a983ff;--ak-dungeon:#c8935a;--ak-pantheon:#e2b54e;--ak-nightfall:#e3714f;--ak-crucible:#e5533d;--ak-gambit:#43b883;--ak-lost:#d9a44c;--ak-xur:#e7c36a;--ak-reset:var(--g-accent,#7ab8e8);--gt-glow:.55;--gt-ease:cubic-bezier(.2,.8,.2,1)}
[data-ak]{--akc:var(--g-accent,#7ab8e8)}
[data-ak="raid"]{--akc:var(--ak-raid)}[data-ak="dungeon"]{--akc:var(--ak-dungeon)}[data-ak="pantheon"]{--akc:var(--ak-pantheon)}
[data-ak="nightfall"]{--akc:var(--ak-nightfall)}[data-ak="crucible"]{--akc:var(--ak-crucible)}[data-ak="gambit"]{--akc:var(--ak-gambit)}
[data-ak="lost sector"],[data-ak="lost"]{--akc:var(--ak-lost)}[data-ak="xur"]{--akc:var(--ak-xur)}[data-ak="reset"]{--akc:var(--ak-reset)}

/* activity cards: a thin edge in the activity's color with a soft glow, stronger on hover */
#activity .acard[data-ak]{border-color:color-mix(in srgb,var(--akc) 34%,var(--g-line,#2b2e33));box-shadow:0 0 calc(30px * var(--gt-glow)) calc(-14px) var(--akc);border-radius:6px}
#activity .acard[data-ak]::after{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--akc);opacity:.9;pointer-events:none}
#activity .acard[data-ak].clk:hover{border-color:color-mix(in srgb,var(--akc) 70%,transparent);box-shadow:0 10px 26px rgba(0,0,0,.38),0 0 calc(34px * var(--gt-glow)) calc(-10px) var(--akc)}
#activity .acard[data-ak] .sub.gdl{color:var(--akc)}
#home .hm-row[data-ak]>img{border-color:color-mix(in srgb,var(--akc) 70%,transparent);box-shadow:0 0 calc(14px * var(--gt-glow)) calc(-3px) var(--akc);border-radius:4px}
#home .hm-row[data-ak] span:not(.r){color:color-mix(in srgb,var(--akc) 60%,#b9bec6)}
#guides .gfc[data-ak]{border-color:color-mix(in srgb,var(--akc) 40%,var(--g-line,#2b2e33))!important;box-shadow:0 0 calc(26px * var(--gt-glow)) calc(-12px) var(--akc)}
#guides .gfc[data-ak]:hover{box-shadow:0 8px 22px rgba(0,0,0,.35),0 0 calc(30px * var(--gt-glow)) calc(-8px) var(--akc)}

/* activity pictures off */
:root[data-cardart="0"] .abgi,:root[data-cardart="0"] .cdbg{display:none!important}
:root[data-cardart="0"] .rimg,:root[data-cardart="0"] #guides .gfc{background-image:none!important}

/* motion: small and quick. Pages fade in (opacity only, so pop-ups inside a page are never shifted), cards ease up. */
@keyframes gtfade{from{opacity:0}to{opacity:1}}
@keyframes gtup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
:root:not([data-anim="off"]) main>section.on{animation:gtfade .18s ease-out}
:root[data-anim="full"] main>section.on{animation-duration:.26s}
:root:not([data-anim="off"]) #home .hm-g>*,:root:not([data-anim="off"]) #activity .agrid>*,:root:not([data-anim="off"]) #hub .hgrid>*{animation:gtup .3s var(--gt-ease) both}
:root[data-anim="subtle"] #home .hm-g>*,:root[data-anim="subtle"] #activity .agrid>*,:root[data-anim="subtle"] #hub .hgrid>*{animation-duration:.22s}
${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => `:root[data-anim="full"] :is(#home .hm-g,#activity .agrid,#hub .hgrid)>:nth-child(${i}){animation-delay:${i * 35}ms}:root[data-anim="subtle"] :is(#home .hm-g,#activity .agrid,#hub .hgrid)>:nth-child(${i}){animation-delay:${i * 15}ms}`).join('')}
:root:not([data-anim="off"]) .card,:root:not([data-anim="off"]) #home .hm-c,:root:not([data-anim="off"]) #activity .acard{transition:border-color .18s,box-shadow .18s,transform .18s var(--gt-ease),background-color .18s}
:root[data-anim="full"] #home .hm-c:hover{transform:translateY(-3px)}
:root:not([data-anim="off"]) nav button,:root:not([data-anim="off"]) button.g,:root:not([data-anim="off"]) button.b{transition:background-color .15s,border-color .15s,color .15s,box-shadow .15s}
:root[data-anim="full"] nav button.on{box-shadow:inset 0 -2px 0 var(--g-accent,#7ab8e8)}
:root:not([data-anim="off"]) .vt{transition:transform .12s var(--gt-ease),filter .12s}
:root[data-anim="full"] #vgrid .vt:hover{transform:translateY(-1px)}
/* the item pop-up only fades (no movement): it is measured to place it, and a moving box measures wrong */
:root:not([data-anim="off"]) #vsheet .dp{animation:gtfade .14s ease-out}
/* off (and "subtle" when the system asks for less motion): no animation anywhere */
:root[data-anim="off"] *,:root[data-anim="off"] *::before,:root[data-anim="off"] *::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}
@media (prefers-reduced-motion:reduce){:root[data-anim="subtle"] *,:root[data-anim="subtle"] *::before,:root[data-anim="subtle"] *::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}}
`;
  document.head.appendChild(css);

  // ---------- small floating boxes always stay inside the window ----------
  // Menus, pickers and info boxes that float over the page (right-click menu, search suggestions, mod info, equip picker,
  // More menu, notes...) are each placed by their own code next to what was clicked. This is the safety net for all of them:
  // whenever one appears, grows (its text arrived) or the window changes size, it is measured for real and, if any edge is
  // outside the window, moved back in; one taller or wider than the window is capped and scrolls. Measuring the real result
  // means it holds at any Interface scale, window size and position.
  const FLOAT = '#gtctx,#dlpp,#vqs,#eqpick,#gtmp,#gtmenup,#gtdlp,#gtnp';
  const rel = (el, top0) => { const q = el.getBoundingClientRect(); return { left: q.left, right: q.right, width: q.width, height: q.height, top: q.top - top0, bottom: q.bottom - top0 }; };
  function fit(el) {
    if (!el || !el.isConnected) return;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position !== 'fixed') return;
    const vw = innerWidth, m = 6, sa = window.__gtsafe ? window.__gtsafe() : { top: 0, bottom: innerHeight };
    // menus that hang off the top bar itself may sit over it; everything stays above the phone tab bar
    const top0 = /^(gtmp|gtmenup|gtdlp|vqs)$/.test(el.id) ? 0 : sa.top, vh = sa.bottom - top0;
    for (let i = 0; i < 3; i++) {
      let r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      r = { left: r.left, right: r.right, width: r.width, height: r.height, top: r.top - top0, bottom: r.bottom - top0 };
      const k = el.offsetWidth ? Math.min(6, Math.max(0.2, r.width / el.offsetWidth)) : 1; // screen px per style px (a zoomed parent)
      if (r.height > vh - 2 * m + 1) { el.style.maxHeight = Math.floor((vh - 2 * m) / k) + 'px'; if (!/auto|scroll/.test(cs.overflowY)) el.style.overflowY = 'auto'; r = rel(el, top0); }
      if (r.width > vw - 2 * m + 1) { el.style.maxWidth = Math.floor((vw - 2 * m) / k) + 'px'; if (el.style.width) el.style.width = Math.floor((vw - 2 * m) / k) + 'px'; el.style.minWidth = '0'; r = rel(el, top0); }
      let dx = 0, dy = 0;
      if (r.right > vw - m) dx = vw - m - r.right; if (r.left + dx < m) dx = m - r.left;
      if (r.bottom > vh - m) dy = vh - m - r.bottom; if (r.top + dy < m) dy = m - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const c2 = getComputedStyle(el), l0 = parseFloat(c2.left), t0 = parseFloat(c2.top);
      if (dx && isFinite(l0)) { el.style.left = Math.round(l0 + dx / k) + 'px'; el.style.right = 'auto'; }
      if (dy && isFinite(t0)) { el.style.top = Math.round(t0 + dy / k) + 'px'; el.style.bottom = 'auto'; }
    }
  }
  window.__gtfit = fit;
  try {
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver((es) => es.forEach((e) => fit(e.target))) : null;
    const seen = new WeakSet();
    const watch = (el) => { if (!el || seen.has(el)) return; seen.add(el); if (ro) ro.observe(el); requestAnimationFrame(() => fit(el)); };
    const scan = () => document.querySelectorAll(FLOAT).forEach(watch);
    scan();
    new MutationObserver((ms) => ms.forEach((mu) => mu.addedNodes.forEach((n) => { if (n.nodeType === 1 && n.matches && n.matches(FLOAT)) watch(n); }))).observe(document.body, { childList: true });
    let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => document.querySelectorAll(FLOAT).forEach(fit), 60); });
    // a menu that is shown by changing its style (not by being added) is checked right after the click or key that opened it
    const later = () => requestAnimationFrame(() => document.querySelectorAll(FLOAT).forEach(fit));
    document.addEventListener('contextmenu', later, true); document.addEventListener('click', later, true); document.addEventListener('input', later, true);
  } catch (e) { /* the boxes keep their own placement */ }

  // ---------- Interface scale never makes a page wider than the window ----------
  // A scale above 100% on a narrow window (a phone, a tablet, a small PC window) could make the page wider than the window;
  // phones and tablets then shrink the WHOLE page to fit, so everything, pop-ups included, came out smaller instead of
  // bigger. Here the scale actually used is the one you chose, lowered just enough that the page you are on fits.
  let fsKey = '', fsZ = 0;
  function fitScale(force) {
    const root = document.documentElement, main = document.querySelector('main'); if (!main) return;
    const want = Math.max(0.5, Math.min(2, (+(window.__gtget && window.__gtget('scale')) || 100) / 100));
    const key = want + '|' + (root.dataset.gsec || '') + '|' + root.clientWidth;
    const over = () => main.scrollWidth - main.clientWidth;
    if (!force && key === fsKey) { if (fsZ && over() <= 0) return; } // same page, same window: only act if it overflows now (more loaded)
    else { root.style.setProperty('--gt-z', String(want)); fsZ = want; }
    fsKey = key;
    if (want <= 1) return;
    for (let i = 0; i < 4 && fsZ > 1; i++) {
      const sw = main.scrollWidth, cw = main.clientWidth; if (sw - cw <= 0) break;
      const nz = Math.max(1, Math.floor(fsZ * ((cw - 2) / sw) * 100) / 100 - (i ? 0.01 : 0)); // aim a hair under so rounding cannot leave a pixel over
      if (nz >= fsZ) break;
      fsZ = nz; root.style.setProperty('--gt-z', String(nz));
    }
    if (fsZ !== want) window.dispatchEvent(new Event('resize')); // let pop-ups and the top bar re-fit at the new size
  }
  window.__gtfitscale = () => fitScale(true);
  try {
    let ft = 0; const soon = (f) => { clearTimeout(ft); ft = setTimeout(() => fitScale(f), 80); };
    let lastW = document.documentElement.clientWidth;
    window.addEventListener('resize', () => { const w = document.documentElement.clientWidth; if (w !== lastW) { lastW = w; soon(true); } });
    new MutationObserver(() => soon(true)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-gsec'] });
    setInterval(() => { if (!document.hidden) fitScale(false); }, 2500); // the page can grow after it loads (your vault arriving)
    setTimeout(() => fitScale(true), 600);
  } catch (e) { /* the chosen scale is used as it is */ }

  // ---------- which tab the app opens on ----------
  try {
    const get = window.__gtget || (() => undefined);
    let st = get('starttab') || 'vault';
    let homeStart = false; try { homeStart = JSON.parse(localStorage.getItem('gt.home.start') || 'false'); } catch (e) { /* none */ }
    if (st === 'vault' && homeStart) st = 'home';
    if (st === 'last') st = window.__gtLastTab || 'vault';
    if (st && st !== 'vault') {
      if (st === 'home' && window.__gthome) window.__gthome.open();
      else {
        const go = () => { const b = document.querySelector('#nav button[data-t="' + CSS.escape(st) + '"]'); if (b && !b.classList.contains('gthide')) b.click(); };
        setTimeout(go, 0);
      }
    }
  } catch (e) { /* stay on Inventory */ }
})();
