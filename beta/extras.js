// Organizer, Loadout Optimizer and Compare. Builds on the vault data exposed by vault.js (window.__gtx).
(() => {
  const X = window.__gtx; if (!X) return;
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault'); if (!nav || !vsec) return;
  const { esc, icon } = X;
  const mk = (id, label) => {
    const s = document.createElement('section'); s.id = id; s.className = 'gdark'; vsec.parentNode.appendChild(s);
    const b = document.createElement('button'); b.textContent = label; b.dataset.t = id;
    const lo = nav.querySelector('[data-t=loadouts]'); nav.insertBefore(b, lo ? lo.nextSibling : null);
    return { s, b };
  };
  const opt = mk('optimizer', 'Optimizer'), org = mk('organizer', 'Organizer');
  const st = document.createElement('style');
  st.textContent = `
#optimizer .oset-b{font-size:11.5px;border:1px solid #6a5a2a;color:#f0d58a;border-radius:9px;padding:1px 8px;cursor:help}#optimizer .osetp{margin:4px 0 8px;font-size:12.5px;display:flex;flex-direction:column;gap:3px}
#organizer,#optimizer{zoom:var(--gt-z,1);--t:var(--gt-t,44px)}
#organizer .card,#optimizer .card{background:var(--g-panel);border:1px solid var(--g-line);border-radius:3px;box-shadow:none;margin-bottom:8px;padding:10px 12px}
#organizer .card::before,#organizer .card::after,#optimizer .card::before,#optimizer .card::after{display:none!important}
#organizer button,#optimizer button,#cmpm button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn);padding:4px 10px;cursor:pointer}
#organizer button.on,#optimizer button.on{background:var(--g-accent2);color:var(--g-on-accent,#fff)}
#organizer input,#organizer select,#optimizer select,#optimizer input[type=number]{background:var(--g-deep);border:1px solid #3a3d43;border-radius:3px;padding:5px 8px;color:#fff}
.otools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#optimizer .orun{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin:14px 0 6px;padding-top:12px;border-top:1px solid var(--g-line,#2b2e33)}#optimizer .omods{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#optimizer .olbl{font-size:13px;color:#cfd2d8;white-space:nowrap}#optimizer .omods select{width:auto!important;min-width:150px}@media (max-width:760px){.omods select{min-width:0;flex:1 1 140px;max-width:100%}.otbl td.pk{min-width:220px}.otools input[type=text]{min-width:0}}#optimizer button.orbtn{padding:8px 22px!important;font-weight:700;font-size:14px;border-radius:4px}.otools input[type=text]{flex:1;min-width:220px}
.otbl{width:100%;border-collapse:collapse;font-size:13px}.otbl th{position:sticky;top:0;background:var(--g-solid);text-align:left;padding:5px 6px;cursor:pointer;color:var(--mute);font-weight:600;white-space:nowrap;border-bottom:1px solid var(--g-line)}
.otbl td{padding:3px 6px;border-bottom:1px solid #26282d;white-space:nowrap;color:#e6e7ea}.otbl tr.r{cursor:pointer}.otbl tr.r:hover{background:#26282d}
.otbl td.n{display:flex;align-items:center;gap:6px}.otbl td.n>img{width:28px;height:28px;border:1px solid #4a4d54}.otbl td.pk{white-space:normal;max-width:420px;color:#b9bcc4;font-size:12px}
.otbl .ex{color:#ceae33}.otbl .hi{color:#7fd17f;font-weight:700}
.otgt{display:flex;flex-direction:column;gap:4px;margin:10px 0;max-width:680px}.otr{display:grid;grid-template-columns:52px 80px 1fr 64px 28px 112px;gap:8px;align-items:center}.otr select{padding:3px 6px!important;font-size:12px}.ostats em.of{color:#7ab8e8}@media (max-width:560px){.otr{grid-template-columns:52px 70px 1fr 56px 24px;row-gap:2px}.otr select{grid-column:2/-1}}.otr b{color:#fff;font-size:13px}.otr input[type=range]{width:100%;margin:0}.otr input[type=number]{width:64px;padding:3px 6px!important}.otr .ord{display:flex;gap:2px}.otr .ord button{padding:0!important;font-size:10px;width:24px;height:24px;line-height:22px;min-width:0}.otr .ord button[disabled]{opacity:.3}.ostats span.ok b{color:#7fd48a}.ostats span.short b{color:#ff9a8f}.ostats i{font-style:normal;color:#ff9a8f;font-size:11px;margin-left:3px}.oset.near{border-left:2px solid rgba(255,154,143,.5);padding-left:8px}.ostats em{font-style:normal;color:#e0b64a;font-size:11px;margin-left:3px}.owgt{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin:8px 0}.owgt label{display:flex;flex-direction:column;font-size:12px;color:var(--mute);text-transform:capitalize}
.oset{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--g-line)}
.oset .tiles{display:flex;gap:3px}.oset .tiles>img{width:var(--t);height:var(--t);border:1px solid #4a4d54;background:var(--g-line)}
.oset .tiles .ex>img{border-color:#ceae33}.ostats{display:grid;grid-template-columns:repeat(3,auto);gap:2px 12px;font-size:12px;color:#e6e7ea}.ostats b{color:#fff}
#cmpm{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:12px}
#cmpm .box{background:var(--g-panel,#1d2026);color:#e6e7ea;border:1px solid #4a4d54;max-width:96vw;max-height:92vh;overflow:auto;padding:12px}
`;
  document.head.appendChild(st);
  const D = () => X.D(), WEAPON = X.WEAPON, ARMOR = X.ARMOR;
  // The same item tile as the vault (ornament, rarity, masterwork, season mark, element), not dragged from here.
  const mt = (x) => (X.tile ? X.tile(x).replace(' draggable="true"', '') : `<img src="${esc(icon(x.i))}" alt="">`);
  const stn = X.STN.map((n) => n[0].toUpperCase() + n.slice(1));
  const where = (x) => (x.loc === 'vault' ? 'Vault' : (X.CL[(X.ent(x.loc) || {}).cls] || '?') + (x.e ? ' (eq)' : '') + (x.pm ? ' PM' : ''));
  const tagOf = (x) => { const t = X.TAGS()[x.id]; const r = X.TG.find((q) => q[0] === t); return r ? `<span style="color:${r[2]}">${r[1]}</span>` : ''; };
  const ELn = (x) => (X.ELEM[x.el] ? X.ELEM[x.el][0] : '');

  // ---------------- Organizer ----------------
  const O = { kind: 'w', cls: 'all', q: '', sort: 'p', dir: -1 };
  const total = (x) => (x.st ? x.st.reduce((a, b) => a + b, 0) : 0);
  const keys = {
    n: (x) => x.n.toLowerCase(), p: (x) => x.p, el: (x) => ELn(x), t: (x) => x.t, r: (x) => x.r, loc: (x) => where(x), tag: (x) => X.TAGS()[x.id] || '', tot: total,
    w: (x) => X.wish(x).v, s0: (x) => (x.st || [])[0] || 0, s1: (x) => (x.st || [])[1] || 0, s2: (x) => (x.st || [])[2] || 0, s3: (x) => (x.st || [])[3] || 0, s4: (x) => (x.st || [])[4] || 0, s5: (x) => (x.st || [])[5] || 0,
  };
  function drawOrg() {
    const d = D();
    if (!d) { org.s.innerHTML = '<div class="card"><p class="mute">Open the Vault tab and load your vault first.</p></div>'; return; }
    const W = O.kind === 'w';
    let rows = d.items.filter((x) => !x.pm && (W ? WEAPON.has(x.b) : ARMOR.has(x.b)) && (W || O.cls === 'all' || x.c === +O.cls) && X.match(x, O.q));
    const kf = keys[O.sort] || keys.p;
    rows.sort((a, b) => { const A = kf(a), B = kf(b); return (A < B ? -1 : A > B ? 1 : 0) * O.dir; });
    const cap = 700, more = rows.length - cap; rows = rows.slice(0, cap);
    const th = (k, l) => `<th data-s="${k}">${l}${O.sort === k ? (O.dir > 0 ? ' &#9650;' : ' &#9660;') : ''}</th>`;
    const head = W ? th('n', 'Name') + th('p', 'Power') + th('el', 'Element') + th('t', 'Type') + th('r', 'Rarity') + th('w', 'Wish') + '<th>Perks</th>' + th('tag', 'Tag') + th('loc', 'Where')
      : th('n', 'Name') + th('p', 'Power') + th('t', 'Slot') + stn.map((n, i) => th('s' + i, n)).join('') + th('tot', 'Total') + th('tag', 'Tag') + th('loc', 'Where');
    const body = rows.map((x) => {
      const w = X.wish(x).v, ex = x.r === 'Exotic' ? ' ex' : '';
      const nm = `<td class="n${ex}"><span class="mtile" style="--t:34px">${mt(x)}</span>${esc(x.n)}</td>`;
      if (W) return `<tr class="r" data-id="${esc(x.id)}">${nm}<td>${x.p}</td><td>${esc(ELn(x))}</td><td>${esc(x.t)}</td><td>${esc(x.r)}</td><td>${w > 0 ? '&#128077;' : w < 0 ? '&#128078;' : ''}</td><td class="pk">${esc((x.ep || []).join(' · '))}</td><td>${tagOf(x)}</td><td>${esc(where(x))}</td></tr>`;
      const t = total(x);
      return `<tr class="r" data-id="${esc(x.id)}">${nm}<td>${x.p}</td><td>${esc(x.t)}</td>${(x.st || [0, 0, 0, 0, 0, 0]).map((v) => `<td${v >= 30 ? ' class="hi"' : ''}>${v}</td>`).join('')}<td><b>${t}</b></td><td>${tagOf(x)}</td><td>${esc(where(x))}</td></tr>`;
    }).join('');
    org.s.innerHTML = `<div class="card"><div class="otools"><button data-k="w" class="${W ? 'on' : ''}">Weapons</button><button data-k="a" class="${W ? '' : 'on'}">Armor</button>${W ? '' : `<select id="ocls"><option value="all">All classes</option>${X.CL.map((c, i) => `<option value="${i}"${O.cls === String(i) ? ' selected' : ''}>${c}</option>`).join('')}</select>`}<input type="text" id="oq" placeholder="Filter like the vault search: is:exotic, perk:outlaw, stat:grenade:>=20, tag:junk, is:wishlist" value="${esc(O.q)}"><span class="mute">${rows.length}${more > 0 ? '+' : ''} items</span></div></div><div class="card" style="overflow:auto"><table class="otbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    const oq = document.getElementById('oq'); if (oq && O.focus) { oq.focus(); oq.setSelectionRange(oq.value.length, oq.value.length); }
  }
  org.s.addEventListener('click', (e) => {
    const k = e.target.closest('[data-k]'); if (k) { O.kind = k.dataset.k; O.sort = k.dataset.k === 'w' ? 'p' : 'tot'; O.dir = -1; O.focus = 0; drawOrg(); return; }
    const h = e.target.closest('[data-s]'); if (h) { if (O.sort === h.dataset.s) O.dir *= -1; else { O.sort = h.dataset.s; O.dir = h.dataset.s === 'n' || h.dataset.s === 'loc' ? 1 : -1; } O.focus = 0; drawOrg(); return; }
    const r = e.target.closest('tr.r'); if (r) { window.show('vault'); X.open(r.dataset.id); }
  });
  org.s.addEventListener('input', (e) => { if (e.target.id === 'oq') { O.q = e.target.value.toLowerCase(); O.focus = 1; clearTimeout(O.t); O.t = setTimeout(drawOrg, 250); } });
  org.s.addEventListener('change', (e) => { if (e.target.id === 'ocls') { O.cls = e.target.value; O.focus = 0; drawOrg(); } });
  // Switch first and redraw right after the page is on screen, so the tab change itself is instant.
  org.b.onclick = () => { O.focus = 0; const had = org.s.firstChild; if (!had) drawOrg(); window.show('organizer'); if (had) requestAnimationFrame(() => setTimeout(drawOrg, 0)); };

  // ---------------- Loadout Optimizer ----------------
  const st2 = document.createElement('style');
  st2.textContent = `
#optimizer .o2help{margin:0 0 10px;max-width:980px;font-size:13px}
#optimizer .o2opts{margin-top:8px}
#optimizer .o2ck{display:inline-flex;gap:6px;align-items:center;font-size:13px;white-space:nowrap}
#optimizer .o2q{display:inline-flex;gap:6px;align-items:center;font-size:13px;flex:1 1 260px}
#optimizer .o2q input{flex:1;min-width:160px;background:var(--g-deep);border:1px solid #3a3d43;border-radius:3px;padding:5px 8px;color:#fff}
#optimizer .o2grid{display:flex;flex-direction:column;gap:4px;margin:12px 0 6px;max-width:860px}
#optimizer .o2h,#optimizer .o2row{display:grid;grid-template-columns:52px 120px 70px 70px minmax(120px,1fr) 92px 70px;gap:8px;align-items:center}
#optimizer .o2h{font-size:11.5px;color:#9aa0a8;text-transform:none}
#optimizer .o2row.off .o2n{color:#7d828a}
#optimizer .o2row .ord{display:flex;gap:2px}
#optimizer .o2row .ord button{padding:0!important;font-size:10px;width:24px;height:24px;line-height:22px;min-width:0}
#optimizer .o2row .ord button[disabled]{opacity:.3}
#optimizer .o2row input[type=number]{width:100%;padding:4px 6px!important}
#optimizer .o2row select{width:100%;padding:3px 4px!important;font-size:12px}
#optimizer .o2n{display:flex;gap:6px;align-items:center;font-weight:700;font-size:13.5px;cursor:pointer}
#optimizer .o2bar{position:relative;height:16px;background:#1b1d22;border:1px solid #2c2f35;border-radius:3px;overflow:hidden}
#optimizer .o2bar i{position:absolute;top:0;bottom:0}
#optimizer .o2bar i.want{background:rgba(240,190,70,.16);border-left:1px solid rgba(240,190,70,.5);border-right:1px solid rgba(240,190,70,.5)}
#optimizer .o2bar i.can{top:4px;bottom:4px;background:#e6e7ea;border-radius:2px}
#optimizer .o2bar em{position:absolute;right:4px;top:0;font-size:10.5px;line-height:14px;font-style:normal;color:#c9ccd2;text-shadow:0 0 3px #000}
#optimizer .o2pins{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
#optimizer .o2chip{display:inline-flex;gap:6px;align-items:center;font-size:12.5px;border:1px solid #3a3d43;border-radius:12px;padding:2px 4px 2px 10px}
#optimizer .o2chip.pin{border-color:#6a5a2a;color:#f0d58a}
#optimizer .o2chip.exc{border-color:#6b3434;color:#f0a0a0}
#optimizer .o2chip button{padding:0 6px!important;border:0!important;background:none!important;color:inherit!important;font-size:15px;line-height:1}
#optimizer .o2list{display:flex;flex-direction:column;gap:6px;margin-top:8px}
#optimizer .oset2{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;border:1px solid var(--g-line,#2b2e33);border-radius:4px;padding:8px 10px;background:rgba(255,255,255,.015)}
#optimizer .oset2.near{border-color:#5a4520}
#optimizer .o2l{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1 1 520px}
#optimizer .oset2 .tiles{display:flex;gap:4px;flex-wrap:wrap}
#optimizer .o2t{padding:0!important;border:2px solid transparent!important;background:none!important;border-radius:4px!important;--t:50px;line-height:0}
#optimizer .o2t.pin{border-color:#e8b84a!important}
#optimizer .o2t:hover{border-color:#8a8f98!important}
#optimizer .o2st{display:flex;gap:4px 14px;flex-wrap:wrap;font-size:13px}
#optimizer .o2st span{color:#c9ccd2;cursor:help;white-space:nowrap}
#optimizer .o2st span b{color:#fff;font-size:14px}
#optimizer .o2st span.ok b{color:#7ed99a}
#optimizer .o2st span.short b{color:#ff8a7a}
#optimizer .o2st span.off{opacity:.55}
#optimizer .o2st i{font-style:normal;color:#ff8a7a;font-size:11.5px;margin-left:4px}
#optimizer .o2m{font-size:12.5px}
#optimizer .o2m b{color:#fff}
#optimizer .o2m .up{color:#7ed99a}#optimizer .o2m .dn{color:#ff8a7a}
#optimizer .o2mods{display:flex;gap:4px 16px;flex-wrap:wrap;font-size:12px;color:#aeb3bb}
#optimizer .o2mods b{color:#d5d8de;font-weight:600}
#optimizer .o2r{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.o2menu{position:fixed;z-index:9999;display:none;flex-direction:column;min-width:200px;background:#16181c;border:1px solid #3a3d43;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.6);padding:4px}
.o2menu.on{display:flex}
.o2menu .o2mt{font-size:12px;color:#9aa0a8;padding:4px 8px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.o2menu button{text-align:left;background:none;border:0;color:#e6e7ea;padding:7px 10px;border-radius:3px;cursor:pointer;font-size:13px}
.o2menu button:hover{background:#262931}
@media (max-width:640px){
#optimizer .o2h{display:none}
#optimizer .o2row{grid-template-columns:44px 1fr 62px 62px;row-gap:4px;padding:6px 0;border-bottom:1px solid #24262b}
#optimizer .o2row .o2bar{grid-column:1/-1}
#optimizer .o2row select{grid-column:1/3}
#optimizer .o2row input[data-bon]{grid-column:3/5}
#optimizer .o2l{flex-basis:100%}
}`;
  document.head.appendChild(st2);
  // Works like DIM's Loadout Optimizer, for Armor 3.0 (each stat 0 to 200):
  //  - each piece's own stats, without the mods in it right now (stat mods, artifice +3, Tier 5 tuning);
  //  - a minimum and a maximum per stat, stats you can switch off, and a priority order;
  //  - auto stat mods (+10 major for 3 energy, +5 minor for 1), artifice +3 and Tier 5 tuning, chosen per set;
  //  - Font mods, other bonuses (fragments and the like), assume masterworked, set bonuses, exotic choice,
  //    a search filter, pinned and excluded pieces;
  //  - every combination is checked (with pruning), best total first, ties broken by the stat order.
  const OPS = (() => { try { return JSON.parse(localStorage.getItem('gt.opt2')) || {}; } catch (e) { return {}; } })();
  const arr6 = (a, f, lo, hi) => (Array.isArray(a) && a.length === 6 ? a.map((v) => Math.max(lo, Math.min(hi, Math.round(+v || 0)))) : [0, 0, 0, 0, 0, 0].map(() => f));
  const OP = {
    cls: 0, pri: Array.isArray(OPS.pri) && OPS.pri.length === 6 && [0, 1, 2, 3, 4, 5].every((k) => OPS.pri.includes(k)) ? OPS.pri : [1, 5, 3, 4, 2, 0],
    mn: arr6(OPS.mn, 0, 0, 200), mx: arr6(OPS.mx, 200, 0, 200), on: Array.isArray(OPS.on) && OPS.on.length === 6 ? OPS.on.map((v) => !!v) : [true, true, true, true, true, true],
    font: arr6(OPS.font, 0, 0, 3), bon: arr6(OPS.bon, 0, -100, 100),
    auto: OPS.auto !== false, tune: OPS.tune !== false, art: OPS.art !== false, mwa: !!OPS.mwa, junk: OPS.junk !== false, q: typeof OPS.q === 'string' ? OPS.q.slice(0, 200) : '',
    ex: '', sets: [], pin: {}, exc: new Set(),
    res: null, near: false, msg: '', busy: false, run: 0, rng: null, shown: 30, SI: null, SD: {}, sLoad: false,
  };
  const saveOP = () => { try { localStorage.setItem('gt.opt2', JSON.stringify({ pri: OP.pri, mn: OP.mn, mx: OP.mx, on: OP.on, font: OP.font, bon: OP.bon, auto: OP.auto, tune: OP.tune, art: OP.art, mwa: OP.mwa, junk: OP.junk, q: OP.q })); } catch (e) { /* storage off */ } };
  // Font mods add to a stat while you have any Armor Charge: +20 for one copy, +40 for two, +50 for three
  // (Bungie, This Week in Destiny 07/10/2025). Each goes in a slot mod socket of one piece and costs 1 energy (the cheap version).
  const FONTV = [0, 20, 40, 50];
  const SLOTS = [3448274439, 3551918588, 14239492, 20886954, 1585787867];
  const SLN = ['Helmet', 'Arms', 'Chest', 'Legs', 'Class item'];
  // stat index -> armor slot of its Font mod: Weapons Font legs, Health Font chest, Class Font class item,
  // Grenade Font arms, Super Font helmet, Melee Font arms
  const FONTSLOT = [3, 2, 4, 1, 0, 1];
  const MAXS = 200;
  async function loadSets() {
    const d = D(); if (!d || OP.sLoad || !window.gt.armSets) return; OP.sLoad = true;
    try { const r = await window.gt.armSets({ h: [...new Set(d.items.filter((x) => ARMOR.has(x.b) && !x.pm).map((x) => x.h))] }); OP.SI = r.items || {}; OP.SD = r.sets || {}; }
    catch (e) { OP.SI = {}; OP.setErr = 1; }
    if (opt.s.classList.contains('on')) drawOpt();
  }
  const setOf = (x) => (OP.SI && OP.SI[x.h]) || 0;
  const setsOf = (its) => { const c = {}; its.forEach((x) => { const sh = setOf(x); if (sh) c[sh] = (c[sh] || 0) + 1; }); return Object.keys(c).filter((sh) => c[sh] >= 2).map((sh) => ({ sh: +sh, n: c[sh], d: OP.SD[sh] })); };
  const classArmor = (d) => d.items.filter((x) => !x.pm && x.st && SLOTS.includes(x.b) && (x.c === OP.cls || x.c === 3));
  // Armor 3.0 masterwork: +5 to the piece's three lowest stats (DIM assumes the same); the part it already has is kept.
  function assumeMw(st, x) {
    if (!OP.mwa || x.mw || !x.gt) return st;
    const o = st.slice(), low = [0, 1, 2, 3, 4, 5].sort((a, b) => o[a] - o[b]).slice(0, 3), have = Math.max(0, Math.min(5, Math.min(...low.map((k) => o[k]))));
    low.forEach((k) => { o[k] += 5 - have; });
    return o;
  }
  // One entry per piece (and per Tier 5 tuning choice), ready for the search.
  function procItems(d) {
    const T = X.TAGS ? X.TAGS() : {}, all = classArmor(d), q = OP.q.trim();
    // the stat tuning should take from: the lowest switched-off stat, else the one with the lowest maximum (lowest in the order on ties)
    const offs = OP.pri.filter((k) => !OP.on[k]);
    const DUMP = offs.length ? offs[offs.length - 1] : [...OP.pri].reverse().reduce((b, k) => (OP.mx[k] < OP.mx[b] ? k : b), OP.pri[5]);
    const per = SLOTS.map(() => []);
    SLOTS.forEach((b, si) => {
      let pool = all.filter((x) => x.b === b && !OP.exc.has(x.id));
      const pinned = OP.pin[si] && pool.find((x) => x.id === OP.pin[si]);
      if (pinned) pool = [pinned];
      else {
        if (OP.junk) pool = pool.filter((x) => T[x.id] !== 'junk');
        // like DIM: when nothing in a slot matches the search, the search is not used for that slot
        if (q && X.match) { const m = pool.filter((x) => X.match(x, q)); if (m.length) pool = m; }
      }
      pool.forEach((x) => {
        const base0 = (x.op && x.op.sb) || x.st, base = assumeMw(base0, x);
        const cap = Math.min(11, Math.max(OP.mwa && !x.mw ? 10 : 0, x.en || 10));
        const art = OP.art && x.op && x.op.ai !== undefined ? 1 : 0;
        const exo = x.r === 'Exotic' ? 1 : 0;
        const vs = [{ st: base, tu: null }];
        if (OP.tune && OP.auto && x.op && x.op.tu) x.op.tu.forEach(([h, dl0, n, ic]) => {
          // like DIM, only tuning that takes from the "dump" stat (or from a stat with a low maximum) is tried
          const neg = dl0 ? dl0.findIndex((q) => q < 0) : -1;
          if (neg >= 0 && neg !== DUMP && !(OP.mx[neg] > 0 && OP.mx[neg] <= 175)) return;
          // Balanced tuning: +1 to the piece's three lowest stats
          const dl = dl0 || (() => { const o = [0, 0, 0, 0, 0, 0]; [0, 1, 2, 3, 4, 5].sort((a, b) => base[a] - base[b]).slice(0, 3).forEach((k) => { o[k] = 1; }); return o; })();
          // a stat can go below 0 on the piece (the game takes the 5 off the character's total, DIM shows it as -5)
          vs.push({ st: base.map((v, k) => Math.min(MAXS, v + dl[k])), tu: [h, n, dl, ic] });
        });
        vs.forEach((v) => per[si].push({ x, si, st: v.st, tu: v.tu, cap, art, exo, eh: exo ? x.h : 0, set: setOf(x) }));
      });
    });
    return per;
  }
  // Drop entries another entry in the same slot beats or equals on every stat that counts (and on artifice, energy,
  // exotic and set-bonus needs), so the search only looks at pieces that could ever win.
  function prune(list, en, keyOf) {
    const groups = {};
    list.forEach((e) => { const k = keyOf(e); (groups[k] = groups[k] || []).push(e); });
    const out = [];
    Object.values(groups).forEach((g) => {
      g.sort((a, b) => en.reduce((t, k) => t + b.st[k] - a.st[k], 0) || (b.art - a.art) || (b.cap - a.cap) || ((a.tu ? 1 : 0) - (b.tu ? 1 : 0)));
      const keep = [];
      g.forEach((e) => {
        const dom = keep.some((o) => o.art >= e.art && Math.min(o.cap, 6) >= Math.min(e.cap, 6) && en.every((k) => o.st[k] >= e.st[k]));
        if (!dom) keep.push(e);
      });
      out.push(...keep);
    });
    return out;
  }
  const fontCost = (si) => OP.font.reduce((t, n, k) => t + (FONTSLOT[k] === si ? n : 0), 0);
  const cmpRes = (a, b) => (b.tot - a.tot) || (() => { for (const k of OP.pri) { if (!OP.on[k]) continue; const d = Math.min(b.v[k], OP.mx[k]) - Math.min(a.v[k], OP.mx[k]); if (d) return d; } return 0; })();
  // could a set whose stats are at most ub (per stat) and whose total is at most ubT still beat w?
  const canBeat = (ubT, ub, w) => { if (ubT !== w.tot) return ubT > w.tot; for (const k of OP.pri) { if (!OP.on[k]) continue; const a = Math.min(ub[k], OP.mx[k]), b = Math.min(w.v[k], OP.mx[k]); if (a !== b) return a > b; } return false; };
  // The search. Runs in small steps so the page stays responsive; returns the best sets, the closest ones when none
  // reach every minimum, and the range each stat can reach.
  async function optimize(token, onStep) {
    const d = D(); if (!d) return { sets: [] };
    const en = [0, 1, 2, 3, 4, 5].filter((k) => OP.on[k]);
    const exSel = OP.ex, exHash = /^\d+$/.test(exSel) ? +exSel : 0;
    const req = OP.sets.filter((s) => s.sh);
    let per = procItems(d);
    // exotic rules
    per = per.map((l) => l.filter((e) => !(exSel === 'none' && e.exo) && !(exHash && e.exo && e.eh !== exHash)));
    if (exHash && !per.some((l) => l.some((e) => e.eh === exHash))) return { sets: [], why: 'You do not have that exotic for this class.' };
    const reqSet = new Set(req.map((s) => s.sh));
    per = per.map((l) => prune(l, en.length ? en : [0, 1, 2, 3, 4, 5], (e) => (e.exo ? 'E' + (exHash ? e.eh : '') : 'L') + '|' + (reqSet.has(e.set) ? e.set : 0)));
    if (per.some((l) => !l.length)) return { sets: [], why: 'No armor left in the ' + SLN[per.findIndex((l) => !l.length)] + ' slot (check the search, junk and excluded pieces).' };
    const F = [0, 1, 2, 3, 4, 5].map((k) => FONTV[OP.font[k]] + OP.bon[k]);
    const fc = SLOTS.map((b, si) => fontCost(si));
    // sort each slot best first, and what the remaining slots could add at most
    const etot = (e) => en.reduce((t, k) => t + e.st[k], 0);
    per.forEach((l) => l.sort((a, b) => etot(b) - etot(a)));
    const order = [0, 1, 2, 3, 4].sort((a, b) => per[a].length - per[b].length);
    const P = order.map((i) => per[i]);
    const suf = []; for (let i = 5; i >= 0; i--) suf[i] = i === 5 ? [0, 0, 0, 0, 0, 0] : suf[i + 1].map((v, k) => v + Math.max(...P[i].map((e) => e.st[k])));
    const sufArt = []; for (let i = 5; i >= 0; i--) sufArt[i] = i === 5 ? 0 : sufArt[i + 1] + (P[i].some((e) => e.art) ? 1 : 0);
    // the most the remaining slots can add to the total of the stats that count (much tighter than adding up each stat's best)
    const sufT = []; for (let i = 5; i >= 0; i--) sufT[i] = i === 5 ? 0 : sufT[i + 1] + Math.max(...P[i].map(etot));
    const N = 100, best = [], near = []; let checked = 0, valid = 0;
    const total = P.reduce((t, l) => t * l.length, 1);
    const rmin = [MAXS, MAXS, MAXS, MAXS, MAXS, MAXS].map((v) => v + 999), rmax = [0, 0, 0, 0, 0, 0].map(() => -999);
    const anyMin = en.some((k) => OP.mn[k] > 0);
    const modMax = (OP.auto ? 50 : 0);
    const cur = [0, 0, 0, 0, 0, 0], pick = [];
    // stat mods, artifice and spare points for one set; null when the minimums cannot be reached
    const finish = (setEntries) => {
      const v = cur.map((q, k) => q + F[k]);
      const plan = []; // [slotIndex, kind, statIndex, amount]
      const budget = setEntries.map((e) => (OP.auto ? e.cap - fc[e.si] : -1));
      const artFree = setEntries.filter((e) => e.art).map((e) => e.si);
      const def = [0, 1, 2, 3, 4, 5].map((k) => (OP.on[k] ? Math.max(0, OP.mn[k] - v[k]) : 0));
      // artifice first where it saves a mod: deficits of 1-3 points, or the odd 1-3 left over after +5s
      const useArt = (k) => { const si = artFree.shift(); plan.push([si, 'a', k, 3]); v[k] += 3; def[k] = Math.max(0, def[k] - 3); };
      [0, 1, 2, 3, 4, 5].filter((k) => def[k] > 0 && def[k] % 5 > 0 && def[k] % 5 <= 3).sort((a, b) => OP.pri.indexOf(a) - OP.pri.indexOf(b)).forEach((k) => { if (artFree.length) useArt(k); });
      // stat mods: +10 needs 3 energy, +5 needs 1
      const big = [], small = [];
      setEntries.forEach((e, j) => { if (budget[j] >= 3) big.push(e.si); else if (budget[j] >= 1) small.push(e.si); });
      for (const k of OP.pri) {
        while (def[k] > 0) {
          if (def[k] <= 3 && artFree.length) { useArt(k); continue; }
          if (def[k] <= 5 && small.length) { const si = small.shift(); plan.push([si, 'm', k, 5]); v[k] += 5; def[k] = Math.max(0, def[k] - 5); continue; }
          if (big.length) { const si = big.shift(); plan.push([si, 'M', k, 10]); v[k] += 10; def[k] = Math.max(0, def[k] - 10); continue; }
          if (small.length) { const si = small.shift(); plan.push([si, 'm', k, 5]); v[k] += 5; def[k] = Math.max(0, def[k] - 5); continue; }
          if (artFree.length) { useArt(k); continue; }
          return { v, plan, short: def.slice() };
        }
      }
      // spare mods and artifice go to the stats in order, up to each stat's maximum (switched-off stats last)
      const ordr = [...OP.pri.filter((k) => OP.on[k]), ...OP.pri.filter((k) => !OP.on[k])];
      const room = (k, a) => v[k] + a <= (OP.on[k] ? OP.mx[k] : MAXS);
      if (OP.auto) {
        for (const k of ordr) { while (big.length && room(k, 10)) { const si = big.shift(); plan.push([si, 'M', k, 10]); v[k] += 10; } while (small.length && room(k, 5)) { const si = small.shift(); plan.push([si, 'm', k, 5]); v[k] += 5; } }
        for (const k of ordr) { while (big.length && room(k, 5)) { const si = big.shift(); plan.push([si, 'm', k, 5]); v[k] += 5; } }
      }
      for (const k of ordr) while (artFree.length && room(k, 3)) useArt(k);
      for (let k = 0; k < 6; k++) if (v[k] < 0) v[k] = 0;
      return { v, plan };
    };
    let last = performance.now();
    let nearMode = false;
    const reqH = req.map((r) => r.sh), reqN = req.map((r) => r.n), rc = req.map(() => 0);
    const sufExo = []; for (let i = 5; i >= 0; i--) sufExo[i] = i === 5 ? 0 : sufExo[i + 1] + (P[i].some((e) => e.exo) ? 1 : 0);
    let artN = 0; const ubv = [0, 0, 0, 0, 0, 0], mxT = en.reduce((t, k) => t + OP.mx[k], 0);
    const mv = (e) => (OP.auto ? (e.cap - fc[e.si] >= 3 ? 10 : e.cap - fc[e.si] >= 1 ? 5 : 0) : 0);
    const leaf = (exo) => {
      checked++;
      if (OP.ex === 'req' && !exo) return;
      for (let q = 0; q < reqH.length; q++) if (rc[q] < reqN[q]) return;
      if (!nearMode && best.length >= N) {
        let ubL = artN * 3; for (let j = 0; j < 5; j++) ubL += mv(pick[j]);
        let u = 0; for (const k of en) { ubv[k] = cur[k] + F[k] + ubL; u += Math.min(OP.mx[k], cur[k] + F[k]); }
        if (!canBeat(Math.min(u + ubL, mxT), ubv, best[best.length - 1])) return;
      }
      const ents = pick.slice();
      const r = finish(ents);
      if (r.short) {
        if (!nearMode) return;
        const sh = r.short.reduce((x, y) => x + y, 0), tot = en.reduce((t, k) => t + Math.min(r.v[k], OP.mx[k]), 0);
        if (near.length < 8 || sh < near[near.length - 1].sh || (sh === near[near.length - 1].sh && tot > near[near.length - 1].tot)) {
          near.push({ ents, v: r.v, plan: r.plan, short: r.short, sh, tot }); near.sort((x, y) => x.sh - y.sh || y.tot - x.tot); if (near.length > 8) near.length = 8;
        }
        return;
      }
      if (nearMode) return;
      valid++;
      for (let k = 0; k < 6; k++) { const q = Math.min(MAXS, r.v[k]); if (q < rmin[k]) rmin[k] = q; if (q > rmax[k]) rmax[k] = q; }
      const tot = en.reduce((t, k) => t + Math.min(r.v[k], OP.mx[k]), 0);
      const res = { ents, v: r.v, plan: r.plan, tot };
      if (best.length >= N && cmpRes(res, best[best.length - 1]) >= 0) return;
      const key = ents.map((e) => e.x.h + ':' + e.st.join('.')).sort().join('|');
      if (best.some((o) => o.key === key)) return;
      res.key = key;
      let lo = 0, hi = best.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (cmpRes(res, best[mid]) < 0) hi = mid; else lo = mid + 1; }
      best.splice(lo, 0, res); if (best.length > N) best.length = N;
    };
    const skipCount = (i) => { let t = 1; for (let q = i + 1; q < 5; q++) t *= P[q].length; return t; };
    // can this piece at depth i lead anywhere? (adds it to the running totals when it can)
    const enter = (i, e, exo) => {
      if (e.exo && exo) return false;
      for (let k = 0; k < 6; k++) cur[k] += e.st[k];
      const sf = suf[i + 1], art = artN + (e.art ? 1 : 0) + sufArt[i + 1];
      let need = 0, ub = 0, raw = sufT[i + 1];
      for (const k of en) { const top = cur[k] + F[k] + sf[k]; if (OP.mn[k] > top) need += OP.mn[k] - top; ub += Math.min(OP.mx[k], top); raw += cur[k] + F[k]; }
      if (raw < ub) ub = raw;
      let ok;
      if (nearMode) ok = !(near.length >= 8 && Math.max(0, need - modMax - art * 3) > near[near.length - 1].sh);
      else if (need > modMax + art * 3) ok = false;
      else if (best.length >= N) { for (const k of en) ubv[k] = cur[k] + F[k] + sf[k] + modMax + art * 3; ok = canBeat(Math.min(ub + modMax + art * 3, mxT), ubv, best[best.length - 1]); }
      else ok = true;
      if (ok && OP.ex === 'req' && !exo && !e.exo && !sufExo[i + 1]) ok = false;
      if (ok && reqH.length) { for (let q = 0; q < reqH.length; q++) { const c = rc[q] + (e.set === reqH[q] ? 1 : 0); if (c + (4 - i) < reqN[q]) { ok = false; break; } } }
      if (!ok) { for (let k = 0; k < 6; k++) cur[k] -= e.st[k]; checked += skipCount(i); return false; }
      pick[i] = e; if (e.art) artN++; for (let q = 0; q < reqH.length; q++) if (e.set === reqH[q]) rc[q]++;
      return true;
    };
    const leave = (e) => { for (let k = 0; k < 6; k++) cur[k] -= e.st[k]; if (e.art) artN--; for (let q = 0; q < reqH.length; q++) if (e.set === reqH[q]) rc[q]--; };
    const recS = (i, exo) => {
      if (i === 5) { leaf(exo); return; }
      const L = P[i];
      for (let j = 0; j < L.length; j++) { const e = L[j]; if (!enter(i, e, exo)) continue; recS(i + 1, exo || e.exo); leave(e); }
    };
    const pass = async () => {
      for (const e0 of P[0]) {
        if (token !== OP.run) return;
        if (!enter(0, e0, 0)) continue;
        for (const e1 of P[1]) {
          if (!enter(1, e1, e0.exo)) continue;
          recS(2, e0.exo || e1.exo);
          leave(e1);
          if (performance.now() - last > 40) { last = performance.now(); if (onStep) onStep(checked / total); await new Promise((ok2) => setTimeout(ok2, 0)); if (token !== OP.run) { leave(e0); return; } }
        }
        leave(e0);
      }
    };
    await pass();
    // nothing reaches every minimum: look again for the closest sets
    if (!best.length && anyMin && token === OP.run) { nearMode = true; checked = 0; await pass(); }
    const toSet = (r) => { const ents = order.map((i, oi) => r.ents[oi]); const bySlot = []; ents.forEach((e) => { bySlot[e.si] = e; }); return Object.assign({}, r, { ents: bySlot }); };
    return { sets: best.map(toSet), near: best.length ? [] : near.map(toSet), valid, checked, total, rng: valid ? { lo: rmin, hi: rmax } : null, counts: per.map((l) => l.length) };
  }
  function setOpts(cur) {
    const d = D(); if (!d || !OP.SI) return '';
    const cnt = {}; classArmor(d).forEach((x) => { const sh = OP.SI[x.h]; if (sh) { cnt[sh] = cnt[sh] || new Set(); cnt[sh].add(x.b); } });
    return Object.keys(cnt).filter((sh) => cnt[sh].size >= 2).map((sh) => [+sh, (OP.SD[sh] && OP.SD[sh].n) || 'Set', cnt[sh].size]).sort((a, b) => a[1].localeCompare(b[1]))
      .map(([sh, n, k]) => `<option value="${sh}"${cur === sh ? ' selected' : ''}>${esc(n)} (${k} slot${k === 1 ? '' : 's'})</option>`).join('');
  }
  const modName = (kind, k, amt) => (kind === 'a' ? stn[k] + ' Forged (artifice +3)' : (amt === 10 ? stn[k] + ' Mod (+10)' : 'Minor ' + stn[k] + ' Mod (+5)'));
  function resHTML(r, i, d, near) {
    const its = r.ents.map((e) => e.x);
    const chars = d.chars.filter((c) => c.cls === OP.cls);
    const base = [0, 1, 2, 3, 4, 5].map((k) => r.ents.reduce((t, e) => t + e.st[k], 0));
    const add = { M: [0, 0, 0, 0, 0, 0], a: [0, 0, 0, 0, 0, 0] }; r.plan.forEach(([si, kind, k, amt]) => { (kind === 'a' ? add.a : add.M)[k] += amt; });
    const tun = r.ents.filter((e) => e.tu);
    const eqC = chars[0] && d.items.filter((x) => x.loc === chars[0].id && x.e && SLOTS.includes(x.b) && x.st);
    const eqT = eqC && eqC.length === 5 ? [0, 1, 2, 3, 4, 5].filter((k) => OP.on[k]).reduce((t, k) => t + Math.min(OP.mx[k], eqC.reduce((s, x) => s + x.st[k], 0)), 0) : null;
    const tot = r.tot !== undefined ? r.tot : [0, 1, 2, 3, 4, 5].filter((k) => OP.on[k]).reduce((t, k) => t + Math.min(r.v[k], OP.mx[k]), 0);
    const mods = [];
    r.ents.forEach((e) => { const m = r.plan.filter((p) => p[0] === e.si).map((p) => modName(p[1], p[2], p[3])); if (e.tu) m.push('Tuning ' + e.tu[1]); const f = OP.font.map((n, k) => (n && FONTSLOT[k] === e.si ? n + '&times; ' + stn[k] + ' Font' : '')).filter(Boolean); if (m.length || f.length) mods.push(`<span><b>${SLN[e.si]}:</b> ${[...m.map(esc), ...f].join(', ')}</span>`); });
    return `<div class="oset2${near ? ' near' : ''}" data-ri="${i}"><div class="o2l"><div class="tiles">${its.map((x, si) => `<button class="o2t${OP.pin[si] === x.id ? ' pin' : ''}" data-it="${esc(x.id)}" data-si="${si}" title="${esc(x.n)} (${esc(where(x))}). Click to pin or exclude it.">${mt(x)}</button>`).join('')}</div>
<div class="o2st">${OP.pri.map((k) => { const sv = Math.min(MAXS, r.v[k]), cls = !OP.on[k] ? 'off' : near && r.short && r.short[k] ? 'short' : OP.mn[k] && sv >= OP.mn[k] ? 'ok' : ''; const parts = [`armor ${base[k]}`]; if (add.M[k]) parts.push(`mods +${add.M[k]}`); if (add.a[k]) parts.push(`artifice +${add.a[k]}`); const tk = tun.reduce((t, e) => t + e.tu[2][k], 0); if (tk) parts.push(`tuning ${tk > 0 ? '+' : ''}${tk}`); if (FONTV[OP.font[k]]) parts.push(`fonts +${FONTV[OP.font[k]]}`); if (OP.bon[k]) parts.push(`bonus ${OP.bon[k] > 0 ? '+' : ''}${OP.bon[k]}`); return `<span class="${cls}" title="${esc(stn[k] + ': ' + parts.join(', ') + (r.v[k] > OP.mx[k] && OP.on[k] ? ' (above your maximum of ' + OP.mx[k] + ', the rest does not count)' : ''))}">${stn[k]} <b>${sv}</b>${near && r.short && r.short[k] ? ` <i>(${r.short[k]} short)</i>` : ''}</span>`; }).join('')}</div>
<div class="o2m mute">Total <b>${tot}</b>${eqT !== null ? ` <span class="${tot - eqT > 0 ? 'up' : tot - eqT < 0 ? 'dn' : ''}" title="Compared with the armor ${esc(X.CL[OP.cls])} has on now">(${tot - eqT >= 0 ? '+' : ''}${tot - eqT} vs equipped)</span>` : ''}${setsOf(its).map((q) => ` <span class="oset-b" title="${esc(((q.d && q.d.p) || []).filter((p) => p.rc <= q.n).map((p) => p.rc + '-piece: ' + p.n + (p.d ? ' - ' + p.d : '')).join('\n'))}">${esc((q.d && q.d.n) || 'Set')} ${q.n >= 4 ? '4' : '2'}-piece</span>`).join('')}</div>
${mods.length ? `<div class="o2mods">${mods.join('')}</div>` : ''}</div>
<div class="o2r">${chars.map((c) => `<button data-eq="${esc(c.id)}" data-ri="${i}">Equip on ${esc(X.CL[c.cls])} ${c.light}</button>`).join('')}<button data-save="${i}" title="Open the loadout editor with this armor and its mods">Save as loadout</button></div></div>`;
  }
  function drawOpt() {
    const d = D();
    if (d && !OP.SI && !OP.sLoad) setTimeout(loadSets, 0);
    if (!d) { opt.s.innerHTML = '<div class="card"><p class="mute">Open the Vault tab and load your vault first.</p></div>'; return; }
    const arm = classArmor(d);
    const exs = arm.filter((x) => x.r === 'Exotic'); const seen = new Set();
    const exo = SLOTS.map((b, si) => ({ si, l: exs.filter((x) => x.b === b && (seen.has(x.h) ? false : seen.add(x.h))).sort((a, c) => a.n.localeCompare(c.n)) })).filter((g) => g.l.length);
    const R = OP.res, list = R ? (R.sets.length ? R.sets : R.near || []) : [];
    const rng = R && R.rng;
    const pinned = Object.keys(OP.pin).map((si) => arm.find((x) => x.id === OP.pin[si])).filter(Boolean);
    const excl = [...OP.exc].map((id) => d.items.find((x) => x.id === id)).filter(Boolean);
    const set0 = OP.sets[0] || { sh: 0, n: 2 }, set1 = OP.sets[1] || { sh: 0, n: 2 };
    opt.s.innerHTML = `<div class="card lo2"><h2 style="margin:0 0 4px">Loadout Optimizer</h2>
<p class="mute o2help">Finds the best armor sets from everything you own for one class. Each piece counts with its own stats (mods in it now are left out). Set a minimum and maximum for each stat, switch off stats you do not care about, and use the arrows to put them in order: the best total of the stats you switched on wins, ties go to the stat nearer the top. Stat mods, artifice (+3) and Tier 5 tuning are picked for each set.</p>
<div class="otools"><label>Class <select id="pcls">${X.CL.map((c, i) => `<option value="${i}"${OP.cls === i ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
<label>Exotic <select id="pex"><option value=""${!OP.ex ? ' selected' : ''}>Any (at most one)</option><option value="req"${OP.ex === 'req' ? ' selected' : ''}>Must have an exotic</option><option value="none"${OP.ex === 'none' ? ' selected' : ''}>No exotic</option>${exo.map((g) => `<optgroup label="${SLN[g.si]}">${g.l.map((x) => `<option value="${x.h}"${OP.ex === String(x.h) ? ' selected' : ''}>${esc(x.n)}</option>`).join('')}</optgroup>`).join('')}</select></label>
<label>Set bonus <select id="pset0"${OP.SI ? '' : ' disabled'}><option value="0">${OP.SI ? 'None' : OP.setErr ? 'Could not load armor sets' : 'Loading armor sets...'}</option>${setOpts(set0.sh)}</select></label>${set0.sh ? `<select id="pneed0" aria-label="Pieces"><option value="2"${set0.n === 2 ? ' selected' : ''}>2-piece</option><option value="4"${set0.n === 4 ? ' selected' : ''}>4-piece</option></select>${set0.n === 2 ? `<label>and <select id="pset1"><option value="0">no second set</option>${setOpts(set1.sh)}</select></label>` : ''}` : ''}</div>
<div class="otools o2opts"><label class="o2ck"><input type="checkbox" id="pauto"${OP.auto ? ' checked' : ''}> Auto stat mods</label><label class="o2ck"><input type="checkbox" id="ptune"${OP.tune ? ' checked' : ''}${OP.auto ? '' : ' disabled'}> Tier 5 tuning</label><label class="o2ck"><input type="checkbox" id="part"${OP.art ? ' checked' : ''}> Artifice +3</label><label class="o2ck" title="Counts every piece as masterworked (Armor 3.0: +5 to its three lowest stats). You have to masterwork them to get these stats."><input type="checkbox" id="pmwa"${OP.mwa ? ' checked' : ''}> Assume masterworked</label><label class="o2ck"><input type="checkbox" id="pjunk"${OP.junk ? ' checked' : ''}> Skip junk</label><label class="o2q">Only armor matching <input type="text" id="pq" value="${esc(OP.q)}" placeholder="e.g. tag:favorite or -is:locked" spellcheck="false"></label></div>
${OP.sets.some((s) => s.sh) ? `<div class="osetp">${OP.sets.filter((s) => s.sh && OP.SD[s.sh]).map((s) => (OP.SD[s.sh].p || []).filter((p) => p.rc <= s.n).map((p) => `<div><b>${esc(OP.SD[s.sh].n)} ${p.rc}-piece: ${esc(p.n)}</b> <span class="mute">${esc(p.d)}</span></div>`).join('')).join('')}</div>` : ''}
<div class="o2grid"><div class="o2h"><span></span><span>Stat</span><span>Min</span><span>Max</span><span>Can reach</span><span>Fonts</span><span title="Fragments, the artifact or anything else that adds to or takes from a stat">Bonus</span></div>
${OP.pri.map((k, r) => `<div class="o2row${OP.on[k] ? '' : ' off'}"><span class="ord"><button data-up="${r}"${r ? '' : ' disabled'} title="Matters more" aria-label="${stn[k]} matters more">&#9650;</button><button data-dn="${r}"${r < 5 ? '' : ' disabled'} title="Matters less" aria-label="${stn[k]} matters less">&#9660;</button></span>
<label class="o2n"><input type="checkbox" data-on="${k}"${OP.on[k] ? ' checked' : ''} aria-label="Count ${stn[k]}"> ${stn[k]}</label>
<input type="number" min="0" max="200" step="5" value="${OP.mn[k]}" data-mn="${k}" aria-label="${stn[k]} minimum"${OP.on[k] ? '' : ' disabled'}>
<input type="number" min="0" max="200" step="5" value="${OP.mx[k]}" data-mx="${k}" aria-label="${stn[k]} maximum"${OP.on[k] ? '' : ' disabled'}>
<span class="o2bar" title="${rng ? `${stn[k]} can reach ${rng.lo[k]} to ${rng.hi[k]} with these settings` : 'Find sets to see what each stat can reach'}"><i style="left:${(OP.mn[k] / 2)}%;width:${Math.max(0, (OP.mx[k] - OP.mn[k]) / 2)}%" class="want"></i>${rng ? `<i class="can" style="left:${rng.lo[k] / 2}%;width:${Math.max(1, (rng.hi[k] - rng.lo[k]) / 2)}%"></i><em>${rng.lo[k]}-${rng.hi[k]}</em>` : ''}</span>
<select data-font="${k}" aria-label="${stn[k]} Font mods" title="${stn[k]} Font mods: count only while you have Armor Charge">${FONTV.map((v, n) => `<option value="${n}"${OP.font[k] === n ? ' selected' : ''}>${n ? n + ' (+' + v + ')' : 'None'}</option>`).join('')}</select>
<input type="number" min="-100" max="100" step="1" value="${OP.bon[k]}" data-bon="${k}" aria-label="${stn[k]} bonus"></div>`).join('')}</div>
${pinned.length || excl.length ? `<div class="o2pins">${pinned.map((x) => `<span class="o2chip pin" title="${esc(x.n)}">Pinned: ${esc(x.n)} <button data-unpin="${esc(x.id)}" aria-label="Unpin">&times;</button></span>`).join('')}${excl.map((x) => `<span class="o2chip exc" title="${esc(x.n)}">Excluded: ${esc(x.n)} <button data-unexc="${esc(x.id)}" aria-label="Stop excluding">&times;</button></span>`).join('')}${excl.length > 1 ? '<button data-unexc="*">Clear excluded</button>' : ''}</div>` : ''}
<div class="orun"><button class="on orbtn" id="prun"${OP.busy ? ' disabled' : ''}>${OP.busy ? 'Searching...' : 'Find best sets'}</button>${OP.busy ? '<button id="pstop">Stop</button>' : ''}<span class="mute" id="pmsg">${esc(OP.msg)}</span></div>
${list.length ? `<div class="o2list">${list.slice(0, OP.shown).map((r, i) => resHTML(r, i, d, !R.sets.length)).join('')}</div>${list.length > OP.shown ? `<button id="pmore">Show more (${list.length - OP.shown} left)</button>` : ''}` : ''}</div>`;
  }
  const num = (t, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+t.value || 0)));
  opt.s.addEventListener('change', (e) => {
    const t = e.target, id = t.id;
    const reset = () => { OP.res = null; OP.msg = ''; };
    if (id === 'pcls') { OP.cls = +t.value; OP.ex = ''; OP.sets = []; OP.pin = {}; reset(); }
    else if (id === 'pex') { OP.ex = t.value; reset(); }
    else if (id === 'pset0') { const sh = +t.value || 0; OP.sets = sh ? [{ sh, n: (OP.sets[0] && OP.sets[0].n) || 2 }] : []; reset(); }
    else if (id === 'pneed0') { OP.sets[0].n = +t.value === 4 ? 4 : 2; if (OP.sets[0].n === 4) OP.sets.length = 1; reset(); }
    else if (id === 'pset1') { const sh = +t.value || 0; OP.sets = [OP.sets[0]].concat(sh && sh !== OP.sets[0].sh ? [{ sh, n: 2 }] : []); reset(); }
    else if (id === 'pauto') { OP.auto = t.checked; saveOP(); reset(); }
    else if (id === 'ptune') { OP.tune = t.checked; saveOP(); reset(); }
    else if (id === 'part') { OP.art = t.checked; saveOP(); reset(); }
    else if (id === 'pmwa') { OP.mwa = t.checked; saveOP(); reset(); }
    else if (id === 'pjunk') { OP.junk = t.checked; saveOP(); reset(); }
    else if (id === 'pq') { OP.q = t.value.slice(0, 200); saveOP(); reset(); }
    else if (t.dataset.on !== undefined) { OP.on[+t.dataset.on] = t.checked; if (!OP.on.some(Boolean)) OP.on[+t.dataset.on] = true; saveOP(); reset(); }
    else if (t.dataset.mn !== undefined) { const k = +t.dataset.mn; OP.mn[k] = num(t, 0, 200); if (OP.mx[k] < OP.mn[k]) OP.mx[k] = OP.mn[k]; saveOP(); reset(); }
    else if (t.dataset.mx !== undefined) { const k = +t.dataset.mx; OP.mx[k] = num(t, 0, 200); if (OP.mn[k] > OP.mx[k]) OP.mn[k] = OP.mx[k]; saveOP(); reset(); }
    else if (t.dataset.font !== undefined) { OP.font[+t.dataset.font] = num(t, 0, 3); saveOP(); reset(); }
    else if (t.dataset.bon !== undefined) { OP.bon[+t.dataset.bon] = num(t, -100, 100); saveOP(); reset(); }
    else return;
    drawOpt();
  });
  opt.s.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'pq') { e.target.blur(); } });
  // the small menu on a piece in the results: pin it, exclude it, or show it
  const pmenu = document.createElement('div'); pmenu.className = 'o2menu'; document.body.appendChild(pmenu);
  document.addEventListener('click', (e) => { if (!pmenu.contains(e.target) && !e.target.closest('.o2t')) pmenu.classList.remove('on'); });
  pmenu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const id = pmenu.dataset.id, si = +pmenu.dataset.si; pmenu.classList.remove('on');
    if (b.dataset.a === 'pin') { OP.pin[si] = id; OP.exc.delete(id); }
    else if (b.dataset.a === 'unpin') delete OP.pin[si];
    else if (b.dataset.a === 'exc') { OP.exc.add(id); if (OP.pin[si] === id) delete OP.pin[si]; }
    else if (b.dataset.a === 'info') { if (X.open) X.open(id); return; }
    OP.msg = 'Changed: press Find best sets again.'; drawOpt();
  });
  function curList() { const R = OP.res; return R ? (R.sets.length ? R.sets : R.near || []) : []; }
  opt.s.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.id === 'prun') {
      const token = ++OP.run; OP.busy = true; OP.msg = 'Searching...'; OP.shown = 30; drawOpt();
      const t0 = performance.now();
      let R;
      try { R = await optimize(token, (f) => { const m = document.getElementById('pmsg'); if (m) m.textContent = 'Searching... ' + Math.min(99, Math.round(f * 100)) + '%'; }); }
      catch (er) { R = { sets: [], why: 'Something went wrong: ' + (er && er.message) }; }
      if (token !== OP.run) return;
      OP.busy = false; OP.res = R;
      const secs = ((performance.now() - t0) / 1000).toFixed(1), set = OP.sets.some((s) => s.sh) ? ' with that set bonus' : '';
      OP.msg = R.why ? R.why : R.sets.length ? `Best ${R.sets.length} of ${R.total.toLocaleString()} combinations (${secs} s).` : R.near && R.near.length ? `No set reaches every minimum${set}. The ${R.near.length} closest:` : `No set fits those settings${set}.`;
      drawOpt(); return;
    }
    if (t.id === 'pstop') { OP.run++; OP.busy = false; OP.msg = 'Stopped.'; drawOpt(); return; }
    if (t.id === 'pmore') { OP.shown += 30; drawOpt(); return; }
    const up = t.closest('[data-up]'), dn = t.closest('[data-dn]');
    if (up || dn) { const r = +(up || dn).dataset[up ? 'up' : 'dn'], o = up ? r - 1 : r + 1; if (o >= 0 && o < 6) { const a = OP.pri; [a[r], a[o]] = [a[o], a[r]]; saveOP(); OP.res = null; OP.msg = ''; drawOpt(); } return; }
    const unp = t.closest('[data-unpin]'); if (unp) { Object.keys(OP.pin).forEach((si) => { if (OP.pin[si] === unp.dataset.unpin) delete OP.pin[si]; }); OP.res = null; drawOpt(); return; }
    const une = t.closest('[data-unexc]'); if (une) { if (une.dataset.unexc === '*') OP.exc.clear(); else OP.exc.delete(une.dataset.unexc); OP.res = null; drawOpt(); return; }
    const tile = t.closest('.o2t');
    if (tile) {
      const id = tile.dataset.it, si = +tile.dataset.si, x = D().items.find((o) => o.id === id); if (!x) return;
      const rc = tile.getBoundingClientRect();
      pmenu.dataset.id = id; pmenu.dataset.si = si;
      pmenu.innerHTML = `<div class="o2mt">${esc(x.n)}</div>${OP.pin[si] === id ? '<button data-a="unpin">Unpin</button>' : '<button data-a="pin">Pin (always use it)</button>'}<button data-a="exc">Exclude (never use it)</button><button data-a="info">Show details</button>`;
      pmenu.style.left = Math.min(innerWidth - 220, rc.left) + 'px'; pmenu.style.top = (rc.bottom + 4) + 'px'; pmenu.classList.add('on');
      return;
    }
    const q = t.closest('[data-eq]');
    if (q) {
      const r = curList()[+q.dataset.ri]; if (!r) return;
      q.disabled = true; OP.msg = 'Equipping... (only works in orbit, a social space or offline)'; const m = document.getElementById('pmsg'); if (m) m.textContent = OP.msg;
      await X.equip(r.ents.map((e) => e.x.id), q.dataset.eq);
      const n = document.getElementById('vnote'); OP.msg = (n && n.textContent) || 'Done'; drawOpt(); return;
    }
    const sv = t.closest('[data-save]');
    if (sv) {
      const r = curList()[+sv.dataset.save]; if (!r || !window.__gtlo || !window.__gtlo.fromOptimizer) return;
      const d = D(), opm = d.opm || { g: [], a: [] };
      const items = r.ents.map((e) => {
        const m = [];
        r.plan.filter((p) => p[0] === e.si).forEach(([si, kind, k, amt]) => {
          if (kind === 'a') { const h = opm.a && opm.a[k]; if (h && e.x.op && e.x.op.ai !== undefined) m.push([e.x.op.ai, h, (opm.ic || {})[h] || '', stn[k] + ' Forged']); }
          else { const h = opm.g && opm.g[k] && opm.g[k][amt === 10 ? 0 : 1]; if (h && e.x.op && e.x.op.gi !== undefined) m.push([e.x.op.gi, h, (opm.ic || {})[h] || '', (amt === 10 ? '' : 'Minor ') + stn[k] + ' Mod']); }
        });
        if (e.tu && e.x.op && e.x.op.ti !== undefined) m.push([e.x.op.ti, e.tu[0], e.tu[3] || '', e.tu[1]]);
        return { x: e.x, m };
      });
      const notes = 'Made with the Loadout Optimizer: ' + OP.pri.filter((k) => OP.on[k]).map((k) => stn[k] + ' ' + Math.min(MAXS, r.v[k])).join(', ') + (OP.font.some(Boolean) ? '. Fonts: ' + OP.font.map((n, k) => (n ? n + 'x ' + stn[k] : '')).filter(Boolean).join(', ') : '') + '.';
      window.__gtlo.fromOptimizer({ c: OP.cls, items, o: notes });
    }
  });
  opt.b.onclick = () => { window.show('optimizer'); drawOpt(); };
  // test hook: lets the page's own checks run the search without the screen
  window.__gtopt = { OP, optimize: () => optimize(++OP.run) };

  // ---------------- Compare ----------------
  async function compare(id) {
    const d = D(), base = d.items.find((x) => x.id === id); if (!base) return;
    const W = WEAPON.has(base.b);
    let list = d.items.filter((x) => !x.pm && x.b === base.b && x.id !== id && (W ? x.t === base.t : (x.c === base.c || x.c === 3)));
    list = [base, ...list.sort((a, b) => b.p - a.p).slice(0, 11)];
    const box = document.createElement('div'); box.id = 'cmpm'; document.body.appendChild(box);
    box.onclick = (e) => { if (e.target === box || e.target.dataset.x) box.remove(); };
    box.innerHTML = '<div class="box"><p>Loading stats...</p></div>';
    let cols, vals;
    if (W) {
      const det = await Promise.all(list.map((x) => X.detail(x).catch(() => null)));
      cols = []; det.forEach((dt) => ((dt && dt.stats) || []).forEach((s) => { if (!cols.includes(s.n)) cols.push(s.n); }));
      vals = det.map((dt) => cols.map((c) => { const s = ((dt && dt.stats) || []).find((q) => q.n === c); return s ? s.v : null; }));
    } else { cols = [...stn, 'Total']; vals = list.map((x) => (x.st ? [...x.st, total(x)] : cols.map(() => null))); }
    const bestOf = cols.map((c, j) => Math.max(...vals.map((v) => (v[j] == null ? -1 : v[j]))));
    box.innerHTML = `<div class="box"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><b>Compare ${esc(base.t)}</b><button data-x="1">Close</button></div><table class="otbl"><thead><tr><th>Item</th><th>Power</th>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}<th>Where</th></tr></thead><tbody>${list.map((x, i) => `<tr${i ? '' : ' style="background:#2a2d33"'}><td class="n"><span class="mtile" style="--t:34px">${mt(x)}</span>${esc(x.n)}</td><td>${x.p}</td>${vals[i].map((v, j) => `<td${v != null && v === bestOf[j] && v > 0 ? ' class="hi"' : ''}>${v == null ? '' : v}</td>`).join('')}<td>${esc(where(x))}</td></tr>`).join('')}</tbody></table><p class="mute">First row is the item you picked. Green is the best value in that column.</p></div>`;
  }
  X.compare = compare;
})();

