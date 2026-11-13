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
:root:not([data-anim="off"]) #vsheet .dp,:root:not([data-anim="off"]) .dp.popx{animation:gtup .16s var(--gt-ease)}
/* off (and "subtle" when the system asks for less motion): no animation anywhere */
:root[data-anim="off"] *,:root[data-anim="off"] *::before,:root[data-anim="off"] *::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}
@media (prefers-reduced-motion:reduce){:root[data-anim="subtle"] *,:root[data-anim="subtle"] *::before,:root[data-anim="subtle"] *::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}}
`;
  document.head.appendChild(css);

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
