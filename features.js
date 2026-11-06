// Extra vault features: bulk select, new-items feed, postmaster warning, infusion finder, wish list maker,
// and the Settings cards for farming / overlay / my wish list. Works on top of vault.js through window.__gtv.
(function () {
  'use strict';
  const V = () => window.__gtv;
  const gt = window.gt;
  if (!gt) return;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };

  const TG = [['favorite', '★'], ['keep', '✔'], ['infuse', '⚡'], ['junk', '✖'], ['archive', '▣']];
  const st = { bulk: false, sel: new Set(), feedOpen: true, inf: null, infMode: 'target', wm: {}, msg: '', lastD: null, pmNote: {}, farm: { on: false, moved: 0, last: '' }, ovl: false, mine: null, mineMsg: '' };

  const css = document.createElement('style');
  css.textContent = `
#vfx{display:flex;flex-direction:column;gap:6px;margin:6px 0 0}
header{position:relative}
:root[data-dark="1"] header{justify-content:center!important;padding-bottom:10px!important}
:root[data-dark="1"] header::after{position:absolute!important;left:50%;bottom:2px;transform:translateX(-50%);margin:0!important}
:root[data-dark="1"] header h1{white-space:nowrap}
/* full-width pages: Resets, Checklist, Wishlist, Helpful follow the window */
:root[data-dark="1"] main>#reset,:root[data-dark="1"] main>#check,:root[data-dark="1"] main>#wish,:root[data-dark="1"] main>#guides{max-width:none!important;margin-left:0!important;margin-right:0!important}
:root[data-gsec="reset"] main,:root[data-gsec="check"] main,:root[data-gsec="wish"] main,:root[data-gsec="guides"] main{max-width:none!important;margin:0!important;padding:10px 12px 30px!important}
#reset.on{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))!important;align-items:stretch}
#check.on #clist{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:8px 12px;margin-top:8px}
#check.on #clist .row{border:1px solid var(--g-line,#2b2e33);padding:10px 12px;background:rgba(255,255,255,.02)}
#check.on #clist .mute:only-child{grid-column:1/-1}
#check.on .card>div:last-child{max-width:720px}
#wish.on{display:grid;grid-template-columns:minmax(320px,440px) minmax(0,1fr);grid-template-rows:auto 1fr;gap:12px;align-items:start}
#wish.on>.card:first-child{grid-column:1;grid-row:1/span 2;margin:0}
#wish.on>#wsearch{grid-column:2;grid-row:1;margin:0}
#wish.on>#wlist{grid-column:2;grid-row:2;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px;align-items:start}
#wish.on>#wlist>.card{margin:0}
#wish.on>#wlist>.mute,#wish.on>#wlist>:not(.card){grid-column:1/-1}
@media(max-width:820px){#wish.on{display:block}#wish.on>#wsearch{margin-bottom:12px}#wish.on>#wlist{display:block}#wish.on>#wlist>.card{margin-bottom:10px}}
#guides #ghub>.card{margin-bottom:12px}
#guides #glist.hubgrid{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))!important}#guides #glist.hubgrid>.gcard{min-height:170px;border-radius:6px!important}#gall{margin-top:16px}#gall h3{margin:4px 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8}#gall .gac{margin-bottom:12px}#gall h4{margin:0 0 6px;font-size:13px;color:#e5c158;font-weight:600}#gall h4 small{color:#8b8f97;font-weight:400}#gall .gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px}#gall .gai{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;background:var(--g-panel,#1a1c20)!important;border:1px solid var(--g-line,#2b2e33)!important;border-radius:4px!important;padding:9px 12px!important;cursor:pointer;color:inherit;letter-spacing:0!important;text-transform:none!important;font:inherit}#gall .gai:hover{border-color:#e5c158!important}#gall .gai b{color:#fff;font-size:13.5px}#gall .gai span{color:#9aa0a8;font-size:12px;line-height:1.35}#gfeat{margin:0 0 12px}#gfeat h3{margin:4px 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8}#gfeat .gfl{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}#gfeat .gfc{position:relative;min-height:96px;border:1px solid var(--g-line,#2b2e33);border-radius:4px;background:#14161a center/cover no-repeat;padding:12px 14px;cursor:pointer;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}#gfeat .gfc::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.8),rgba(0,0,0,.2))}#gfeat .gfc>*{position:relative}#gfeat .gfc b{color:#fff;font-size:16px}#gfeat .gfc small{color:#e5c158;font-size:11.5px;letter-spacing:1px;text-transform:uppercase}#gfeat .gfc:hover{border-color:#e5c158}
#guides #gpage{max-width:1200px}

#vfx:empty{display:none}
.fxbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;background:#17181b;border:1px solid #2f3238;padding:6px 8px;font-size:13px;color:#d6d8dc}
.fxbar b{color:#fff}.fxbar .sp{flex:1}
.fxbar button{padding:4px 9px;font-size:12px}
.fxbar.warn{border-color:#8a6a20;background:#221d10;color:#f0d79a}
.fxbar.bulk{border-color:#3f6c93;background:#101b25}
.fxgoal{background:#17181b;border:1px solid #2f3238;padding:6px 8px;margin-bottom:6px}.fxgoal h4{margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#cfd2d8;display:flex;align-items:center;gap:8px}.fxgoal h4>span[data-f]{cursor:pointer}.fxgoal h4 small{color:#7c7f86;letter-spacing:0;text-transform:none;margin-left:6px}.fxgoal h4 button{padding:2px 8px!important;font-size:11px;letter-spacing:0;text-transform:none}
.pglist{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px;margin-top:6px}.pgcard{position:relative;display:flex;gap:8px;background:#1d1f23;border:1px solid #2f3238;padding:6px 26px 6px 6px}.pgcard.ok{border-color:#2f6b3a}.pgcard img{width:36px;height:36px;flex:none;border:1px solid #3a3d43}.pgbd{flex:1;min-width:0}.pgbd b{display:block;color:#fff;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pgbd small{color:#8b8f97;font-size:11px}.pgob{display:grid;grid-template-columns:1fr 60px auto;gap:6px;align-items:center;font-size:11.5px;color:#b9bec6;margin-top:3px}.pgob span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pgob i{height:5px;background:#2c2f34;border-radius:3px;overflow:hidden}.pgob i b{display:block;height:100%;background:#5d93c9}.pgob.ok{color:#7fd48a}.pgob.ok i b{background:#4caf50}.pgob em{font-style:normal;color:#cfd2d8;font-size:11px}.pgx{position:absolute;top:2px;right:2px;background:none!important;border:0!important;color:#8b8f97;cursor:pointer;font-size:15px;padding:0 5px!important}.pgx:hover{color:#fff}
.pgmenu{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;max-height:220px;overflow:auto}.pgmenu button{background:#1d1f23;border:1px solid #3a3d43;color:#cfd2d8;padding:4px 10px;font-size:12px;cursor:pointer;border-radius:3px;text-align:left}.pgmenu button.on{border-color:#8fb3d9;color:#fff}.pgmenu button small{color:#8b8f97;margin-left:6px}
.fxfeed{background:#17181b;border:1px solid #2f3238;padding:6px 8px}
.fxfeed h4{margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#cfd2d8;display:flex;align-items:center;gap:8px;cursor:pointer}
.fxfeed h4 small{color:#7c7f86;letter-spacing:0;text-transform:none}
.fxfeed .fxrow{display:flex;flex-wrap:wrap;gap:calc(var(--t,44px)*.12);margin-top:8px}
.vt.bsel{outline:2px solid #7ab8e8;outline-offset:-2px}
.vt.bsel::after{content:"\\2713";position:absolute;left:2px;top:2px;width:15px;height:15px;border-radius:50%;background:#7ab8e8;color:#08141f;font-size:11px;font-weight:700;line-height:15px;text-align:center;z-index:2}
body.fxbulk .vt{cursor:copy}
.pfx{margin:6px 12px;display:flex;flex-direction:column;gap:6px}
.pfx .pfb{display:flex;flex-wrap:wrap;gap:6px}
.pfx .pfb button{padding:4px 9px;font-size:12px}
.pfx .pfb button.on{border-color:#fff;color:#fff}
.pfx .pfp{background:#101114;border:1px solid #2b2e33;padding:8px;font-size:12px;color:#c9ccd2}
.pfx .pfp h5{margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9da1a8;font-weight:600}
.pfx .infrow{display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid #1d1f23}
.pfx .infrow:first-of-type{border-top:0}
.pfx .infrow .vt{--t:36px;flex:none}
.pfx .infrow .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pfx .infrow .df{color:#7ad98f;font-weight:700}
.pfx .infrow small{color:#8b8f97;display:block}
.pfx label.wmc{display:flex;gap:6px;align-items:center;padding:2px 0}
.pfx input[type=text]{width:100%;background:#0b0c0e;border:1px solid #33363c;color:#fff;padding:4px 6px;font-size:12px}
.pfx p,.pfx .mute{font-size:12px;line-height:1.4}.pfx label.wmc{justify-content:flex-start;font-size:12px}.pfx label.wmc input{width:auto;margin:0}.pfx select{font-size:12px;padding:3px 6px;height:auto}.pfx .pfb button.b{font-size:11px}
.pfx .wmmsg{color:#9ecb9e}.pfx .wmmsg.bad{color:#ef8a8a}
.fxcard .wr{display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px solid #23252a;font-size:13px}
.fxcard .wr:first-of-type{border-top:0}
.fxcard .wr .nm{flex:1;min-width:0}
.fxcard .wr small{display:block;color:#8b8f97}
.fxcard .wr .tr{color:#e05b5b;font-weight:700}
body.ovl header{display:none}
`;
  document.head.appendChild(css);

  const gear = () => { const v = V(), D = v && v.D(); return D ? D.items.filter((x) => !x.pm) : []; };
  const byId = (id) => V().byId(id);
  const moveable = (x) => x && !x.ro && !x.pm && !x.e && x.id && /^\d+$/.test(x.id);

  // ---------- postmaster warning ----------
  function warnHTML() {
    const D = V().D(), thr = lsGet('gt.pmwarn', 18); if (!thr || thr > 21) return '';
    let h = '';
    for (const c of D.chars) {
      const its = D.items.filter((x) => x.loc === c.id && x.pm), n = (D.pm && D.pm[c.id]) || its.length;
      if (n >= thr) {
        h += `<div class="fxbar warn"><span>&#9888; <b>${esc(V().CL()[c.cls] || 'Guardian')}</b> postmaster is ${n}/21. Items at the back get deleted when it is full.</span><span class="sp"></span>${its.some((x) => !x.eg) ? `<button class="g" data-act="collect" data-c="${esc(c.id)}">Collect postmaster</button>` : ''}</div>`;
        if (lsGet('gt.pmnotify', true) && !st.pmNote[c.id]) { st.pmNote[c.id] = 1; gt.notify({ title: 'Postmaster almost full', body: (V().CL()[c.cls] || 'Guardian') + ' postmaster is ' + n + '/21.' }).catch(() => {}); }
      } else st.pmNote[c.id] = 0;
    }
    return h;
  }

  // ---------- bulk select ----------
  function bulkHTML() {
    const n = st.sel.size;
    if (!st.bulk && !n) return st.msg ? `<div class="fxbar"><span>${esc(st.msg)}</span></div>` : '';
    const D = V().D(), CLs = V().CL();
    const tg = ((V() && V().TG) || TG).map((t) => `<button class="g" data-f="btag" data-v="${t[0]}" title="Tag ${t[0]}" style="${t[2] ? 'color:' + t[2] : ''}">${t[1]}</button>`).join('') + '<button class="g" data-f="btag" data-v="" title="Remove tags">No tag</button>';
    const mv = ['vault', ...D.chars.map((c) => c.id)].map((t) => `<button class="g" data-f="bmove" data-t="${esc(t)}">${t === 'vault' ? 'Vault' : esc(CLs[(D.chars.find((c) => c.id === t) || {}).cls] || 'Guardian')}</button>`).join('');
    return `<div class="fxbar bulk"><b>${n} selected</b><button class="g" data-f="ball" title="Select everything matching the current search">Select search results</button><span>Tag:</span>${tg}<span>Lock:</span><button class="g" data-f="block">Lock</button><button class="g" data-f="bunlock">Unlock</button><span>Move to:</span>${mv}<span class="sp"></span>${st.msg ? `<span>${esc(st.msg)}</span>` : ''}<button class="g" data-f="bdone">${n ? 'Clear' : 'Done'}</button></div>`;
  }
  function toggleSel(id) { if (st.sel.has(id)) st.sel.delete(id); else st.sel.add(id); st.msg = ''; V().render(); }
  const selItems = () => [...st.sel].map(byId).filter(Boolean);

  async function bulkAct(kind, arg) {
    const v = V(), D = v.D(), items = selItems();
    if (!items.length) { st.msg = 'Select some items first.'; v.render(); return; }
    if (kind === 'tag') {
      const o = v.TAGS(); items.forEach((x) => { if (arg) o[x.id] = arg; else delete o[x.id]; }); v.saveTAGS(o); st.msg = 'Tagged ' + items.length + '.'; v.render(); return;
    }
    if (kind === 'lock') {
      const want = arg, its = items.filter((x) => !x.ro && !x.pm && /^\d+$/.test(x.id) && !!x.lk !== want);
      if (!its.length) { st.msg = want ? 'Those are already locked.' : 'Those are already unlocked.'; v.render(); return; }
      v.act((want ? 'lock ' : 'unlock ') + its.length + ' items', () => its.forEach((o) => { o.lk = want ? 1 : 0; }), async () => { for (const x of its) await gt.itemLock({ id: x.id, state: want, char: v.charFor(x) }); }, false);
      return;
    }
    if (kind === 'move') {
      const to = arg, ch = D.chars.find((c) => c.id === to);
      const its = items.filter((x) => moveable(x) && x.loc !== to && (to === 'vault' || (ch && (x.c === 3 || x.c === undefined || x.c === ch.cls))));
      const skipped = items.length - its.length;
      if (!its.length) { st.msg = 'Nothing to move (equipped items, postmaster items and other-class armor are skipped).'; v.render(); return; }
      const snaps = its.map(v.slim);
      v.act('move ' + its.length + ' items', () => its.forEach((o) => { o.loc = to; }), () => v.pmap(snaps, (s) => gt.move({ item: s, from: s.loc, to })), true);
      st.msg = skipped ? skipped + ' skipped.' : '';
      st.sel.clear();
    }
  }

  // ---------- new items feed ----------
  function feedUpdate() {
    const v = V(), D = v.D(); if (!D || st.lastD === D) return; st.lastD = D;
    const key = 'gt.seen.' + (D.name || 'x'), fkey = 'gt.feed.' + (D.name || 'x');
    const ids = D.items.filter((x) => !x.pm && x.id && /^\d+$/.test(x.id)).map((x) => x.id);
    const seen = lsGet(key, null);
    let feed = lsGet(fkey, []);
    if (seen) { const s = new Set(seen); const now = Date.now(); ids.forEach((id) => { if (!s.has(id)) feed.unshift({ id, at: now }); }); }
    const have = new Set(ids);
    feed = feed.filter((f) => have.has(f.id)).slice(0, 40);
    // Remember every item ever seen (not just the last snapshot): an item that blinked out of one lagging reply and came back used to be called new.
    lsSet(key, seen ? [...new Set([...seen, ...ids])].slice(-8000) : ids); lsSet(fkey, feed);
  }
  function feedHTML() {
    const D = V().D(), fkey = 'gt.feed.' + (D.name || 'x');
    const feed = lsGet(fkey, []).map((f) => byId(f.id)).filter(Boolean);
    return ''; // the New items strip is turned off on purpose (it only ever got dismissed)
    // eslint-disable-next-line no-unreachable
    return `<div class="fxfeed"><h4 data-f="feedt">${st.feedOpen ? '&#9662;' : '&#9656;'} New items <small>${feed.length} since you last looked</small><span style="flex:1"></span><button class="g" data-f="feedx" style="padding:2px 8px;font-size:11px">Dismiss all</button></h4>${st.feedOpen ? `<div class="fxrow">${feed.map((x) => V().tile(x)).join('')}</div>` : ''}</div>`;
  }

  // ---------- pinned goals: triumphs you pinned (star in Triumphs) and quests you pin here ----------
  const TPIN = () => lsGet('gt_tpin', []), QPIN = () => lsGet('gt.qpin', []);
  st.goals = null; st.goalAt = 0; st.goalBusy = false; st.goalMenu = false;
  function goalLoad(force) {
    if (st.goalBusy || !gt.goalState) return;
    if (!force && st.goals && Date.now() - st.goalAt < 90000) return;
    st.goalBusy = true;
    gt.goalState({ r: TPIN().slice(0, 40) }).then((r) => { st.goals = r; st.goalAt = Date.now(); }).catch(() => { st.goalAt = Date.now(); }).finally(() => { st.goalBusy = false; if (V() && V().D()) after(); });
  }
  const objLine = (o) => `<div class="pgob${o.c ? ' ok' : ''}"><span>${esc(o.t || 'Objective')}</span><i><b style="width:${Math.min(100, Math.round(o.p / (o.m || 1) * 100))}%"></b></i><em>${o.m > 1 ? Math.min(o.p, o.m).toLocaleString() + '/' + o.m.toLocaleString() : o.c ? '&#10003;' : ''}</em></div>`;
  function goalsHTML() {
    const open = lsGet('gt.goals.open', true), g = st.goals || { recs: [], quests: [] };
    const qp = QPIN(), qs = g.quests.filter((x) => qp.includes(x.k)), rs = g.recs, n = rs.length + qs.length;
    const CL = (V().CL && V().CL()) || [];
    const card = (x, kind) => `<div class="pgcard${x.done ? ' ok' : ''}">${x.i ? `<img src="${esc(V().icon(x.i))}" alt="">` : ''}<div class="pgbd"><b title="${esc(x.d || '')}">${esc(x.n)}</b>${kind === 'q' && CL[x.cl] ? `<small>${esc(CL[x.cl])}</small>` : ''}${(x.obj || []).slice(0, 4).map(objLine).join('')}${x.done ? '<div class="pgob ok"><span>Complete</span></div>' : ''}</div><button class="pgx" data-f="${kind === 'q' ? 'qunpin' : 'tunpin'}" data-k="${esc(kind === 'q' ? x.k : String(x.h))}" title="Unpin">&times;</button></div>`;
    const menu = st.goalMenu ? `<div class="pgmenu">${g.quests.length ? g.quests.map((x) => `<button data-f="qpin" data-k="${esc(x.k)}" class="${qp.includes(x.k) ? 'on' : ''}">${qp.includes(x.k) ? '&#10003; ' : ''}${esc(x.n)}<small>${esc(CL[x.cl] || '')}</small></button>`).join('') : `<p class="mute">${st.goalBusy ? 'Loading your quests...' : 'No quests with progress on your characters.'}</p>`}</div>` : '';
    return `<div class="fxgoal"><h4><span data-f="goalt">${open ? '&#9662;' : '&#9656;'} Pinned goals <small>${n ? n + ' pinned' : 'Pin triumphs and seal steps with the pin in Triumphs, or pin a quest here'}</small></span><span style="flex:1"></span><button class="g" data-f="goalm">${st.goalMenu ? 'Done' : '+ Pin a quest'}</button>${n ? '<button class="g" data-f="goalr" title="Refresh">&#8635;</button>' : ''}</h4>${menu}${open && n ? `<div class="pglist">${rs.map((x) => card(x, 't')).join('')}${qs.map((x) => card(x, 'q')).join('')}</div>` : ''}</div>`;
  }

  // ---------- all of the above, drawn into #vfx ----------
  function after() {
    const box = document.getElementById('vfx'); if (!box || !V() || !V().D()) return;
    feedUpdate();
    goalLoad(false);
    box.innerHTML = warnHTML() + bulkHTML() + goalsHTML() + feedHTML();
    document.body.classList.toggle('fxbulk', st.bulk);
    document.querySelectorAll('[data-f=bulk]').forEach((b) => b.classList.toggle('on', st.bulk || st.sel.size > 0));
  }

  // ---------- infusion finder (inside the item popup) ----------
  function infusionHTML(x) {
    const v = V(), D = v.D(), all = gear().filter((o) => o.id !== x.id && o.b === x.b && /^\d+$/.test(o.id));
    const ok = (o) => (x.fc && o.fc ? x.fc === o.fc : ((o.c === x.c) || o.c === 3 || x.c === 3));
    const fuelMode = st.infMode === 'fuel';
    const list = all.filter(ok).filter((o) => fuelMode ? (o.p || 0) < (x.p || 0) : (o.p || 0) > (x.p || 0))
      .sort((a, b) => fuelMode ? (b.p || 0) - (a.p || 0) : (b.p || 0) - (a.p || 0)).slice(0, 10);
    const where = (o) => o.loc === 'vault' ? 'Vault' : (v.CL()[(D.chars.find((c) => c.id === o.loc) || {}).cls] || 'Character') + (o.e ? ' (equipped)' : '');
    const rows = list.map((o) => {
      const d = (o.p || 0) - (x.p || 0);
      return `<div class="infrow">${v.tile(o)}<div class="nm"><b>${esc(o.n)}</b><small>${esc(o.t || '')} &middot; ${esc(where(o))}${o.r === 'Exotic' ? ' &middot; exotic' : ''}</small></div><span class="df">${d > 0 ? '+' : ''}${d}</span>${moveable(o) ? `<button class="g" data-f="infmove" data-id="${esc(o.id)}" title="Bring it next to ${esc(x.n)} so you can infuse in game">Move here</button>` : ''}</div>`;
    }).join('');
    return `<div class="pfp"><h5>Infusion finder</h5><div class="pfb" style="margin-bottom:6px"><button class="g${fuelMode ? '' : ' on'}" data-f="infmode" data-v="target">Raise this item</button><button class="g${fuelMode ? ' on' : ''}" data-f="infmode" data-v="fuel">Use this as fuel</button></div>${rows || `<span class="mute">${fuelMode ? 'Nothing lower than this to raise.' : 'Nothing in your inventory or vault has higher power than this.'}</span>`}<p class="mute" style="margin:6px 0 0">Bungie does not let apps press the infuse button. Move the fuel next to the item, then infuse in game.</p></div>`;
  }

  // ---------- wish list maker (inside the item popup) ----------
  function perkCols(x) {
    const v = V(), d = v.det(x.id); if (!d || !d.groups) return [];
    const ps = v.psel();
    const out = [];
    d.groups.forEach((gr, gi) => { if (gr.label !== 'Perks') return; gr.cols.forEach((col, ci) => {
      const k = gi + '-' + ci, on = col.find((p) => p.on) || col[0], si = ps[k] !== undefined ? ps[k] : col.indexOf(on), p = col[si] || on;
      if (p && p.h) out.push({ k, p, opts: col.length });
    }); });
    return out;
  }
  function makerHTML(x) {
    const v = V(), cols = perkCols(x), w = st.wm[x.id] || (st.wm[x.id] = { chk: null, note: '', tag: '' });
    if (!cols.length) return '<div class="pfp"><h5>Wish list maker</h5><span class="mute">Open the item first so its perks load.</span></div>';
    if (!w.chk) { const n = cols.length; w.chk = cols.map((c, i) => (n >= 5 ? i === n - 3 || i === n - 2 : n >= 3 ? i >= n - 2 : true)); }
    const mine = ((st.mine && st.mine[x.h]) || []).length;
    return `<div class="pfp"><h5>Wish list maker</h5><p class="mute" style="margin:0 0 6px">Tick the perks that make this roll. Click a perk in the columns below to try another option, then add it. It goes in "My wish list" and shows a thumbs up right away.</p>
${cols.map((c, i) => `<label class="wmc"><input type="checkbox" data-f="wmchk" data-i="${i}"${w.chk[i] ? ' checked' : ''}> <span>${esc(c.p.n)}</span></label>`).join('')}
<input type="text" id="fxnote" maxlength="200" placeholder="Note (optional), e.g. PvE god roll" value="${esc(w.note)}">
<div class="pfb" style="margin-top:6px"><select id="fxtag" style="width:auto"><option value="">No tag</option><option value="pve"${w.tag === 'pve' ? ' selected' : ''}>PvE</option><option value="pvp"${w.tag === 'pvp' ? ' selected' : ''}>PvP</option><option value="pve,pvp"${w.tag === 'pve,pvp' ? ' selected' : ''}>PvE + PvP</option></select>
<button class="b" data-f="wmadd">&#128077; Add as wish list roll</button><button class="g" data-f="wmtrash">&#128078; Add as trash roll</button></div>
${mine ? `<div class="mute" style="margin-top:4px">You have ${mine} roll${mine === 1 ? '' : 's'} saved for this weapon. Manage them in Settings.</div>` : ''}${st.wmMsg ? `<div class="wmmsg${/^Could not|^Pick/.test(st.wmMsg) ? ' bad' : ''}">${esc(st.wmMsg)}</div>` : ''}</div>`;
  }
  async function wmAdd(x, trash) {
    const v = V(), cols = perkCols(x), w = st.wm[x.id]; if (!w || !w.chk) return;
    const perks = cols.filter((c, i) => w.chk[i]).map((c) => c.p.h);
    try {
      const o = await gt.wlAddRoll({ h: x.h, perks, note: w.note || '', tags: w.tag || '', trash: !!trash, name: x.n });
      st.wmMsg = trash ? 'Saved as a trash roll.' : 'Saved to My wish list.';
      st.mine = (await gt.wlMine()).rolls; v.wlReload(); void o;
    } catch (er) { st.wmMsg = 'Could not save: ' + String((er && er.message) || er).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''); }
    v.pop();
  }

  function pop(x) {
    if (!x || x.ro || x.pm || !x.id || !/^\d+$/.test(x.id)) return '';
    const v = V(), isW = v.WEAPON().has(x.b), open = st.inf === x.id, mk = st.wmOpen === x.id;
    let h = `<div class="pfx"><div class="pfb"><button class="g${open ? ' on' : ''}" data-f="inf" data-id="${esc(x.id)}">Infusion finder</button>${isW ? `<button class="g${mk ? ' on' : ''}" data-f="wm" data-id="${esc(x.id)}">Wish list maker</button>` : ''}</div>`;
    if (open) h += infusionHTML(x);
    if (mk && isW) h += makerHTML(x);
    return h + '</div>';
  }

  // ---------- clicks ----------
  function onClick(e) {
    const v = V(); if (!v || !v.D()) return false;
    const vt = e.target.closest('.vt');
    if (vt && !e.target.closest('.pfx') && (e.ctrlKey || e.metaKey || e.shiftKey || st.bulk)) {
      const o = byId(vt.dataset.id); if (o && !o.ro) { toggleSel(vt.dataset.id); return true; }
    }
    const f = e.target.closest('[data-f]'); if (!f) return false;
    const a = f.dataset.f, x = v.sel() ? byId(v.sel()) : null;
    if (a === 'feedx' || a === 'feedt') {
      if (a === 'feedx') { const D = v.D(); lsSet('gt.feed.' + (D.name || 'x'), []); } else st.feedOpen = !st.feedOpen;
      e.stopPropagation(); v.render(); return true;
    }
    if (a === 'goalt') { lsSet('gt.goals.open', !lsGet('gt.goals.open', true)); e.stopPropagation(); after(); return true; }
    if (a === 'goalm') { st.goalMenu = !st.goalMenu; if (st.goalMenu) goalLoad(true); e.stopPropagation(); after(); return true; }
    if (a === 'goalr') { goalLoad(true); e.stopPropagation(); return true; }
    if (a === 'qpin' || a === 'qunpin') { const k = f.dataset.k, l = QPIN(); lsSet('gt.qpin', l.includes(k) ? l.filter((z) => z !== k) : [...l, k].slice(-20)); e.stopPropagation(); after(); return true; }
    if (a === 'tunpin') { const h = +f.dataset.k; lsSet('gt_tpin', TPIN().filter((z) => z !== h)); if (st.goals) st.goals.recs = st.goals.recs.filter((r) => r.h !== h); e.stopPropagation(); after(); return true; }
    if (a === 'bulk') { st.bulk = !st.bulk; v.render(); return true; }
    if (a === 'bdone') { st.sel.clear(); st.bulk = false; st.msg = ''; v.render(); return true; }
    if (a === 'ball') { if (!v.q()) { st.msg = 'Type a search first, then select the results.'; } else { gear().filter((o) => v.match(o) && !o.ro).forEach((o) => st.sel.add(o.id)); st.msg = ''; } v.render(); return true; }
    if (a === 'btag') { bulkAct('tag', f.dataset.v); return true; }
    if (a === 'block') { bulkAct('lock', true); return true; }
    if (a === 'bunlock') { bulkAct('lock', false); return true; }
    if (a === 'bmove') { bulkAct('move', f.dataset.t); return true; }
    if (a === 'inf') { st.inf = st.inf === f.dataset.id ? null : f.dataset.id; v.pop(); return true; }
    if (a === 'infmode') { st.infMode = f.dataset.v; v.pop(); return true; }
    if (a === 'infmove' && x) {
      const o = byId(f.dataset.id); if (!o) return true;
      const to = x.loc === 'vault' ? (v.D().chars.find((c) => c.cls === o.c || o.c === 3 || o.c === undefined) || v.D().chars[0]).id : x.loc;
      if (!moveable(o)) { v.PMSG('That item is equipped or in the postmaster, so it cannot be moved.'); return true; }
      if (o.loc === to) { v.PMSG('Already there.'); return true; }
      const s = v.slim(o), keep = x.id; Promise.resolve(v.act('move ' + o.n, () => { o.loc = to; }, () => gt.move({ item: s, from: s.loc, to }), true)).then(() => { if (st.inf === keep) v.open(keep); }); return true;
    }
    if (a === 'wm') { st.wmOpen = st.wmOpen === f.dataset.id ? null : f.dataset.id; st.wmMsg = ''; gt.wlMine().then((m) => { st.mine = m.rolls; v.pop(); }).catch(() => {}); v.pop(); return true; }
    if (a === 'wmchk') { const w = st.wm[x && x.id]; if (w && w.chk) { w.chk[+f.dataset.i] = f.checked; } return true; }
    if (a === 'wmadd' && x) { wmAdd(x, false); return true; }
    if (a === 'wmtrash' && x) { wmAdd(x, true); return true; }
    return false;
  }
  // text fields in the maker: remember them across redraws
  document.addEventListener('input', (e) => {
    const v = V(); if (!v || !v.sel()) return;
    const w = st.wm[v.sel()]; if (!w) return;
    if (e.target.id === 'fxnote') w.note = e.target.value; else if (e.target.id === 'fxtag') w.tag = e.target.value;
  });
  document.addEventListener('change', (e) => {
    const v = V(); if (!v) return;
    if (e.target.dataset && e.target.dataset.f === 'wmchk') { const w = st.wm[v.sel()]; if (w && w.chk) w.chk[+e.target.dataset.i] = e.target.checked; }
    if (e.target.id === 'fxtag') { const w = st.wm[v.sel()]; if (w) w.tag = e.target.value; }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && st.sel.size && V() && !V().sel()) { st.sel.clear(); st.bulk = false; V().render(); }
  });

  window.__gtf = { isSel: (id) => st.sel.has(id), onClick, pop, after, goals: () => st.goals, goalLoad: (f) => goalLoad(f), qpins: () => QPIN(), newCount: () => { const D = V() && V().D(); return D ? lsGet('gt.feed.' + (D.name || 'x'), []).length : 0; } };
  // The vault may already have drawn itself before this file loaded: draw again so the new panels appear.
  setTimeout(() => { try { if (V() && V().D()) V().render(); } catch (e) { /* not loaded yet */ } }, 0);

  // ---------- Settings: farming, overlay, my wish list ----------
  const setEl = document.getElementById('settings');
  async function setOverlay(on) { try { st.ovl = !!(await gt.overlay({ on })); document.body.classList.toggle('ovl', st.ovl); } catch (er) { /* ignore */ } drawFx(); }
  function mineRows() {
    const rolls = st.mine || {}, v = V(), pn = (v && v.pn()) || {}, D = v && v.D();
    const rows = [];
    Object.keys(rolls).forEach((h) => rolls[h].forEach((r, i) => {
      const own = D && D.items.find((o) => String(o.h) === h);
      const name = r[4] || (own && own.n) || (h === '*' ? 'Any weapon' : 'Item ' + h);
      rows.push(`<div class="wr"><div class="nm"><b>${r[2] ? '<span class="tr">&#128078;</span> ' : '&#128077; '}${esc(name)}</b><small>${esc(r[0].map((p) => pn[p] || '#' + p).join(', '))}${r[1] ? ' &middot; ' + esc(r[1]) : ''}${r[3] ? ' &middot; ' + esc(r[3]) : ''}</small></div><button class="g" data-fs="delroll" data-h="${esc(h)}" data-i="${i}">Remove</button></div>`);
    }));
    return rows.join('') || '<p class="mute">No rolls yet. Open a weapon in the vault and use <b>Wish list maker</b>.</p>';
  }
  function fxCard() {
    const thr = lsGet('gt.pmwarn', 18), fm = st.farm;
    return `<div class="card fxcard" id="gtfx"><h2>Farming</h2>
<div class="wr"><div class="nm"><b>Farming mode</b><small>${fm.on ? esc(fm.last || 'Watching...') + ' &middot; ' + fm.moved + ' moved' : 'Every 20 seconds, moves unequipped, unlocked weapons and armor to the vault so your inventory never fills. Needs the Vault tab to have loaded once.'}</small></div><button class="${fm.on ? 'g' : 'b'}" data-fs="farm">${fm.on ? 'Stop' : 'Start'}</button></div>
<div class="wr"><div class="nm"><b>Postmaster warning</b><small>Show a banner in the vault when a postmaster reaches this many items (0 turns it off).</small></div><input type="number" min="0" max="21" value="${thr}" data-fs="pmthr" style="width:64px"><label class="wr" style="border:0;padding:0"><input type="checkbox" data-fs="pmnot"${lsGet('gt.pmnotify', true) ? ' checked' : ''}> Desktop alert</label></div></div>
<div class="card fxcard" id="gtfx3"><h2>Reminders</h2>
<div class="wr"><div class="nm"><b>Weekly reset</b><small>A desktop alert when the weekly reset happens (Tuesdays 17:00 UTC), with this week's featured raid and dungeon.</small></div><label class="wr" style="border:0;padding:0"><input type="checkbox" data-fs="remw"${lsGet('gt.rem.w', true) ? ' checked' : ''}> On</label></div>
<div class="wr"><div class="nm"><b>X&ucirc;r</b><small>A desktop alert when X&ucirc;r arrives on Friday.</small></div><label class="wr" style="border:0;padding:0"><input type="checkbox" data-fs="remx"${lsGet('gt.rem.x', true) ? ' checked' : ''}> On</label></div>
<div class="wr"><div class="nm"><b>Daily reset</b><small>A desktop alert at every daily reset (17:00 UTC).</small></div><label class="wr" style="border:0;padding:0"><input type="checkbox" data-fs="remd"${lsGet('gt.rem.d', false) ? ' checked' : ''}> On</label></div></div>
<div class="card fxcard" id="gtfx4"><h2>Backup</h2><p class="mute">Save everything you set up in Pathfinder to a file: loadouts, tags, notes, saved searches, settings, farming targets and your own wish list rolls. Restore it after reinstalling or on another PC. Your Bungie sign-in is never saved in the file.</p>
<p><button class="b" data-fs="bkexp">Save a backup...</button> <button class="g" data-fs="bkimp">Restore from a backup...</button> <span class="mute">${esc(st.bkMsg || '')}</span></p></div>
<div class="card fxcard" id="gtfx2"><h2>My wish list</h2><p class="mute">Rolls you added with the Wish list maker. They work like any other list: thumbs up in the vault, perk badges in the popup.</p>${mineRows()}<p style="margin-top:8px"><button class="g" data-fs="copy">Copy as DIM wish list</button> <button class="g" data-fs="wipe">Remove all my rolls</button> <span class="mute">${esc(st.mineMsg)}</span></p></div>`;
  }
  function drawFx() {
    if (!setEl) return;
    setEl.querySelectorAll('#gtfx, #gtfx2, #gtfx3, #gtfx4').forEach((n) => n.remove());
    const tmp = document.createElement('div'); tmp.innerHTML = fxCard();
    while (tmp.firstChild) setEl.appendChild(tmp.firstChild);
  }
  if (setEl) {
    new MutationObserver(() => { if (!setEl.querySelector('#gtfx')) { drawFx(); } }).observe(setEl, { childList: true });
    setEl.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-fs]'); if (!b) return;
      const a = b.dataset.fs;
      try {
        if (a === 'farm') { const r = await gt.farmSet({ on: !st.farm.on }); st.farm = r; }
        else if (a === 'ovl') { await setOverlay(!st.ovl); return; }
        else if (a === 'delroll') { await gt.wlDelRoll({ h: +b.dataset.h, i: +b.dataset.i }); st.mine = (await gt.wlMine()).rolls; V() && V().wlReload(); }
        else if (a === 'wipe') { if (!confirm('Remove every roll in My wish list?')) return; for (const h of Object.keys(st.mine || {})) { while ((st.mine[h] || []).length) { await gt.wlDelRoll({ h: +h, i: 0 }); st.mine = (await gt.wlMine()).rolls; } } V() && V().wlReload(); }
        else if (a === 'bkexp') {
          const ls = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^gt[._]/.test(k)) ls[k] = localStorage.getItem(k); } } catch (er) { /* storage off */ }
          const r = await gt.bkExport({ ls }); st.bkMsg = r && r.ok ? 'Saved ' + r.file + '.' : '';
        }
        else if (a === 'bkimp') {
          const r = await gt.bkImport(); if (!r || !r.ok) return;
          if (!confirm('Restore this backup? Your current loadouts, tags, notes and settings are replaced by the ones in the file.')) return;
          try { Object.keys(r.ls).forEach((k) => localStorage.setItem(k, r.ls[k])); } catch (er) { st.bkMsg = 'Could not write the restored data.'; drawFx(); return; }
          location.reload(); return;
        }
        else if (a === 'copy') { const t = await gt.wlExport({ id: 'mine' }); await gt.writeClipboard(t); st.mineMsg = 'Copied. Paste it into a .txt file or DIM.'; }
      } catch (er) { st.mineMsg = String((er && er.message) || er).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''); if (/^bk/.test(a)) st.bkMsg = st.mineMsg; if (a === 'farm') st.farm = { ...st.farm, last: st.mineMsg }; }
      drawFx();
    });
    setEl.addEventListener('change', (e) => {
      const b = e.target.closest('[data-fs]'); if (!b) return;
      if (b.dataset.fs === 'pmthr') lsSet('gt.pmwarn', Math.max(0, Math.min(21, parseInt(e.target.value, 10) || 0)));
      if (b.dataset.fs === 'pmnot') lsSet('gt.pmnotify', e.target.checked);
      if (b.dataset.fs === 'remw') lsSet('gt.rem.w', e.target.checked);
      if (b.dataset.fs === 'remx') lsSet('gt.rem.x', e.target.checked);
      if (b.dataset.fs === 'remd') lsSet('gt.rem.d', e.target.checked);
      if (V() && V().D()) V().render();
    });
    // Reset reminders: checked every minute; each reset is announced once (also when the app was closed at the time and opens later that day).
    const remTick = async () => {
      if (typeof lastReset !== 'function') return;
      const now = Date.now(), w = lastReset(true), d = lastReset(false), x = w + 3 * 864e5;
      if (!lsGet('gt.rem.lx', 0)) lsSet('gt.rem.lx', now >= x ? x : x - 7 * 864e5); // Xûr's last visit, so this Friday is announced
      const once = async (key, at, on, title, body) => {
        const last = lsGet(key, 0);
        if (!last) { lsSet(key, at); return; } // first run: nothing to announce yet
        if (last >= at) return;
        lsSet(key, at);
        if (!on || now - at > 12 * 3600e3) return; // too long ago to be useful
        let b = body; if (typeof b === 'function') { try { b = await b(); } catch (er) { b = ''; } }
        gt.notify({ title, body: String(b || ' ').slice(0, 190) }).catch(() => {});
      };
      await once('gt.rem.lw', w, lsGet('gt.rem.w', true), 'Weekly reset', async () => { const r = await gt.actRot({}); const f = ((r && r.feat) || []).map((q) => q.n).slice(0, 3); return f.length ? 'Featured this week: ' + f.join(', ') : 'New weekly rotations are live.'; });
      if (now >= x) await once('gt.rem.lx', x, lsGet('gt.rem.x', true), 'Xûr has arrived', 'Open Activity > Xûr to see what he is selling this week.');
      if (d !== w) await once('gt.rem.ld', d, lsGet('gt.rem.d', false), 'Daily reset', 'New daily rotations are live.');
    };
    setTimeout(remTick, 20000); setInterval(remTick, 60000);
    gt.onFarm((m) => { st.farm = m; drawFx(); });
    gt.farmGet().then((m) => { st.farm = m; drawFx(); }).catch(() => {});
    gt.wlMine().then((m) => { st.mine = m.rolls; drawFx(); }).catch(() => {});
    drawFx();
  }
})();