// ---------------- Triumphs ----------------
(() => {
  const X = window.__gtx; if (!X || !window.gt || !window.gt.trDefs) return;
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  const s = document.createElement('section'); s.id = 'triumphs'; s.className = 'gdark'; vsec.parentNode.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Triumphs'; b.dataset.t = 'triumphs';
  const anchor = nav.querySelector('[data-t=optimizer]'); nav.insertBefore(b, anchor ? anchor.nextSibling : null);
  const st = document.createElement('style');
  st.textContent = `
#triumphs{zoom:var(--gt-z,1)}
#triumphs .card{background:var(--g-panel);border:1px solid var(--g-line);border-radius:6px;box-shadow:none;margin-bottom:10px;padding:12px 14px}
#triumphs .card::before,#triumphs .card::after{display:none!important}
#triumphs button,#triumphs input,#triumphs select{border-radius:5px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn);padding:5px 12px;cursor:pointer;font-size:13px}
#triumphs input[type=text]{background:var(--g-deep);color:#fff;cursor:text;flex:1;min-width:200px}
#triumphs button:hover{border-color:#6a6e76;color:#fff}
#triumphs button.on{background:var(--g-accent2);border-color:var(--g-accent);color:var(--g-on-accent,#fff)}
.tsum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.tsum div{background:linear-gradient(160deg,#1f2227,#17191d);border:1px solid #2c2f35;border-radius:6px;padding:10px 14px;display:flex;flex-direction:column;gap:2px}
.tsum b{font-size:26px;font-weight:600;color:#fff;line-height:1.1}.tsum b.gold{color:#f5dc7a}.tsum b.grn{color:#7fd48a}
.tsum span{color:var(--mute);font-size:11px;letter-spacing:2px;text-transform:uppercase}
.ttools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}
.tseg{display:inline-flex;border:1px solid #3a3d43;border-radius:6px;overflow:hidden}
.tseg button{border:0!important;border-radius:0!important;border-right:1px solid #3a3d43!important}.tseg button:last-child{border-right:0!important}
.tn{border:1px solid #2b2e33;border-radius:6px;margin-top:8px;background:#16181b;overflow:hidden}
.tnh{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;color:#e6e7ea;position:relative}.tnh:hover{background:#1f2227}
.tnh img{width:28px;height:28px}.tnh .ct{margin-left:auto;color:var(--mute);font-size:12px;white-space:nowrap}.tnh .ar{width:12px;color:var(--mute)}
.tnh .nb{position:absolute;left:0;bottom:0;height:2px;background:linear-gradient(90deg,#6fa3d6,#7fd48a)}
.tnc{padding:2px 10px 10px 14px;border-top:1px solid #23262a}
.tr{display:flex;gap:12px;padding:10px 8px;border-top:1px solid #23262a;align-items:flex-start}.tr:first-child{border-top:0}.tr.done{opacity:.62}
.tr .ti{width:44px;height:44px;flex:none;background:#1c1e22;border:1px solid #3a3d43;border-radius:5px;overflow:hidden}.tr .ti img{width:100%;height:100%;display:block}
.tr .tb{flex:1;min-width:0}.tr .tt{color:#fff;font-weight:600;font-size:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tr .pts{background:#2a2517;border:1px solid #5b4b1c;color:#f5dc7a;border-radius:10px;padding:0 8px;font-size:11px;font-weight:600}
.tr .td{color:#a3a6ad;font-size:12px;line-height:1.35;margin-top:2px}
.tr .to{margin-top:6px;display:grid;gap:5px}.tr .ob{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px;align-items:center;font-size:12px;color:#b9bcc4}
.tr .bar,.seal .sbar{height:7px;background:#2c2f34;border-radius:4px;position:relative;overflow:hidden}.tr .bar i,.seal .sbar i{display:block;height:100%;background:linear-gradient(90deg,#5d93c9,#8cb4d6);border-radius:4px}.tr.done .bar i,.seal .sbar i.dn{background:linear-gradient(90deg,#4fa85a,#7fd48a)}
.tr .pin{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:4px 10px!important;font-size:12px!important}.tr .pin .tkd,.trd .tkb .tkd{width:9px;height:9px;border-radius:50%;border:1.5px solid #6fcf7a;flex:none}.tr .pin.on,.trd .tkb.on{color:#bff0c4!important;background:#1d3322!important;border-color:#3f8f4c!important}.tr .pin.on .tkd,.trd .tkb.on .tkd{background:#6fcf7a;box-shadow:0 0 6px #6fcf7a}
.tr{cursor:pointer}.tr:hover{background:rgba(255,255,255,.025)}
.tr .ck{color:#7fd48a;font-weight:700}
.tr .how{flex:none;font-size:11px!important;padding:3px 9px!important;white-space:nowrap}.tr .how.on{background:var(--g-accent2)!important;border-color:var(--g-accent)!important;color:var(--g-on-accent,#fff)!important}
.tr .acts2{display:flex;flex-direction:column;gap:5px;align-items:stretch}
.howp{margin-top:8px;padding:8px 10px;background:#14161a;border:1px solid #2b2e33;border-left:3px solid var(--g-accent,#7ab8e8);border-radius:4px;font-size:12px;color:#c9ccd2;line-height:1.45}
.howp h5{margin:8px 0 3px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8d9097;font-weight:600}.howp h5:first-child{margin-top:0}
.howp ol,.howp ul{margin:0;padding-left:18px}.howp li{margin:1px 0}
.howp .hwp{color:#9da1a8}.howp .hwl{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.howp .hwl button{font-size:11px!important;padding:3px 9px!important}
.howp .hwr{display:flex;align-items:center;gap:6px}.howp .hwr img{width:24px;height:24px;border:1px solid #3a3d43}
.sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.seal{--sc:#6a8fb5;display:grid;grid-template-columns:76px minmax(0,1fr);gap:12px;align-items:center;padding:12px;border:1px solid #2c2f35;border-left:4px solid var(--sc);border-radius:8px;background:linear-gradient(135deg,color-mix(in srgb,var(--sc) 16%,#17191d),#17191d 70%);cursor:pointer;position:relative;transition:transform .08s,border-color .15s}
.seal:hover{transform:translateY(-1px);border-color:var(--sc)}
.seal .ring{position:relative;width:76px;height:76px}.seal .ring svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}.seal .ring circle{fill:none;stroke-width:5}
.seal .ring .bg{stroke:#2a2d33}.seal .ring .fg{stroke:var(--sc);stroke-linecap:round}
.seal .ring img{position:absolute;inset:11px;width:54px;height:54px;object-fit:contain}
.seal:not(.done) .ring img{filter:saturate(.6) brightness(.85)}
.seal b{display:block;color:#fff;font-size:15px;line-height:1.2}
.seal .ttl{color:var(--sc);font-size:12px;font-style:italic;margin-top:1px;filter:brightness(1.35)}
.seal .meta{display:flex;gap:6px;align-items:center;margin-top:6px;font-size:11px;color:#9da1a8;text-transform:uppercase;letter-spacing:1px}
.seal .chip{border:1px solid currentColor;border-radius:10px;padding:0 7px;font-size:10px;letter-spacing:1px}
.seal .chip.ok{color:#7fd48a}.seal .chip.gd{color:#f5dc7a;background:#2a2517}
.seal.gild{border-color:#d9b44a;box-shadow:0 0 0 1px #d9b44a55,0 0 18px #d9b44a22}
.seal .sbar{margin-top:7px}
.tdet{display:flex;align-items:center;gap:12px;margin-bottom:8px}.tdet h3{margin:0;font-size:18px;color:#fff;font-weight:600}.tdet .ttl{font-style:italic;color:#c9cdd4}
.exg{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px}.exo{display:flex;gap:10px;align-items:flex-start;background:var(--g-panel);border:1px solid var(--g-line);padding:8px;border-radius:3px}.exo img{width:48px;height:48px;border:1px solid #ceae33;flex:none}.exo.miss img{filter:grayscale(1) brightness(.6);border-color:#555}.exo b{color:#fff;display:block}.exo small{display:block;color:#9da1a8;font-size:12px}.exo small.src{color:#cfd2d8;margin-top:3px}.exc{display:flex;align-items:center;gap:6px;margin-top:5px;font-size:11.5px;color:#9da1a8;cursor:pointer}.exc .ebar{width:80px;display:inline-block;height:5px;margin:0}.exc b{color:#cfd2d8;font-weight:500}.exc.ok b{color:#7fd48a}.tfl{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.twrap{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-items:start}.twrap.side{grid-template-columns:minmax(0,1fr) 340px}.twrap>.card{margin:0}.tside{display:flex;flex-direction:column;gap:8px;position:sticky;top:60px}.tside .card{margin:0}.tsr{display:grid;grid-template-columns:30px minmax(0,1fr) 38px;gap:8px;align-items:center;padding:5px 0;cursor:pointer;border-top:1px solid rgba(255,255,255,.04)}.tsr:hover b{color:#9fc4ee}.tsr img,.tsr>i{width:30px;height:30px;border:1px solid #3a3d43;background:#0d0f12}.tsr b{display:block;color:#e6e7ea;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tsr .sbar{margin-top:4px;height:5px}.tsr em{font-style:normal;font-size:11.5px;color:#9da1a8;text-align:right}
.tclose{color:var(--mute);font-size:12px;margin:0 0 6px}
.tcol{display:flex;gap:8px;align-items:center;margin:8px 0 2px;color:#9da1a8;font-size:11px;letter-spacing:2px;text-transform:uppercase}
`;
  document.head.appendChild(st);
  const { esc } = X, icon = X.icon;
  const hw = {}, RW = {};
  let DEF = null, S = null, tab = 'seal', filt = 'all', q = '', open = {}, loading = false, err = '', sortM = 'game', sealOpen = 0;
  const PIN = () => { try { return JSON.parse(localStorage.getItem('gt_tpin')) || []; } catch (e) { return []; } };
  const savePIN = (a) => { try { localStorage.setItem('gt_tpin', JSON.stringify(a)); } catch (e) { /* ignore */ } };
  const COL = () => { try { return JSON.parse(localStorage.getItem('gt_sealcol')) || {}; } catch (e) { return {}; } };
  const saveCOL = (o) => { try { localStorage.setItem('gt_sealcol', JSON.stringify(o)); } catch (e) { /* ignore */ } };
  const state = (h) => (S && S.recs[h]) || null;
  const isDone = (h) => { const r = state(h); return !!r && !(r[0] & 4); };
  const hidden = (h) => { const r = state(h); return !r || !!(r[0] & 16); };
  const memo = {};
  function counts(nh) { // [done, total] under a node
    if (memo[nh]) return memo[nh];
    const n = DEF.node[nh]; if (!n) return (memo[nh] = [0, 0]);
    memo[nh] = [0, 0];
    let d = 0, t = 0;
    n.r.forEach((h) => { if (!DEF.rec[h] || hidden(h)) return; t++; if (isDone(h)) d++; });
    n.c.forEach((c) => { const x = counts(c); d += x[0]; t += x[1]; });
    return (memo[nh] = [d, t]);
  }
  // One objective's 0..1 progress. Bungie sometimes flags an objective complete with no progress at all (the per-dungeon
  // lines under "In Every Corner" are like that), which drew full bars on unfinished triumphs and ranked them as nearly done.
  // So an objective only counts as done when its progress reaches its target, or when the whole triumph is done.
  function obFrac(h, ob) {
    if (isDone(h)) return 1;
    const [oh, p, m, c] = ob, mm = m || (DEF.obj[oh] && DEF.obj[oh].m) || 1, f = Math.min(1, Math.max(0, p || 0) / mm);
    return f >= 1 ? 1 : f; // Bungie's own complete flag alone is not trusted
  }
  // 0..1 how far along a triumph is
  function pct(h) {
    if (isDone(h)) return 1;
    const r = state(h); if (!r || !r[1].length) return 0;
    let a = 0; r[1].forEach((ob) => { a += obFrac(h, ob); });
    return a / r[1].length;
  }
  const sortRecs = (arr) => (sortM === 'close' ? arr.slice().sort((x, y) => { const dx = isDone(x), dy = isDone(y); if (dx !== dy) return dx ? 1 : -1; return pct(y) - pct(x); }) : arr);
  // Where a triumph lives in the Triumphs tree, e.g. Raids > Crota's End.
  let RPAR = null, NPAR = null;
  function crumbs(h) {
    if (!RPAR) {
      RPAR = {}; NPAR = {};
      for (const k in DEF.node) { const n = DEF.node[k]; n.r.forEach((rh) => { if (!RPAR[rh]) RPAR[rh] = k; }); n.c.forEach((c) => { if (!NPAR[c]) NPAR[c] = k; }); }
    }
    const out = []; let k = RPAR[h], guard = 0;
    while (k && guard++ < 8) { const n = DEF.node[k]; if (!n) break; if (n.n) out.unshift(n.n); k = NPAR[k]; }
    return out.filter((x, i) => i > 0 || !/^(triumphs|records|seals|legacy triumphs)$/i.test(x) || out.length === 1);
  }
  function ensureRw(h) {
    const r = DEF.rec[h]; if (!r || !r.rw || !window.gt || !window.gt.itemInfo) return;
    r.rw.forEach(([ih]) => { if (RW[ih] === undefined) { RW[ih] = null; window.gt.itemInfo({ h: ih }).then((o) => { RW[ih] = o || {}; draw(); if (dOpen) drawDet(); }).catch(() => { RW[ih] = {}; }); } });
  }
  function howHTML(h) {
    const r = DEF.rec[h]; if (!r) return '';
    const st = state(h), cat = /catalyst/i.test(r.n), wname = r.n.replace(/\s*catalyst\s*$/i, '').trim();
    if (st && (st[0] & 8)) return '<div class="howp"><p>This one is hidden. Keep playing: it shows its details once the game reveals it.</p></div>';
    const hashes = (r.o && r.o.length ? r.o : (st ? st[1].map((q) => q[0]) : []));
    const steps = hashes.map((oh) => { const od = DEF.obj[oh] || {}, mm = (od.m || 1), cur = st && st[1].find((q) => q[0] === oh); const left = cur ? Math.max(0, mm - cur[1]) : mm; return (od.d || 'Complete the objective') + (mm > 1 ? ' (' + mm.toLocaleString() + ' needed' + (cur && !cur[3] ? ', ' + left.toLocaleString() + ' to go' : '') + ')' : ''); });
    const path = crumbs(h);
    ensureRw(h);
    const rw = (r.rw || []).map(([ih, n]) => { const o = RW[ih]; return `<div class="hwr">${o && o.i ? `<img src="${esc(icon(o.i))}" alt="">` : ''}<span>${o ? esc(o.n || 'Reward') : 'Loading...'}${n > 1 ? ' x' + n : ''}</span></div>`; }).join('');
    const q1 = encodeURIComponent('destiny 2 ' + (cat ? wname + ' exotic catalyst how to get and complete' : r.n + ' triumph how to complete'));
    return `<div class="howp">`
      + (r.d ? `<h5>What it asks</h5><p>${esc(r.d)}</p>` : '')
      + (steps.length ? `<h5>Steps</h5><ol>${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : '')
      + (cat ? `<h5>Getting the catalyst</h5><p>This is the catalyst for <b>${esc(wname)}</b>. You first need the weapon, and the catalyst itself comes from that weapon's own quest or a drop (it differs per weapon, see the guide below). Once the catalyst is in your inventory, apply it to the weapon and complete the objective above to finish it.</p>` : '')
      + (r.ex ? `<h5>Time limit</h5><p>${esc(r.ex)}</p>` : '')
      + (r.t && r.ti ? `<h5>Title</h5><p>Finishing this unlocks the title <b>${esc(r.ti)}</b>.</p>` : '')
      + (rw ? `<h5>Reward</h5>${rw}` : '')
      + (path.length ? `<h5>Where it is</h5><p class="hwp">Triumphs &rsaquo; ${path.map(esc).join(' &rsaquo; ')}</p>` : '')
      + `<div class="hwl"><button data-g="${q1}">Search a guide</button><button data-g2="${esc(encodeURIComponent('destiny 2 ' + (cat ? wname + ' catalyst' : r.n + ' triumph') + ' guide'))}">Find a video</button></div></div>`;
  }
  function recHTML(h) {
    const r = DEF.rec[h]; if (!r) return '';
    const st = state(h), done = isDone(h), obs = st && (st[0] & 8), pins = PIN().includes(+h);
    const obj = (st ? st[1] : []).map((ob) => {
      const [oh, p, m] = ob, od = DEF.obj[oh] || {}, mm = m || od.m || 1, pc = Math.round(obFrac(h, ob) * 100);
      return `<div class="ob"><span>${esc(od.d || '')} ${mm > 1 ? esc(p + ' / ' + mm) : ''}</span><div class="bar"><i style="width:${pc}%"></i></div></div>`;
    }).join('');
    return `<div class="tr${done ? ' done' : ''}" data-r="${h}"><div class="ti">${r.i ? `<img src="${esc(icon(r.i))}" alt="">` : ''}</div><div class="tb"><div class="tt">${obs ? '???' : esc(r.n)}${r.s ? `<span class="pts">${r.s} pts</span>` : ''}${done ? '<span class="ck">&#10003;</span>' : ''}</div><div class="td">${obs ? 'Hidden until unlocked.' : esc(r.d)}</div>${obj ? `<div class="to">${obj}</div>` : ''}${hw[h] ? howHTML(h) : ''}</div><div class="acts2"><button class="pin${pins ? ' on' : ''}" data-pin="${h}" title="${pins ? 'Stop tracking' : 'Track: keeps it in Tracked, the side column and the Inventory page'}"><i class="tkd"></i>${pins ? 'Tracked' : 'Track'}</button><button class="how${hw[h] ? ' on' : ''}" data-how="${h}" title="What you have to do to get this">How to get</button></div></div>`;
  }
  const pass = (h) => { const r = DEF.rec[h]; if (!r || hidden(h)) return false; const d = isDone(h); if (filt === 'todo' && d) return false; if (filt === 'done' && !d) return false; return true; };
  function nodeHTML(nh, depth) {
    const n = DEF.node[nh]; if (!n) return '';
    const [d, t] = counts(nh); if (!t) return '';
    const o = open[nh];
    let inner = '';
    if (o) inner = `<div class="tnc">${n.c.map((c) => nodeHTML(c, depth + 1)).join('')}${sortRecs(n.r.filter(pass)).map(recHTML).join('')}</div>`;
    return `<div class="tn"><div class="tnh" data-n="${nh}"><span class="ar">${o ? '&#9662;' : '&#9656;'}</span>${n.i ? `<img src="${esc(icon(n.i))}" alt="">` : ''}<b>${esc(n.n)}</b><span class="ct">${d} / ${t}</span><i class="nb" style="width:${t ? Math.round(d * 100 / t) : 0}%"></i></div>${inner}</div>`;
  }
  function allRecs(nh, out, seen) {
    const n = DEF.node[nh]; if (!n || seen.has(nh)) return out; seen.add(nh);
    n.r.forEach((h) => out.add(h)); n.c.forEach((c) => allRecs(c, out, seen)); return out;
  }
  // ---- seals ----
  const hue = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return `hsl(${h} 45% 58%)`; };
  function sealInfo(nh) {
    const n = DEF.node[nh], rec = DEF.rec[n.cr] || {}, [d, t] = counts(nh);
    const done = n.cr ? isDone(n.cr) : (t > 0 && d >= t);
    let gilded = 0, gcount = 0;
    // Gilded is the gilding triumph being done; how many times comes from Bungie's own completed count for it (not its objective progress).
    if (rec.gl && state(rec.gl)) { const r = state(rec.gl); gcount = r[2] || 0; gilded = isDone(rec.gl) || gcount > 0 ? 1 : 0; if (gilded && !gcount) gcount = 1; }
    return { nh, n, rec, d, t, done, gilded, gcount, title: rec.ti || '' };
  }
  function sealCard(nh) {
    const z = sealInfo(nh); if (!z.t) return '';
    const p = z.t ? z.d / z.t : 0, C = 2 * Math.PI * 33, col = COL()[z.n.i || z.n.n] || hue(z.n.n);
    return `<div class="seal${z.done ? ' done' : ''}${z.gilded ? ' gild' : ''}" data-seal="${nh}" data-ic="${esc(z.n.i || '')}" style="--sc:${col}"><div class="ring"><svg viewBox="0 0 76 76"><circle class="bg" cx="38" cy="38" r="33"/><circle class="fg" cx="38" cy="38" r="33" stroke-dasharray="${(C * p).toFixed(1)} ${C.toFixed(1)}"/></svg>${z.n.i ? `<img src="${esc(icon(z.n.i))}" alt="">` : ''}</div><div><b>${esc(z.n.n)}</b>${z.title ? `<div class="ttl">&ldquo;${esc(z.title)}&rdquo;</div>` : ''}<div class="meta"><span>${z.d} / ${z.t}</span>${z.gilded ? `<span class="chip gd">&#10022; Gilded${z.gcount > 1 ? ' x' + z.gcount : ''}</span>` : z.done ? '<span class="chip ok">Complete</span>' : `<span>${Math.round(p * 100)}%</span>`}</div><div class="sbar"><i class="${z.done ? 'dn' : ''}" style="width:${Math.round(p * 100)}%"></i></div></div></div>`;
  }
  function sealsHTML() {
    const root = DEF.node[S.seals]; if (!root) return '<p class="mute">Seal list not found.</p>';
    if (sealOpen && DEF.node[sealOpen]) {
      const z = sealInfo(sealOpen);
      return `<div class="tdet"><button data-sealback="1">&#8592; All seals</button>${z.n.i ? `<img src="${esc(icon(z.n.i))}" alt="" width="40" height="40">` : ''}<div><h3>${esc(z.n.n)}</h3>${z.title ? `<div class="ttl">&ldquo;${esc(z.title)}&rdquo;</div>` : ''}</div><span class="ct" style="margin-left:auto;color:var(--mute)">${z.d} / ${z.t}</span></div>${sortRecs([...allRecs(sealOpen, new Set(), new Set())].filter(pass)).map(recHTML).join('') || '<p class="mute">Nothing in this filter.</p>'}`;
    }
    let ids = root.c.slice().filter((c) => DEF.node[c] && counts(c)[1]);
    const prog = (c) => { const z = sealInfo(c); return z.done ? 2 : z.d / z.t; };
    if (sortM === 'close') ids = ids.sort((x, y) => { const px = prog(x), py = prog(y); return px === 2 && py !== 2 ? 1 : py === 2 && px !== 2 ? -1 : py - px; });
    if (filt === 'todo') ids = ids.filter((c) => !sealInfo(c).done); else if (filt === 'done') ids = ids.filter((c) => sealInfo(c).done);
    return `<div class="sgrid">${ids.map(sealCard).join('')}</div>` || '';
  }
  // pull a seal's colour out of its icon (works when the image server allows it; otherwise the seal keeps a colour from its name)
  const colTried = {};
  function tint(src, key, el) {
    if (!src || colTried[key]) return; colTried[key] = 1;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 24, 24);
        const d = g.getImageData(0, 0, 24, 24).data; let r = 0, gg = 0, bb = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255, mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]), sat = mx ? (mx - mn) / mx : 0, wt = a * sat * sat * (mx / 255); r += d[i] * wt; gg += d[i + 1] * wt; bb += d[i + 2] * wt; w += wt; }
        if (w < 1) return;
        const col = `rgb(${Math.round(r / w)},${Math.round(gg / w)},${Math.round(bb / w)})`, o = COL(); o[key] = col; saveCOL(o);
        s.querySelectorAll('.seal').forEach((n) => { if ((n.dataset.ic || n.querySelector('b').textContent) === key) n.style.setProperty('--sc', col); });
      } catch (e) { /* image server does not allow reading pixels: keep the name colour */ }
    };
    img.src = src;
  }
  // ---- Planner: unfinished triumphs that fit the activities you already play, closest first ----
  const PACT = [
    ['crucible', 'Crucible', /crucible|pvp|guardians? (defeated|in)|opponents?|trials of osiris|iron banner|competitive|control|clash|rumble|elimination/i],
    ['strike', 'Strikes and Nightfalls', /strikes?\b|nightfall|vanguard|grandmaster|vanguard ops/i],
    ['gambit', 'Gambit', /gambit|motes?\b|invad|primeval/i],
    ['raid', 'Raids', /\braids?\b|vault of glass|deep stone|king's fall|garden of salvation|last wish|root of nightmares|crota's end|salvation's edge|desert perpetual|vow of the disciple/i],
    ['dungeon', 'Dungeons', /dungeons?|shattered throne|pit of heresy|prophecy|grasp of avarice|duality|spire of the watcher|ghosts of the deep|warlord's ruin|vesper's host|sundered doctrine|equilibrium/i],
    ['patrol', 'Patrol and events', /patrol|public events?|lost sectors?|heroic|destination|bounties/i],
    ['season', 'Seasonal activities', /season|episode/i],
    ['exotic', 'Exotic missions', /exotic missions?|presage|harbinger|vox obscura|zero hour|the whisper|starcrossed|kell's fall|encore/i],
    ['weapon', 'Weapon kills', /(final blows?|kills?|defeat\w*)[^.]{0,40}\b(with|using)\b[^.]{0,30}(auto rifles?|hand cannons?|scout rifles?|pulse rifles?|sniper rifles?|shotguns?|swords?|bows?|grenade launchers?|rocket launchers?|fusion rifles?|machine guns?|sidearms?|submachine guns?|trace rifles?|glaives?|weapons?)/i],
    ['ability', 'Ability kills', /(final blows?|kills?|defeat\w*)[^.]{0,40}\b(with|using)\b[^.]{0,30}(grenades?|melee|supers?|abilit|arc|solar|void|stasis|strand|prismatic)/i],
  ];
  const PLS = () => { try { const a = JSON.parse(localStorage.getItem('gt.tplan')); return Array.isArray(a) ? a : ['strike', 'patrol']; } catch (e) { return ['strike', 'patrol']; } };
  let PTXT = null;
  const recTxt = (h) => { PTXT = PTXT || {}; if (PTXT[h] === undefined) { const r = DEF.rec[h]; PTXT[h] = r.n + ' ' + r.d + ' ' + crumbs(h).join(' ') + ' ' + (r.o || []).map((o) => (DEF.obj[o] || {}).d || '').join(' '); } return PTXT[h]; };
  function planHTML() {
    const on = PLS(), acts = PACT.filter((a) => on.includes(a[0]));
    const all = [...allRecs(S.cat, new Set(), new Set()), ...allRecs(S.seals, new Set(), new Set())].filter((h) => DEF.rec[h] && !hidden(h) && !isDone(h) && !((state(h) || [0])[0] & 8));
    const fits = acts.length ? all.filter((h) => acts.some((a) => a[2].test(recTxt(h)))) : [];
    const score = (h) => pct(h) * 100 + Math.min(20, (DEF.rec[h].s || 0) / 5);
    const pick = fits.sort((a, b) => score(b) - score(a)).slice(0, 40);
    const quick = all.filter((h) => pct(h) >= 0.75 && !pick.includes(h)).sort((a, b) => pct(b) - pct(a)).slice(0, 12);
    const pts = pick.reduce((t, h) => t + (DEF.rec[h].s || 0), 0);
    return `<div class="tcol">Activities you play</div><div class="tfl">${PACT.map(([k, l]) => `<button data-pl="${k}" class="${on.includes(k) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
<p class="mute" style="margin:0 0 8px">Pick what you usually play. The planner shows unfinished triumphs that fit those activities, closest to done first, so progress comes from things you were going to do anyway. Pin any of them to see them on the Inventory page.</p>
${acts.length ? `<div class="tcol">Fits what you play: ${fits.length} triumph${fits.length === 1 ? '' : 's'}${pts ? ' &middot; ' + pts.toLocaleString() + ' score in the top ' + pick.length : ''}</div>${pick.map(recHTML).join('') || '<p class="mute">Nothing unfinished matches those activities.</p>'}` : '<p class="mute">Pick at least one activity above.</p>'}
${quick.length ? `<div class="tcol" style="margin-top:14px">Quick wins: almost done</div>${quick.map(recHTML).join('')}` : ''}`;
  }

  // ---- Exotics: your exotic collection, what is missing, where it drops, and catalyst progress ----
  let EXO = null, exoErr = '', exoBusy = false;
  const exoF = { show: 'missing', kind: 'all' };
  const WBK = new Set([1498876634, 2465295065, 953998645]);
  function exoLoad() {
    if (exoBusy || !window.gt.actExotics) return; exoBusy = true; exoErr = '';
    window.gt.actExotics().then((r) => { EXO = r.items || []; }).catch((e) => { exoErr = String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''); }).finally(() => { exoBusy = false; if (tab === 'exo') draw(); });
  }
  let CATI = null;
  function catOf(name) {
    if (!CATI) { CATI = {}; for (const h in DEF.rec) { const n = DEF.rec[h].n; if (/\scatalyst$/i.test(n)) { const k = n.replace(/\s*catalyst$/i, '').trim().toLowerCase(); if (!CATI[k] || !hidden(h)) CATI[k] = +h; } } }
    return CATI[String(name).toLowerCase()] || 0;
  }
  function exoHTML() {
    if (exoErr) return `<p class="mute">Could not load your collection: ${esc(exoErr)}</p><button id="exor">Try again</button>`;
    if (!EXO) { exoLoad(); return '<p class="mute">Loading your exotic collection... the first time this downloads the collections list.</p>'; }
    const d = X.D(), owned = new Set(((d && d.items) || []).map((x) => x.n + '|' + (WBK.has(x.b) ? 3 : x.c)));
    const CL = X.CL || ['Titan', 'Hunter', 'Warlock'];
    const kinds = [['all', 'All'], ['w', 'Weapons'], ['0', CL[0]], ['1', CL[1]], ['2', CL[2]]];
    const list0 = EXO.filter((x) => exoF.kind === 'all' || (exoF.kind === 'w' ? WBK.has(x.b) : !WBK.has(x.b) && String(x.cl) === exoF.kind));
    const got = list0.filter((x) => x.got).length;
    const list = list0.filter((x) => exoF.show === 'all' || (exoF.show === 'missing' ? !x.got : x.got));
    const card = (x) => {
      const w = WBK.has(x.b), have = owned.has(x.n + '|' + (w ? 3 : x.cl));
      let cat = '';
      if (w && x.got) {
        const ch = catOf(x.n);
        if (ch && !hidden(ch)) { const p = pct(ch), dn = isDone(ch); cat = `<div class="exc${dn ? ' ok' : ''}" data-how="${ch}" title="Catalyst"><span>Catalyst</span>${dn ? '<b>Done</b>' : `<span class="sbar ebar"><i style="width:${Math.round(p * 100)}%"></i></span><b>${Math.round(p * 100)}%</b>`}</div>`; }
        else if (ch) cat = '<div class="exc"><span>Catalyst</span><b class="mute">Not found yet</b></div>';
      }
      return `<div class="exo${x.got ? '' : ' miss'}"><img src="${esc(icon(x.i))}" alt="" loading="lazy"><div><b>${esc(x.n)}</b><small>${esc(x.t)}${w ? '' : ' &middot; ' + esc(CL[x.cl] || '')}${x.got ? (have ? ' &middot; in your inventory' : ' &middot; unlocked, pull it from Collections') : ''}</small>${!x.got && x.src ? `<small class="src">${esc(x.src)}</small>` : ''}${cat}</div></div>`;
    };
    return `<div class="tcol">Exotic collection: ${got} of ${list0.length} unlocked</div><div class="sbar" style="margin:4px 0 10px"><i style="width:${list0.length ? Math.round(got / list0.length * 100) : 0}%"></i></div>
<div class="tfl">${[['missing', 'Missing'], ['got', 'Unlocked'], ['all', 'All']].map(([k, l]) => `<button data-exs="${k}" class="${exoF.show === k ? 'on' : ''}">${l}</button>`).join('')}<span style="width:12px"></span>${kinds.map(([k, l]) => `<button data-exk="${k}" class="${exoF.kind === k ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>
<div class="exg">${list.map(card).join('') || `<p class="mute">${exoF.show === 'missing' ? 'Nothing missing here. Nice.' : 'Nothing here.'}</p>`}</div>${hwOpen()}`;
  }
  const hwOpen = () => Object.keys(hw).filter((k) => hw[k] && DEF.rec[k] && catOf(DEF.rec[k].n.replace(/\s*catalyst$/i, '')) === +k).map((k) => `<div class="card" style="margin-top:8px"><b>${esc(DEF.rec[k].n)}</b>${howHTML(+k)}</div>`).join('');
  // Wide windows: a side column with what you track and what is closest to done, so the page uses the whole width.
  let SIDEC = null, sideW = window.innerWidth >= 1500;
  window.addEventListener('resize', () => { const w = window.innerWidth >= 1500; if (w !== sideW) { sideW = w; if (s.classList.contains('on') && DEF && S) draw(); } });
  function sideHTML() {
    if (window.innerWidth < 1500 || q) return '';
    if (!SIDEC || SIDEC.s !== S) {
      const all = [...allRecs(S.cat, new Set(), new Set()), ...allRecs(S.seals, new Set(), new Set())].filter((h) => DEF.rec[h] && !hidden(h) && !isDone(h) && !((state(h) || [0])[0] & 8));
      SIDEC = { s: S, near: all.map((h) => [h, pct(h)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 10).map((x) => x[0]) };
    }
    const trk = [...new Set([...S.tracked, ...PIN()])].filter((h) => DEF.rec[h]).slice(0, 8);
    const row = (h) => { const r = DEF.rec[h], p = isDone(h) ? 1 : pct(h); return `<div class="tsr" data-rd="${h}" title="${esc(r.d)}">${r.i ? `<img src="${esc(icon(r.i))}" alt="">` : '<i></i>'}<div><b>${esc(r.n)}</b><div class="sbar"><i class="${p >= 1 ? 'dn' : ''}" style="width:${Math.round(p * 100)}%"></i></div></div><em>${Math.round(p * 100)}%</em></div>`; };
    return `<aside class="tside"><div class="card"><div class="tcol">Tracked</div>${trk.length ? trk.map(row).join('') : '<p class="mute">Press Track on any triumph to keep it here and on the Inventory page.</p>'}</div><div class="card"><div class="tcol">Closest to done</div>${SIDEC.near.map(row).join('') || '<p class="mute">Nothing in progress.</p>'}</div></aside>`;
  }
  // ---- one triumph in detail, with which friends and clan members have it (like Braytech) ----
  let dOpen = 0, WHOR = null, whoTab = 'friend', whoT = 0;
  const cleanE = (e) => String((e && e.message) || e || '').replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
  async function whoFetch(h, reload) {
    clearTimeout(whoT);
    try { WHOR = await window.gt.trWho({ h, reload: !!reload }); } catch (e) { WHOR = { st: 'error', err: { all: cleanE(e) } }; }
    if (dOpen !== h) return;
    drawDet();
    if (WHOR && WHOR.st === 'loading') whoT = setTimeout(() => whoFetch(h), 900);
  }
  function openDet(h) { if (!DEF || !DEF.rec[h]) return; dOpen = h; WHOR = null; drawDet(); if (window.gt.trWho) whoFetch(h); }
  function closeDet() { dOpen = 0; clearTimeout(whoT); const m = document.getElementById('trd'); if (m) m.remove(); }
  function whoHTML() {
    if (!window.gt.trWho) return '<p class="mute">Friends and clan need the desktop app or website signed in.</p>';
    const W = WHOR;
    if (!W) return '<p class="mute">Looking up your friends and clan...</p>';
    if (W.st === 'loading') { const p = W.total ? Math.round((W.done / W.total) * 100) : 5; return `<p class="mute">Looking up your friends and clan${W.total ? ': ' + W.done + ' of ' + W.total : '...'}<br><small>This happens once. After that every triumph opens instantly.</small></p><div class="wbar"><i style="width:${p}%"></i></div>`; }
    if (W.st === 'error') return `<p class="mute">Could not look up your friends and clan: ${esc((W.err && W.err.all) || 'unknown error')}</p><button data-who="reload">Try again</button>`;
    const ppl = (W.people || []).filter((p) => p.s.includes(whoTab));
    const nF = (W.people || []).filter((p) => p.s.includes('friend')), nC = (W.people || []).filter((p) => p.s.includes('clan'));
    const cnt = (l) => l.filter((p) => p.d).length + ' / ' + l.length;
    const tabs = `<div class="wtabs"><button data-wt="friend" class="${whoTab === 'friend' ? 'on' : ''}">Friends <small>${cnt(nF)}</small></button><button data-wt="clan" class="${whoTab === 'clan' ? 'on' : ''}">Clan${W.clan ? ' &middot; ' + esc(W.clan) : ''} <small>${cnt(nC)}</small></button><button class="wrl" data-who="reload" title="Look everyone up again">&#8635;</button></div>`;
    const er = whoTab === 'friend' ? W.err && W.err.friends : W.err && W.err.clan;
    let note = '';
    if (er === 'scope') note = 'Bungie did not let Pathfinder read your friends list. Your clan still works.';
    else if (er === 'none') note = 'You are not in a clan.';
    else if (er) note = 'Could not load: ' + esc(er);
    const name = (p) => `<div class="wp${p.d ? ' wdn' : ''}${p.priv ? ' wpv' : ''}" title="${p.priv ? 'Private profile: Bungie does not share their triumphs' : ''}"><b>${esc(p.n)}</b>${p.c ? `<span>#${esc(p.c)}</span>` : ''}</div>`;
    const by = (a, b) => a.n.localeCompare(b.n);
    const dn = ppl.filter((p) => p.d).sort(by), nd = ppl.filter((p) => !p.d && !p.priv).sort(by), pv = ppl.filter((p) => !p.d && p.priv).sort(by);
    const grp = (t, l) => l.length ? `<h5>${t} <small>${l.length}</small></h5><div class="wgrid">${l.map(name).join('')}</div>` : '';
    return tabs + (note ? `<p class="mute">${note}</p>` : '') + (ppl.length ? grp('Completed', dn) + grp('Not completed', nd) + grp('Private profiles', pv) : (note ? '' : '<p class="mute">Nobody here yet.</p>'));
  }
  function drawDet() {
    let m = document.getElementById('trd');
    if (!dOpen) { if (m) m.remove(); return; }
    const h = dOpen, r = DEF.rec[h]; if (!r) { closeDet(); return; }
    if (!m) {
      m = document.createElement('div'); m.id = 'trd'; m.className = 'trd'; document.body.appendChild(m);
      m.addEventListener('click', (e) => {
        if (e.target === m || e.target.closest('[data-dx]')) { closeDet(); return; }
        const wt = e.target.closest('[data-wt]'); if (wt) { whoTab = wt.dataset.wt; drawDet(); return; }
        if (e.target.closest('[data-who]')) { WHOR = null; drawDet(); whoFetch(dOpen, true); return; }
        const tk = e.target.closest('[data-tk]'); if (tk) { const k = +tk.dataset.tk, a = PIN(); savePIN(a.includes(k) ? a.filter((x) => x !== k) : [...a, k]); drawDet(); draw(); }
      });
    }
    const st = state(h), done = isDone(h), obs = st && (st[0] & 8), on = PIN().includes(+h);
    ensureRw(h);
    const obj = (st ? st[1] : []).map((ob) => { const [oh, p, mx] = ob, od = DEF.obj[oh] || {}, mm = mx || od.m || 1, f = obFrac(h, ob), c = f >= 1, pc = Math.round(f * 100); return `<div class="dob${c ? ' ok' : ''}"><i class="bx"></i><div class="db"><i style="width:${pc}%"></i><span>${esc(od.d || 'Progress')}</span><em>${esc((p || 0).toLocaleString() + (mm > 1 ? ' / ' + mm.toLocaleString() : ''))}</em></div></div>`; }).join('');
    const rw = (r.rw || []).map(([ih, n]) => { const o = RW[ih]; return `<div class="drw">${o && o.i ? `<img src="${esc(icon(o.i))}" alt="">` : '<i></i>'}<span>${o ? esc(o.n || 'Reward') : 'Loading...'}${n > 1 ? ' x' + n : ''}</span></div>`; }).join('');
    const path = crumbs(h);
    m.innerHTML = `<div class="trdp" role="dialog" aria-label="${esc(r.n)}"><button class="dx" data-dx="1" title="Close (Esc)">&times;</button>
      <div class="dl"><div class="dhd">${r.i ? `<img src="${esc(icon(r.i))}" alt="">` : ''}<div><h3>${obs ? '???' : esc(r.n)}</h3>${path.length ? `<small>${path.map(esc).join(' &rsaquo; ')}</small>` : ''}</div></div>
        <p class="dd">${obs ? 'Hidden until the game reveals it.' : esc(r.d)}</p>
        <div class="dmeta">${r.s ? `<span>${r.s} points</span>` : ''}${done ? '<span class="ok">&#10003; Completed</span>' : '<span>Not completed yet</span>'}</div>
        ${obj ? `<h5>Objectives</h5>${obj}` : ''}
        ${r.t && r.ti ? `<h5>Title</h5><p class="dd">Unlocks the title <b>${esc(r.ti)}</b>.</p>` : ''}
        ${rw ? `<h5>Rewards</h5>${rw}` : ''}
        <button class="tkb${on ? ' on' : ''}" data-tk="${h}"><i class="tkd"></i>${on ? 'Tracked' : 'Track this triumph'}</button>
      </div>
      <div class="dr"><div class="dme"><b>You</b>${done ? '<span class="ok">Completed</span>' : '<span>Not completed</span>'}</div>${whoHTML()}</div></div>`;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dOpen) closeDet(); });
  { const ds = document.createElement('style'); ds.textContent = `
.trd{position:fixed;inset:0;z-index:9600;background:rgba(5,6,9,.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow:auto}
.trdp{position:relative;display:grid;grid-template-columns:minmax(0,380px) minmax(0,1fr);gap:0;width:min(1100px,100%);background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,.6);color:#e6e7ea;overflow:hidden}
.trdp .dx{position:absolute;top:8px;right:10px;background:none;border:0;color:#9aa0a8;font-size:26px;line-height:1;cursor:pointer;padding:2px 8px}.trdp .dx:hover{color:#fff}
@media (max-width:760px){.trdp .dhd{padding-right:44px}.trd{padding:calc(env(safe-area-inset-top,0px) + 56px) 10px calc(env(safe-area-inset-bottom,0px) + 80px)}.trdp .dx{position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);right:12px;z-index:2;width:42px;height:42px;padding:0;border-radius:50%;background:rgba(20,22,28,.92);border:1px solid #3a3d43;color:#fff;display:flex;align-items:center;justify-content:center}}
.trdp .dl{padding:20px 22px;border-right:1px solid var(--g-line,#2b2e33);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,0))}
.trdp .dr{padding:20px 22px;min-height:320px}
.trdp .dhd{display:flex;gap:12px;align-items:center}.trdp .dhd img{width:56px;height:56px;flex:none;border-radius:6px;background:#111}
.trdp h3{margin:0;font-size:20px;color:#fff;font-weight:600}.trdp .dhd small{display:block;color:#8b8f97;font-size:11.5px;margin-top:3px}
.trdp .dd{color:#c3c7cd;font-size:13.5px;line-height:1.5;margin:12px 0}
.trdp h5{margin:16px 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b8f97;font-weight:700}.trdp h5 small{color:#6a6f77;margin-left:4px}
.trdp .dmeta{display:flex;gap:8px;flex-wrap:wrap}.trdp .dmeta span,.trdp .dme span{font-size:12px;padding:2px 8px;border:1px solid #3a3d43;border-radius:10px;color:#b9bec6}.trdp .ok{color:#9fe3a8!important;border-color:#3f8f4c!important}
.trdp .dob{display:flex;gap:8px;align-items:center;margin-bottom:6px}.trdp .dob .bx{width:14px;height:14px;border:1px solid #6a6f77;flex:none}.trdp .dob.ok .bx{background:#5fbf6c;border-color:#5fbf6c}
.trdp .db{position:relative;flex:1;height:24px;background:#23262b;overflow:hidden;border-radius:2px}.trdp .db i{position:absolute;inset:0 auto 0 0;background:#3f8f4c}.trdp .dob.ok .db i{background:#4b9e58}
.trdp .db span,.trdp .db em{position:absolute;top:0;line-height:24px;font-size:12.5px;color:#fff;font-style:normal}.trdp .db span{left:8px;right:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.trdp .db em{right:8px}
.trdp .drw{display:flex;gap:8px;align-items:center;margin-bottom:6px;font-size:13px}.trdp .drw img,.trdp .drw i{width:28px;height:28px;border-radius:3px;background:#111;flex:none}
.trdp .tkb{margin-top:18px;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border:1px solid #3a3d43;border-radius:5px;background:var(--g-btn);color:#e6e7ea;cursor:pointer;font-size:13px}
.trdp .dme{display:flex;align-items:center;gap:10px;margin:0 0 12px}.trdp .dme b{color:#fff}
.trdp .wtabs{display:flex;gap:6px;align-items:center;border-bottom:1px solid var(--g-line,#2b2e33);margin-bottom:6px;padding-bottom:8px}
.trdp .wtabs button{background:none;border:0;border-bottom:2px solid transparent;color:#9aa0a8;padding:6px 4px;margin-right:10px;cursor:pointer;font-size:14px;font-weight:600}.trdp .wtabs button small{color:#6a6f77;font-weight:400;margin-left:3px}
.trdp .wtabs button.on{color:#fff;border-bottom-color:var(--g-accent,#7ab8e8)}.trdp .wtabs .wrl{margin-left:auto;margin-right:0;font-size:16px}
.trdp .wgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:4px}
.trdp .wp{display:flex;align-items:baseline;gap:2px;min-width:0;padding:7px 10px;background:#24272c;border-left:3px solid #3a3d43;font-size:13px}.trdp .wp b{font-weight:600;color:#e6e7ea;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.trdp .wp span{color:#7d828a;font-size:11.5px;flex:none}.trdp .wp b{display:inline!important;min-width:0}
.trdp .wp.wdn{background:#2d2333;border-left-color:#c79bdc}.trdp .wp.wpv{opacity:.5}
.trdp .wbar{height:6px;background:#23262b;border-radius:3px;overflow:hidden;max-width:360px}.trdp .wbar i{display:block;height:100%;background:var(--g-accent,#7ab8e8);transition:width .3s}
@media (max-width:760px){.trdp{grid-template-columns:1fr;align-content:start}.trdp .dl{border-right:0;border-bottom:1px solid var(--g-line,#2b2e33)}.trd{padding:0}.trdp{border-radius:0;min-height:100%}}
`; document.head.appendChild(ds); }
  function draw() {
    if (!window.gt) return;
    if (err) { s.innerHTML = `<div class="card"><p class="mute">${esc(err)}</p><button id="tre">Try again</button></div>`; return; }
    if (!DEF || !S) { s.innerHTML = `<div class="card"><p class="mute">${loading ? 'Loading your triumphs... the first time this downloads the triumph list, so it can take a minute.' : 'Sign in on the Vault tab first.'}</p></div>`; return; }
    let body = '';
    const root = tab === 'seal' ? S.seals : S.cat;
    const sealIds = (DEF.node[S.seals] ? DEF.node[S.seals].c : []).filter((c) => DEF.node[c] && counts(c)[1]);
    const sealDone = sealIds.filter((c) => sealInfo(c).done).length, gilded = sealIds.filter((c) => sealInfo(c).gilded).length;
    if (q) {
      const ids = [...allRecs(S.cat, new Set(), new Set()), ...allRecs(S.seals, new Set(), new Set())].filter((h) => pass(h) && (DEF.rec[h].n + ' ' + DEF.rec[h].d).toLowerCase().includes(q));
      body = sortRecs(ids).slice(0, 80).map(recHTML).join('') || '<p class="mute">Nothing matches.</p>';
    } else if (tab === 'trk') {
      const ids = [...new Set([...S.tracked, ...PIN()])].filter((h) => DEF.rec[h]);
      body = sortRecs(ids).map(recHTML).join('') || '<p class="mute">Nothing tracked yet. Press Track on any triumph to keep it here. Triumphs you track in the game show up here too.</p>';
    } else if (tab === 'near') {
      const all = [...allRecs(S.cat, new Set(), new Set()), ...allRecs(S.seals, new Set(), new Set())].filter((h) => DEF.rec[h] && !hidden(h) && !isDone(h) && pct(h) > 0);
      body = all.sort((x, y) => pct(y) - pct(x)).slice(0, 60).map(recHTML).join('') || '<p class="mute">Nothing in progress yet.</p>';
    } else if (tab === 'cat') {
      const hit = Object.keys(DEF.node).filter((k) => /catalyst/i.test(DEF.node[k].n) && (DEF.node[k].r.length || DEF.node[k].c.length));
      const ids = [...new Set(hit.flatMap((k) => [...allRecs(+k, new Set(), new Set())]))].filter((h) => pass(h) && /catalyst/i.test(DEF.rec[h].n));
      body = sortRecs(ids).map(recHTML).join('') || '<p class="mute">No catalyst triumphs found.</p>';
    } else if (tab === 'exo') body = exoHTML();
    else if (tab === 'plan') body = planHTML();
    else if (tab === 'seal') body = sealsHTML();
    else {
      const n = DEF.node[root];
      body = n ? n.c.map((c) => nodeHTML(c, 0)).join('') : '<p class="mute">Triumph list not found.</p>';
    }
    const tb = (k, l) => `<button data-tab="${k}" class="${tab === k && !q ? 'on' : ''}">${l}</button>`;
    const fb = (k, l) => `<button data-f="${k}" class="${filt === k ? 'on' : ''}">${l}</button>`;
    const sb = (k, l) => `<button data-sort="${k}" class="${sortM === k ? 'on' : ''}">${l}</button>`;
    const side = sideHTML();
    s.innerHTML = `<div class="card"><div class="tsum tscore"><div><b class="gold">${S.score.active.toLocaleString()}</b><span>Active score</span></div><div><b>${S.score.lifetime.toLocaleString()}</b><span>Lifetime</span></div><div><b class="grn">${sealDone}<small style="font-size:14px;color:var(--mute)"> / ${sealIds.length}</small></b><span>Seals complete</span></div><div><b class="gold">${gilded}</b><span>Gilded seals</span></div></div><div class="ttools"><span class="tseg">${tb('seal', 'Seals')}${tb('all', 'Triumphs')}${tb('trk', 'Tracked')}${tb('near', 'Closest to done')}${tb('cat', 'Catalysts')}${tb('exo', 'Exotics')}${tb('plan', 'Planner')}</span><input type="text" id="tq" placeholder="Search triumphs" value="${esc(q)}"><span class="tseg">${fb('all', 'All')}${fb('todo', 'Incomplete')}${fb('done', 'Complete')}</span><span class="tseg">${sb('game', 'Game order')}${sb('close', 'Closest first')}</span><button id="trf" title="Reload from Bungie">&#8635;</button></div></div><div class="twrap${side ? ' side' : ''}"><div class="card tmain">${body}</div>${side}</div>`;
    if (document.activeElement === document.body && q) { const t = document.getElementById('tq'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }
    if (tab === 'seal' && !sealOpen && !q) s.querySelectorAll('.seal').forEach((n) => { const ic = n.dataset.ic; if (ic && !COL()[ic]) tint(icon(ic), ic, n); });
  }
  async function load(force) {
    if (loading) return; loading = true; err = ''; draw();
    try {
      if (!DEF) DEF = await window.gt.trDefs();
      S = await window.gt.trState(); Object.keys(memo).forEach((k) => delete memo[k]);
    } catch (e) { err = 'Could not load triumphs: ' + String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''); }
    loading = false; draw();
  }
  s.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('#tre') || t.closest('#trf')) { load(true); return; }
    const hb = t.closest('[data-how]'); if (hb) { const k = hb.dataset.how; hw[k] = !hw[k]; draw(); return; }
    const gg = t.closest('[data-g]'); if (gg) { window.open('https://www.google.com/search?q=' + gg.dataset.g); return; }
    const g2 = t.closest('[data-g2]'); if (g2) { window.open('https://www.youtube.com/results?search_query=' + g2.dataset.g2); return; }
    const pn = t.closest('[data-pin]'); if (pn) { const h = +pn.dataset.pin, a = PIN(); savePIN(a.includes(h) ? a.filter((x) => x !== h) : [...a, h]); draw(); return; }
    const rdb = t.closest('[data-rd]'); if (rdb) { openDet(+rdb.dataset.rd); return; }
    const sq = t.closest('[data-sq]'); if (sq) { q = sq.dataset.sq.toLowerCase(); const ti = document.getElementById('tq'); if (ti) ti.value = sq.dataset.sq; draw(); return; }
    const plb = t.closest('[data-pl]'); if (plb) { const k = plb.dataset.pl, a = PLS(); try { localStorage.setItem('gt.tplan', JSON.stringify(a.includes(k) ? a.filter((z) => z !== k) : [...a, k])); } catch (er) { /* storage off */ } draw(); return; }
    if (t.closest('#exor')) { exoLoad(); draw(); return; }
    const exs = t.closest('[data-exs]'); if (exs) { exoF.show = exs.dataset.exs; draw(); return; }
    const exk = t.closest('[data-exk]'); if (exk) { exoF.kind = exk.dataset.exk; draw(); return; }
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; q = ''; sealOpen = 0; draw(); return; }
    const f = t.closest('[data-f]'); if (f) { filt = f.dataset.f; draw(); return; }
    const so = t.closest('[data-sort]'); if (so) { sortM = so.dataset.sort; draw(); return; }
    if (t.closest('[data-sealback]')) { sealOpen = 0; draw(); return; }
    const sl = t.closest('[data-seal]'); if (sl) { sealOpen = +sl.dataset.seal; draw(); window.scrollTo(0, 0); return; }
    const rr = t.closest('.tr[data-r]'); if (rr && !t.closest('button,a,input,select,.howp')) { openDet(+rr.dataset.r); return; }
    const nh = t.closest('[data-n]'); if (nh) { const k = nh.dataset.n; open[k] = !open[k]; draw(); }
  });
  s.addEventListener('input', (e) => { if (e.target.id === 'tq') { q = e.target.value.toLowerCase().trim(); clearTimeout(s._t); s._t = setTimeout(draw, 250); } });
  b.onclick = () => { window.show('triumphs'); if (!S) load(); else draw(); };
})();

