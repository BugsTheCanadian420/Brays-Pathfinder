// Loadouts tab, laid out and behaving like DIM's Loadouts page:
//  - sidebar with your characters, sort, Create / Import / Optimizer, and a filter + name list
//  - IN-GAME LOADOUTS grid (click one for Equip, Prepare Equip, Edit Identifiers, Save as Loadout, Share, Clear)
//  - LOADOUTS: an "Equipped" card, then your saved loadouts (Apply, Edit, Edit Copy, Share, delete)
//  - a bottom-sheet editor with undo/redo, fill-in, randomize, notes with #hashtags and artifact perks
// Saved loadouts live in this app only (localStorage "gt_dimlo2"). Share codes start with GTL1:.
(() => {
  'use strict';
  const V = window.__gtv, sec = document.getElementById('loadouts'), gt = window.gt;
  window.__gtl = { render() {}, reset() {} };
  if (!V || !sec || !gt) return;
  const esc = V.esc, g = (id) => document.getElementById(id), CL = V.CL();
  // Each Bungie account has its own saved loadouts (the first account keeps the original list).
  const KEY = () => { let ns = ''; try { ns = localStorage.getItem('gt_acct_ns') || ''; } catch (e) { ns = ''; } return 'gt_dimlo2' + ns; };
  const KIN = 1498876634, ENE = 2465295065, PWR = 953998645, HEL = 3448274439, GAU = 3551918588, CHE = 14239492, LEG = 20886954, CLS = 1585787867;
  const GHO = 4023194814, SPA = 2025709351, SHP = 284967655, SUB = 3284755031;
  const WB = [KIN, ENE, PWR], AB = [HEL, GAU, CHE, LEG, CLS], GB = [GHO, SPA, SHP], ALLB = [SUB, ...WB, ...AB, ...GB];
  const STL = [['W', 'Weapons'], ['H', 'Health'], ['C', 'Class'], ['G', 'Grenade'], ['S', 'Super'], ['M', 'Melee']];
  const CAPX = /masterwork|tuning|catalyst|shader|ornament/i;
  const BN = { [SUB]: 'Subclass', [KIN]: 'Kinetic', [ENE]: 'Energy', [PWR]: 'Power', [HEL]: 'Helmet', [GAU]: 'Gauntlets', [CHE]: 'Chest', [LEG]: 'Legs', [CLS]: 'Class item', [GHO]: 'Ghost', [SPA]: 'Sparrow', [SHP]: 'Ship' };
  const SECS = [['Subclass', [SUB]], ['Weapons', WB], ['Armor', AB], ['General', GB]];

  // ---------------- data ----------------
  const int = (v, d) => (Number.isFinite(+v) ? Math.trunc(+v) : (d || 0));
  const sid = (v) => (/^\d{1,20}$/.test(String(v)) ? String(v) : '');
  const rawIcon = (p) => (typeof p === 'string' && /^\/[\w./%-]{1,240}$/.test(p) ? p : '');
  const newId = () => 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function norm(l) {
    if (!l || typeof l !== 'object') return null;
    const it = (Array.isArray(l.it) ? l.it : []).slice(0, 24).map((q) => {
      if (!q || typeof q !== 'object' || !(int(q.h) > 0)) return null;
      return {
        id: sid(q.id), h: int(q.h), b: int(q.b), n: String(q.n || '').slice(0, 80), i: rawIcon(q.i), e: q.e === 0 ? 0 : 1,
        m: (Array.isArray(q.m) ? q.m : []).slice(0, 40).map((p) => (Array.isArray(p) && int(p[1]) > 0 ? [int(p[0]), int(p[1]), rawIcon(p[2]), String(p[3] || '').slice(0, 60)] : null)).filter(Boolean),
        cs: (Array.isArray(q.cs) ? q.cs : []).slice(0, 6).map((p) => (Array.isArray(p) && int(p[1]) > 0 ? [int(p[0]), int(p[1]), rawIcon(p[2]), String(p[3] || '').slice(0, 60)] : null)).filter(Boolean),
      };
    }).filter(Boolean);
    const seen = new Set(), items = it.filter((q) => { if (seen.has(q.b) && q.b) return false; seen.add(q.b); return true; });
    const c = int(l.c, 3);
    return {
      id: /^[\w-]{1,32}$/.test(String(l.id || '')) ? String(l.id) : newId(), n: String(l.n || '').slice(0, 80), c: c >= 0 && c <= 3 ? c : 3, o: String(l.o || '').slice(0, 2000),
      it: items, mv: l.mv ? 1 : 0, t: int(l.t, Date.now()), k: int(l.k, Date.now()),
      ai: l.ai && int(l.ai.h) > 0 ? { h: int(l.ai.h), n: String(l.ai.n || '').slice(0, 60), i: rawIcon(l.ai.i) } : null,
      a: (Array.isArray(l.a) ? l.a : []).slice(0, 20).map((p) => (Array.isArray(p) && int(p[0]) > 0 ? [int(p[0]), String(p[1] || '').slice(0, 60), rawIcon(p[2])] : null)).filter(Boolean),
      fm: (Array.isArray(l.fm) ? l.fm : []).slice(0, 100).map((p) => (Array.isArray(p) && int(p[0]) > 0 ? [int(p[0]), String(p[1] || '').slice(0, 60), rawIcon(p[2]), String(p[3] || '').slice(0, 80), int(p[4]) > 0 ? int(p[4]) : 0] : null)).filter(Boolean),
    };
  }
  let LS = null;
  const all = () => { if (!LS) { try { const a = JSON.parse(localStorage.getItem(KEY())); LS = Array.isArray(a) ? a.map(norm).filter(Boolean) : []; } catch (e) { LS = []; } } return LS; };
  const save = () => { try { localStorage.setItem(KEY(), JSON.stringify(all())); } catch (e) { /* storage unavailable */ } };
  const b64e = (s) => { const u = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < u.length; i++) o += String.fromCharCode(u[i]); return btoa(o); };
  const b64d = (b) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new TextDecoder().decode(u); };
  const codeOf = (l) => 'GTL1:' + b64e(JSON.stringify({ v: 1, n: l.n, c: l.c, o: l.o, a: l.a, ai: l.ai, fm: l.fm, mv: l.mv, it: l.it.map((q) => ({ h: q.h, b: q.b, n: q.n, i: q.i, e: q.e, m: q.m })) }));
  function decode(s) {
    const m = /GTL1:([A-Za-z0-9+/=]+)/.exec(String(s || '')); if (!m) throw new Error('That is not a loadout code. It should start with GTL1:');
    let o; try { o = JSON.parse(b64d(m[1])); } catch (e) { throw new Error('That loadout code is damaged. Ask for it again.'); }
    const l = norm({ ...o, id: '', t: Date.now(), k: Date.now() });
    if (!l || !l.it.length) throw new Error('That loadout has no items in it.');
    return l;
  }

  // ---------------- state ----------------
  let CH = null, FILT = '', ed = null, mod = null, tT = 0;
  let SORT = 'time'; try { SORT = localStorage.getItem('gt_dlsort') === 'name' ? 'name' : 'time'; } catch (e) { /* default */ }
  let AR, ARCH = null, ARLOAD = false, ARERR = '', AP = null, apq = '', ARMSG = '', LD = null, PLC = {};
  const D0 = () => V.D();
  const items = () => { const D = D0(); return D ? D.items.concat(D.gen || []) : []; };
  const eqOf = (cid) => items().filter((x) => x.loc === cid && x.e && !x.pm && ALLB.includes(x.b)).sort((a, b) => ALLB.indexOf(a.b) - ALLB.indexOf(b.b));
  const isEx = (x) => x.r === 'Exotic';

  // ---------------- finding the live items for a loadout ----------------
  function resolve(l) {
    const all1 = items(), byid = new Map(all1.map((x) => [x.id, x])), used = new Set(), out = [];
    l.it.forEach((en) => { const x = en.id && byid.get(en.id); if (x && !x.pm) { used.add(x.id); out.push({ en, x }); } else out.push({ en, x: null }); });
    out.forEach((r) => {
      if (r.x) return;
      const cand = all1.filter((o) => o.h === r.en.h && !o.pm && !used.has(o.id) && (l.c === 3 || o.c === undefined || o.c === 3 || o.c === l.c));
      cand.sort((a, b) => (b.p || 0) - (a.p || 0));
      if (cand[0]) { r.x = cand[0]; used.add(cand[0].id); }
    });
    return out;
  }
  const missOf = (l) => resolve(l).filter((r) => !r.x);
  // The character a loadout is for: the one on screen if it is the right class, otherwise the first of that class.
  const fillChar = (d) => { const cs = V.chars(), cur = V.ent(CH); if (d.c === 3 || (cur && cur.cls === d.c)) return CH; const o = cs.find((q) => q.cls === d.c); return o ? o.id : CH; };
  const catLabel = (c) => (/super/i.test(c) ? 'Super' : /class/i.test(c) ? 'Class ability' : /movement|jump/i.test(c) ? 'Jump' : /melee/i.test(c) ? 'Melee' : /grenade/i.test(c) ? 'Grenade' : /aspect/i.test(c) ? 'Aspect' : /fragment/i.test(c) ? 'Fragment' : 'Ability');

  // ---------------- toast ----------------
  function toast(msg, o) {
    o = o || {};
    let el = g('dlt'); if (!el) { el = document.createElement('div'); el.id = 'dlt'; document.body.appendChild(el); el.onclick = (e) => { const u = e.target.closest('[data-undo]'); el.style.display = 'none'; if (u) undoLo(u.dataset.undo); }; }
    const ic = (o.icons || []).map((i) => V.icon(i)).filter(Boolean);
    el.className = o.bad ? 'bad' : '';
    el.innerHTML = `<b>${esc(msg)}</b>${ic.length ? `<div class="dl-ti">${ic.map((i) => `<img src="${esc(i)}" alt="">`).join('')}</div>` : ''}${(o.lines || []).map((t) => `<div class="dl-tl">${esc(t)}</div>`).join('')}${o.undo ? `<button class="g dl-undo" data-undo="${esc(o.undo)}">&#8630; Undo</button>` : ''}`;
    el.style.display = 'block'; clearTimeout(tT);
    if (!o.sticky) tT = setTimeout(() => { el.style.display = 'none'; }, o.bad || o.undo ? 10000 : 5000);
  }
  // Puts back what the character wore before the last loadout.
  async function undoLo(cid) {
    toast('Putting your gear back...', { sticky: 1 });
    try {
      const r = await gt.loUndo({ char: cid });
      try { await V.sync(); } catch (e) { /* the next refresh shows it */ }
      const w = ((r && r.failed) || []).map((f) => (f.n || 'An item') + ': ' + V.clean(f.why));
      toast(w.length ? 'Undone, with problems' : 'Back to what you had on', { lines: w.slice(0, 5), bad: w.length > 0 });
    } catch (e) { toast('Could not undo: ' + V.clean(e), { bad: 1 }); }
  }

  // ---------------- artifact (the seasonal mod picker) ----------------
  const ARC = {}, ARD = {}, PL = {};
  let ARL = null;
  // The list of artifact items each character owns, and the perk slots of one item, are fetched once and kept.
  async function artList(force) { if (!force && ARL) return ARL; const r = await gt.artGet({ all: 1 }); ARL = (r && r.by) || {}; return ARL; }
  async function artDetail(it, ch, force) {
    if (!force && ARD[it.id]) return ARD[it.id];
    const r = await gt.artItem({ id: it.id, h: it.h, ch }); ARD[it.id] = r; Object.assign(PL, r.plugs || {}); return r;
  }
  const artItemsOf = (ch) => ((ARL && ARL[ch]) || {}).items || [];
  // The artifact equipped on a character: its perks are what the Loadouts tab shows for that character.
  async function artLoad(force, ch) {
    const want = ch || CH || '';
    if (force) { ARL = null; Object.keys(ARC).forEach((k) => delete ARC[k]); Object.keys(ARD).forEach((k) => delete ARD[k]); }
    if (!force && ARC[want]) { AR = ARC[want].v; ARERR = ARC[want].e; ARCH = want; return; }
    if (ARLOAD) return;
    ARLOAD = true; ARERR = '';
    try {
      await artList(false);
      const items = artItemsOf(want), eq = items.find((x) => x.eq) || items[0];
      ARC[want] = eq ? { v: await artDetail(eq, want, false), e: '' } : { v: { none: 1 }, e: '' };
    } catch (e) { ARC[want] = { v: null, e: V.clean(e) }; }
    ARLOAD = false; AR = ARC[want].v; ARERR = ARC[want].e; ARCH = want; render(); drawEd(); renderAP();
    // Quietly get the other characters ready too, so switching characters is instant.
    (async () => { for (const c of V.chars()) { if (ARC[c.id]) continue; try { const its = artItemsOf(c.id), q = its.find((x) => x.eq) || its[0]; ARC[c.id] = q ? { v: await artDetail(q, c.id, false), e: '' } : { v: { none: 1 }, e: '' }; } catch (e) { ARC[c.id] = { v: null, e: V.clean(e) }; } } })();
  }
  const artSel = () => { if (ARC[CH]) { AR = ARC[CH].v; ARERR = ARC[CH].e; ARCH = CH; } else { AR = undefined; ARCH = null; ARERR = ''; artLoad(); } };
  const curPerks = () => (AR && AR.socks ? AR.socks.map((q) => q.cur) : []);
  const plugOf = (h) => PL[h] || (AR && AR.plugs && AR.plugs[h]) || null;
  const aIcon = (p) => `<span class="ap" title="${esc((p.n || '') + (p.d ? '\n' + p.d : ''))}">${p.i ? `<img src="${esc(V.icon(p.i))}" alt="">` : ''}</span>`;
  const aRow = (picks) => picks.map((q) => { const p = plugOf(q) || {}; return aIcon({ n: p.n || '', d: p.d || '', i: p.i || '' }); }).join('');
  const aRowL = (a) => a.map((q) => { const p = plugOf(q[0]); return aIcon({ n: (p && p.n) || q[1], d: (p && p.d) || '', i: (p && p.i) || q[2] }); }).join('');
  const artOk = () => AR && !AR.none && AR.socks && AR.socks.length;
  const permk = (h) => { const p = plugOf(h) || {}; return [h, String(p.n || '').slice(0, 60), rawIcon(p.i)]; };
  const itemOf = (it) => ({ h: it.h, n: it.n || '', i: rawIcon(it.i) });
  // DIM style: "Customize artifact" lists your artifacts, pick one, then pick its perks.
  async function artEd(a) {
    if (a === 'artcur') {
      if (!artOk()) { ed.msg = 'Reading your artifact from Bungie...'; drawEd(); await artLoad(true); }
      if (!ed) return;
      if (!artOk()) { ed.msg = AR && AR.item && !AR.none ? 'Bungie reports no perks on your ' + AR.item.n + ' for this character.' : 'Could not read your artifact' + (ARERR ? ': ' + ARERR : '.'); drawEd(); return; }
      ed.msg = ''; const it = AR.item; mut((d) => { d.ai = itemOf(it); d.a = curPerks().map(permk); });
      return;
    }
    ed.msg = 'Reading your artifacts from Bungie...'; drawEd();
    try { await artList(false); } catch (e) { ed.msg = 'Could not read your artifacts: ' + V.clean(e); drawEd(); return; }
    if (!ed) return;
    const cc = fillChar(ed.d), items = artItemsOf(cc);
    if (!items.length) { ed.msg = 'Bungie did not list any artifacts on this character.'; drawEd(); return; }
    ed.msg = ''; ARMSG = ''; apq = ''; AP = { stage: 'list', ch: cc, items, picks: [] }; renderAP(); drawEd();
  }
  async function apPickItem(it) {
    ARMSG = 'Reading ' + (it.n || 'artifact') + '...'; renderAP();
    try {
      const det = await artDetail(it, AP.ch, false);
      const same = ed && ed.d.ai && ed.d.ai.h === it.h;
      AP = { stage: 'pick', ch: AP.ch, items: AP.items, it, det, picks: same ? ed.d.a.map((q) => q[0]) : det.socks.map((q) => q.cur).filter(Boolean) }; ARMSG = '';
    } catch (e) { ARMSG = 'Failed: ' + V.clean(e); }
    renderAP();
  }
  function renderAP() {
    let box = g('apm');
    if (!AP) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div'); box.id = 'apm'; document.body.appendChild(box); box.onclick = apClick;
      box.oninput = (e) => { if (e.target.id === 'apq') { apq = e.target.value.toLowerCase(); renderAP(); const i = g('apq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } };
    }
    if (AP.stage === 'list') {
      box.innerHTML = `<div class="aph"><b>Add artifacts</b><button data-x="1">&#10005;</button></div><div class="apq"><span class="mute">${esc(ARMSG)}</span></div><div class="apg apl">${AP.items.map((it, k) => `<div class="apc" data-k="${k}" title="${esc(it.n)}"><span class="ap">${it.i ? `<img src="${esc(V.icon(it.i))}" alt="">` : ''}</span><b>${esc(it.n)}${it.eq ? ' <small class="mute">(equipped)</small>' : ''}</b></div>`).join('')}</div>`;
      return;
    }
    const det = AP.det, n = det.socks.length, pk = AP.picks;
    const allp = [...new Set(det.socks.flatMap((q) => q.opts))].filter((h) => { const p = plugOf(h); return p && !/^empty\b/i.test(p.n || ''); });
    const cards = allp.filter((h) => { const p = plugOf(h); return p && (!apq || (p.n + ' ' + p.d).toLowerCase().includes(apq)); }).map((h) => { const p = plugOf(h); return `<div class="apc${pk.includes(h) ? ' on' : ''}" data-h="${h}"><span class="ap">${p.i ? `<img src="${esc(V.icon(p.i))}" alt="">` : ''}</span><b>${esc(p.n)}</b><span class="d">${esc(p.d)}</span></div>`; }).join('');
    box.innerHTML = `<div class="aph"><b>${esc(AP.it.n)} options</b><button data-x="1">&#10005;</button></div><div class="apq"><input id="apq" placeholder="Search ${esc(AP.it.n)} options" value="${esc(apq)}"></div><div class="apt">Artifact perk (${pk.length}/${n})</div><div class="apg">${cards}</div><div class="apb"><button class="g" data-ap="back">Back</button><div class="arow">${aRow(pk)}</div><span id="apmsg" class="mute">${esc(ARMSG)}</span><span style="flex:1"></span><button class="b" data-ap="keep">Use these perks</button></div>`;
  }
  async function apClick(e) {
    const t = e.target;
    if (t.closest('[data-x]')) { AP = null; ARMSG = ''; renderAP(); return; }
    const c = t.closest('.apc');
    if (c && AP && AP.stage === 'list') { const it = AP.items[+c.dataset.k]; if (it) apPickItem(it); return; }
    if (c && AP) { const h = +c.dataset.h, n = AP.det.socks.length; if (AP.picks.includes(h)) AP.picks = AP.picks.filter((x) => x !== h); else { if (AP.picks.length >= n) { const gone = AP.picks.shift(), gp = plugOf(gone) || {}; ARMSG = 'Swapped out ' + (gp.n || 'a perk') + '.'; } else ARMSG = ''; AP.picks.push(h); } renderAP(); return; }
    const b = t.closest('[data-ap]'); if (!b || !AP) return;
    if (b.dataset.ap === 'back') { AP = { stage: 'list', ch: AP.ch, items: AP.items, picks: [] }; ARMSG = ''; renderAP(); }
    else if (b.dataset.ap === 'keep') {
      const picks = AP.picks.slice(), it = AP.it; AP = null; ARMSG = ''; renderAP();
      if (ed) mut((d) => { d.ai = itemOf(it); d.a = picks.map(permk); });
    }
  }

  // ---------------- mods and subclass settings, read from and written to the game ----------------
  async function capture(x) {
    if (!x || !(AB.includes(x.b) || x.b === SUB) || !/^\d+$/.test(String(x.id))) return [];
    let d; try { d = await gt.itemDetail({ id: x.id, h: x.h }); } catch (e) { return null; }
    const out = [];
    ((d && d.groups) || []).forEach((gr) => {
      if (x.b !== SUB && gr.label !== 'Mods') return;
      (gr.cols || []).forEach((col) => {
        const on = col.find((p) => p.on);
        if (on && !CAPX.test(on.c || '') && int(on.si, -1) >= 0 && int(on.h) > 0) out.push([int(on.si), int(on.h), rawIcon(on.i), String(on.n || '').slice(0, 60)]);
      });
    });
    return out;
  }
  // Ornaments and shaders on a weapon or armor piece, saved with the loadout when you ask for its look.
  async function capCos(x) {
    if (!x || !(WB.includes(x.b) || AB.includes(x.b)) || !/^\d+$/.test(String(x.id))) return [];
    let d; try { d = await gt.itemDetail({ id: x.id, h: x.h }); } catch (e) { return null; }
    return ((d && d.cos) || []).filter((p) => int(p.si, -1) >= 0 && int(p.h) > 0 && /shader|skin|ornament/i.test(p.c || '')).map((p) => [int(p.si), int(p.h), rawIcon(p.i), String(p.n || '').slice(0, 60)]);
  }
  async function putPlugs(en, x, cid, warns, cos) {
    if (!en.m || !en.m.length) return 0;
    const cur = cos ? await capCos(x) : await capture(x), have = new Map((cur || []).map((p) => [p[0], p[1]]));
    // Like DIM: a plug that already sits in ANOTHER socket (a fragment, an aspect, a mod) cannot be inserted twice, so sockets that
    // hold a plug wanted elsewhere are changed first, and a plug already in a socket nobody else wants counts as done.
    let ops = en.m.filter((p) => have.get(p[0]) !== p[1]), n = 0;
    const target = new Set(en.m.map((p) => p[0]));
    for (let pass = 0; pass < 3 && ops.length; pass++) {
      const later = [];
      for (const p of ops) {
        const elsewhere = [...have.entries()].find(([si, h]) => h === p[1] && si !== p[0]);
        if (elsewhere) { if (target.has(elsewhere[0]) && pass < 2) { later.push(p); continue; } if (!target.has(elsewhere[0])) continue; }
        try { await gt.itemPlug({ id: x.id, char: cid, socket: p[0], plug: p[1] }); have.set(p[0], p[1]); n++; }
        catch (e) { warns.push((p[3] || 'A mod') + ' on ' + x.n + ': ' + V.clean(e)); }
      }
      ops = later;
    }
    return n;
  }

  // Armor mods that came from a DIM link are just a list. Put each one in a free socket of the right kind on the armor you have equipped.
  async function placeMods(pieces, mods, cid, warns) {
    const slots = [];
    for (const x of pieces) {
      let ss = []; try { ss = await gt.itemSlots({ id: x.id }); } catch (e) { warns.push('Could not read the mod sockets of ' + x.n + '.'); continue; }
      ss.forEach((q) => slots.push({ x, si: q.si, cur: q.cur, cat: q.cat, used: false }));
    }
    if (!slots.length) { if (mods.length) warns.push('No armor mod sockets were found.'); return 0; }
    const rest = []; let n = 0;
    const fits = (q, m) => !m[4] || q.x.b === m[4];
    mods.forEach((m) => { const s = slots.find((q) => !q.used && q.cur === m[0] && fits(q, m)); if (s) s.used = true; else rest.push(m); });
    for (const m of rest) {
      const s = slots.find((q) => !q.used && fits(q, m) && q.cat && q.cat === m[3]) || slots.find((q) => !q.used && fits(q, m) && q.cat && /general/i.test(q.cat) && /general/i.test(m[3] || ''));
      if (!s) { warns.push((m[1] || 'A mod') + ': no free ' + (m[3] ? 'matching ' : '') + 'socket.'); continue; }
      s.used = true;
      try { await gt.itemPlug({ id: s.x.id, char: cid, socket: s.si, plug: m[0] }); n++; }
      catch (e) { warns.push((m[1] || 'A mod') + ' on ' + s.x.n + ': ' + V.clean(e)); }
    }
    return n;
  }

  // ---------------- applying a loadout ----------------
  async function applyL(l, cid) {
    const c = V.ent(cid); if (!c) return;
    if (l.c < 3 && c.cls !== l.c) { toast('"' + (l.n || 'This loadout') + '" is a ' + CL[l.c] + ' loadout.', { bad: 1 }); return; }
    const r = resolve(l), miss = r.filter((q) => !q.x).length;
    const live = r.filter((q) => q.x && !(AB.includes(q.x.b) && q.x.c !== undefined && q.x.c !== 3 && q.x.c !== c.cls));
    if (!live.length) { toast('None of the items in this loadout could be found.', { bad: 1 }); return; }
    const eq = live.filter((q) => q.en.e !== 0).slice(0, 20), carry = live.filter((q) => q.en.e === 0);
    const keep = new Set(live.map((q) => q.x.id));
    // Gear that is equipped on another character cannot be moved, so a stand-in gets equipped there first (a non-exotic from that
    // character if possible, otherwise from the vault).
    const swaps = [], taken = new Set(keep);
    eq.concat(carry).forEach(({ x }) => {
      if (!x.e || x.loc === cid || x.loc === 'vault') return;
      const oc = V.ent(x.loc); if (!oc) return;
      const pool = items().filter((o) => o.b === x.b && o.id !== x.id && !o.e && !o.pm && !o.ro && !taken.has(o.id) && (o.loc === x.loc || o.loc === 'vault') && (!AB.includes(o.b) || o.c === undefined || o.c === 3 || o.c === oc.cls));
      pool.sort((a, b) => ((a.r === 'Exotic') - (b.r === 'Exotic')) || ((a.loc === x.loc ? 0 : 1) - (b.loc === x.loc ? 0 : 1)) || ((b.p || 0) - (a.p || 0)));
      if (pool[0]) { taken.add(pool[0].id); swaps.push({ rep: pool[0], x, other: x.loc }); }
    });
    const snaps = eq.map((q) => V.slim(q.x)), csnaps = carry.map((q) => V.slim(q.x)), sw = swaps.map((s) => ({ it: V.slim(s.rep), to: s.other }));
    const away = l.mv ? items().filter((o) => o.loc === cid && !o.e && !o.pm && !o.ro && !keep.has(o.id) && (V.WEAPON().has(o.b) || V.ARMOR().has(o.b))) : [];
    const asnaps = away.map((o) => V.slim(o));
    const warns = []; let ok = false, err = '', canUndo = false;
    toast('Applying ' + (l.n || 'loadout') + '...', { sticky: 1, icons: live.map((q) => q.x.i) });
    await V.act('apply ' + (l.n || 'loadout') + (miss ? ' (' + miss + ' missing items skipped)' : ''), () => {
      swaps.forEach(({ rep, x, other }) => { items().forEach((o) => { if (o.loc === other && o.b === rep.b && o.e) o.e = 0; }); x.e = 0; rep.loc = other; rep.e = 1; });
      eq.forEach(({ x }) => { items().forEach((o) => { if (o !== x && o.loc === cid && o.b === x.b && o.e) o.e = 0; }); x.loc = cid; x.e = 1; });
      carry.forEach(({ x }) => { x.loc = cid; x.e = 0; });
      away.forEach((o) => { o.loc = 'vault'; });
    }, async () => {
      try {
        for (const s of asnaps) { try { await gt.move({ item: s, from: s.loc, to: 'vault' }); } catch (e) { warns.push('Could not move ' + s.n + ' out of the way: ' + V.clean(e)); } }
        const part = { revert: [] };
        if (snaps.length || csnaps.length) {
          const res = await gt.applyLoadout({ items: snaps, carry: csnaps, swaps: sw, char: cid }); canUndo = !!(res && res.undo);
          ((res && res.failed) || []).forEach((f) => { warns.push((f.n || 'An item') + ': ' + V.clean(f.why)); part.revert.push(f.id); });
        }
        const bad = new Set(part.revert), good = live.filter((q) => !bad.has(q.x.id));
        for (const q of good) if (q.en.m && q.en.m.length) await putPlugs(q.en, q.x, cid, warns);
        for (const q of good) if (q.en.cs && q.en.cs.length) await putPlugs({ m: q.en.cs }, q.x, cid, warns, true);
        if (l.fm && l.fm.length) await placeMods(good.filter((q) => AB.includes(q.x.b) && q.en.e !== 0).map((q) => q.x), l.fm, cid, warns);
        if (l.a && l.a.length) {
          try {
            await artList(false);
            const its = artItemsOf(cid), mine = (l.ai && its.find((x) => x.h === l.ai.h)) || (!l.ai && (its.find((x) => x.eq) || its[0]));
            if (!mine) warns.push('Artifact: ' + ((l.ai && l.ai.n) || 'the artifact') + ' was not found on this character.');
            else {
              await gt.artApply({ id: mine.id, h: mine.h, ch: cid, picks: l.a.map((p) => p[0]), equip: mine.eq ? 0 : 1 });
              delete ARD[mine.id]; delete ARC[cid]; its.forEach((x) => { x.eq = x.id === mine.id ? 1 : 0; });
            }
          } catch (e) { warns.push('Artifact: ' + V.clean(e)); }
        }
        ok = true;
        return part;
      } catch (e) { err = V.clean(e); throw e; }
    }, true);
    if (ok) {
      const lines = warns.slice(0, 5).concat(miss ? [miss + ' item' + (miss > 1 ? 's' : '') + ' could not be found.'] : []);
      toast(warns.length || miss ? 'Loadout applied, with problems' : 'Loadout succeeded', { icons: live.map((q) => q.x.i), lines, bad: warns.length > 0, undo: canUndo ? cid : '' });
    } else toast(err ? 'Loadout failed: ' + err : 'Loadout did not run.', { bad: 1 });
  }


  // ---------------- loadout as a picture (to post on Discord and so on) ----------------
  const IMSTL = ['Weapons', 'Health', 'Class', 'Grenade', 'Super', 'Melee'], IMSTC = ['#9aa0a8', '#6fbf73', '#e0b64a', '#e8a53a', '#c77dff', '#5d9ce0'];
  const IMRC = { Exotic: '#ceae33', Legendary: '#522f65', Rare: '#5076a3', Uncommon: '#366f42', Common: '#c3bcb4' };
  async function loImage(l) {
    const res = resolve(l), by = (b) => res.find((r) => r.en.b === b) || null, c = l.c < 3 ? CL[l.c] : 'Any class';
    const sub = by(SUB), weps = WB.map(by), arms = AB.map(by);
    // Mods by where they go: each armor piece's own mods, plus loadout mods that name a piece; the rest go in "Any piece".
    const mk = (p) => (p && p[2] ? { i: p[2], n: p[1] || '' } : null);
    const modsBy = AB.map((b) => [...l.it.filter((q) => q.b === b).flatMap((q) => (q.m || []).map(mk)), ...(l.fm || []).filter((p) => +p[4] === b).map(mk)].filter(Boolean).slice(0, 12));
    const anyMods = (l.fm || []).filter((p) => !p[4] || !AB.includes(+p[4])).map(mk).filter(Boolean).slice(0, 12);
    const hasMods = modsBy.some((m) => m.length) || anyMods.length > 0;
    const subPl = sub && sub.en.m ? sub.en.m.map(mk).filter(Boolean).slice(0, 16) : [];
    const ic = (r) => (r && (r.x ? rawIcon(r.x.i) : r.en.i)) || '';
    const artPk = (l.a || []).map((p) => p[2]).filter(Boolean).slice(0, 14), artIc = (l.ai && l.ai.i) || '', hasArt = !!(artIc || artPk.length);
    const paths = [ic(sub), ...weps.map(ic), ...arms.map(ic), ...modsBy.flat().map((m) => m.i), ...anyMods.map((m) => m.i), ...subPl.map((m) => m.i), artIc, ...artPk].filter(Boolean);
    let D = {}; try { D = await gt.imgFetch({ p: [...new Set(paths)] }); } catch (e) { /* drawn without icons */ }
    const imgs = {}; await Promise.all(Object.entries(D).map(([k, v]) => new Promise((ok) => { const im = new Image(); im.onload = () => { imgs[k] = im; ok(); }; im.onerror = ok; im.src = v; })));
    // What kind of armor each piece is: its archetype (Bulwark, Brawler...) and its set. Looked up in parallel; the picture is still drawn if it fails.
    const AD = arms.map(() => ({})), X = window.__gtx;
    await Promise.all(arms.map(async (r, i) => { if (!r || !r.x || !X || !X.detail) return; try { const d = await Promise.race([X.detail(r.x), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]); AD[i] = { a: (d.arche && d.arche.n) || '', s: (d.set && d.set.n) || '' }; } catch (e) { /* no armor details */ } }));
    const st = [0, 0, 0, 0, 0, 0]; let hasSt = false; arms.forEach((r) => { if (r && r.x && r.x.st) { hasSt = true; r.x.st.forEach((v, i) => { st[i] += v || 0; }); } });
    // Layout first (the picture grows to fit the sections it has), then draw.
    const W = 1200, M = 32, IW = W - M * 2, GAP = 16;
    const SUBSZ = 54, SUBSTEP = 62, subPer = Math.floor((IW - 32) / SUBSTEP), subRows = Math.ceil(subPl.length / subPer);
    const cols = anyMods.length ? 6 : 5, colW = IW / cols, MSZ = 46, MSTEP = 54, mPer = Math.max(1, Math.floor((colW - 24) / MSTEP));
    const mRows = Math.max(1, ...[...modsBy, anyMods].map((m) => Math.ceil(m.length / mPer)));
    let y = 196;
    const L = { top: y };
    y += 400 + GAP;
    if (subPl.length) { L.sub = y; y += 50 + subRows * SUBSTEP + 10 + GAP; }
    if (hasMods) { L.mods = y; y += 108 + mRows * MSTEP + 8 + GAP; }
    if (hasArt) { L.art = y; y += 104 + GAP; }
    const H = y + 24, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g2 = cv.getContext('2d');
    // Background: dark base, a glow in the class colour, a faded subclass emblem, a fine pattern and a vignette.
    const ACC = [['#5d8ae6', '#2c4a9a'], ['#45c48d', '#1d6f4d'], ['#e8c25a', '#8a6a1c']][l.c] || ['#a98bff', '#4b3a99'];
    const bg = g2.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#171a22'); bg.addColorStop(.55, '#101218'); bg.addColorStop(1, '#0a0b0f'); g2.fillStyle = bg; g2.fillRect(0, 0, W, H);
    const glow = (x, y1, r, col, a) => { const q = g2.createRadialGradient(x, y1, 0, x, y1, r); q.addColorStop(0, col + a); q.addColorStop(1, col + '00'); g2.fillStyle = q; g2.fillRect(0, 0, W, H); };
    glow(W * .88, -40, 760, ACC[0], '38'); glow(-60, H + 40, 640, ACC[1], '55'); glow(W * .5, H * .55, 520, ACC[1], '16');
    if (sub && imgs[ic(sub)]) { g2.save(); g2.globalAlpha = .07; g2.drawImage(imgs[ic(sub)], W - 520, -70, 560, 560); g2.restore(); }
    g2.save(); g2.strokeStyle = 'rgba(255,255,255,.035)'; g2.lineWidth = 1; for (let x = -H; x < W; x += 26) { g2.beginPath(); g2.moveTo(x, H); g2.lineTo(x + H, 0); g2.stroke(); } g2.restore();
    const vg = g2.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g2.fillStyle = vg; g2.fillRect(0, 0, W, H);
    const bar = g2.createLinearGradient(0, 0, W, 0); bar.addColorStop(0, ACC[0]); bar.addColorStop(1, ACC[1] + '00'); g2.fillStyle = bar; g2.fillRect(0, 0, W, 5);
    const rr = (x, y1, w, h, r) => { g2.beginPath(); if (g2.roundRect) g2.roundRect(x, y1, w, h, r); else g2.rect(x, y1, w, h); };
    const panel = (x, y1, w, h) => { rr(x, y1, w, h, 14); g2.fillStyle = 'rgba(255,255,255,.04)'; g2.fill(); g2.strokeStyle = 'rgba(255,255,255,.09)'; g2.lineWidth = 1; g2.stroke(); };
    const font = (sz, w) => { g2.font = `${w || 400} ${sz}px "Open Sans","Segoe UI",Arial,sans-serif`; };
    const txt = (t, x, y1, sz, col, w, max) => { font(sz, w); g2.fillStyle = col; let s2 = String(t || ''); if (max) while (s2.length > 1 && g2.measureText(s2).width > max) s2 = s2.slice(0, -2) + '…'; g2.fillText(s2, x, y1); };
    const label = (t, x, y1) => txt(t, x, y1, 14, '#8b8f97', 700);
    const box = (r, x, y1, sz) => {
      const rc = r && r.x ? IMRC[r.x.r] || '#3a3d43' : '#3a3d43';
      // The rarity colour goes behind the picture, so an item whose icon has a see-through or dark background (ornaments, for example) still looks like the others.
      const fg = g2.createLinearGradient(x, y1, x, y1 + sz); fg.addColorStop(0, rc); fg.addColorStop(1, '#14161b');
      g2.save(); rr(x, y1, sz, sz, 7); g2.clip(); g2.fillStyle = '#14161b'; g2.fillRect(x, y1, sz, sz); g2.globalAlpha = .9; g2.fillStyle = fg; g2.fillRect(x, y1, sz, sz); g2.globalAlpha = 1;
      const im = imgs[ic(r)]; if (im) g2.drawImage(im, x, y1, sz, sz); g2.restore();
      rr(x + 1.5, y1 + 1.5, sz - 3, sz - 3, 7); g2.strokeStyle = rc === '#522f65' ? '#8a5fb0' : rc; g2.lineWidth = Math.max(2, sz / 30); g2.stroke();
    };
    const tileIc = (src, x, y1, sz, round) => {
      const rad = round ? sz / 2 : 7;
      rr(x, y1, sz, sz, rad); g2.fillStyle = '#14161b'; g2.fill();
      const im = imgs[src]; if (im) { g2.save(); rr(x, y1, sz, sz, rad); g2.clip(); g2.drawImage(im, x, y1, sz, sz); g2.restore(); }
      rr(x + .5, y1 + .5, sz - 1, sz - 1, rad); g2.strokeStyle = 'rgba(255,255,255,.22)'; g2.lineWidth = 1.5; g2.stroke();
    };
    // header
    txt(l.n || 'Loadout', 48, 78, 46, '#ffffff', 700, 900);
    txt(c.toUpperCase() + (sub && (sub.x || sub.en).n ? '  ·  ' + (sub.x || sub.en).n : ''), 50, 112, 18, '#9aa0a8', 600, 900);
    if (sub && imgs[ic(sub)]) g2.drawImage(imgs[ic(sub)], W - 150, 30, 110, 110);
    g2.fillStyle = '#2b2e33'; g2.fillRect(48, 172, W - 96, 1);
    // weapons and armor
    panel(M, L.top, 520, 400); panel(584, L.top, W - M - 584, 400);
    label('WEAPONS', 48, L.top + 26);
    weps.forEach((r, i) => { const y1 = L.top + 44 + i * 112; box(r, 48, y1, 88); txt(r ? (r.x || r.en).n : 'Empty', 154, y1 + 40, 23, r ? '#fff' : '#555', 600, 370); txt(r && r.x ? (r.x.t || '') + (r.x.p ? '  ·  ' + r.x.p : '') : '', 154, y1 + 68, 15, '#9aa0a8', 400, 370); });
    label('ARMOR', 600, L.top + 26);
    arms.forEach((r, i) => { box(r, 600 + i * 108, L.top + 40, 92); });
    // under each piece: its archetype, then its set (or the exotic's name)
    arms.forEach((r, i) => {
      if (!r) return; const x0 = 600 + i * 108, ex = r.x && r.x.r === 'Exotic';
      if (AD[i].a) txt(AD[i].a, x0, L.top + 148, 14, '#e6e7ea', 700, 100);
      const sub2 = ex ? (r.x.n || '') : (AD[i].s || ''); if (sub2) txt(sub2, x0, L.top + 166, 12.5, ex ? '#ceae33' : '#8b8f97', ex ? 600 : 400, 100);
    });
    if (hasSt) {
      const tot = st.reduce((a, b) => a + b, 0);
      st.forEach((v, i) => {
        const y1 = L.top + 186 + i * 30; txt(IMSTL[i], 600, y1 + 14, 15, '#cfd2d8', 600);
        g2.fillStyle = '#23262b'; g2.fillRect(700, y1 + 2, 360, 14); g2.fillStyle = IMSTC[i]; g2.fillRect(700, y1 + 2, Math.max(0, Math.min(360, v / 200 * 360)), 14);
        txt(String(v), 1072, y1 + 15, 16, '#fff', 700);
      });
      txt('Total ' + tot, 600, L.top + 384, 16, '#e0b64a', 700);
    }
    // subclass: super, abilities, aspects and fragments
    if (L.sub) {
      panel(M, L.sub, IW, 50 + subRows * SUBSTEP + 10);
      label('SUBCLASS' + (sub && (sub.x || sub.en).n ? '  ·  ' + String((sub.x || sub.en).n).toUpperCase() : ''), 48, L.sub + 26);
      subPl.forEach((m, i) => tileIc(m.i, 48 + (i % subPer) * SUBSTEP, L.sub + 42 + Math.floor(i / subPer) * SUBSTEP, SUBSZ, false));
    }
    // mods, under the armor piece they go on
    if (L.mods) {
      panel(M, L.mods, IW, 108 + mRows * MSTEP + 8);
      label('MODS', 48, L.mods + 26);
      const SLOTN = ['Helmet', 'Arms', 'Chest', 'Legs', 'Class item'];
      [...modsBy, ...(anyMods.length ? [anyMods] : [])].forEach((list, ci) => {
        const x0 = M + 16 + ci * colW, yh = L.mods + 40;
        if (ci < 5) box(arms[ci], x0, yh, 46); else { rr(x0, yh, 46, 46, 7); g2.fillStyle = '#1b1d22'; g2.fill(); txt('+', x0 + 15, yh + 32, 26, '#8b8f97', 600); }
        txt(ci < 5 ? SLOTN[ci] : 'Any piece', x0 + 56, yh + 20, 15, '#e6e7ea', 600, colW - 70);
        txt(list.length ? list.length + ' mod' + (list.length > 1 ? 's' : '') : 'No mods', x0 + 56, yh + 40, 13, '#8b8f97', 400, colW - 70);
        if (ci) { g2.fillStyle = 'rgba(255,255,255,.07)'; g2.fillRect(x0 - 10, yh, 1, 52 + mRows * MSTEP); }
        list.forEach((m, k) => tileIc(m.i, x0 + (k % mPer) * MSTEP, yh + 60 + Math.floor(k / mPer) * MSTEP, MSZ, false));
      });
    }
    // artifact
    if (L.art) {
      const y0 = L.art; panel(M, y0, IW, 104);
      label('ARTIFACT', 48, y0 + 26);
      if (artIc && imgs[artIc]) { rr(48, y0 + 38, 54, 54, 8); g2.fillStyle = '#1a1c22'; g2.fill(); g2.drawImage(imgs[artIc], 48, y0 + 38, 54, 54); rr(48.5, y0 + 38.5, 53, 53, 8); g2.strokeStyle = '#ceae33'; g2.lineWidth = 2; g2.stroke(); }
      txt((l.ai && l.ai.n) || 'Artifact', 116, y0 + 62, 20, '#ffffff', 600, 280);
      txt(artPk.length ? artPk.length + ' perks selected' : '', 116, y0 + 84, 14, '#9aa0a8', 400);
      artPk.forEach((p, i) => tileIc(p, 420 + i * 60, y0 + 38, 54, true));
    }
    txt('Made with Pathfinder', W - 220, H - 10, 14, '#6a6f77', 600);
    const data = cv.toDataURL('image/png');
    // The picture as a file, made now: phones only allow copying and sharing straight from a tap, with nothing awaited first.
    const bin = atob(data.split(',')[1] || ''), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const blob = new Blob([u8], { type: 'image/png' }), fname = (String(l.n || 'loadout').replace(/[^\w \-]+/g, '').trim().slice(0, 60) || 'loadout') + '.png';
    let file = null; try { file = new File([blob], fname, { type: 'image/png' }); } catch (e) { /* no File constructor */ }
    const canShare = !!(file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
    const isWeb = document.documentElement.classList.contains('gtweb');
    let m = g('loimg'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'loimg';
    m.innerHTML = `<div class="li"><img src="${data}" alt=""><p>${canShare ? '<button class="b" data-li="share">Share picture</button> ' : ''}<button class="${canShare ? 'g' : 'b'}" data-li="copy">Copy picture</button> <button class="g" data-li="save">${isWeb ? 'Download' : 'Save as PNG...'}</button> <button class="g" data-li="x">Close</button> <span class="mute" id="limsg">${canShare ? 'Share it straight to Discord, Messages and more.' : isWeb ? 'Copy it, or hold your finger on the picture and choose Copy.' : 'Paste it straight into Discord after copying.'}</span></p></div>`;
    m.onclick = (e) => {
      const b = e.target.closest('[data-li]'); if (e.target === m || (b && b.dataset.li === 'x')) { m.remove(); return; }
      if (!b) return; const msg = g('limsg'), say = (t) => { msg.textContent = t; };
      const k = b.dataset.li;
      if (k === 'share') { navigator.share({ files: [file], title: l.n || 'Loadout' }).then(() => say('Shared.'), (er) => { if (!er || er.name !== 'AbortError') say('Could not share: ' + V.clean(er)); }); return; }
      if (k === 'copy') {
        // In a browser: copy right here, straight from the tap. On the PC app: the app's own clipboard.
        if (isWeb && navigator.clipboard && window.ClipboardItem) { navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]).then(() => say('Copied. Paste it into Discord or anywhere else.'), () => say('This browser would not copy it. Hold your finger on the picture and choose Copy, or use Download.')); return; }
        gt.imgCopy({ d: data }).then(() => say('Copied. Paste it into Discord or anywhere else.'), () => {
          if (navigator.clipboard && window.ClipboardItem) navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]).then(() => say('Copied. Paste it into Discord or anywhere else.'), (er) => say(V.clean(er)));
          else say('Could not copy. Use Save as PNG instead.');
        });
        return;
      }
      gt.imgSave({ d: data, name: l.n || 'loadout' }).then((r) => { if (r && r.ok) say((isWeb ? 'Downloaded ' : 'Saved ') + r.file + '.'); }, (er) => say(V.clean(er)));
    };
    document.body.appendChild(m);
  }

  // ---------------- building loadouts ----------------
  const entOf = (x) => ({ id: x.id, h: x.h, b: x.b, n: String(x.n || '').slice(0, 80), i: rawIcon(x.i), e: 1, m: [] });
  async function addMods(d, ens) {
    const D = D0(); if (!D) return;
    for (const en of ens) {
      const x = items().find((o) => o.id === en.id); if (!x || !(AB.includes(x.b) || x.b === SUB)) continue;
      const m = await capture(x);
      if (m && ed && ed.d === d) { en.m = m; drawEd(); }
      else if (m) en.m = m;
    }
  }
  function fromChar(cid, name) {
    const c = V.ent(cid), its = eqOf(cid).map(entOf);
    return norm({ id: newId(), n: name || '', c: c ? c.cls : 3, o: '', it: its, mv: 0, a: [], t: Date.now(), k: Date.now() });
  }
  const cand = (b, d) => {
    const cls = d.c;
    return items().filter((x) => x.b === b && !x.pm && x.id && (cls === 3 ? !(AB.includes(b) || b === SUB) : !(AB.includes(b) || b === SUB) || x.c === undefined || x.c === 3 || x.c === cls)).sort(V.sortI);
  };
  const usedExotics = (d) => { const res = resolve(d); return [res.filter((q) => q.x && WB.includes(q.x.b) && isEx(q.x)).length, res.filter((q) => q.x && AB.includes(q.x.b) && isEx(q.x)).length]; };

  // ---------------- editor (bottom sheet) ----------------
  function openEd(l, isNew) {
    ed = { id: isNew ? null : l.id, d: clone(l), hist: [], fut: [], pick: null, pq: '', msg: '' };
    drawEd(); artLoad();
  }
  function mut(fn) { if (!ed) return; ed.hist.push(JSON.stringify(ed.d)); if (ed.hist.length > 60) ed.hist.shift(); ed.fut = []; fn(ed.d); drawEd(); }
  const slotCell = (d, b, res) => {
    const r = res.find((q) => q.en.b === b), en = r && r.en;
    let body;
    if (en) {
      const t = r.x ? V.tile(r.x).replace(/ fade(?=[" ])/, '') : `<div class="vt dl-miss" title="Missing: ${esc(en.n)}">${en.i ? `<img src="${esc(V.icon(en.i))}" alt="">` : '?'}</div>`;
      body = `<div class="dl-tw${en.e === 0 ? ' dl-ne' : ''}" data-ed="pick" data-b="${b}">${t}</div>`;
    } else body = `<div class="dl-tw dl-empty" data-ed="pick" data-b="${b}" title="Add ${esc(BN[b])}"><span>+</span></div>`;
    const mi = en && AB.includes(b) && en.m.length ? `<div class="dl-pm">${plugIcons(en.m)}</div>` : '';
    return `<div class="dl-slot">${b === SUB ? '' : `<div class="dl-sn">${esc(BN[b])}</div>`}${body}${mi}${en ? `<div class="dl-sf"><button class="g${en.e === 0 ? '' : ' on'}" data-ed="eqt" data-b="${b}" title="${en.e === 0 ? 'Only moved to the character, not equipped' : 'Equipped when applied'}">${en.e === 0 ? 'Carry' : 'Equip'}</button><button class="g" data-ed="rm" data-b="${b}" title="Remove from loadout">&#10005;</button></div>` : ''}</div>`;
  };
  function pickList() {
    const d = ed.d, b = ed.pick, qq = ed.pq.trim();
    let list = cand(b, d);
    if (qq && window.__gtx) list = list.filter((x) => window.__gtx.match(x, qq.toLowerCase()));
    else if (qq) list = list.filter((x) => (x.n + ' ' + x.t).toLowerCase().includes(qq.toLowerCase()));
    const cur = d.it.find((q) => q.b === b);
    return list.slice(0, 300).map((x) => `<div class="dl-pi${cur && cur.id === x.id ? ' on' : ''}" data-ed="choose" data-id="${esc(x.id)}">${V.tile(x).replace(/ fade(?=[" ])/, '')}</div>`).join('') || '<p class="mute">Nothing in your inventory fits this slot.</p>';
  }
  function drawEd() {
    let box = g('dled');
    if (!ed) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div'); box.id = 'dled'; document.body.appendChild(box);
      box.onclick = edClick; box.onchange = edChange; box.oninput = edInput;
    }
    const bd0 = box.querySelector('.dl-ebody'), sc0 = bd0 ? bd0.scrollTop : 0;
    const keepQ = box.querySelector('#dlpq') && document.activeElement === box.querySelector('#dlpq'), keepN = document.activeElement && document.activeElement.id;
    const d = ed.d, res = resolve(d), [xw, xa] = usedExotics(d);
    const row = (bs) => bs.map((b) => slotCell(d, b, res)).join('');
    const subEn = d.it.find((q) => q.b === SUB), anyc = d.c === 3;
    const subPl = subEn ? subEn.m.slice().sort((p, q) => p[0] - q[0]) : [];
    const mods = [...(d.fm || []).map((p) => [0, p[0], p[2], p[1]]), ...d.it.flatMap((q) => (AB.includes(q.b) ? q.m : []))];
    const coss = d.it.filter((q) => (WB.includes(q.b) || AB.includes(q.b)) && q.cs && q.cs.length);
    const cosRow = coss.length ? coss.map((q) => `<span class="dl-cs" title="${esc(q.n)}"><img class="dl-csi" src="${esc(V.icon(q.i))}" alt="">${plugIcons(q.cs)}</span>`).join('') : '<span class="mute">Not saved. The loadout leaves your ornaments and shaders as they are.</span>';
    const modRow = mods.length ? mods.map((p) => `<span class="ap" title="${esc(p[3])}">${p[2] ? `<img src="${esc(V.icon(p[2]))}" alt="">` : ''}</span>`).join('') : '<span class="mute">No mods saved.</span>';
    const warn = (xw > 1 ? '<div class="dl-wr">Only one exotic weapon can be equipped at a time.</div>' : '') + (xa > 1 ? '<div class="dl-wr">Only one exotic armor piece can be equipped at a time.</div>' : '');
    const pn = (cls, title, body, foot, dis) => `<div class="dl-pn ${cls}${dis ? ' dis' : ''}"><div class="dl-ph"><span>${title}</span></div><div class="dl-pb">${body}</div>${foot ? `<div class="dl-pf">${foot}</div>` : ''}</div>`;
    box.innerHTML = `<div class="dl-eb">
<div class="dl-ehd"><input id="dlen" class="dl-name" placeholder="Loadout name" maxlength="80" value="${esc(d.n)}"><select id="dlcls" title="Which class this loadout is for"><option value="3"${anyc ? ' selected' : ''}>Any class</option>${[0, 1, 2].map((c) => `<option value="${c}"${d.c === c ? ' selected' : ''}>${esc(CL[c])}</option>`).join('')}</select><span class="dl-sp"></span><button class="g" data-ed="undo"${ed.hist.length ? '' : ' disabled'} title="Undo">&#8630; Undo</button><button class="g" data-ed="redo"${ed.fut.length ? '' : ' disabled'} title="Redo">Redo &#8631;</button><button class="g" data-ed="x" title="Close without saving">&#10005;</button></div>
<div class="dl-ebody"><textarea id="dleo" class="dl-notes" placeholder="Notes (add #hashtags like #pvp or #raid to find this loadout fast)">${esc(d.o)}</textarea>
${warn}${ed.msg ? `<div class="dl-wr">${esc(ed.msg)}</div>` : ''}
${ed.pick ? `<div class="dl-es dl-pk"><div class="dl-eh">Choose ${esc(BN[ed.pick])} <button class="g" data-ed="pickx">Close</button></div><input id="dlpq" placeholder="Search (is:exotic, perk:..., or a name)" value="${esc(ed.pq)}" autocomplete="off"><div id="dlpl" class="dl-pl">${pickList()}</div></div>` : ''}
<div class="dl-panels">
${pn('dl-p-sub', 'Subclass', anyc ? '<span class="mute">Pick a class to add a subclass.</span>' : `<div class="dl-subrow">${row([SUB])}<div class="dl-subpl">${subPl.length ? plugIcons(subPl, 'big') : (subEn ? '<span class="mute">No abilities saved. Use Customize.</span>' : '')}</div></div>`, `<button class="g" data-ed="subcust"${subEn ? '' : ' disabled'}>Customize subclass</button>`, anyc)}
${pn('dl-p-wep', 'Weapons', `<div class="dl-er">${row(WB)}</div>`, `<label class="dl-ac"><input type="checkbox" id="dlmv"${d.mv ? ' checked' : ''}> Move other items away</label>`)}
${pn('dl-p-arm', 'Armor', `<div class="dl-er">${row(AB)}</div>`, '', anyc)}
${pn('dl-p-gen', 'General', `<div class="dl-er">${row(GB)}</div>`, '')}
${pn('dl-p-mod', 'Mods', `<div class="arow dl-mods">${modRow}</div>`, `<button class="g" data-ed="curmods">Use current mods</button>${mods.length ? '<button class="g" data-ed="clrmods">Clear</button>' : ''}`)}
${pn('dl-p-cos', 'Ornaments and shaders', `<div class="arow dl-coss">${cosRow}</div>`, `<button class="g" data-ed="curcos">Use current look</button>${coss.length ? '<button class="g" data-ed="clrcos">Clear</button>' : ''}`)}
${pn('dl-p-art', 'Artifact', `<div class="dl-artrow">${d.ai && d.ai.i ? `<span class="dl-ai"><img src="${esc(V.icon(d.ai.i))}" alt="" title="${esc(d.ai.n)}"></span>` : ''}<div class="arow">${d.a.length ? aRowL(d.a) : '<span class="mute">No artifact perks saved.</span>'}</div></div>`, `<button class="g" data-ed="artpick">Customize artifact</button><button class="g" data-ed="artcur">Use current</button>${d.a.length ? '<button class="g" data-ed="artclr">Clear</button>' : ''}`)}
</div>
<div class="dl-tools"><button class="g" data-ed="fill" data-m="eq">Fill in using equipped</button><button class="g" data-ed="fill" data-m="neq">Fill in using non-equipped</button><button class="g" data-ed="rand">Randomize</button>${AR === null ? `<span class="mute">Artifact unavailable${ARERR ? ': ' + esc(ARERR) : ''}</span>` : ''}</div>
</div>
<div class="dl-ef"><button class="b" data-ed="save">Save Changes</button><button class="g" data-ed="savenew">Save as New</button><button class="g" data-ed="share">Share</button>${ed.id ? '<button class="g dl-del" data-ed="del">Delete</button>' : ''}<span class="dl-sp"></span><button class="g" data-ed="x">Cancel</button></div></div>`;
    { const bd = box.querySelector('.dl-ebody'); if (bd) bd.scrollTop = ed.top ? 0 : sc0; ed.top = false; }
    if (keepQ) { const i = box.querySelector('#dlpq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } else if (keepN === 'dlen' || keepN === 'dleo') { const i = g(keepN); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }
  function edInput(e) {
    if (!ed) return; const id = e.target.id;
    if (id === 'dlen') ed.d.n = e.target.value;
    else if (id === 'dleo') ed.d.o = e.target.value;
    else if (id === 'dlpq') { ed.pq = e.target.value; const l = g('dlpl'); if (l) l.innerHTML = pickList(); }
  }
  function edChange(e) {
    if (!ed) return; const id = e.target.id;
    if (id === 'dlmv') ed.d.mv = e.target.checked ? 1 : 0;
    else if (id === 'dlcls') {
      const nc = +e.target.value;
      if (nc === 3 && ed.d.it.some((q) => AB.includes(q.b) || q.b === SUB)) { ed.msg = 'Remove the subclass and armor first. Those only work for one class.'; drawEd(); return; }
      ed.msg = '';
      mut((d) => {
        d.c = nc;
        if (nc < 3) d.it = d.it.filter((q) => { if (!(AB.includes(q.b) || q.b === SUB)) return true; const x = items().find((o) => o.id === q.id); return !x || x.c === undefined || x.c === 3 || x.c === nc; });
      });
    }
  }
  function doFill(mode) {
    mut((d) => {
      const taken = new Set(d.it.map((q) => q.b)), add = [], fc = fillChar(d);
      ALLB.forEach((b) => {
        if (taken.has(b) || (d.c === 3 && (AB.includes(b) || b === SUB))) return;
        const pool = cand(b, d).filter((x) => x.loc === fc && (mode === 'eq' ? x.e : !x.e));
        if (pool[0]) add.push(entOf(pool[0]));
      });
      d.it.push(...add); addMods(d, add.filter((q) => AB.includes(q.b) || q.b === SUB));
    });
    if (mode === 'eq' && ed && !(ed.d.a && ed.d.a.length)) artEd('artcur');
  }
  function doRandom() {
    mut((d) => {
      const pick = (a) => a[Math.floor(Math.random() * a.length)];
      let ew = 0, ea = 0; const add = [];
      d.it = d.it.filter((q) => !(WB.includes(q.b) || (AB.includes(q.b) && d.c !== 3)));
      [...WB, ...AB].forEach((b) => {
        if (d.c === 3 && AB.includes(b)) return;
        const pool = cand(b, d); if (!pool.length) return;
        const ex = pool.filter(isEx), ne = pool.filter((x) => !isEx(x)), exOK = WB.includes(b) ? !ew : !ea;
        let x;
        if (exOK && ex.length && (Math.random() < 0.25 || !ne.length)) x = pick(ex); else if (ne.length) x = pick(ne); else return;
        if (isEx(x)) { if (WB.includes(b)) ew++; else ea++; }
        add.push(entOf(x));
      });
      d.it.push(...add);
    });
  }
  function choose(id) {
    const x = items().find((o) => o.id === id), b = ed.pick; if (!x || !b) return;
    const en = entOf(x);
    mut((d) => { d.it = d.it.filter((q) => q.b !== b); d.it.push(en); });
    if (AB.includes(b) || b === SUB) addMods(ed.d, [ed.d.it.find((q) => q.id === id)].filter(Boolean));
    ed.pick = null; drawEd();
  }
  function closeEd() { ed = null; AP = null; drawEd(); renderAP(); }
  function commit(asNew) {
    const d = clone(ed.d); d.n = d.n.trim();
    if (!d.n) { ed.msg = 'Give the loadout a name first.'; ed.top = true; drawEd(); const i = g('dlen'); if (i) i.focus(); return; }
    if (!d.it.length) { ed.msg = 'Add at least one item first.'; ed.top = true; drawEd(); return; }
    d.t = Date.now();
    const a = all();
    if (!asNew && ed.id) { const i = a.findIndex((q) => q.id === ed.id); d.id = ed.id; if (i >= 0) { d.k = a[i].k; a[i] = norm(d); } else a.push(norm(d)); }
    else { d.id = newId(); d.k = Date.now(); a.push(norm(d)); }
    save(); const nm = d.n; closeEd(); render(); toast('Saved ' + nm);
  }
  // Share: a picture (easiest to post anywhere) or a code the other person imports.
  function share(l) { mod = { t: 'shmenu', l }; drawMod(); }
  async function shareCode(l, send) {
    const c = codeOf(l);
    if (send && navigator.share) { try { await navigator.share({ title: l.n || 'Loadout', text: c }); mod = null; drawMod(); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await gt.writeClipboard(c); mod = null; drawMod(); toast('Loadout code copied. Send it to a friend. They use Import Loadout.'); }
    catch (e) { mod = { t: 'share', code: c }; drawMod(); }
  }
  async function edClick(e) {
    const t = e.target.closest('[data-ed]'); if (!t || !ed) return;
    const a = t.dataset.ed, b = +t.dataset.b;
    if (a === 'x') closeEd();
    else if (a === 'undo') { if (ed.hist.length) { ed.fut.push(JSON.stringify(ed.d)); ed.d = JSON.parse(ed.hist.pop()); drawEd(); } }
    else if (a === 'redo') { if (ed.fut.length) { ed.hist.push(JSON.stringify(ed.d)); ed.d = JSON.parse(ed.fut.pop()); drawEd(); } }
    else if (a === 'pick') { ed.pick = b; ed.pq = ''; ed.top = true; drawEd(); const i = g('dlpq'); if (i) i.focus(); }
    else if (a === 'pickx') { ed.pick = null; drawEd(); }
    else if (a === 'choose') choose(t.dataset.id);
    else if (a === 'rm') mut((d) => { d.it = d.it.filter((q) => q.b !== b); });
    else if (a === 'eqt') mut((d) => { const q = d.it.find((o) => o.b === b); if (q) q.e = q.e === 0 ? 1 : 0; });
    else if (a === 'fill') doFill(t.dataset.m);
    else if (a === 'rand') doRandom();
    else if (a === 'clrmods') mut((d) => { d.fm = []; d.it.forEach((q) => { if (AB.includes(q.b)) q.m = []; }); });
    else if (a === 'subcust') openSub();
    else if (a === 'curmods') {
      const ens = ed.d.it.filter((q) => AB.includes(q.b)); if (!ens.length) { ed.msg = 'Add armor first.'; drawEd(); return; }
      ed.msg = 'Reading your armor mods...'; drawEd();
      const d = ed.d;
      for (const en of ens) { const x = items().find((o) => o.id === en.id) || (resolve(d).find((q) => q.en === en) || {}).x; if (x) { const m = await capture(x); if (m) en.m = m; } }
      if (ed && ed.d === d) { d.fm = []; ed.msg = ''; drawEd(); }
    }
    else if (a === 'curcos') {
      const ens = ed.d.it.filter((q) => WB.includes(q.b) || AB.includes(q.b)); if (!ens.length) { ed.msg = 'Add weapons or armor first.'; drawEd(); return; }
      ed.msg = 'Reading your ornaments and shaders...'; drawEd();
      const d = ed.d;
      for (const en of ens) { const x = items().find((o) => o.id === en.id) || (resolve(d).find((q) => q.en === en) || {}).x; if (x) { const c = await capCos(x); if (c) en.cs = c; } }
      if (ed && ed.d === d) { ed.msg = ''; drawEd(); }
    }
    else if (a === 'clrcos') mut((d) => { d.it.forEach((q) => { q.cs = []; }); });
    else if (a === 'artpick' || a === 'artcur') artEd(a);
    else if (a === 'artcur0') artEd('artcur');
    else if (a === 'artclr') mut((d) => { d.a = []; d.ai = null; });
    else if (a === 'save') commit(false);
    else if (a === 'savenew') commit(true);
    else if (a === 'share') share(norm({ ...ed.d, n: ed.d.n || 'Loadout' }));
    else if (a === 'del') { if (ed.id && confirm('Delete "' + (ed.d.n || 'this loadout') + '"?')) { const id = ed.id; LS = all().filter((q) => q.id !== id); save(); closeEd(); render(); toast('Loadout deleted'); } }
  }

  // ---------------- subclass customiser ----------------
  const SUBC = {};
  async function openSub() {
    const en = ed && ed.d.it.find((q) => q.b === SUB); if (!en) return;
    mod = { t: 'sub', h: en.h, msg: '', cur: null }; drawMod();
    try { if (!SUBC[en.h]) SUBC[en.h] = await gt.subOpts({ h: en.h }); } catch (e) { if (mod && mod.t === 'sub') { mod.msg = 'Could not load the subclass options: ' + V.clean(e); drawMod(); } return; }
    if (mod && mod.t === 'sub') { mod.data = SUBC[en.h]; drawMod(); }
  }
  function subHTML() {
    const en = ed && ed.d.it.find((q) => q.b === SUB);
    if (!en) return '<div class="dl-mc"><p class="mute">Add a subclass first.</p><div class="dl-bt"><button class="g" data-md="x">Close</button></div></div>';
    if (!mod.data) return `<div class="dl-mc"><h3>Customize subclass</h3><p class="mute">${mod.msg ? esc(mod.msg) : 'Loading the options...'}</p><div class="dl-bt"><span class="dl-sp"></span><button class="g" data-md="x">Close</button></div></div>`;
    const have = new Map(en.m.map((p) => [p[0], p[1]]));
    let socks = mod.data.sockets;
    if (have.size) socks = socks.filter((q) => have.has(q.si));
    const cnt = {}, rows = socks.map((q) => {
      let lab = catLabel(q.opts[0][4]); if (lab === 'Ability') lab = q.opts.length > 8 ? 'Fragment' : 'Aspect'; cnt[lab] = (cnt[lab] || 0) + 1;
      return `<div class="dl-sr"><div class="dl-gl">${lab}${['Fragment', 'Aspect'].includes(lab) ? ' ' + cnt[lab] : ''}</div><div class="dl-so">${q.opts.map((o) => `<span class="ap md${have.get(q.si) === o[0] ? ' on' : ''}" data-sp="${q.si}:${o[0]}" title="${esc(o[1] + (o[3] ? '\n' + o[3] : ''))}">${o[2] ? `<img src="${esc(V.icon(o[2]))}" alt="">` : ''}</span>`).join('')}</div></div>`;
    }).join('');
    return `<div class="dl-mc dl-sub"><h3>Customize subclass</h3><p class="mute">Click an option to use it. These are written to the subclass when the loadout is applied.${have.size ? '' : ' Nothing was saved from the game, so every socket is shown.'}</p>${mod.msg ? `<div class="dl-wr">${esc(mod.msg)}</div>` : ''}<div class="dl-sw">${rows || '<span class="mute">No options found.</span>'}</div><div class="dl-bt"><button class="g" data-md="subcur">Use current from game</button><span class="dl-sp"></span><button class="b" data-md="x">Done</button></div></div>`;
  }

  // ---------------- modals: import, in-game loadout menu, identifiers ----------------
  function drawMod() {
    let box = g('dlmod');
    if (!mod) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'dlmod'; document.body.appendChild(box); box.onclick = modClick; box.onchange = modChange; }
    const D = D0(); let h = '';
    if (mod.t === 'sub') h = subHTML();
    else if (mod.t === 'imp') {
      h = `<div class="dl-mc"><h3>Import loadout</h3><p class="mute">Paste a DIM loadout link (dim.gg/...) or a loadout code from this app (GTL1:...). Items are matched to the closest ones you own.</p><textarea id="dlimp" placeholder="https://dim.gg/..."" spellcheck="false">${esc(mod.text || '')}</textarea>${mod.msg ? `<div class="dl-wr">${esc(mod.msg)}</div>` : ''}<div class="dl-bt"><button class="g" data-md="paste">Paste from clipboard</button><span class="dl-sp"></span><button class="b" data-md="doimp">Import</button><button class="g" data-md="x">Cancel</button></div></div>`;
    } else if (mod.t === 'shmenu') {
      h = `<div class="dl-mc dl-ig-pop"><h3>Share loadout</h3><p class="mute">A picture is the easiest to send. A code lets your friend import the loadout into their own app.</p><div class="dl-bt dl-col"><button class="b" data-md="shpic">Share as a picture</button><button class="g" data-md="shcode">Copy loadout code</button>${navigator.share ? '<button class="g" data-md="shsend">Send the code...</button>' : ''}<button class="g" data-md="x">Close</button></div></div>`;
    } else if (mod.t === 'share') {
      h = `<div class="dl-mc"><h3>Loadout code</h3><p class="mute">Copy this and send it to your friend.</p><textarea readonly spellcheck="false">${esc(mod.code)}</textarea><div class="dl-bt"><span class="dl-sp"></span><button class="g" data-md="x">Close</button></div></div>`;
    } else if (mod.t === 'igp' && D) {
      const L = ((D.lo && D.lo[mod.c]) || []).find((q) => q.i === mod.i); if (!L) { mod = null; drawMod(); return; }
      const its = L.items.map((id) => items().find((x) => x.id === id)).filter(Boolean).sort((a, b) => ALLB.indexOf(a.b) - ALLB.indexOf(b.b));
      const miss = L.items.length - its.length, empty = !L.items.length;
      h = `<div class="dl-mc dl-ig-pop"><div class="dl-ipH" style="${L.c ? `background-image:url(${esc(V.icon(L.c))})` : ''}">${L.ic ? `<img src="${esc(V.icon(L.ic))}" alt="">` : ''}<div><h3>${esc(L.n || (empty ? 'Empty slot' : 'Loadout'))}</h3><span class="mute">Slot ${L.i + 1}${miss ? ' &middot; ' + miss + ' missing' : ''}</span></div></div><div class="dl-tiles">${its.map((x) => V.tile(x).replace(/ fade(?=[" ])/, '')).join('') || '<span class="mute">This slot is empty.</span>'}</div>
<div class="dl-bt dl-col">${empty ? '' : '<button class="b" data-md="igeq">Equip</button><button class="g" data-md="igprep">Prepare Equip</button>'}<button class="g" data-md="igid">${empty ? 'Save current gear here' : 'Edit Identifiers'}</button>${empty ? '' : '<button class="g" data-md="igdim">Save as Loadout</button><button class="g" data-md="igsh">Share</button><button class="g dl-del" data-md="igclr">Clear Slot ' + (L.i + 1) + '</button>'}<button class="g" data-md="x">Close</button></div></div>`;
    } else if (mod.t === 'ident' && D) {
      if (!LD) { h = '<div class="dl-mc"><p class="mute">Loading names and icons...</p></div>'; }
      else {
        const slots = ((D.lo && D.lo[mod.c]) || []);
        h = `<div class="dl-mc dl-idm"><h3>${mod.mode === 'snap' ? 'Save current gear as an in-game loadout' : 'Edit identifiers'}</h3>${mod.mode === 'snap' ? `<label>Slot<select id="dlslot">${slots.map((s) => `<option value="${s.i}"${s.i === mod.i ? ' selected' : ''}>${s.i + 1}${s.items.length ? ' - ' + esc(s.n || 'In use (will be replaced)') : ' - empty'}</option>`).join('')}</select></label>` : ''}<label>Name<select id="dlnm">${LD.names.map((n) => `<option value="${n.h}"${n.h === mod.nh ? ' selected' : ''}>${esc(n.v)}</option>`).join('')}</select></label><label>Icon</label><div class="lpk ic">${LD.icons.map((o) => `<div class="ic${o.h === mod.ih ? ' on' : ''}" data-ic="${o.h}"><img src="${esc(V.icon(o.v))}" alt=""></div>`).join('')}</div><label>Color</label><div class="lpk">${LD.colors.map((o) => `<div class="sw${o.h === mod.ch ? ' on' : ''}" data-sw="${o.h}" style="background-image:url(${esc(V.icon(o.v))})"></div>`).join('')}</div><div class="dl-bt"><span class="dl-sp"></span><button class="b" data-md="idok">${mod.mode === 'snap' ? 'Save loadout' : 'Update'}</button><button class="g" data-md="x">Cancel</button></div></div>`;
      }
    }
    box.innerHTML = h;
  }
  async function openIdent(c, i, mode) {
    const D = D0(), L = ((D.lo && D.lo[c]) || []).find((q) => q.i === i); if (!L) return;
    mod = { t: 'ident', c, i, mode, nh: L.nh, ch: L.ch, ih: L.ih }; drawMod();
    if (!LD) {
      try { LD = await gt.loDefs(); LD.names.sort((a, b) => String(a.v).localeCompare(b.v)); }
      catch (e) { mod = null; drawMod(); toast('Could not load loadout names: ' + V.clean(e), { bad: 1 }); return; }
    }
    if (!mod || mod.t !== 'ident') return;
    if (!mod.nh || !LD.names.some((n) => n.h === mod.nh)) mod.nh = LD.names[0] && LD.names[0].h;
    if (!mod.ch || !LD.colors.some((n) => n.h === mod.ch)) mod.ch = LD.colors[0] && LD.colors[0].h;
    if (!mod.ih || !LD.icons.some((n) => n.h === mod.ih)) mod.ih = LD.icons[0] && LD.icons[0].h;
    drawMod();
  }
  function modChange(e) {
    if (!mod) return;
    if (e.target.id === 'dlnm') mod.nh = +e.target.value;
    else if (e.target.id === 'dlslot') { mod.i = +e.target.value; }
    else if (e.target.id === 'dlimp') mod.text = e.target.value;
  }
  function fromDim(r) {
    const l = norm({
      n: r.n, o: r.o, c: r.c, mv: r.mv, id: '', t: Date.now(), k: Date.now(),
      it: r.items.filter((q) => q.b).map((q) => ({ id: q.id, h: q.h, b: q.b, n: q.n, i: q.i, e: q.e, m: q.so })),
      a: r.art.map((p) => [p[0], p[1], p[2]]), fm: (r.mbk && r.mbk.length ? r.mbk : r.mods).map((p) => [p[0], p[1], p[2], p[3], p[4] || 0]),
    });
    if (!l || !l.it.length) throw new Error('That DIM loadout has no items in it.');
    if (!l.n) l.n = 'DIM loadout';
    return l;
  }
  async function modClick(e) {
    if (!mod) return;
    const spb = e.target.closest('[data-sp]');
    if (spb && mod.t === 'sub') {
      const [si, ph] = spb.dataset.sp.split(':').map(Number), en = ed && ed.d.it.find((q) => q.b === SUB);
      if (en && mod.data) {
        const sk = mod.data.sockets.find((q) => q.si === si), o = sk && sk.opts.find((q) => q[0] === ph);
        if (o) mut((d) => { const t = d.it.find((q) => q.b === SUB); t.m = t.m.filter((p) => p[0] !== si); t.m.push([si, ph, o[2], o[1]]); t.m.sort((p, q) => p[0] - q[0]); });
        drawMod();
      }
      return;
    }
    if (e.target.id === 'dlmod') { mod = null; drawMod(); return; }
    const sw = e.target.closest('[data-sw]'), ic = e.target.closest('[data-ic]');
    if ((sw || ic) && mod.t === 'ident') { if (sw) mod.ch = +sw.dataset.sw; else mod.ih = +ic.dataset.ic; const nm = g('dlnm'), sl = g('dlslot'); if (nm) mod.nh = +nm.value; if (sl) mod.i = +sl.value; drawMod(); return; }
    const b = e.target.closest('[data-md]'); if (!b) return;
    const a = b.dataset.md, D = D0();
    if (a === 'x') { mod = null; drawMod(); return; }
    if (mod.t === 'shmenu') {
      const l = mod.l;
      if (a === 'shpic') { mod = null; drawMod(); toast('Drawing the picture...'); try { await loImage(l); } catch (er) { toast('Could not draw the picture: ' + V.clean(er), { bad: 1 }); } return; }
      if (a === 'shcode' || a === 'shsend') { await shareCode(l, a === 'shsend'); return; }
    }
    if (a === 'subcur' && mod.t === 'sub') {
      const en = ed && ed.d.it.find((q) => q.b === SUB), x = en && items().find((o) => o.id === en.id);
      if (!x) { mod.msg = 'That subclass is not in your inventory right now.'; drawMod(); return; }
      const m = await capture(x); if (m && mod && mod.t === 'sub') { mut((d) => { d.it.find((q) => q.b === SUB).m = m; }); mod.msg = ''; drawMod(); }
      return;
    }
    if (a === 'paste') { try { const t = ((await gt.readClipboard()) || '').trim(); mod.text = t; mod.msg = t ? '' : 'The clipboard is empty.'; } catch (er) { mod.msg = 'Could not read the clipboard.'; } drawMod(); return; }
    if (a === 'doimp') {
      const ta = g('dlimp'); mod.text = ta ? ta.value : mod.text;
      try {
        let l;
        if (/GTL1:/.test(mod.text)) l = decode(mod.text);
        else {
          if (!/\S/.test(mod.text || '')) throw new Error('Paste a DIM link or a loadout code first.');
          mod.msg = 'Getting the loadout from DIM...'; drawMod();
          l = fromDim(await gt.dimFetch({ text: mod.text }));
        }
        l.id = newId(); l.t = l.k = Date.now();
        resolve(l).forEach((r) => { if (r.x) r.en.id = r.x.id; });
        if (l.c < 3 && !l.n) l.n = 'Imported loadout';
        all().push(l); save(); mod = null; drawMod();
        if (l.c < 3) { const ch = V.chars().find((q) => q.cls === l.c); if (ch) CH = ch.id; }
        FILT = ''; render();
        const miss = missOf(l).length; toast('Imported ' + (l.n || 'loadout') + (miss ? ' (' + miss + ' item' + (miss > 1 ? 's' : '') + ' not in your inventory)' : ''));
      } catch (er) { if (mod) { mod.msg = V.clean(er); drawMod(); } }
      return;
    }
    const L = mod.t === 'igp' || mod.t === 'ident' ? ((D.lo && D.lo[mod.c]) || []).find((q) => q.i === mod.i) : null, c = mod.c, i = mod.i;
    if (a === 'igeq') {
      const its = L.items.map((id) => items().find((x) => x.id === id)).filter(Boolean); mod = null; drawMod();
      // Bungie's own "equip loadout" leaves weapons behind when they are in the vault or on another character, so the gear is
      // first brought over and equipped the same way as an app loadout (stand-ins, room, exotic rules), then the in-game loadout is
      // equipped on top of it for its subclass, mods and cosmetics.
      const gear = its.filter((x) => !x.pm && !x.ro && /^\d+$/.test(String(x.id))), snaps = gear.map((x) => V.slim(x)), warns = [];
      toast('Equipping ' + (L.n || 'loadout ' + (i + 1)) + '...', { sticky: 1, icons: its.map((x) => x.i) });
      let okEq = false, err = '', canUndo = false;
      await V.act('equip loadout ' + (i + 1), () => { its.forEach((x) => { items().forEach((o) => { if (o !== x && o.loc === c && o.b === x.b && o.e) o.e = 0; }); x.loc = c; x.e = 1; }); }, async () => {
        try {
          const part = { revert: [] };
          if (snaps.length) { const res = await gt.applyLoadout({ items: snaps, carry: [], swaps: [], char: c }); canUndo = !!(res && res.undo); ((res && res.failed) || []).forEach((f) => { warns.push((f.n || 'An item') + ': ' + V.clean(f.why)); part.revert.push(f.id); }); }
          try { await gt.loEquip({ char: c, index: i }); } catch (e) { warns.push('In-game loadout: ' + V.clean(e)); }
          okEq = true; return part;
        } catch (e) { err = V.clean(e); throw e; }
      }, true);
      if (okEq) toast(warns.length ? 'Loadout equipped, with problems' : 'Loadout equipped', { icons: its.map((x) => x.i), lines: warns.slice(0, 5), bad: warns.length > 0, undo: canUndo ? c : '' });
      else toast('Loadout failed' + (err ? ': ' + err : ''), { bad: 1 });
      return;
    }
    if (a === 'igprep') {
      const its = L.items.map((id) => items().find((x) => x.id === id)).filter((x) => x && x.loc !== c && !x.e && !x.pm), sn = its.map((x) => ({ s: V.slim(x), from: x.loc }));
      mod = null; drawMod();
      if (!its.length) { toast('Everything in that loadout is already on this character.'); return; }
      V.act('prepare loadout ' + (i + 1), () => its.forEach((x) => { x.loc = c; }), async () => { for (const q of sn) await gt.move({ item: q.s, from: q.from, to: c }); }, true);
      return;
    }
    if (a === 'igid') { const sn = !L.items.length; mod = null; openIdent(c, i, sn ? 'snap' : 'ident'); return; }
    if (a === 'igdim') {
      const d = fromChar(c, L.n || 'Loadout ' + (L.i + 1)); d.it = L.items.map((id) => items().find((x) => x.id === id)).filter(Boolean).map(entOf);
      mod = null; drawMod(); if (!d.it.length) return;
      openEd(d, true); addMods(ed.d, ed.d.it.filter((q) => AB.includes(q.b) || q.b === SUB)); return;
    }
    if (a === 'igsh') { const d = fromChar(c, L.n || 'Loadout ' + (L.i + 1)); d.it = L.items.map((id) => items().find((x) => x.id === id)).filter(Boolean).map(entOf); mod = null; drawMod(); share(d); return; }
    if (a === 'igclr') { mod = null; drawMod(); V.act('clear loadout ' + (i + 1), () => { L.items = []; L.n = ''; L.ic = ''; L.c = ''; }, () => gt.loClear({ char: c, index: i }), true); return; }
    if (a === 'idok') {
      const nm = g('dlnm'), sl = g('dlslot'); if (nm) mod.nh = +nm.value; if (sl) mod.i = +sl.value;
      const m = mod; mod = null; drawMod();
      if (!m.nh || !m.ch || !m.ih) { toast('Pick a name, color and icon first.', { bad: 1 }); return; }
      const L2 = ((D.lo && D.lo[m.c]) || []).find((q) => q.i === m.i), payload = { char: m.c, index: m.i, nh: m.nh, ch: m.ch, ih: m.ih };
      const style = () => { Object.assign(L2, { nh: m.nh, ch: m.ch, ih: m.ih }); const f = (arr, h) => (arr.find((o) => o.h === h) || {}).v || ''; L2.n = f(LD.names, m.nh); L2.c = f(LD.colors, m.ch); L2.ic = f(LD.icons, m.ih); };
      const nm2 = (LD.names.find((o) => o.h === m.nh) || {}).v || 'loadout ' + (m.i + 1);
      const done = (p, okMsg) => p.then((good) => toast(good ? okMsg : 'Could not save the in-game loadout. Bungie only allows this while you are in orbit or a social space, and not mid-activity.', { bad: !good }));
      if (m.mode === 'snap') done(V.act('save loadout ' + (m.i + 1), () => { style(); L2.items = eqOf(m.c).map((x) => x.id); }, () => gt.loSnap(payload), true), 'Saved your current gear as ' + nm2 + ' (slot ' + (m.i + 1) + ')');
      else done(V.act('update loadout ' + (m.i + 1), style, () => gt.loIdent(payload), true), 'Updated ' + nm2);
    }
  }

  // ---------------- the page ----------------
  const hashes = (l) => ((l.n + ' ' + l.o).match(/(?:^|\s)#[A-Za-z][\w-]*/g) || []).map((s) => s.trim().toLowerCase());
  const noteHTML = (t) => esc(t).replace(/(^|\s)(#[A-Za-z][\w-]*)/g, (m, a, b) => `${a}<a class="dl-tag" data-tag="${b}">${b}</a>`);
  const shown = (cls) => {
    const f = FILT.trim().toLowerCase();
    let a = all().filter((l) => l.c === 3 || l.c === cls);
    if (f) a = a.filter((l) => (l.n + ' ' + l.o + ' ' + l.it.map((q) => q.n).join(' ')).toLowerCase().includes(f));
    return a.sort((x, y) => (SORT === 'name' ? x.n.localeCompare(y.n) : y.t - x.t));
  };
  const statsOf = (xs) => {
    const w = xs.filter((x) => x.st); if (!w.length) return '';
    const t = [0, 0, 0, 0, 0, 0]; w.forEach((x) => x.st.forEach((v, i) => { t[i] += v; }));
    return `<div class="dl-stats" title="Armor stats of these pieces">${t.map((v, i) => `<span title="${STL[i][1]}">${STL[i][0]}<b>${v}</b></span>`).join('')}<span class="dl-tot">Total <b>${t.reduce((s, v) => s + v, 0)}</b></span></div>`;
  };
  const tileOf = (r) => (r.x ? V.tile(r.x).replace(/ fade(?=[" ])/, '') : `<div class="vt dl-miss" title="Missing: ${esc(r.en.n || 'item')}">${r.en.i ? `<img src="${esc(V.icon(r.en.i))}" alt="">` : '?'}</div>`);
  const plugIcons = (m, big) => m.map((p) => `<span class="ap ${big ? 'md' : 'sm'}" title="${esc(p[3])}">${p[2] ? `<img src="${esc(V.icon(p[2]))}" alt="">` : ''}</span>`).join('');
  function cardHTML(l) {
    const res = resolve(l), miss = res.filter((r) => !r.x).length, c = V.ent(CH);
    const grp = (label, bs) => {
      const a = res.filter((r) => bs.includes(r.en.b)).sort((p, q) => bs.indexOf(p.en.b) - bs.indexOf(q.en.b)); if (!a.length) return '';
      const sub = bs[0] === SUB;
      return `<div class="dl-g"><div class="dl-gl">${label}</div><div class="dl-tiles">${a.map((r) => `<div class="dl-tt${r.en.e === 0 ? ' dl-ne' : ''}">${tileOf(r)}${r.en.m.length && !sub && PLC[l.id] ? `<div class="dl-pm">${plugIcons(r.en.m)}</div>` : ''}</div>`).join('')}</div>${sub ? `<div class="dl-sp2">${a.map((r) => plugIcons(r.en.m)).join('')}</div>` : ''}${label === 'Armor' ? statsOf(a.map((r) => r.x).filter(Boolean)) : ''}</div>`;
    };
    const mods = l.it.flatMap((q) => (AB.includes(q.b) ? q.m : []));
    return `<div class="card dl-card" id="dlc-${esc(l.id)}" data-id="${esc(l.id)}"><div class="dl-ch"><b class="dl-nm">${esc(l.n || 'Untitled')}</b><span class="dl-cl">${l.c < 3 ? esc(CL[l.c]) : 'Any class'}</span>${miss ? `<span class="dl-mc2" title="Items that are no longer in your inventory">${miss} missing</span>` : ''}<span class="dl-sp"></span><div class="dl-bt"><button class="b" data-dl="apply" data-id="${esc(l.id)}" title="Equip this on ${esc(c ? CL[c.cls] : 'this character')}">Apply</button><button class="g" data-dl="edit" data-id="${esc(l.id)}">Edit</button><button class="g" data-dl="copy" data-id="${esc(l.id)}">Edit Copy</button><button class="g" data-dl="share" data-id="${esc(l.id)}">Share</button><button class="g" data-dl="img" data-id="${esc(l.id)}" title="Make a picture of this loadout to post on Discord">Image</button>${window.__gth ? window.__gth.btn('lo', l.id, l.n || 'Loadout') : ''}<button class="g dl-del" data-dl="del" data-id="${esc(l.id)}" title="Delete this loadout">&#128465;</button></div></div>${l.o ? `<div class="dl-notes-v">${noteHTML(l.o)}</div>` : ''}<div class="dl-body">${SECS.map(([label, bs]) => grp(label, bs)).join('')}</div>${mods.length ? `<div class="dl-mrow"><span class="dl-gl">Mods</span>${plugIcons(mods)}<button class="g" data-dl="plc" data-id="${esc(l.id)}">${PLC[l.id] ? 'Hide' : 'Show'} Mod Placement</button></div>` : ''}${l.a.length ? `<div class="dl-mrow"><span class="dl-gl">Artifact${l.ai && l.ai.n ? ' &middot; ' + esc(l.ai.n) : ''}</span>${aRowL(l.a)}</div>` : ''}${l.mv ? '<div class="dl-fl">Moves other weapons and armor away when applied.</div>' : ''}</div>`;
  }
  function listsHTML(c) {
    const ls = shown(c.cls);
    return ls.map(cardHTML).join('') || `<p class="mute dl-none">${FILT.trim() ? 'No loadouts match that filter.' : 'No loadouts yet. Use Create Loadout, or Save Loadout on the Equipped card.'}</p>`;
  }
  function namesHTML(c) { return shown(c.cls).map((l) => `<a class="dl-nl" data-dl="go" data-id="${esc(l.id)}">${esc(l.n || 'Untitled')}</a>`).join('') || ''; }
  function drawLists() {
    const c = V.ent(CH); if (!c) return;
    const a = g('dlcards'), n = g('dlnames'); if (a) a.innerHTML = listsHTML(c); if (n) n.innerHTML = namesHTML(c);
    const w = g('dlwarn'); if (w) w.innerHTML = warnHTML(c);
  }
  function warnHTML(c) {
    const ls = shown(c.cls), bad = ls.map((l) => ({ l, m: missOf(l) })).filter((q) => q.m.length), n = bad.reduce((s, q) => s + q.m.length, 0);
    const tags = [...new Set(ls.flatMap(hashes))].sort();
    return (n ? `<details class="dl-warn"><summary>Missing Items (${n})</summary><div class="dl-wl">${bad.map((q) => `<div><b>${esc(q.l.n || 'Untitled')}</b>: ${q.m.map((r) => esc(r.en.n || 'Unknown item')).join(', ')}</div>`).join('')}<button class="g" data-dl="rmmiss">Remove missing items from these loadouts</button></div></details>` : '')
      + `<p class="dl-tip">Tip: put #hashtags in a loadout's name or notes (like #pvp or #raid), then click a tag to show only those loadouts.</p>${tags.length ? `<div class="dl-tags">${tags.map((t) => `<a class="dl-tag${FILT.trim().toLowerCase() === t ? ' on' : ''}" data-tag="${esc(t)}">${esc(t)}</a>`).join('')}</div>` : ''}`;
  }
  function render() {
    const D = D0();
    if (!D) { sec.innerHTML = '<div class="card"><p class="mute">Connect and load your vault first (Inventory tab), then your loadouts appear here.</p></div>'; return; }
    const chars = V.chars();
    if (!CH || !V.ent(CH)) CH = chars[0].id;
    if (ARCH !== CH) artSel(); else if (AR === undefined) artLoad();
    const c = V.ent(CH), S = V.set();
    const fa = document.activeElement, keep = fa && fa.id === 'dlf' ? [fa.selectionStart, fa.selectionEnd] : null;
    const side = chars.map((q) => `<div class="dl-cc${q.id === CH ? ' on' : ''}${S.emblems && q.em ? ' em' : ''}" data-dl="char" data-id="${esc(q.id)}" style="--cc:${V.CC[q.cls] || '#3a3d43'}${S.emblems && q.em ? `;background-image:linear-gradient(90deg,rgba(0,0,0,.05),rgba(0,0,0,.55)),url(${esc(V.icon(q.em))})` : ''}"><div class="dn"><b>${esc(CL[q.cls] || 'Guardian')}</b>${q.tt ? `<small style="color:${q.gl ? '#f1cc4f' : '#d9a6ff'}">${esc(q.tt)}</small>` : ''}</div><span>${q.light}</span></div>`).join('');
    const slots = ((D.lo && D.lo[CH]) || []).filter((l) => l.items.length);
    const eqIds = new Set(eqOf(CH).map((x) => x.id)), byid = new Map(items().map((x) => [x.id, x]));
    const ig = slots.map((L) => {
      const its = L.items.map((id) => byid.get(id)).filter(Boolean), miss = L.items.length - its.length, on = its.length && !miss && its.every((x) => eqIds.has(x.id));
      return `<button class="dl-sl${on ? ' cur' : ''}" data-dl="ig" data-i="${L.i}" title="${esc(L.n || 'Loadout')} (slot ${L.i + 1})${miss ? ' - ' + miss + ' missing' : ''}">${L.c ? `<span class="lc" style="background-image:url(${esc(V.icon(L.c))})"></span>` : ''}${L.ic ? `<img src="${esc(V.icon(L.ic))}" alt="">` : ''}<i>${L.i + 1}</i>${miss ? '<u class="wn">!</u>' : on ? '<u class="ok">&#10003;</u>' : ''}</button>`;
    }).join('');
    const eq = eqOf(CH), art = AR && !AR.none && AR.socks && AR.socks.length;
    sec.innerHTML = `<div class="dl-wrap"><aside class="dl-side"><div class="dl-chars">${side}</div>
<label class="dl-srt">Sort by<select id="dlsort"><option value="time"${SORT === 'time' ? ' selected' : ''}>Edit time</option><option value="name"${SORT === 'name' ? ' selected' : ''}>Name</option></select></label>
<button class="b" data-dl="new">Create Loadout</button><button class="g" data-dl="imp">Import Loadout</button>
<input id="dlf" placeholder="Filter loadouts" value="${esc(FILT)}" autocomplete="off" spellcheck="false"><div id="dlnames" class="dl-names">${namesHTML(c)}</div></aside>
<div class="dl-main"><h2 class="dl-h">In-game loadouts</h2><div class="dl-ig">${ig || '<span class="mute">No in-game loadouts on this character yet. Use Save As In-Game Loadout below.</span>'}</div>
<h2 class="dl-h">Loadouts</h2><div id="dlwarn">${warnHTML(c)}</div>
<div class="card dl-card dl-eqc"><div class="dl-ch"><b class="dl-nm">Equipped</b><span class="dl-cl">${esc(CL[c.cls] || '')} ${c.light}</span><span class="dl-sp"></span><div class="dl-bt"><button class="b" data-dl="saveeq">Save Loadout</button><button class="g" data-dl="shareeq">Share</button><button class="g" data-dl="igsave">Save As In-Game Loadout</button></div></div><div class="dl-tiles">${eq.map((x) => V.tile(x).replace(/ fade(?=[" ])/, '')).join('') || '<span class="mute">Nothing equipped.</span>'}</div>
<div id="dleqx"></div>
${art ? `<div class="dl-mrow"><span class="dl-gl">Artifact &middot; ${esc(AR.item.n)}</span>${aRow(curPerks())}</div>` : ''}</div>
<div id="dlcards">${listsHTML(c)}</div></div></div>`;
    if (keep) { const i = g('dlf'); if (i) { i.focus(); i.setSelectionRange(keep[0], keep[1]); } }
    eqLive(CH);
  }
  // Subclass abilities and armor mods of what this character has equipped right now.
  const EQC = {};
  async function eqLive(cid) {
    const sub = eqOf(cid).find((x) => x.b === SUB), arm = eqOf(cid).filter((x) => AB.includes(x.b));
    const key = cid + ':' + [sub, ...arm].filter(Boolean).map((x) => x.id).join(',');
    const draw = (r) => { const el = g('dleqx'); if (!el || CH !== cid) return; el.innerHTML = (r.sub.length ? `<div class="dl-mrow"><span class="dl-gl">Subclass</span>${plugIcons(r.sub, 'big')}</div>` : '') + (r.mods.length ? `<div class="dl-mrow"><span class="dl-gl">Mods</span>${plugIcons(r.mods, 'big')}</div>` : ''); };
    if (EQC[key] && Date.now() - EQC[key].t < 30000) { draw(EQC[key]); return; }
    const g0 = g('dleqx'); if (g0 && EQC[key]) draw(EQC[key]);
    const r = { t: Date.now(), sub: [], mods: [] };
    try {
      if (sub) r.sub = (await capture(sub)) || [];
      for (const x of arm) r.mods.push(...((await capture(x)) || []));
    } catch (e) { return; }
    EQC[key] = r; draw(r);
  }
  sec.onclick = (e) => {
    const D = D0(); if (!D) return;
    const tg = e.target.closest('[data-tag]');
    if (tg) { FILT = FILT.trim().toLowerCase() === tg.dataset.tag ? '' : tg.dataset.tag; const f = g('dlf'); if (f) f.value = FILT; drawLists(); return; }
    const b = e.target.closest('[data-dl]'); if (!b) return;
    const a = b.dataset.dl, id = b.dataset.id, l = id && all().find((q) => q.id === id), c = V.ent(CH);
    if (a === 'char') { CH = id; FILT = ''; render(); }
    else if (a === 'new') { const d = norm({ id: newId(), n: '', c: c.cls, o: '', it: [], a: [], mv: 0 }); openEd(d, true); }
    else if (a === 'imp') { mod = { t: 'imp', text: '', msg: '' }; drawMod(); const i = g('dlimp'); if (i) i.focus(); }
    else if (a === 'opt') { const ob = document.querySelector('nav button[data-t=optimizer]'); if (ob) ob.click(); else toast('The optimizer is not available.', { bad: 1 }); }
    else if (a === 'ig') { mod = { t: 'igp', c: CH, i: +b.dataset.i }; drawMod(); }
    else if (a === 'saveeq') { const d = fromChar(CH, ''); openEd(d, true); addMods(ed.d, ed.d.it.filter((q) => AB.includes(q.b) || q.b === SUB)); artEd('artcur'); } // like DIM: the equipped artifact and its perks come along
    else if (a === 'shareeq') { const d = fromChar(CH, 'Equipped'); share(d); }
    else if (a === 'igsave') {
      const D2 = D0(), slots = (D2.lo && D2.lo[CH]) || [], free = slots.find((q) => !q.items.length) || slots[0];
      if (!free) { toast('This character has no in-game loadout slots.', { bad: 1 }); return; }
      openIdent(CH, free.i, 'snap');
    }
    else if (a === 'apply' && l) applyL(l, CH);
    else if (a === 'edit' && l) openEd(l, false);
    else if (a === 'copy' && l) { const d = clone(l); d.n = (l.n || 'Loadout') + ' copy'; openEd(d, true); }
    else if (a === 'share' && l) share(l);
    else if (a === 'img' && l) loImage(l);
    else if (a === 'del' && l) { if (confirm('Delete "' + (l.n || 'this loadout') + '"?')) { LS = all().filter((q) => q.id !== id); save(); render(); toast('Loadout deleted'); } }
    else if (a === 'plc' && l) { PLC[id] = !PLC[id]; drawLists(); }
    else if (a === 'go') { const el = g('dlc-' + id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } }
    else if (a === 'rmmiss') { shown(c.cls).forEach((q) => { const miss = new Set(missOf(q).map((r) => r.en)); if (miss.size) { q.it = q.it.filter((en) => !miss.has(en)); q.t = Date.now(); } }); save(); render(); toast('Removed missing items'); }
  };
  sec.oninput = (e) => { if (e.target.id === 'dlf') { FILT = e.target.value; drawLists(); } };
  sec.onchange = (e) => { if (e.target.id === 'dlsort') { SORT = e.target.value === 'name' ? 'name' : 'time'; try { localStorage.setItem('gt_dlsort', SORT); } catch (er) { /* default */ } render(); } };
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (g('apm')) { AP = null; renderAP(); return; }
    if (mod) { mod = null; drawMod(); return; }
    if (ed) closeEd();
  });
  new MutationObserver(() => { if (sec.classList.contains('on')) render(); }).observe(sec, { attributes: true, attributeFilter: ['class'] });

  // ---------------- styles ----------------
  const st = document.createElement('style');
  st.textContent = `
#loadouts{--t:var(--gt-t,44px);zoom:var(--gt-z,1)}
#apm{z-index:90!important}
.dl-wrap{display:flex;gap:18px;align-items:flex-start}
.dl-side{width:230px;flex:none;display:flex;flex-direction:column;gap:7px}
.dl-chars{display:flex;flex-direction:column;gap:6px;margin-bottom:4px}
.dl-cc{display:flex;align-items:center;gap:8px;height:50px;padding:0 12px;background:linear-gradient(90deg,var(--cc,#3a3d43),rgba(0,0,0,0) 90%) center/cover;border:1px solid var(--g-line);cursor:pointer;opacity:.6;text-shadow:0 1px 3px #000}
.dl-cc.em{background-size:cover;background-position:left center}.dl-cc.on{opacity:1;border-color:#e6e7ea}.dl-cc b{text-transform:uppercase;letter-spacing:2px;font-size:15px}.dl-cc small{display:block;font-size:11px;color:#c9ccd2}.dl-cc span{margin-left:auto;font-size:18px;color:#f5dc7a}
.dl-srt{display:flex;align-items:center;gap:8px;font-size:12px;color:#aeb2b9}.dl-srt select{flex:1}
.dl-side button,#dled button,#dlmod button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:#23262b;padding:6px 12px;cursor:pointer;font-size:13px}
.dl-side button:hover,#dled button:hover,#dlmod button:hover,.dl-card button:hover{border-color:#cfd2d8;color:#fff}
.dl-side button.b,.dl-card button.b,#dled button.b,#dlmod button.b{background:var(--g-accent2,#3a6ea5);border-color:transparent;color:var(--g-on-accent,#fff)}
#dled button:disabled{opacity:.4;cursor:default}
.dl-card button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:#23262b;padding:5px 11px;cursor:pointer;font-size:12px}
#dled button.on{background:#2c4a30;border-color:#4caf50;color:#fff}
.dl-del:hover{border-color:#d9534f!important;color:#ff8a85!important}
.dl-names{display:flex;flex-direction:column;gap:2px;max-height:50vh;overflow:auto;border-top:1px solid var(--g-line);padding-top:6px}
.dl-nl{padding:4px 6px;color:#cfd2d8;cursor:pointer;font-size:13px;border-left:2px solid transparent}.dl-nl:hover{background:rgba(255,255,255,.06);border-left-color:#e6e7ea;color:#fff}
.dl-main{flex:1;min-width:0}
.dl-h{font-size:13px!important;letter-spacing:3px;text-transform:uppercase;color:#aeb2b9!important;margin:2px 0 8px!important;border-bottom:1px solid var(--g-line);padding-bottom:4px}
.dl-ig{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.dl-sl{position:relative;width:50px!important;height:50px!important;min-height:0!important;border:1px solid #4a4d54!important;border-radius:6px!important;overflow:hidden;background:#23262b!important;display:flex;align-items:center;justify-content:center;padding:0!important}
:root #loadouts button.dl-sl{border-radius:6px!important;width:50px!important;height:50px!important;padding:0!important}
/* the loadout's own colour from the game, as its background (a span, so no theme button style can paint over it) */
.dl-sl .lc{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;z-index:0;pointer-events:none}.dl-sl>img,.dl-sl>i,.dl-sl>u{z-index:1}
.dl-sl>img{position:relative;width:40px;height:40px;display:block}.dl-sl i{position:absolute;right:3px;bottom:0;font-size:11px;font-style:normal;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000}
.dl-sl u{position:absolute;left:2px;top:1px;font-size:12px;text-decoration:none;font-weight:700;text-shadow:0 0 3px #000}.dl-sl .ok{color:#6fd36f}.dl-sl .wn{color:#ffb74d}.dl-sl.cur{border-color:#6fd36f!important}
.dl-warn{background:#3a2f12;border:1px solid #8a6d1d;color:#f0d98a;padding:6px 10px;margin-bottom:8px;border-radius:3px}.dl-warn summary{cursor:pointer;font-weight:700}.dl-wl{padding-top:6px;font-size:13px;display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.dl-tip{font-size:12px;color:#8c9098;margin:2px 0 8px}.dl-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.dl-tag{color:#7fb2ff;cursor:pointer;font-size:12px}.dl-tags .dl-tag{border:1px solid #2f4a73;padding:1px 8px;border-radius:10px}.dl-tag.on,.dl-tag:hover{color:#fff;background:#2f4a73}
.dl-card{margin-bottom:12px;padding:10px 12px!important}.dl-card.flash{outline:2px solid #7fb2ff}
.dl-ch{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}.dl-nm{font-size:17px;letter-spacing:1px;color:#fff}
.dl-cl{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8c9098}.dl-mc2{font-size:11px;color:#ffb74d;border:1px solid #8a6d1d;padding:0 6px;border-radius:9px}
.dl-sp{flex:1}.dl-bt{display:flex;gap:6px;flex-wrap:wrap}.dl-col{flex-direction:column}
.dl-notes-v{font-size:13px;color:#aab0ba;margin:0 0 8px;white-space:pre-wrap}
.dl-body{display:flex;flex-wrap:wrap;gap:6px 22px;align-items:flex-start}
.dl-g{display:flex;flex-direction:column;gap:4px}.dl-gl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7c7f86}
.dl-tiles{display:flex;gap:4px;flex-wrap:wrap}.dl-tt{display:flex;flex-direction:column;align-items:center;gap:3px}.dl-ne{opacity:.55}
.dl-miss{display:flex;align-items:center;justify-content:center;color:#ffb74d;font-size:20px;filter:grayscale(1) brightness(.6);border-color:#8a6d1d!important;cursor:default}
.dl-sp2{display:flex;gap:3px;flex-wrap:wrap;max-width:260px}
.dl-pm{display:flex;gap:2px;flex-wrap:wrap;justify-content:center;max-width:calc(var(--t) + 8px)}
.ap.sm{width:22px;height:22px;border-width:1px}
.dl-stats{display:flex;gap:6px;font-size:11px;color:#9aa0a8;flex-wrap:wrap}.dl-stats b{color:#fff;margin-left:2px}.dl-tot{margin-left:4px;color:#f5dc7a}
.dl-mrow{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:8px}.dl-mrow .dl-gl{margin-right:6px}
.dl-fl{font-size:11px;color:#8c9098;margin-top:6px}
.dl-eqc{border-color:#4a4d54!important}
.dl-none{padding:14px 4px}
#dled{--t:var(--gt-t,44px);position:fixed;left:0;right:0;bottom:0;height:78vh;z-index:85;background:#14161a;border-top:1px solid #4a4d54;color:#e6e7ea;box-shadow:0 -8px 30px rgba(0,0,0,.65);display:flex;flex-direction:column}
.dl-eb{display:flex;flex-direction:column;height:100%;min-height:0}
.dl-ehd{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #2b2d31;flex-wrap:wrap}
#dled input:not([type=checkbox]),#dled textarea,#dlmod textarea,#dlmod select{background:#0e1013;border:1px solid #3a3d43;border-radius:3px;color:#fff;padding:7px 10px;font:inherit}
.dl-name{flex:1;min-width:200px;max-width:420px;font-size:16px!important}.dl-ac{display:flex;align-items:center;gap:6px;font-size:13px;color:#cfd2d8;white-space:nowrap}.dl-cls{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8c9098}
.dl-ebody{flex:1;overflow:auto;padding:10px 14px;display:flex;flex-direction:column;gap:10px}.dl-ebody>*{flex:none}
.dl-notes{width:100%;height:54px;resize:vertical}.dl-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dl-es{border-top:1px solid #23262b;padding-top:8px}.dl-es.dis{opacity:.45}.dl-eh{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#aeb2b9;margin-bottom:6px;display:flex;gap:10px;align-items:center}.dl-eh small{color:#6d7077;letter-spacing:0;text-transform:none}
.dl-er{display:flex;gap:12px;flex-wrap:wrap}.dl-slot{display:flex;flex-direction:column;gap:3px;align-items:center}.dl-sn{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#7c7f86}
.dl-tw{cursor:pointer}.dl-empty{width:var(--t);height:var(--t);border:1px dashed #4a4d54;display:flex;align-items:center;justify-content:center;color:#6d7077;font-size:22px}.dl-empty:hover{border-color:#fff;color:#fff}
.dl-sf{display:flex;gap:3px}.dl-sf button{padding:1px 6px!important;font-size:11px!important}
.dl-pk{background:#101216;padding:8px}.dl-pk input{width:100%;margin-bottom:8px}.dl-pl{display:flex;flex-wrap:wrap;gap:4px;max-height:30vh;overflow:auto}.dl-pi{cursor:pointer}.dl-pi.on .vt{outline:2px solid #6fd36f}
.dl-wr{color:#ffb74d;font-size:13px}
.dl-ef{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #2b2d31;background:#0e1013;flex-wrap:wrap}
#dlmod{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;--t:var(--gt-t,44px)}
.dl-mc{background:#1a1c20;border:1px solid #4a4d54;border-radius:4px;padding:16px;min-width:300px;max-width:min(560px,92vw);max-height:86vh;overflow:auto;color:#e6e7ea;display:flex;flex-direction:column;gap:10px}
.dl-mc h3{margin:0;font-size:16px;letter-spacing:1px}.dl-mc textarea{width:100%;height:130px;font-family:monospace;font-size:12px}.dl-mc label{font-size:12px;color:#aeb2b9;display:flex;flex-direction:column;gap:4px}
.dl-ig-pop{min-width:340px}.dl-ipH{display:flex;align-items:center;gap:12px;padding:10px;background:#23262b center/cover no-repeat;border-radius:3px}.dl-ipH img{width:44px;height:44px}.dl-ipH h3{text-shadow:0 1px 3px #000}
.dl-ig-pop .dl-bt button{width:100%;text-align:left}
.dl-idm .lpk{display:grid;gap:4px}
#dlt{display:none;position:fixed;left:16px;bottom:16px;z-index:99;background:#1f3a24;border:1px solid #4caf50;color:#fff;padding:10px 14px;border-radius:3px;max-width:380px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5)}
#loimg{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px}#loimg .li{background:#17181b;border:1px solid #2f3238;padding:14px;max-width:min(1000px,100%)}#loimg img{display:block;width:100%;height:auto;border:1px solid #2f3238}#loimg p{margin:10px 0 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}#dlt .dl-undo{margin-top:8px}.dl-coss{display:flex;flex-wrap:wrap;gap:10px}.dl-cs{display:inline-flex;align-items:center;gap:3px;padding:2px 6px 2px 2px;border:1px solid #2f3238;border-radius:3px}.dl-csi{width:30px;height:30px;border:1px solid #3a3d43}#dlt .dl-undo{margin-top:8px;padding:4px 12px;font-size:12px}#dlt.bad{background:#3d2218;border-color:#d9772f}.dl-ti{display:flex;gap:3px;flex-wrap:wrap;margin-top:6px}.dl-ti img{width:28px;height:28px;border:1px solid #455565}.dl-tl{font-size:12px;margin-top:4px;color:#f1d6c8}
#dled{background:#0f1114}
.dl-panels{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}.dl-pn{flex:0 1 auto;max-width:100%}
.dl-ehd #dlen{width:auto;flex:1 1 220px}.dl-ehd #dlcls{width:auto;flex:none;background:#0e1013;border:1px solid #3a3d43;color:#fff;padding:7px 10px;border-radius:3px}
#dled .dl-notes{width:100%;box-sizing:border-box}
.dl-pn{background:#181a1e;border:1px solid #2e3136;display:flex;flex-direction:column}.dl-pn.dis{opacity:.45;pointer-events:none}
.dl-ph{padding:6px 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#cfd2d8;border-bottom:1px solid #2e3136;background:#1d2024}
.dl-pb{padding:10px;display:flex;flex-direction:column;gap:8px}.dl-pf{padding:8px 10px;border-top:1px solid #2e3136;display:flex;gap:6px;flex-wrap:wrap}
.dl-subrow{display:flex;gap:10px;align-items:flex-start}.dl-subpl{display:flex;gap:4px;flex-wrap:wrap}
.dl-artrow{display:flex;gap:8px;align-items:center}.dl-ai img{width:44px;height:44px;border:1px solid #4a4d54}
.dl-sub{max-width:min(640px,94vw)}.dl-sw{display:flex;flex-direction:column;gap:8px}.dl-sr{display:flex;gap:10px;align-items:center;border-top:1px solid #2b2d31;padding-top:6px}
.dl-sr .dl-gl{width:90px;flex:none}.dl-so{display:flex;gap:4px;flex-wrap:wrap}.dl-so .ap{cursor:pointer;opacity:.6}.dl-so .ap.on{opacity:1;outline:2px solid #6fd36f}.dl-so .ap:hover{opacity:1}
@media (max-width:900px){.dl-wrap{flex-direction:column}.dl-side{width:100%}.dl-chars{flex-direction:row}.dl-cc{flex:1}}@media (max-width:520px){.dl-cc{flex:1 1 0;min-width:0;padding:0 8px;gap:4px}.dl-cc b{font-size:12.5px;letter-spacing:1px}.dl-cc .dn{min-width:0;flex:1;overflow:hidden}.dl-cc .dn b,.dl-cc .dn small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}.dl-cc span{flex:none;font-size:13px}}`;
  document.head.appendChild(st);

  window.__gtl = {
    render, reset() { AR = undefined; ARCH = null; Object.keys(ARC).forEach((k) => delete ARC[k]); LD = null; render(); },
    // for tests and for other tabs
    _all: all, _codeOf: codeOf, _decode: decode, _resolve: resolve,
    // for the Home page: a loadout's name and icons, and Apply / Open from there
    get: (id) => { const l = all().find((q) => q.id === id); if (!l) return null; const res = resolve(l); return { n: l.n, cls: l.c < 3 ? CL[l.c] : 'Any class', icons: res.map((r) => V.icon(r.x ? rawIcon(r.x.i) : r.en.i)).filter(Boolean) }; },
    apply: (id) => { const l = all().find((q) => q.id === id); if (l) applyL(l, fillChar(l)); },
    go: (id) => { show('loadouts'); render(); setTimeout(() => { const el = g('dlc-' + id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } }, 60); },
  };
})();