// ---------------- Hub: Checkpoints, Raid Report, Destiny Report (the real sites, shown inside the app) ----------------
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec) return;
  const SITES = [
    { id: 'cp', g: 'look', c: '#4fb6c9', name: 'Checkpoints', url: 'https://d2checkpoint.com/', desc: 'Find checkpoint bots for raids, dungeons and Pantheon encounters. Copy the bot name and add it in game.' },
    { id: 'rr', g: 'look', c: 'var(--ak-raid)', name: 'Raid Report', url: 'https://raid.report/', desc: 'Look up any guardian for raid clears, fastest times and leaderboards.' },
    { id: 'dg', g: 'look', c: 'var(--ak-dungeon)', name: 'Dungeon Report', url: 'https://dungeon.report/', desc: 'Look up any guardian for dungeon clears, fastest times and leaderboards.' },
    { id: 'dr', g: 'look', c: '#6aa6e0', name: 'Destiny Report', url: 'https://destiny.report/', desc: 'Weapon database: search every weapon by perk, frame, element and where it drops, and find god rolls.' },
    { id: 'ls', g: 'look', c: 'var(--ak-lost)', name: 'Lost Sector Report', url: 'https://d2lostsector.report/', desc: 'Today\'s legend and master lost sectors, rewards, modifiers and the rotation ahead.' },
    { id: 'cal', g: 'look', c: '#d36b8f', name: 'Caldera Report', url: 'https://caldera.report/', desc: 'Caldera clears and stats for any guardian.' },
    { id: 'blue', g: 'build', c: '#7d8cf0', name: 'Blueberries', url: 'https://www.blueberries.gg/', desc: 'Destiny 2 guides, best builds for the current meta, and weapon and armor breakdowns.' },
    { id: 'bldr', g: 'build', c: '#e2675c', name: 'Builders', url: 'https://builders.gg/destiny/builds', desc: 'Browse and filter Destiny 2 builds by class, subclass, season, exotics, aspects and fragments.' },
  ];
  const s = document.createElement('section'); s.id = 'hub'; s.className = 'gdark'; vsec.parentNode.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Hub'; b.dataset.t = 'hub';
  const anchor = nav.querySelector('[data-t=triumphs]'); nav.insertBefore(b, anchor ? anchor.nextSibling : null);
  const st = document.createElement('style');
  st.textContent = `
:root[data-gsec="hub"] main > #hub{max-width:none!important;margin:0!important;zoom:1!important;padding:0 12px}
#hub .hbar{display:flex;align-items:center;gap:6px;padding:8px 0;flex-wrap:wrap}
#hub .hbar button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn);padding:6px 14px;cursor:pointer;letter-spacing:2px;text-transform:uppercase;font-size:12px}
#hub .hbar button.on{background:var(--g-accent2,#2b4a6b);color:var(--g-on-accent,#fff);border-color:#8fb3d9}
#hub .hbar .sp{margin-left:auto;display:flex;gap:6px}
#hub .hbar .sp button{letter-spacing:0;text-transform:none;font-size:12px;padding:4px 10px}
#hub .hhero{position:relative;overflow:hidden;margin:6px 0 4px;padding:22px 24px;border:1px solid var(--g-line);border-radius:8px;background:radial-gradient(120% 140% at 100% 0,var(--g-accent-soft,rgba(122,184,232,.16)),transparent 60%),linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,0)),var(--g-panel)}
#hub .hhero small{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--g-accent,#7ab8e8);font-weight:700}#hub .hhero h2{border:0!important;padding:0!important;margin:4px 0 6px;font-size:24px;color:#fff;font-weight:600;letter-spacing:.5px}#hub .hhero p{margin:0;color:#aeb3bb;font-size:13.5px;max-width:560px}
.hhero{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.hdisc{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;background:#5865f2;color:#fff!important;font-weight:700;font-size:14px;text-decoration:none!important;box-shadow:0 6px 18px rgba(88,101,242,.35)}.hdisc:hover{background:#4752c4}
#hub .hsec{display:flex;align-items:baseline;gap:10px;margin:20px 0 0}#hub .hsec h4{margin:0;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:#d9dce1;font-weight:700}#hub .hsec span{color:#8b8f97;font-size:12.5px}
#hub .hgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-top:10px}#hub .hcard{min-height:140px}
#hub .hcard{position:relative;overflow:hidden;background:linear-gradient(160deg,color-mix(in srgb,var(--hc) 10%,transparent),transparent 55%),var(--g-panel);border:1px solid color-mix(in srgb,var(--hc) 28%,var(--g-line,#2b2e33));border-radius:8px;padding:16px 18px;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
#hub .hcard::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--hc)}
#hub .hcard:hover{border-color:color-mix(in srgb,var(--hc) 60%,transparent);box-shadow:0 10px 26px rgba(0,0,0,.35),0 0 calc(26px * var(--gt-glow,.55)) calc(-8px) var(--hc);transform:translateY(-2px)}
#hub .hct{display:flex;align-items:center;gap:10px;min-width:0}#hub .hct h3{flex:1;min-width:0;overflow-wrap:anywhere}#hub .hct .hmpin{margin-left:auto;flex:none}
#hub .hmono{flex:none;width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:800 13px/1 'Open Sans',system-ui,sans-serif;letter-spacing:.5px;color:#fff;background:linear-gradient(145deg,color-mix(in srgb,var(--hc) 75%,#fff 0%),color-mix(in srgb,var(--hc) 55%,#000));box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
#hub .hcard h3{margin:0;font-size:14px;letter-spacing:1.5px;line-height:1.25;text-transform:uppercase;color:#fff;font-weight:600}
#hub .hcard p{margin:0;color:var(--mute);font-size:13px;line-height:1.45}
#hub .hcard .go{margin-top:auto;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--hc);transition:letter-spacing .18s}#hub .hcard:hover .go{letter-spacing:2.6px}
#hub .hnote{color:var(--mute);font-size:12px;margin-top:14px}
#hub .cpbox{height:calc(100vh - 190px);min-height:360px;border:1px solid var(--g-line);background:#0b0c0f}
#hub webview{width:100%;height:100%;display:flex}
#hub .cpmsg{padding:30px;text-align:center;color:var(--mute)}
#hub .hcard .go .nt{display:inline-block;margin-left:4px;font-size:13px}
#hub.webm .hbar .sp{display:none!important}
#hub.webm .hcard:hover .go{color:#fff}`;
  document.head.appendChild(st);
  let cur = 'home';
  const wvs = {}, boxes = {};
  // The website cannot show other sites inside itself (they refuse to be framed, and their sign-ins would break), so there each site opens in a new tab.
  const WEBM = () => !!window.__GT_WEB__ || !document.createElement('webview').reload; // checked when used, after the desktop app has set up its <webview>
  const ext = (x) => { try { window.open(x.url, '_blank', 'noopener'); } catch (e) { /* blocked */ } };
  window.__gthub = { url: (id) => { const x = SITES.find((q) => q.id === id); return x ? x.url : ''; }, get web() { return WEBM(); } };
  const draw = () => {
    s.classList.toggle('webm', WEBM());
    s.innerHTML = '<div class="hbar"><button data-h="home">Hub</button>' + SITES.map((x) => `<button data-h="${x.id}">${x.name}</button>`).join('') + '<span class="sp"><button data-hx="back">&lsaquo; Back</button><button data-hx="fwd">Forward &rsaquo;</button><button data-hx="site">Site home</button><button data-hx="reload">Reload</button><button data-hx="ext">Open in browser</button></span></div><div id="hhome"></div>' + SITES.map((x) => `<div class="cpbox" id="hbox-${x.id}" style="display:none"></div>`).join('');
    SITES.forEach((x) => { boxes[x.id] = s.querySelector('#hbox-' + x.id); delete wvs[x.id]; });
    const mono = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const card = (x) => `<div class="hcard" data-h="${x.id}" style="--hc:${x.c}"><div class="hct"><span class="hmono">${mono(x.name)}</span><h3>${x.name}</h3>${window.__gth ? window.__gth.btn('hub', x.id, x.name) : ''}</div><p>${x.desc}</p><span class="go">${WEBM() ? 'Open in a new tab <span class="nt">&#8599;</span>' : 'Open &rsaquo;'}</span></div>`;
    const grp = (g, t, sub) => `<div class="hsec"><h4>${t}</h4><span>${sub}</span></div><div class="hgrid">${SITES.filter((x) => x.g === g).map(card).join('')}</div>`;
    s.querySelector('#hhome').innerHTML = '<div class="hhero"><div><small>Hub</small><h2>Community sites</h2><p>Look up clears, find checkpoints and grab builds without leaving Pathfinder.</p></div><a class="hdisc" href="https://discord.gg/rJXsgHdcMY" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19.5 5.3A17 17 0 0 0 15.3 4l-.5 1a15.6 15.6 0 0 0-5.6 0l-.5-1a17 17 0 0 0-4.2 1.3C1.9 9.3 1.2 13.2 1.6 17a17 17 0 0 0 5.2 2.6l1.1-1.8a11 11 0 0 1-1.7-.8l.4-.3a12.2 12.2 0 0 0 10.8 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.8a17 17 0 0 0 5.2-2.6c.5-4.4-.8-8.3-2.9-11.7zM8.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm6.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1z"/></svg>Join our Discord</a></div>' + grp('look', 'Lookups and checkpoints', 'Clears, records and bots for any guardian') + grp('build', 'Builds and guides', 'Meta builds, breakdowns and help') + '<p class="hnote">' + (WEBM() ? 'These are the real websites. On the Pathfinder website they open in a new tab, because they do not allow being shown inside another site. In the desktop app they open right here.' : 'These are the real websites, shown inside the app. They are not part of Pathfinder and have nothing to do with your vault. Links to other sites open in your normal browser.') + '</p>';
    go(cur);
  };
  const open = (x) => {
    const box = boxes[x.id]; if (!box || wvs[x.id]) return;
    if (WEBM()) { box.innerHTML = `<div class="cpmsg"><p>${x.name} opens in its own browser tab.</p><button class="b" data-hext="${x.id}">Open ${x.name} &#8599;</button></div>`; wvs[x.id] = 1; return; }
    const w = document.createElement('webview'); w.setAttribute('src', x.url); w.setAttribute('partition', 'persist:hub-' + x.id);
    w.addEventListener('did-fail-load', (e) => { if (e.errorCode !== -3 && e.isMainFrame) { box.innerHTML = '<div class="cpmsg">Could not load ' + x.name + ' (' + (e.errorDescription || 'offline') + '). Check your connection, then press Reload.</div>'; delete wvs[x.id]; } });
    box.appendChild(w); wvs[x.id] = w;
  };
  function go(id) {
    cur = id;
    s.querySelectorAll('.hbar [data-h]').forEach((n) => n.classList.toggle('on', n.dataset.h === id));
    s.querySelector('#hhome').style.display = id === 'home' ? '' : 'none';
    SITES.forEach((x) => { boxes[x.id].style.display = x.id === id ? '' : 'none'; });
    s.querySelector('.hbar .sp').style.display = id === 'home' ? 'none' : '';
    const site = SITES.find((x) => x.id === id); if (site) open(site);
  }
  s.addEventListener('click', (e) => {
    if (e.target.closest('[data-hpin]')) return; // the + Home button only pins, it does not open the site
    const xb = e.target.closest('[data-hext]'); if (xb) { const x = SITES.find((q) => q.id === xb.dataset.hext); if (x) ext(x); return; }
    if (e.target.closest('.hmpin')) return;
    const h = e.target.closest('[data-h]'); if (h) { const x = WEBM() && SITES.find((q) => q.id === h.dataset.h); if (x) { ext(x); return; } go(h.dataset.h); return; }
    const t = e.target.closest('[data-hx]'); if (!t) return;
    const site = SITES.find((x) => x.id === cur); if (!site) return;
    const w = wvs[site.id], live = w && w.reload;
    const hx = t.dataset.hx;
    if (hx === 'ext') { let u = site.url; try { if (live && w.getURL()) u = w.getURL(); } catch (er) { /* not ready yet */ } window.open(u); return; }
    if (hx === 'back') { try { if (live && w.canGoBack()) w.goBack(); } catch (er) { /* not ready yet */ } return; }
    if (hx === 'fwd') { try { if (live && w.canGoForward()) w.goForward(); } catch (er) { /* not ready yet */ } return; }
    if (hx === 'site') { if (live) { try { w.loadURL(site.url); return; } catch (er) { /* fall through and rebuild */ } } delete wvs[site.id]; boxes[site.id].innerHTML = ''; open(site); return; }
    if (live) w.reload(); else { delete wvs[site.id]; boxes[site.id].innerHTML = ''; open(site); }
  });
  b.onclick = () => { show('hub'); if (!s.firstChild) draw(); };
})();
