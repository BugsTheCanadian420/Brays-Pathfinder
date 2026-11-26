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
        // weapon perks picked for a build ([hash, name, icon]): shown on the build's page and picture, never put on your weapon
        wp: (Array.isArray(q.wp) ? q.wp : []).slice(0, 8).map((p) => (Array.isArray(p) && int(p[0]) > 0 ? [int(p[0]), String(p[1] || '').slice(0, 60), rawIcon(p[2])] : null)).filter(Boolean),
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
  const codeOf = (l) => 'GTL1:' + b64e(JSON.stringify({ v: 1, n: l.n, c: l.c, o: l.o, a: l.a, ai: l.ai, fm: l.fm, mv: l.mv, it: l.it.map((q) => ({ h: q.h, b: q.b, n: q.n, i: q.i, e: q.e, m: q.m, ...(q.wp && q.wp.length ? { wp: q.wp } : {}) })) }));
  function decode(s) {
    const m = /GTL1:([A-Za-z0-9+/=]+)/.exec(String(s || '')); if (!m) throw new Error('That is not a loadout code. It should start with GTL1:');
    let o; try { o = JSON.parse(b64d(m[1])); } catch (e) { throw new Error('That loadout code is damaged. Ask for it again.'); }
    const l = norm({ ...o, id: '', t: Date.now(), k: Date.now() });
    if (!l || !l.it.length) throw new Error('That loadout has no items in it.');
    return l;
  }

  // Share links: https://d2pathfinder.com/<code>/<name> (or the GitHub address of the website).
  // Share links: d2pathfinder.com, the old GitHub Pages address, or whatever address this copy of the site runs on (previews).
  const HERE = (() => { try { return /^https?:$/.test(location.protocol) ? location.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''; } catch (e) { return ''; } })();
  const LINKRE = new RegExp('(?:d2pathfinder\\.com|bugsthecanadian420\\.github\\.io\\/Brays-Pathfinder' + (HERE ? '|' + HERE : '') + ')(?:\\/beta)?\\/([A-Za-z0-9]{5,12})(?=[/?#\\s]|$)', 'i');
  const linkCode = (t) => { const m = LINKRE.exec(String(t || '')); return m && !/^(status|privacy|download|beta|index|terms)$/i.test(m[1]) ? m[1] : ''; }; // site pages are not share codes
  // A picture made with Pathfinder has its loadout code inside the file.
  // A picture on the clipboard, for the Paste button: the app reads it natively, a browser asks for permission.
  async function clipPic() {
    try { const b = gt.readClipboardImage && (await gt.readClipboardImage()); if (b) return new Blob([Uint8Array.from(atob(b), (c) => c.charCodeAt(0))], { type: 'image/png' }); } catch (e) { /* the browser way below */ }
    try { if (navigator.clipboard && navigator.clipboard.read) for (const it of await navigator.clipboard.read()) { const ty = it.types.find((x) => /^image\//.test(x)); if (ty) return await it.getType(ty); } } catch (e) { /* refused or nothing there */ }
    return null;
  }
  async function impPic(file, pasted) {
    if (!mod || mod.t !== 'imp' || !file) return;
    try {
      const code = pngText(new Uint8Array(await file.arrayBuffer()), PNGK);
      if (!code) {
        mod.msg = 'Reading the picture...'; drawMod();
        const sc = (await qrRead(file)) || (await qRead(file));
        if (sc) { mod.msg = 'Getting the shared loadout...'; drawMod(); const r = await gt.loShareGet({ code: sc }); const l = decode(r.c); if (!l.n && r.n) l.n = r.n; mod = null; drawMod(); importLo(l); return; }
      }
      if (!code) throw new Error('Pathfinder can\'t find a loadout in this picture. Pictures made before this update lose their loadout when Discord or another app re-saves them: ask for a new picture (new ones have a QR code in the bottom corner), use the original picture file, or type the link printed at the bottom of the picture.');
      const l = decode(code); mod = null; drawMod(); importLo(l);
    } catch (er) { if (mod) { mod.msg = V.clean(er); drawMod(); } }
  }
  function importLo(l) {
    l.id = newId(); l.t = l.k = Date.now();
    resolve(l).forEach((r) => { if (r.x) r.en.id = r.x.id; });
    if (l.c < 3 && !l.n) l.n = 'Imported loadout';
    all().push(l); save();
    if (l.c < 3) { const ch = V.chars().find((q) => q.cls === l.c); if (ch) CH = ch.id; }
    FILT = ''; render();
    const miss = missOf(l).length; toast('Imported ' + (l.n || 'loadout') + (miss ? ' (' + miss + ' item' + (miss > 1 ? 's' : '') + ' not in your inventory)' : ''));
  }
  // Someone opened a share link on the website: show the loadout (no sign-in needed to look), with a button to add it.
  // A phone's browser (a scanned QR code opens there) rather than the home-screen app, which keeps its own loadouts on iPhones.
  const homeTip = () => { try { return !!(mod && mod.code) && document.documentElement.classList.contains('gtweb') && matchMedia('(pointer:coarse)').matches && !matchMedia('(display-mode: standalone)').matches && !navigator.standalone; } catch (e) { return false; } };
  // The Builds tab opens a build here: the same pop-up as a share link, with "Add to my loadouts".
  window.__gtlo = Object.assign(window.__gtlo || {}, {
    // the Builds tab asks for a picture of a build its owner shared before builds had pictures
    async buildPic(code, title) { const l = decode(code); if (title) l.n = String(title).slice(0, 80); return buildPic(l); },
    // Builds tab > Create build: the loadout editor in build mode (any item, Share to Builds at the bottom).
    createBuild() { let c = 3; try { const e0 = CH && V.ent(CH); if (e0 && e0.cls !== undefined) c = e0.cls; } catch (e) { /* any class */ } openEd(norm({ id: newId(), n: '', c, o: '', it: [], a: [], mv: 0 }), true, { build: true }); },
    openBuild(code, meta) { const l = decode(code); if (meta && meta.title) l.n = String(meta.title).slice(0, 80); mod = { t: 'shin', l, bid: meta && meta.id, by: meta && meta.by }; drawMod(); },
  });
  function shinHTML() {
    const l = mod.l, signed = !!D0(), cls = l.c < 3 ? CL[l.c] : 'Any class';
    const grp = (bs) => l.it.filter((q) => bs.includes(q.b)).sort((a, b) => bs.indexOf(a.b) - bs.indexOf(b.b));
    const row = (q) => `<div class="dl-shi${q.e === 0 ? ' fade' : ''}"><span>${q.i ? `<img src="${esc(V.icon(q.i))}" alt="">` : ''}</span><b>${esc(q.n || 'Item')}</b></div>`;
    const sec2 = (t, bs) => { const l2 = grp(bs); return l2.length ? `<h4>${t}</h4><div class="dl-shg">${l2.map(row).join('')}</div>` : ''; };
    return `<div class="dl-mc dl-shin"><h3>${esc(l.n || 'Shared loadout')}</h3><p class="mute">${esc(cls)} &middot; ${mod.bid ? 'a build by ' + esc(mod.by || 'a Guardian') + ' from the Builds tab' : 'shared with Pathfinder'}${l.o ? ' &middot; ' + esc(String(l.o).slice(0, 140)) : ''}</p>${sec2('Subclass', [SUB])}${sec2('Weapons', WB)}${sec2('Armor', AB)}${sec2('General', GB)}${l.a && l.a.length ? `<p class="mute">Includes ${l.a.length} artifact perks${l.fm && l.fm.length ? ' and ' + l.fm.length + ' mods' : ''}.</p>` : ''}${signed ? '' : '<div class="dl-wr">Sign in (Inventory tab) to add it to your loadouts. Items are matched to the ones you own.</div>'}${homeTip() ? '<p class="mute dl-hst">Using Pathfinder from your home screen? Copy the link, then open Pathfinder there and paste it into Loadouts &gt; Import loadout. <button class="g" data-md="shcopy">Copy link</button></p>' : ''}<div class="dl-bt"><button class="b" data-md="shadd"${signed ? '' : ' disabled'}>Add to my loadouts</button><span class="dl-sp"></span><button class="g" data-md="x">Close</button></div></div>`;
  }
  (async () => {
    let sp; try { sp = new URLSearchParams(location.search); } catch (e) { return; }
    // Kept for this tab, so signing in (which leaves the page and comes back) does not lose the link you opened.
    let code = sp.get('s'); if (!code) { try { code = sessionStorage.getItem('gt.share') || ''; } catch (e) { code = ''; } }
    if (!code || !/^[A-Za-z0-9]{5,12}$/.test(code) || !gt.loShareGet) return;
    try { sessionStorage.setItem('gt.share', code); } catch (e) { /* storage off */ }
    try { sp.delete('s'); sp.delete('n'); history.replaceState(null, '', location.pathname + (sp.toString() ? '?' + sp : '') + location.hash); } catch (e) { /* keep the address */ }
    try {
      const r = await gt.loShareGet({ code }); const l = decode(r.c); if (!l.n && r.n) l.n = r.n;
      mod = { t: 'shin', l, code }; drawMod();
      // the Add button switches on as soon as your vault has loaded
      const tick = setInterval(() => { if (!mod || mod.t !== 'shin') { clearInterval(tick); return; } if (D0()) { clearInterval(tick); drawMod(); } }, 1000);
    } catch (er) { toast('Could not open that share link: ' + V.clean(er), { bad: 1 }); }
  })();

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
    if (o.bad && window.__gtLog) window.__gtLog(msg, 'loadouts');
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
  // A character's equipped artifact, waiting for any read already under way instead of giving up (sharing used to draw the
  // picture without the artifact the first time, then with it the second time, once the read had finished).
  async function artFor(cid) {
    const nap = () => new Promise((ok) => setTimeout(ok, 150));
    for (let i = 0; i < 120 && !ARC[cid] && ARLOAD; i++) await nap(); // another read is under way
    if (!ARC[cid] && !ARLOAD) await artLoad(false, cid);
    for (let i = 0; i < 120 && !ARC[cid]; i++) { await nap(); if (!ARLOAD && i === 40 && !ARC[cid]) await artLoad(false, cid); } // the quiet read of the other characters may be filling it in
    const a = ARC[cid] && ARC[cid].v;
    return a && !a.none && a.item && a.socks && a.socks.length ? a : null;
  }
  const withArt = (d, a) => { if (a) { d.ai = itemOf(a.item); d.a = a.socks.map((q) => q.cur).filter(Boolean).map(permk); } return d; };
  const artSel = () => { if (ARC[CH]) { AR = ARC[CH].v; ARERR = ARC[CH].e; ARCH = CH; } else { AR = undefined; ARCH = null; ARERR = ''; artLoad(); } };
  const curPerks = () => (AR && AR.socks ? AR.socks.map((q) => q.cur) : []);
  const plugOf = (h) => PL[h] || (AR && AR.plugs && AR.plugs[h]) || null;
  const aIcon = (p) => `<span class="ap" data-ph="${int(p.h)}" title="${esc((p.n || '') + (p.d ? '\n' + p.d : ''))}">${p.i ? `<img src="${esc(V.icon(p.i))}" alt="">` : ''}</span>`;
  const aRow = (picks) => picks.map((q) => { const p = plugOf(q) || {}; return aIcon({ h: q, n: p.n || '', d: p.d || '', i: p.i || '' }); }).join('');
  const aRowL = (a) => a.map((q) => { const p = plugOf(q[0]); return aIcon({ h: q[0], n: (p && p.n) || q[1], d: (p && p.d) || '', i: (p && p.i) || q[2] }); }).join('');
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
  // Subclass setups in the game's order: super, class ability, jump, melee, grenade, aspects, fragments. New captures are sorted by
  // what each socket is; older saved ones are in Bungie's socket order, where the super is socket 2, so it is moved to the front.
  const SUBRK = [[/super/i, 0], [/class_abilit|classabilit/i, 1], [/movement|jump/i, 2], [/melee/i, 3], [/grenade/i, 4], [/aspect/i, 5], [/fragment/i, 6]];
  const subRank = (c) => { for (const [re, n] of SUBRK) if (re.test(c || '')) return n; return 7; };
  function subOrd(m) {
    if (!Array.isArray(m) || m.length < 3 || m[0][0] === 2) return m || [];
    const i = m.findIndex((p) => p[0] === 2); if (i <= 0) return m;
    return [m[i], ...m.slice(0, i), ...m.slice(i + 1)];
  }
  async function capture(x) {
    if (!x || !(AB.includes(x.b) || x.b === SUB) || !/^\d+$/.test(String(x.id))) return [];
    let d; try { d = await gt.itemDetail({ id: x.id, h: x.h }); } catch (e) { return null; }
    const out = [];
    ((d && d.groups) || []).forEach((gr) => {
      if (x.b !== SUB && gr.label !== 'Mods') return;
      (gr.cols || []).forEach((col) => {
        const on = col.find((p) => p.on);
        if (on && !CAPX.test(on.c || '') && int(on.si, -1) >= 0 && int(on.h) > 0) out.push([int(on.si), int(on.h), rawIcon(on.i), String(on.n || '').slice(0, 60), subRank(on.c)]);
      });
    });
    if (x.b === SUB) out.sort((p, q) => p[4] - q[4] || p[0] - q[0]);
    return out.map((p) => p.slice(0, 4));
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
  async function placeMods(pieces, mods, cid, warns, keep) {
    const slots = [];
    for (const x of pieces) {
      let ss = []; try { ss = await gt.itemSlots({ id: x.id }); } catch (e) { warns.push('Could not read the mod sockets of ' + x.n + '.'); continue; }
      ss.forEach((q) => slots.push({ x, si: q.si, cur: q.cur, cat: q.cat, used: !!(keep && keep.get(x.id) && keep.get(x.id).has(q.si)) }));
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
        if (l.fm && l.fm.length) await placeMods(good.filter((q) => AB.includes(q.x.b) && q.en.e !== 0).map((q) => q.x), l.fm, cid, warns, new Map(good.map((q) => [q.x.id, new Set((q.en.m || []).map((p) => p[0]))])));
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
  // Title and one-line summary for a share link's preview card: class and subclass, the weapons, and the exotic armor.
  function shareMeta(l) {
    try {
      const res = resolve(l), by = (b) => res.find((r) => r.en.b === b) || null, nm = (r) => (r ? String((r.x || r.en).n || '') : '');
      const sub = nm(by(SUB)), cls = l.c < 3 ? CL[l.c] : '';
      const weps = WB.map(by).map(nm).filter(Boolean);
      const exo = AB.map(by).filter((r) => r && r.x && r.x.r === 'Exotic').map(nm).filter(Boolean);
      const subHas = !!(sub && cls && sub.toLowerCase().includes(cls.toLowerCase())); // "Prismatic Titan" already says Titan
      const head = subHas ? sub : [cls, sub].filter(Boolean).join(' · ');
      const d = [head, [weps.join(', '), exo.length ? 'Exotic: ' + exo.join(', ') : ''].filter(Boolean).join(' · ')].filter(Boolean).join(' — ');
      const n = String(l.n || 'Loadout'), t = /^equipped$/i.test(n.trim()) && cls ? 'Equipped ' + (subHas ? sub : cls + (sub ? ' (' + sub + ')' : '')) : n;
      return { t: t.slice(0, 100), d: d.slice(0, 300) };
    } catch (e) { return { t: String(l.n || 'Loadout').slice(0, 100), d: '' }; }
  }
  // Draws the preview picture for a share link and sends it (a smaller JPEG). Never in the way: failures are ignored.
  async function sharePreview(l, code) {
    if (!gt.loShareImg) return false;
    const cv = await drawPic(l);
    let w = cv.width, h = cv.height; const sc = Math.min(1, 1200 / w); w = Math.round(w * sc); h = Math.round(h * sc);
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; const x2 = c2.getContext('2d'); x2.fillStyle = '#0e0f11'; x2.fillRect(0, 0, w, h); x2.drawImage(cv, 0, 0, w, h);
    let q = 0.86, d = c2.toDataURL('image/jpeg', q);
    while (d.length > 1900000 && q > 0.5) { q -= 0.12; d = c2.toDataURL('image/jpeg', q); }
    await gt.loShareImg({ code, d });
    return true;
  }
  // A Pathfinder picture carries its loadout: the code inside the PNG file (read back by Import), and a short link printed at the
  // bottom (for screenshots and pictures an app re-saved, which drops the hidden part).
  const PNGK = 'Pathfinder-Loadout';
  // Pictures made before the QR code had a small black-and-white code block at the bottom-right carrying the share link's code
  // (still read, so those pictures keep importing). Unlike the hidden part,
  // it survives Discord, phones and apps that re-save, shrink or convert the picture (JPEG, WebP), so a picture pasted from the
  // clipboard still imports. Layout (on the 1200 px wide picture): 12 px squares, a black frame of 22 x 6 squares around 20 x 4
  // data squares, on a white card whose right edge is 32 px and bottom 12 px from the picture's edges. 80 data bits: a fixed
  // start byte, the code length, up to 10 characters (6 bits each, 0-9 A-Z a-z; share codes are 7) and a check byte.
  const QB = { W: 1200, m: 12, cols: 22, rows: 6, pad: 10, right: 32, bottom: 12 };
  const QA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const crc8 = (a) => { let c = 0; for (const v of a) { c ^= v; for (let k = 0; k < 8; k++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff; } return c; };
  // Reads the block back from a picture of any size (the same layout, scaled), trying small shifts in case the copy moved a pixel or two.
  async function qRead(file) {
    let bmp; try { bmp = await createImageBitmap(file); } catch (e) { return ''; }
    const w = bmp.width, h = bmp.height, sc = w / QB.W; if (w < 300) return '';
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g2 = cv.getContext('2d', { willReadFrequently: true }); g2.drawImage(bmp, 0, 0);
    const m = QB.m * sc, bw = (QB.cols * QB.m + QB.pad * 2) * sc, bh = (QB.rows * QB.m + QB.pad * 2) * sc;
    const bx = w - QB.right * sc - bw, by = h - QB.bottom * sc - bh;
    const rx = Math.max(0, Math.floor(bx - 6 * sc)), ry = Math.max(0, Math.floor(by - 6 * sc)), rw = Math.min(w - rx, Math.ceil(bw + 12 * sc)), rh = Math.min(h - ry, Math.ceil(bh + 12 * sc));
    if (rw < 10 || rh < 10) return '';
    const px = g2.getImageData(rx, ry, rw, rh).data;
    const lum = (x, y) => { let t = 0, n = 0; const rr = m >= 5 ? Math.round(m * 0.25) : 0; for (let yy = Math.round(y) - rr; yy <= Math.round(y) + rr; yy++) for (let xx = Math.round(x) - rr; xx <= Math.round(x) + rr; xx++) { const X = xx - rx, Y = yy - ry; if (X < 0 || Y < 0 || X >= rw || Y >= rh) continue; const i = (Y * rw + X) * 4; t += px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11; n++; } return n ? t / n : 255; };
    const step = Math.max(0.5, sc);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      const ox = bx + QB.pad * sc + dx * step, oy = by + QB.pad * sc + dy * step, ctr = (c, r) => [ox + (c + 0.5) * m, oy + (r + 0.5) * m];
      // the frame must be dark and the white card around it light
      let fk = 0, fn = 0; for (let c = 0; c < QB.cols; c++) for (const r of [0, QB.rows - 1]) { fk += lum(...ctr(c, r)); fn++; } for (let r = 1; r < QB.rows - 1; r++) for (const c of [0, QB.cols - 1]) { fk += lum(...ctr(c, r)); fn++; }
      const black = fk / fn, white = (lum(ox - QB.pad * sc * 0.5, oy - QB.pad * sc * 0.5) + lum(ox + QB.cols * m + QB.pad * sc * 0.5, oy + QB.rows * m + QB.pad * sc * 0.5) + lum(ox + QB.cols * m * 0.5, oy - QB.pad * sc * 0.5)) / 3;
      if (white - black < 60) continue;
      const th = (white + black) / 2, bits = [];
      for (let r = 1; r < QB.rows - 1; r++) for (let c = 1; c < QB.cols - 1; c++) bits.push(lum(...ctr(c, r)) < th ? 1 : 0);
      const take = (i, n) => { let v = 0; for (let k = 0; k < n; k++) v = (v << 1) | bits[i + k]; return v; };
      if (take(0, 8) !== 0xb2) continue;
      const len = take(8, 4); if (len < 1 || len > 10) continue;
      const cs = []; for (let i = 0; i < len; i++) cs.push(take(12 + i * 6, 6));
      if (cs.some((v) => v >= QA.length) || crc8([len, ...cs]) !== take(72, 8)) continue;
      return cs.map((v) => QA[v]).join('');
    }
    return '';
  }
  // ---------------- QR code ----------------
  // New pictures carry a real QR code of the share link, so a phone camera opens the loadout on the website, and Pathfinder
  // reads the same code back when the picture is pasted or picked (it sits at a fixed place: the bottom-right corner).
  // Byte mode, error correction level M, versions 1 to 6. The older black-and-white block above is still read for old pictures.
  const QP = { W: 1200, m: 6, q: 3, right: 32, bottom: 16 }; // on the 1200 px picture: 6 px squares, a 3-square white border
  const QR = (() => {
    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0), inv = (a) => EXP[255 - LOG[a]], pow = (a, k) => (k === 0 ? 1 : EXP[(LOG[a] * k) % 255]);
    const ECC = [0, 10, 16, 26, 18, 24, 16], BLK = [0, 1, 1, 1, 2, 2, 4], ALIGN = [0, 0, 18, 22, 26, 30, 34];
    const size = (v) => 17 + 4 * v;
    const rawBits = (v) => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; } return r; };
    const total = (v) => Math.floor(rawBits(v) / 8), cap = (v) => total(v) - ECC[v] * BLK[v];
    const lens = (v) => { const nb = BLK[v], t = total(v), sh = Math.floor(t / nb), ns = nb - (t % nb); return [...Array(nb)].map((_, i) => sh - ECC[v] + (i < ns ? 0 : 1)); };
    // where the two copies of the 15 format bits go (bit i at [x, y])
    const fmtPos = (n) => {
      const a = []; for (let i = 0; i < 6; i++) a.push([8, i]); a.push([8, 7], [8, 8], [7, 8]); for (let i = 9; i < 15; i++) a.push([14 - i, 8]);
      const b = []; for (let i = 0; i < 8; i++) b.push([n - 1 - i, 8]); for (let i = 8; i < 15; i++) b.push([8, n - 15 + i]);
      return [a, b];
    };
    const fmtBits = (k) => { const d = k; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); return ((d << 10) | r) ^ 0x5412; }; // level M = 00
    const maskAt = (k, x, y) => [(x + y) % 2, y % 2, x % 3, (x + y) % 3, (Math.floor(x / 3) + Math.floor(y / 2)) % 2, ((x * y) % 2) + ((x * y) % 3), (((x * y) % 2) + ((x * y) % 3)) % 2, (((x + y) % 2) + ((x * y) % 3)) % 2][k] === 0;
    function base(v) { // the fixed patterns, and which squares belong to them
      const n = size(v), m = [...Array(n)].map(() => new Array(n).fill(false)), f = [...Array(n)].map(() => new Array(n).fill(false));
      const set = (x, y, d) => { m[y][x] = d; f[y][x] = true; };
      for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
      for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4);
      }
      if (v >= 2) { const a = ALIGN[v]; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, a + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
      for (const p of fmtPos(n)) for (const [x, y] of p) f[y][x] = true;
      set(8, n - 8, true);
      return { m, f, n };
    }
    function order(f, n) { // the zigzag the data squares are filled in
      const out = [];
      for (let right = n - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
          const x = right - j, up = ((right + 1) & 2) === 0, y = up ? n - 1 - vert : vert; if (!f[y][x]) out.push([x, y]);
        }
      }
      return out;
    }
    function rsRem(data, deg) {
      const dv = new Array(deg).fill(0); dv[deg - 1] = 1; let root = 1;
      for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { dv[j] = mul(dv[j], root); if (j + 1 < deg) dv[j] ^= dv[j + 1]; } root = mul(root, 2); }
      const r = new Array(deg).fill(0);
      for (const b of data) { const k = b ^ r.shift(); r.push(0); dv.forEach((c, i) => { r[i] ^= mul(c, k); }); }
      return r;
    }
    function penalty(m, n) {
      let p = 0, dark = 0;
      const line = (get) => {
        let s = 0, run = 1;
        for (let i = 1; i < n; i++) { if (get(i) === get(i - 1)) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; }
        for (let i = 0; i + 7 <= n; i++) if (get(i) && !get(i + 1) && get(i + 2) && get(i + 3) && get(i + 4) && !get(i + 5) && get(i + 6)) {
          if ([1, 2, 3, 4].every((k) => !get(i - k)) || [7, 8, 9, 10].every((k) => !get(i + k))) s += 40;
        }
        return s;
      };
      for (let y = 0; y < n; y++) p += line((i) => i >= 0 && i < n && m[y][i]);
      for (let x = 0; x < n; x++) p += line((i) => i >= 0 && i < n && m[i][x]);
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
      for (const r of m) for (const c of r) if (c) dark++;
      return p + (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1) * 10;
    }
    function encode(text) {
      const bytes = [...new TextEncoder().encode(String(text))];
      let v = 1; while (v <= 6 && bytes.length + 2 > cap(v)) v++;
      if (v > 6) return null;
      const bits = [], put = (val, k) => { for (let i = k - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
      put(4, 4); put(bytes.length, 8); bytes.forEach((b) => put(b, 8));
      put(0, Math.min(4, cap(v) * 8 - bits.length)); while (bits.length % 8) bits.push(0);
      const data = []; for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; data.push(b); }
      for (let pad = 0xec; data.length < cap(v); pad ^= 0xec ^ 0x11) data.push(pad);
      const L = lens(v), bs = []; let at = 0;
      for (const n2 of L) { const d = data.slice(at, at + n2); at += n2; bs.push({ d, e: rsRem(d, ECC[v]) }); }
      const cw = []; for (let i = 0; i < Math.max(...L); i++) bs.forEach((b) => { if (i < b.d.length) cw.push(b.d[i]); });
      for (let i = 0; i < ECC[v]; i++) bs.forEach((b) => cw.push(b.e[i]));
      const { m, f, n } = base(v), ord = order(f, n);
      ord.forEach(([x, y], i) => { if (i < cw.length * 8) m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; });
      let best = null, bestP = Infinity;
      for (let k = 0; k < 8; k++) {
        const mm = m.map((r) => r.slice());
        for (const [x, y] of ord) if (maskAt(k, x, y)) mm[y][x] = !mm[y][x];
        const fb = fmtBits(k); for (const p of fmtPos(n)) p.forEach(([x, y], i) => { mm[y][x] = ((fb >>> i) & 1) === 1; });
        const pn = penalty(mm, n); if (pn < bestP) { bestP = pn; best = mm; }
      }
      return best;
    }
    // Reed-Solomon: fix up to half as many wrong bytes as there are check bytes (Berlekamp-Massey, then solve for the values)
    function rsFix(msg, ns) {
      const n = msg.length, syn = (a) => { const S = []; for (let j = 0; j < ns; j++) { let y = 0; for (const c of a) y = mul(y, EXP[j]) ^ c; S.push(y); } return S; };
      const S = syn(msg); if (S.every((s) => !s)) return msg;
      let C = [1], B = [1], L = 0, m = 1, b = 1;
      for (let r = 0; r < ns; r++) {
        let d = S[r]; for (let i = 1; i <= L; i++) d ^= mul(C[i] || 0, S[r - i]);
        if (!d) { m++; continue; }
        const T = C.slice(), k = mul(d, inv(b)); while (C.length < B.length + m) C.push(0);
        for (let i = 0; i < B.length; i++) C[i + m] ^= mul(k, B[i]);
        if (2 * L <= r) { L = r + 1 - L; B = T; b = d; m = 1; } else m++;
      }
      if (!L || 2 * L > ns) return null;
      const pos = [];
      for (let p = 0; p < n; p++) { const xi = EXP[(255 - ((n - 1 - p) % 255)) % 255]; let y = 0; for (let i = C.length - 1; i >= 0; i--) y = mul(y, xi) ^ (C[i] || 0); if (!y) pos.push(p); }
      if (pos.length !== L) return null;
      const X = pos.map((p) => EXP[(n - 1 - p) % 255]), A = [];
      for (let j = 0; j < L; j++) A.push([...X.map((x) => pow(x, j)), S[j]]);
      for (let c = 0; c < L; c++) {
        let r = c; while (r < L && !A[r][c]) r++; if (r === L) return null;
        [A[c], A[r]] = [A[r], A[c]]; const iv = inv(A[c][c]); A[c] = A[c].map((x) => mul(x, iv));
        for (let r2 = 0; r2 < L; r2++) if (r2 !== c && A[r2][c]) { const k = A[r2][c]; A[r2] = A[r2].map((x, i) => x ^ mul(k, A[c][i])); }
      }
      const out = msg.slice(); pos.forEach((p, k) => { out[p] ^= A[k][L]; });
      return syn(out).every((s) => !s) ? out : null;
    }
    function decode(mat) { // a square of true (dark) / false (light) read from a picture: the text, or ''
      const n = mat.length, v = (n - 17) / 4; if (!(v >= 1 && v <= 6 && v % 1 === 0)) return '';
      let mask = -1, bd = 99;
      for (let k = 0; k < 8; k++) { const fb = fmtBits(k); for (const p of fmtPos(n)) { let d = 0; p.forEach(([x, y], i) => { if (!!mat[y][x] !== (((fb >>> i) & 1) === 1)) d++; }); if (d < bd) { bd = d; mask = k; } } }
      if (bd > 3) return '';
      const { f } = base(v), cw = new Array(total(v)).fill(0);
      order(f, n).forEach(([x, y], i) => { if (i < cw.length * 8 && (!!mat[y][x] !== maskAt(mask, x, y))) cw[i >>> 3] |= 0x80 >>> (i & 7); });
      const L = lens(v), bs = L.map(() => []); let at = 0;
      for (let i = 0; i < Math.max(...L); i++) bs.forEach((b, j) => { if (i < L[j]) b.push(cw[at++]); });
      for (let i = 0; i < ECC[v]; i++) bs.forEach((b) => b.push(cw[at++]));
      const data = [];
      for (let j = 0; j < bs.length; j++) { const fx = rsFix(bs[j], ECC[v]); if (!fx) return ''; data.push(...fx.slice(0, L[j])); }
      let p = 0; const take = (k) => { let x = 0; for (let i = 0; i < k; i++, p++) x = (x << 1) | ((data[p >>> 3] >>> (7 - (p & 7))) & 1); return x; };
      if (take(4) !== 4) return ''; const len = take(8); if (12 + len * 8 > data.length * 8) return '';
      const out = new Uint8Array(len); for (let i = 0; i < len; i++) out[i] = take(8);
      try { return new TextDecoder().decode(out); } catch (e) { return ''; }
    }
    return { encode, decode, base, size };
  })();
  // Reads the QR code back from a picture of any size (the same layout, scaled), trying each code size and small shifts.
  async function qrRead(file) {
    let bmp; try { bmp = await createImageBitmap(file); } catch (e) { return ''; }
    const w = bmp.width, h = bmp.height, sc = w / QP.W; if (w < 300) return '';
    const big = (QR.size(6) + 2 * QP.q) * QP.m * sc;
    const rx = Math.max(0, Math.floor(w - (QP.right + 10) * sc - big)), ry = Math.max(0, Math.floor(h - (QP.bottom + 10) * sc - big)), rw = w - rx, rh = h - ry;
    const cv = document.createElement('canvas'); cv.width = rw; cv.height = rh; const g2 = cv.getContext('2d', { willReadFrequently: true });
    g2.drawImage(bmp, rx, ry, rw, rh, 0, 0, rw, rh);
    const px = g2.getImageData(0, 0, rw, rh).data, m = QP.m * sc, rr = m >= 4 ? Math.max(1, Math.round(m * 0.2)) : 0;
    const lum = (x, y) => { let t = 0, k = 0; for (let yy = Math.round(y) - rr; yy <= Math.round(y) + rr; yy++) for (let xx = Math.round(x) - rr; xx <= Math.round(x) + rr; xx++) { const X = xx - rx, Y = yy - ry; if (X < 0 || Y < 0 || X >= rw || Y >= rh) continue; const o = (Y * rw + X) * 4; t += px[o] * 0.3 + px[o + 1] * 0.59 + px[o + 2] * 0.11; k++; } return k ? t / k : 255; };
    const step = Math.max(0.5, sc);
    for (let v = 1; v <= 6; v++) {
      const { m: ref, n } = QR.base(v), S = (n + 2 * QP.q) * m, cx = w - QP.right * sc - S + QP.q * m, cy = h - QP.bottom * sc - S + QP.q * m;
      const fp = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if ((x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)) fp.push([x, y, ref[y][x]]);
      let best = null;
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
        const ox = cx + dx * step, oy = cy + dy * step, vals = fp.map(([x, y]) => lum(ox + (x + 0.5) * m, oy + (y + 0.5) * m));
        let kd = 0, nd = 0, kl = 0, nl = 0; fp.forEach(([, , d], i) => { if (d) { kd += vals[i]; nd++; } else { kl += vals[i]; nl++; } });
        const dark = kd / nd, light = kl / nl; if (light - dark < 60) continue;
        const th = (dark + light) / 2; let ok = 0; fp.forEach(([, , d], i) => { if ((vals[i] < th) === d) ok++; });
        if (!best || ok > best.ok) best = { ok, ox, oy, th };
      }
      if (!best || best.ok < fp.length * 0.92) continue;
      const mat = []; for (let y = 0; y < n; y++) { const r = []; for (let x = 0; x < n; x++) r.push(lum(best.ox + (x + 0.5) * m, best.oy + (y + 0.5) * m) < best.th); mat.push(r); }
      const code = linkCode(QR.decode(mat)); if (code) return code;
    }
    return '';
  }
  let CRCT = null;
  const crc32 = (u8) => { if (!CRCT) { CRCT = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRCT[n] = c >>> 0; } } let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRCT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function pngAddText(u8, key, text) {
    const body = new TextEncoder().encode(key + '\0' + text), td = new Uint8Array(4 + body.length); td.set([116, 69, 88, 116]); td.set(body, 4); // "tEXt"
    const ch = new Uint8Array(12 + body.length), dv = new DataView(ch.buffer); dv.setUint32(0, body.length); ch.set(td, 4); dv.setUint32(8 + body.length, crc32(td));
    // goes in just before the IEND chunk (the last 12 bytes)
    const at = u8.length - 12, out = new Uint8Array(u8.length + ch.length); out.set(u8.subarray(0, at)); out.set(ch, at); out.set(u8.subarray(at), at + ch.length); return out;
  }
  function pngText(u8, key) {
    const sig = [137, 80, 78, 71, 13, 10, 26, 10]; if (u8.length < 20 || sig.some((v, i) => u8[i] !== v)) return '';
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    for (let o = 8; o + 12 <= u8.length;) {
      const len = dv.getUint32(o), type = String.fromCharCode(u8[o + 4], u8[o + 5], u8[o + 6], u8[o + 7]);
      if (type === 'tEXt' && o + 12 + len <= u8.length) { const t = new TextDecoder('latin1').decode(u8.subarray(o + 8, o + 8 + len)), z = t.indexOf('\0'); if (z > 0 && t.slice(0, z) === key) return t.slice(z + 1); }
      if (type === 'IEND') break; o += 12 + len;
    }
    return '';
  }
  const u8b64 = (u8) => { let s2 = ''; for (let i = 0; i < u8.length; i += 0x8000) s2 += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s2); };
  async function loImage(l) {
    let link = '';
    try {
      if (gt.loShare && l.it && l.it.length) {
        const meta = shareMeta(l);
        const r = await Promise.race([gt.loShare({ c: codeOf(l), n: l.n || 'Loadout', t: meta.t, d: meta.d }), new Promise((ok) => setTimeout(() => ok(null), 6000))]);
        if (r && r.url) link = String(r.url).replace(/^https?:\/\//, '').replace(/\/[^/]*$/, ''); // d2pathfinder.com/AbC123
      }
    } catch (e) { /* not signed in or offline: the picture still has the loadout hidden inside */ }
    const cv = await drawPic(l, link);
    showPic(l, cv, codeOf(l));
  }
  // opt.build: the Builds tab version, more compact: no header (the Builds tab shows the name, class and subclass) and no
  // per-piece stat rows (the totals stay).
  async function drawPic(l, link, opt) {
    const cp = !!(opt && opt.build);
    const res = resolve(l), by = (b) => res.find((r) => r.en.b === b) || null, c = l.c < 3 ? CL[l.c] : 'Any class';
    const sub = by(SUB), weps = WB.map(by), arms = AB.map(by);
    // Mods by where they go: each armor piece's own mods, plus loadout mods that name a piece; the rest go in "Any piece".
    const mk = (p) => (p && p[2] ? { i: p[2], n: p[1] || '' } : null);
    const modsBy = AB.map((b) => [...l.it.filter((q) => q.b === b).flatMap((q) => (q.m || []).map(mk)), ...(l.fm || []).filter((p) => +p[4] === b).map(mk)].filter(Boolean).slice(0, 12));
    const anyMods = (l.fm || []).filter((p) => !p[4] || !AB.includes(+p[4])).map(mk).filter(Boolean).slice(0, 12);
    const subM = sub && sub.en.m ? ((await ghostFree(sub.en)) || sub.en.m) : [];
    const subPl = subOrd(subM).map(mk).filter(Boolean).slice(0, 16);
    const ic = (r) => (r && (r.x ? rawIcon(r.x.i) : r.en.i)) || '';
    const artPk = (l.a || []).map((p) => p[2]).filter(Boolean).slice(0, 14), artIc = (l.ai && l.ai.i) || '', hasArt = !!(artIc || artPk.length);
    // Details, looked up in parallel (the picture is still drawn if one fails): each weapon's equipped perks, and each armor
    // piece's archetype and set, for the set bonuses you have on.
    const X = window.__gtx, det = (x) => (x && X && X.detail ? Promise.race([X.detail(x), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]).catch(() => null) : Promise.resolve(null));
    const [WD, ADd] = await Promise.all([Promise.all(weps.map((r) => det(r && r.x))), Promise.all(arms.map((r) => det(r && r.x)))]);
    // Armor 3.0: an archetype's primary and secondary stats are fixed, so when Bungie does not name it, the piece's two biggest stats do.
    const ARCH = [['Gunner', 0, 3], ['Bulwark', 1, 2], ['Specialist', 2, 0], ['Grenadier', 3, 4], ['Paragon', 4, 5], ['Brawler', 5, 1]];
    const archOf = (x) => { if (!x || !x.st || x.r === 'Exotic') return ''; const o = x.st.map((v, i) => [v || 0, i]).sort((p, q) => q[0] - p[0]); if (!o[1] || !o[1][0]) return ''; const f = ARCH.find((a) => a[1] === o[0][1] && a[2] === o[1][1]); return f ? f[0] : ''; };
    const AD = ADd.map((d, i) => ({ a: (d && d.arche && d.arche.n) || archOf(arms[i] && arms[i].x), s: (d && d.set && d.set.n) || '', set: (d && d.set) || null, f: (d && d.frame && d.frame.n) || '' }));
    const WP = WD.map((d, wi) => {
      const en = weps[wi] && weps[wi].en, pk = en && en.wp && en.wp.length ? en.wp.map((p) => ({ h: p[0], i: p[2], n: p[1] })) : null;
      if (!d) return pk ? pk.slice(0, 7) : [];
      const out = []; if (d.frame && d.frame.i) out.push({ i: d.frame.i, n: d.frame.n, d: d.frame.d || '', fr: 1 });
      if (pk) return out.concat(pk).slice(0, 7); // the build's page: perks picked for a build win over the ones on your own copy
      (d.groups || []).filter((gr) => gr.label === 'Perks').forEach((gr) => gr.cols.forEach((col) => { const on = col.find((p) => p.on); if (on && on.i && !/tracker|memento|shader/i.test(on.c || '')) out.push({ h: on.h, i: on.i, n: on.n, d: on.d || '' }); }));
      return out.slice(0, 7);
    });
    // The picture draws each weapon's own perks, as it always has; perks picked for a build only go on the build's page.
    const WPD = WD.map((d) => {
      if (!d) return [];
      const out = []; if (d.frame && d.frame.i) out.push({ i: d.frame.i, n: d.frame.n });
      (d.groups || []).filter((gr) => gr.label === 'Perks').forEach((gr) => gr.cols.forEach((col) => { const on = col.find((p) => p.on); if (on && on.i && !/tracker|memento|shader/i.test(on.c || '')) out.push({ i: on.i, n: on.n }); }));
      return out.slice(0, 7);
    });
    // Set bonuses that are on: a set's 2- and 4-piece perks, once you wear that many pieces of it.
    const sets = {}; AD.forEach((a) => { if (a.set && a.set.n) { const k = a.set.n; (sets[k] = sets[k] || { set: a.set, n: 0 }).n++; } });
    const SB = []; Object.values(sets).forEach((o) => (o.set.perks || []).forEach((p) => { if (o.n >= (p.rc || 99)) SB.push({ n: p.n, i: p.i, rc: p.rc, s: o.set.n, d: p.d || '' }); }));
    const paths = [ic(sub), ...weps.map(ic), ...arms.map(ic), ...modsBy.flat().map((m) => m.i), ...anyMods.map((m) => m.i), ...subPl.map((m) => m.i), artIc, ...artPk, ...WP.flat().map((p) => p.i), ...WPD.flat().map((p) => p.i), ...SB.map((p) => p.i)].filter(Boolean);
    let D = {}; try { D = await gt.imgFetch({ p: [...new Set(paths)] }); } catch (e) { /* drawn without icons */ }
    const imgs = {}; await Promise.all(Object.entries(D).map(([k, v]) => new Promise((ok) => { const im = new Image(); im.onload = () => { imgs[k] = im; ok(); }; im.onerror = ok; im.src = v; })));
    // Each piece's six stats, in the game's order (Health, Melee, Grenade, Super, Class, Weapons), with the tuning (+5 / -5) if it has one.
    const SHX = [2996146975, 392767087, 1943323491, 1735777505, 144602215, 4244567218], GORD = [1, 5, 3, 4, 2, 0];
    const pst = arms.map((r, i) => {
      if (!r || !r.x || !r.x.st) return [];
      const ds = (ADd[i] && ADd[i].stats) || [];
      return GORD.map((k) => { const q = ds.find((z) => z.h === SHX[k]); return q ? [q.v, k, q.tn || 0] : [r.x.st[k] || 0, k, 0]; });
    });
    const st = [0, 0, 0, 0, 0, 0]; let hasSt = false; pst.forEach((rows) => rows.forEach(([v, k]) => { hasSt = true; st[k] += v || 0; }));
    // Layout first (the picture grows to fit the sections it has), then draw.
    const W = 1200, M = 32, IW = W - M * 2, GAP = 16;
    // Subclass icons fill the width of their box: one row when they fit at a good size, two otherwise.
    const subRows = subPl.length > 14 ? 2 : 1, subPer = Math.max(1, Math.ceil(subPl.length / subRows)), SUBGAP = 10;
    const SUBSZ = Math.max(44, Math.min(88, Math.floor((IW - 32 - (subPer - 1) * SUBGAP) / subPer))), SUBSTEP = SUBSZ + SUBGAP;
    // armor cards: five across, each with its archetype, tier, set, its own stats and its mods
    const CG = 12, CW = Math.floor((IW - 32 - 4 * CG) / 5), MSZ = 44, MSTEP = 50, mPer = Math.max(1, Math.floor((CW - 20 + (MSTEP - MSZ)) / MSTEP));
    const stRows = cp ? 0 : Math.max(0, ...pst.map((q) => q.length)), mRows = Math.max(0, ...modsBy.map((m) => Math.ceil(m.length / mPer)));
    const CH2 = 12 + 88 + 30 + stRows * 22 + (stRows ? 8 : 0) + (mRows ? 8 + mRows * MSTEP : 0) + 8;
    const anyRows = anyMods.length ? Math.ceil(anyMods.length / Math.floor((IW - 32) / MSTEP)) : 0;
    let y = cp ? 26 : 196;
    const L = { top: y };
    const TOPH = 414; y += TOPH + GAP;
    if (arms.some(Boolean)) { L.arm = y; y += 44 + CH2 + 14 + GAP; }
    if (subPl.length) { L.sub = y; y += 50 + subRows * SUBSTEP + 8 + GAP; }
    if (anyRows) { L.mods = y; y += 52 + anyRows * MSTEP + 8 + GAP; }
    if (hasArt || SB.length) { L.art = y; y += 140 + GAP; }
    // with a share link, a QR code of it takes the bottom-right corner (phones scan it, and Pathfinder reads it back)
    const qm = link && W === QP.W ? QR.encode('https://' + link) : null, qS = qm ? (qm.length + 2 * QP.q) * QP.m : 0;
    const H = y + (qm ? qS + QP.bottom + 18 : link ? 112 : 24), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g2 = cv.getContext('2d');
    // Background: dark base, a glow in the class colour, a faded subclass emblem, a fine pattern and a vignette.
    // Colours from the subclass (its element), falling back to the class.
    const ELC = { solar: ['#f5862e', '#a3420f'], arc: ['#6fd3ff', '#1d6a96'], void: ['#b07bff', '#4a2a8a'], stasis: ['#7ab0ff', '#26447e'], strand: ['#4fd88a', '#1b6b45'], prismatic: ['#ff7fd0', '#6a3bd1'] };
    const SUBEL = { gunslinger: 'solar', sunbreaker: 'solar', dawnblade: 'solar', arcstrider: 'arc', striker: 'arc', stormcaller: 'arc', nightstalker: 'void', sentinel: 'void', voidwalker: 'void', revenant: 'stasis', behemoth: 'stasis', shadebinder: 'stasis', threadrunner: 'strand', berserker: 'strand', broodweaver: 'strand' };
    const subN = String((sub && (sub.x || sub.en).n) || '').toLowerCase(), elk = (subN.match(/prismatic|solar|arc|void|stasis|strand/) || [])[0] || SUBEL[subN.trim()] || '';
    const ACC = ELC[elk] || [['#5d8ae6', '#2c4a9a'], ['#45c48d', '#1d6f4d'], ['#e8c25a', '#8a6a1c']][l.c] || ['#a98bff', '#4b3a99'];
    const bg = g2.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#171a22'); bg.addColorStop(.55, '#101218'); bg.addColorStop(1, '#0a0b0f'); g2.fillStyle = bg; g2.fillRect(0, 0, W, H);
    const glow = (x, y1, r, col, a) => { const q = g2.createRadialGradient(x, y1, 0, x, y1, r); q.addColorStop(0, col + a); q.addColorStop(1, col + '00'); g2.fillStyle = q; g2.fillRect(0, 0, W, H); };
    glow(W * .88, -40, 820, ACC[0], '4a'); glow(-60, H + 40, 720, ACC[1], '66'); glow(W * .5, H * .55, 640, ACC[1], '22'); glow(W * .1, H * .25, 520, ACC[0], '14');
    if (sub && imgs[ic(sub)]) { g2.save(); g2.globalAlpha = .07; g2.drawImage(imgs[ic(sub)], W - 520, -70, 560, 560); g2.restore(); }
    g2.save(); g2.strokeStyle = 'rgba(255,255,255,.035)'; g2.lineWidth = 1; for (let x = -H; x < W; x += 26) { g2.beginPath(); g2.moveTo(x, H); g2.lineTo(x + H, 0); g2.stroke(); } g2.restore();
    const vg = g2.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g2.fillStyle = vg; g2.fillRect(0, 0, W, H);
    const bar = g2.createLinearGradient(0, 0, W, 0); bar.addColorStop(0, ACC[0]); bar.addColorStop(.6, ACC[1]); bar.addColorStop(1, ACC[1] + '00'); g2.fillStyle = bar; g2.fillRect(0, 0, W, 6);
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
    const tileIc = (src, x, y1, sz, round, tint) => {
      const rad = round ? sz / 2 : 7;
      rr(x, y1, sz, sz, rad); g2.fillStyle = '#14161b'; g2.fill();
      // Subclass tiles: an element-coloured backing, so icons drawn on a see-through background (the Super) match the others.
      if (tint) { const gr = g2.createLinearGradient(x, y1, x, y1 + sz); gr.addColorStop(0, tint + '33'); gr.addColorStop(1, tint + 'aa'); rr(x, y1, sz, sz, rad); g2.fillStyle = gr; g2.fill(); }
      const im = imgs[src]; if (im) { g2.save(); rr(x, y1, sz, sz, rad); g2.clip(); g2.drawImage(im, x, y1, sz, sz); g2.restore(); }
      rr(x + .5, y1 + .5, sz - 1, sz - 1, rad); g2.strokeStyle = 'rgba(255,255,255,.22)'; g2.lineWidth = 1.5; g2.stroke();
    };
    // header
    if (!cp) {
      txt(l.n || 'Loadout', 48, 78, 46, '#ffffff', 700, 900);
      txt(c.toUpperCase() + (sub && (sub.x || sub.en).n ? '  ·  ' + (sub.x || sub.en).n : ''), 50, 112, 18, '#9aa0a8', 600, 900);
      if (sub && imgs[ic(sub)]) g2.drawImage(imgs[ic(sub)], W - 150, 30, 110, 110);
      g2.fillStyle = '#2b2e33'; g2.fillRect(48, 172, W - 96, 1);
    }
    // weapons, with the perks in them right now (their frame first)
    const WPW = 640; panel(M, L.top, WPW - M, TOPH); panel(WPW + GAP, L.top, W - M - WPW - GAP, TOPH);
    label('WEAPONS', 48, L.top + 26);
    weps.forEach((r, i) => {
      const y1 = L.top + 42 + i * 122; box(r, 48, y1, 100);
      txt(r ? (r.x || r.en).n : 'Empty', 166, y1 + 26, 23, r ? '#fff' : '#555', 700, WPW - 200);
      txt(r && r.x ? (r.x.t || '') + (r.x.p ? '  ·  ' + r.x.p : '') : '', 166, y1 + 48, 14, '#9aa0a8', 400, WPW - 200);
      (WPD[i] || []).forEach((p, k) => tileIc(p.i, 166 + k * 54, y1 + 56, 46, true));
    });
    // total stats, with every piece's share
    const sx = WPW + GAP + 16, sw = W - M - 16 - sx;
    label('STATS', sx, L.top + 26);
    if (hasSt) {
      const tot = st.reduce((a, b) => a + b, 0), bx = sx + 108, bw = sw - 108 - 56;
      // in the game's order (Health, Melee, Grenade, Super, Class, Weapons); a stat below 0 (tuning took 5 from it) shows in red, like the game
      GORD.forEach((i, row) => {
        const v = st[i], y1 = L.top + 48 + row * 50; txt(IMSTL[i], sx, y1 + 18, 17, '#e6e7ea', 600);
        rr(bx, y1 + 3, bw, 18, 4); g2.fillStyle = '#23262b'; g2.fill();
        const fw = Math.max(0, Math.min(bw, Math.abs(v) / 200 * bw)); if (fw > 0) { rr(bx, y1 + 3, fw, 18, 4); g2.fillStyle = v < 0 ? '#c0392b' : IMSTC[i]; g2.fill(); }
        for (let t = 1; t < 10; t++) { g2.fillStyle = 'rgba(0,0,0,.35)'; g2.fillRect(bx + bw * t / 10, y1 + 3, 1, 18); } // tens, like the game
        txt(String(v), bx + bw + 12, y1 + 19, 19, v < 0 ? '#ff8a7a' : '#fff', 700);
      });
      txt('Total ' + tot, sx, L.top + 384, 18, '#e0b64a', 700);
    } else txt('Stats show for your own armor.', sx, L.top + 70, 15, '#8b8f97', 400);
    // armor: one card per piece
    if (L.arm) {
      panel(M, L.arm, IW, 44 + CH2 + 14);
      label('ARMOR', 48, L.arm + 26);
      const SLOTN = ['Helmet', 'Arms', 'Chest', 'Legs', 'Class item'];
      arms.forEach((r, i) => {
        const x0 = M + 16 + i * (CW + CG), y0 = L.arm + 40;
        rr(x0, y0, CW, CH2, 10); g2.fillStyle = 'rgba(0,0,0,.22)'; g2.fill(); g2.strokeStyle = 'rgba(255,255,255,.07)'; g2.lineWidth = 1; g2.stroke();
        const ix = x0 + 10, iy = y0 + 12; box(r, ix, iy, 88);
        const tx = ix + 98, tw = CW - 108, ex = !!(r && r.x && r.x.r === 'Exotic');
        txt(SLOTN[i].toUpperCase(), tx, iy + 14, 11.5, '#8b8f97', 700, tw);
        if (!r) { txt('Empty', tx, iy + 40, 16, '#555', 600, tw); return; }
        // archetype (Paragon, Brawler...) as a tag; an exotic says Exotic
        const tag = AD[i].a || (ex ? 'Exotic' : '');
        if (tag) { font(13.5, 700); const tw2 = Math.min(tw, g2.measureText(tag).width + 18); rr(tx, iy + 24, tw2, 24, 12); g2.fillStyle = ex ? 'rgba(206,174,51,.22)' : 'rgba(255,255,255,.12)'; g2.fill(); txt(tag, tx + 9, iy + 41, 13.5, ex ? '#f0d58a' : '#fff', 700, tw - 18); }
        const tier = r.x && r.x.gt ? +r.x.gt : 0;
        if (tier) { for (let k = 0; k < 5; k++) { g2.save(); g2.translate(tx + 6 + k * 14, iy + 66); g2.rotate(Math.PI / 4); g2.fillStyle = k < tier ? '#e0b64a' : 'rgba(255,255,255,.15)'; g2.fillRect(-4.5, -4.5, 9, 9); g2.restore(); } txt('T' + tier, tx + 76, iy + 71, 12.5, '#c9b06a', 700, tw - 76); }
        // under the picture, the full width: its set, or for an exotic its own name (not its perk, which read like the item's name)
        txt(ex ? (r.x.n || (r.en && r.en.n) || '') : (AD[i].s || (r.x || r.en).n || ''), ix, iy + 88 + 20, 14, ex ? '#ceae33' : '#e6e7ea', 600, CW - 20);
        // this piece's stats, biggest first
        let yy = iy + 88 + 30;
        if (!cp) pst[i].forEach(([v, k, tn]) => {
          const zero = !v;
          txt(IMSTL[k], ix, yy + 13, 13, tn < 0 ? '#e88a7e' : zero ? '#7c818a' : '#cfd2d8', 600, 64);
          // tuning: which stat got +5 and which gave 5 away
          if (tn) { font(10.5, 800); const tt = (tn > 0 ? '+' : '−') + Math.abs(tn), tw3 = g2.measureText(tt).width + 8; rr(ix + 64, yy + 2, tw3, 14, 7); g2.fillStyle = tn > 0 ? 'rgba(90,200,250,.22)' : 'rgba(224,90,74,.25)'; g2.fill(); txt(tt, ix + 68, yy + 13, 10.5, tn > 0 ? '#8fdcff' : '#ff9b8f', 800); }
          const bx = ix + 92, bw = CW - 20 - 92 - 30; rr(bx, yy + 3, bw, 11, 3); g2.fillStyle = '#23262b'; g2.fill();
          const fw = Math.max(0, Math.min(bw, v / 45 * bw)); if (fw > 0) { rr(bx, yy + 3, fw, 11, 3); g2.fillStyle = IMSTC[k]; g2.fill(); }
          if (tn < 0) { const nw = Math.min(bw - fw, -tn / 45 * bw); g2.fillStyle = '#c0392b'; g2.fillRect(bx + fw, yy + 3, nw, 11); }
          txt(String(v), bx + bw + 6, yy + 13, 13.5, v < 0 ? '#ff8a7a' : zero ? '#7c818a' : '#fff', 700); yy += 22;
        });
        // and its mods
        if (mRows) {
          const y2 = iy + 88 + 30 + stRows * 22 + (stRows ? 8 : 0);
          g2.fillStyle = 'rgba(255,255,255,.07)'; g2.fillRect(ix, y2 - 4, CW - 20, 1);
          (modsBy[i] || []).forEach((m, k) => tileIc(m.i, ix + (k % mPer) * MSTEP, y2 + 4 + Math.floor(k / mPer) * MSTEP, MSZ, false));
        }
      });
    }
    // mods that go on any piece
    if (L.mods) {
      panel(M, L.mods, IW, 52 + anyRows * MSTEP + 8);
      label('OTHER MODS', 48, L.mods + 26);
      const per = Math.floor((IW - 32) / MSTEP);
      anyMods.forEach((m, k) => tileIc(m.i, 48 + (k % per) * MSTEP, L.mods + 40 + Math.floor(k / per) * MSTEP, MSZ, false));
    }
    // subclass: super, abilities, aspects and fragments
    if (L.sub) {
      panel(M, L.sub, IW, 50 + subRows * SUBSTEP + 8);
      label('SUBCLASS' + (sub && (sub.x || sub.en).n ? '  ·  ' + String((sub.x || sub.en).n).toUpperCase() : ''), 48, L.sub + 26);
      const rowW = (k) => k * SUBSZ + (k - 1) * SUBGAP;
      subPl.forEach((m, i) => { const row = Math.floor(i / subPer), inRow = Math.min(subPer, subPl.length - row * subPer), x0 = M + (IW - rowW(inRow)) / 2; tileIc(m.i, x0 + (i % subPer) * SUBSTEP, L.sub + 40 + row * SUBSTEP, SUBSZ, false, /^#[0-9a-f]{6}$/i.test(ACC[1]) ? ACC[1] : ''); });
    }
    // artifact
    if (L.art) {
      const y0 = L.art, hasSB = SB.length > 0, sbX = hasSB ? 832 : W - M; panel(M, y0, IW, 140);
      if (hasArt) {
        label('ARTIFACT', 48, y0 + 26);
        const AS = 84;
        if (artIc && imgs[artIc]) { rr(48, y0 + 40, AS, AS, 10); g2.fillStyle = '#1a1c22'; g2.fill(); g2.drawImage(imgs[artIc], 48, y0 + 40, AS, AS); rr(49, y0 + 41, AS - 2, AS - 2, 10); g2.strokeStyle = '#ceae33'; g2.lineWidth = 2.5; g2.stroke(); }
        txt((l.ai && l.ai.n) || 'Artifact', 148, y0 + 74, 21, '#ffffff', 600, 200);
        txt(artPk.length ? artPk.length + ' perks selected' : '', 148, y0 + 98, 14, '#9aa0a8', 400);
        // the perks sit right after the name, leaving room for the set bonus on the right
        const pk0 = 360, room = sbX - 24 - pk0, step = Math.min(64, Math.max(40, Math.floor(room / Math.max(1, artPk.length)))), psz = Math.min(56, step - 6);
        artPk.forEach((p, i) => tileIc(p, pk0 + i * step, y0 + 40 + (84 - psz) / 2, psz, true));
      }
      if (hasSB) {
        if (hasArt) { g2.fillStyle = 'rgba(255,255,255,.08)'; g2.fillRect(sbX - 14, y0 + 18, 1, 104); }
        label('ARMOR SET BONUS', sbX, y0 + 26);
        SB.slice(0, 2).forEach((p, k) => {
          const yy = y0 + 42 + k * 46; tileIc(p.i, sbX, yy, 38, true);
          txt(p.n, sbX + 48, yy + 17, 15, '#ffffff', 600, W - M - sbX - 64);
          txt(p.rc + '-piece  ·  ' + p.s, sbX + 48, yy + 35, 12.5, '#9aa0a8', 400, W - M - sbX - 64);
        });
      }
    }
    if (qm) {
      const qx = W - QP.right - qS, qy = H - QP.bottom - qS, tx = M + 16, tw = qx - 32 - tx;
      g2.fillStyle = '#fff'; g2.fillRect(qx, qy, qS, qS); g2.fillStyle = '#000';
      qm.forEach((row, r) => row.forEach((on, c) => { if (on) g2.fillRect(qx + (QP.q + c) * QP.m, qy + (QP.q + r) * QP.m, QP.m, QP.m); }));
      txt('Scan to get this loadout', tx, qy + 46, 24, '#ffffff', 700, tw);
      txt('Point your phone camera at the code to open it in Pathfinder,', tx, qy + 80, 15, '#9aa0a8', 400, tw);
      txt('or paste this picture into Loadouts > Import loadout.', tx, qy + 102, 15, '#9aa0a8', 400, tw);
      txt('Link: ' + link, tx, qy + 138, 15, '#c9ccd2', 600, tw);
      txt('Made with Pathfinder', tx, H - QP.bottom - 4, 14, '#6a6f77', 600);
    } else {
      font(14, 600); const mx = W - 220;
      txt('Made with Pathfinder', mx, H - 10, 14, '#6a6f77', 600);
      if (link) txt('Import this loadout in Pathfinder: ' + link, M + 16, H - 10, 14, '#8b8f97', 600, mx - 24 - (M + 16));
    }
    // What the Builds page shows, worked out here once: the same things the picture draws, with names.
    const nmM = (p) => (p && p[2] ? { h: +p[1] || 0, i: p[2], n: String(p[3] || '') } : null); // armor and subclass plugs: [socket, hash, icon, name]
    const nmF = (p) => (p && p[2] ? { h: +p[0] || 0, i: p[2], n: String(p[1] || '') } : null); // loadout mods: [hash, name, icon, ..., bucket]
    const SLN = ['Helmet', 'Arms', 'Chest', 'Legs', 'Class item'];
    cv.info = {
      v: 2,
      sub: sub ? { h: sub.en.h, n: (sub.x || sub.en).n || '', i: ic(sub), el: elk } : null,
      sp: subOrd(subM).map(nmM).filter(Boolean).slice(0, 16),
      w: weps.map((r, i) => { if (!r) return null; const fr = (WP[i] || []).find((q) => q.fr); return { h: r.en.h, n: (r.x || r.en).n || '', i: ic(r), t: (r.x && r.x.t) || '', r: (r.x && r.x.r) || '', intr: fr ? { n: fr.n || '', i: fr.i, d: fr.d || '' } : null, p: (WP[i] || []).filter((q) => !q.fr).map((q) => ({ h: q.h || 0, i: q.i, n: q.n || '', d: q.d || '' })) }; }).filter(Boolean),
      a: arms.map((r, i) => (r ? { h: r.en.h, n: (r.x || r.en).n || '', i: ic(r), s: SLN[i], r: (r.x && r.x.r) || '', ar: AD[i].a || '', set: AD[i].s || '', intr: ADd[i] && ADd[i].frame && r.x && r.x.r === 'Exotic' ? { n: ADd[i].frame.n || '', i: ADd[i].frame.i || '', d: ADd[i].frame.d || '' } : null, m: [...l.it.filter((q) => q.b === AB[i]).flatMap((q) => (q.m || []).map(nmM)), ...(l.fm || []).filter((q) => +q[4] === AB[i]).map(nmF)].filter(Boolean).slice(0, 12) } : null)).filter(Boolean),
      any: (l.fm || []).filter((q) => !q[4] || !AB.includes(+q[4])).map(nmF).filter(Boolean).slice(0, 12),
      st: hasSt ? st.slice() : null,
      sb: SB.slice(0, 6).map((q) => ({ n: q.n || '', i: q.i || '', rc: q.rc || 0, s: q.s || '', d: q.d || '' })),
      art: hasArt ? { n: (l.ai && l.ai.n) || 'Artifact', i: artIc, p: (l.a || []).slice(0, 14).map((q) => ({ h: +q[0] || 0, i: q[2] || '', n: String(q[1] || '') })).filter((q) => q.i) } : null,
    };
    return cv;
  }
  // The Builds picture: the compact loadout picture (with the QR code of a share link when one can be made), as a WebP small
  // enough to keep with the build. Empty when it cannot be made; the build is still shared.
  async function buildPic(l) {
    try {
      let link = '';
      try {
        if (gt.loShare && l.it && l.it.length) { const meta = shareMeta(l); const r = await Promise.race([gt.loShare({ c: codeOf(l), n: l.n || 'Loadout', t: meta.t, d: meta.d }), new Promise((ok) => setTimeout(() => ok(null), 6000))]); if (r && r.url) link = String(r.url).replace(/^https?:\/\//, '').replace(/\/[^/]*$/, ''); }
      } catch (e) { /* no link: no QR code */ }
      let cv = await drawPic(l, link, { build: true });
      const info = cv.info || null;
      if (info && gt.bdDefs) {
        try {
          const plugsOf = [...info.sp, ...info.w.flatMap((q) => q.p), ...info.a.flatMap((q) => q.m), ...info.any, ...((info.art && info.art.p) || [])];
          const D2 = await gt.bdDefs({ items: [...new Set([...info.w, ...info.a].map((q) => q.h).filter(Boolean))].slice(0, 60), plugs: [...new Set(plugsOf.map((q) => q.h).filter(Boolean))].slice(0, 200) });
          [...info.w, ...info.a].forEach((q) => {
            const x = D2.items[q.h]; if (!x) return;
            if (!q.t) q.t = x.t; if (!q.r) q.r = x.r;
            if (!q.intr && x.intr && (q.r === 'Exotic' || info.w.includes(q))) q.intr = x.intr;
            if (!q.set && x.set && x.set.n) { q.set = x.set.n; q.setp = x.set.perks; }
          });
          info.sp.forEach((q) => { const x = D2.plugs[q.h]; if (x) { q.k = subRank(x.c); if (!q.n) q.n = x.n; if (x.d) q.d = x.d; } });
          plugsOf.forEach((q) => { const x = D2.plugs[q.h]; if (x) { if (!q.n) q.n = x.n; if (!q.d && x.d) q.d = x.d; } });
          // set bonuses for armor you do not own (worked out from the sets of the pieces in the build)
          const cnt = {}; info.a.forEach((q) => { if (q.set) cnt[q.set] = (cnt[q.set] || 0) + 1; });
          info.a.forEach((q) => { (q.setp || []).forEach((p) => { if (cnt[q.set] >= (p.rc || 99) && !info.sb.some((b) => b.n === p.n)) info.sb.push({ n: p.n, i: p.i, rc: p.rc, s: q.set, d: p.d || '' }); }); delete q.setp; });
        } catch (e) { /* the page shows what it has */ }
      }
      let img = '';
      for (let k = 0; k < 4 && !img; k++) {
        for (const [ty, q] of [['image/webp', .84], ['image/webp', .7], ['image/jpeg', .72]]) { const d = cv.toDataURL(ty, q); if (d.startsWith('data:' + ty) && d.length <= 690000) { img = d; break; } }
        if (!img) { const c2 = document.createElement('canvas'); c2.width = Math.round(cv.width * .8); c2.height = Math.round(cv.height * .8); c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height); cv = c2; }
      }
      return { img, info };
    } catch (e) { /* shared without a picture */ }
    return { img: '', info: null };
  }
  function showPic(l, cv, code) {
    let data = cv.toDataURL('image/png');
    // The picture as a file, made now: phones only allow copying and sharing straight from a tap, with nothing awaited first.
    const bin = atob(data.split(',')[1] || ''); let u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    if (code) { try { u8 = pngAddText(u8, PNGK, code); data = 'data:image/png;base64,' + u8b64(u8); } catch (e) { /* the plain picture still works */ } }
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
        // Copied straight from the click with the browser clipboard (on the website and in the PC app alike: it writes a real
        // picture Discord can paste). If that is refused, the PC app tries its own clipboard, which checks that it worked.
        const okMsg = () => say('Copied. Paste it into Discord or anywhere else.');
        const viaApp = () => (isWeb || !gt.imgCopy ? Promise.reject(new Error('no')) : gt.imgCopy({ d: data }));
        const fail = () => say(isWeb ? 'This browser would not copy it. Hold your finger on the picture and choose Copy, or use Download.' : 'Could not copy the picture. Use Save as PNG and drag the file into Discord instead.');
        if (navigator.clipboard && window.ClipboardItem) navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]).then(okMsg, () => viaApp().then(okMsg, fail));
        else viaApp().then(okMsg, fail);
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
  // Equipped, complete: like Save loadout, the armor mods, the subclass setup and the artifact with its perks are read from the game.
  async function fullFromChar(cid, name) {
    const d = fromChar(cid, name);
    await Promise.all(d.it.filter((q) => AB.includes(q.b) || q.b === SUB).map(async (en) => { const x = items().find((o) => o.id === en.id); const m = await capture(x); if (m) en.m = m; }));
    try { withArt(d, await artFor(cid)); } catch (e) { /* shared without the artifact */ }
    return d;
  }
  // Fragments in slots the aspects do not open ("ghosts", greyed out in game) were saved by older versions. When the subclass is
  // in your inventory with the same aspects, its greyed-out slots are known, and fragments in them are dropped.
  async function ghostFree(en) {
    if (!en || en.b !== SUB || !en.m || !en.m.length) return null;
    const X = window.__gtx, x = items().find((o) => o.id === en.id) || items().find((o) => o.h === en.h && o.b === SUB);
    if (!x || !X || !X.detail) return null;
    let d; try { d = await X.detail(x); } catch (e) { return null; }
    if (!d || !Array.isArray(d.dis) || !d.dis.length) return null;
    const asp = []; ((d.groups || [])).forEach((gr) => (gr.cols || []).forEach((col) => { const on = col.find((p) => p.on); if (on && /aspect/i.test(on.c || '')) asp.push([int(on.si), int(on.h)]); }));
    if (!asp.length || !asp.every(([si, h]) => en.m.some((p) => p[0] === si && p[1] === h))) return null; // other aspects: other slots open
    const dis = new Set(d.dis), keep = en.m.filter((p) => !dis.has(p[0]));
    return keep.length < en.m.length ? keep : null;
  }
  let ghostRun = false;
  async function fixGhosts() {
    if (ghostRun || !D0()) return; ghostRun = true;
    let n = 0;
    for (const l of all()) { const en = (l.it || []).find((q) => q.b === SUB); const keep = await ghostFree(en); if (keep) { en.m = keep; n++; } }
    if (n) { save(); render(); }
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
  function openEd(l, isNew, opt) {
    const bld = !!(opt && opt.build);
    ed = { id: isNew ? null : l.id, d: clone(l), hist: [], fut: [], pick: null, pq: '', msg: '', build: bld, src: bld ? 'any' : 'mine', anyRes: null, anyKey: '', anySeq: 0 };
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
  // Any item: every Legendary and Exotic in the game for the slot (armor for the loadout's class), for builds you do not own yet.
  const anyOK = (b) => WB.includes(b) || AB.includes(b);
  let anyT = 0;
  function anyLoad() {
    if (!ed || !gt.bdItems) return; const key = ed.pick + '|' + ed.d.c + '|' + ed.pq.trim(); if (ed.anyKey === key) return;
    ed.anyKey = key; ed.anyRes = null; const my = ++ed.anySeq, e0 = ed; clearTimeout(anyT);
    anyT = setTimeout(() => gt.bdItems({ b: e0.pick, c: e0.d.c, q: e0.pq.trim() }).then((r) => { if (ed === e0 && my === e0.anySeq) { e0.anyRes = r || []; const el = g('dlpl'); if (el) el.innerHTML = pickList(); } }, () => { if (ed === e0 && my === e0.anySeq) { e0.anyRes = []; const el = g('dlpl'); if (el) el.innerHTML = pickList(); } }), 180);
  }
  function pickList() {
    const d = ed.d, b = ed.pick, qq = ed.pq.trim();
    if (ed.src === 'any' && anyOK(b)) {
      if (AB.includes(b) && d.c === 3) return '<p class="mute">Pick a class at the top first. Armor is made for one class.</p>';
      anyLoad(); const cur = d.it.find((q) => q.b === b);
      if (ed.anyRes === null) return '<p class="mute">Loading every item for this slot...</p>';
      return ed.anyRes.map((x) => `<div class="dl-pa${cur && cur.h === x.h ? ' on' : ''}" data-ed="chooseany" data-h="${x.h}" role="button" tabindex="0" title="${esc(x.n)}"><span style="border-color:${IMRC[x.r] === '#522f65' ? '#8a5fb0' : IMRC[x.r] || '#3a3d43'}"><img src="${esc(V.icon(x.i))}" alt="" loading="lazy"></span><b>${esc(x.n)}</b><small>${esc(x.t)}${x.r === 'Exotic' ? ' · Exotic' : ''}</small></div>`).join('') || '<p class="mute">Nothing matches. Try another name or type.</p>';
    }
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
    const subPl = subEn ? subOrd(subEn.m.slice().sort((p, q) => p[0] - q[0])) : [];
    const mods = [...(d.fm || []).map((p) => [0, p[0], p[2], p[1]]), ...d.it.flatMap((q) => (AB.includes(q.b) ? q.m : []))];
    const coss = d.it.filter((q) => (WB.includes(q.b) || AB.includes(q.b)) && q.cs && q.cs.length);
    const cosRow = coss.length ? coss.map((q) => `<span class="dl-cs" title="${esc(q.n)}"><img class="dl-csi" src="${esc(V.icon(q.i))}" alt="">${plugIcons(q.cs)}</span>`).join('') : '<span class="mute">Not saved. The loadout leaves your ornaments and shaders as they are.</span>';
    loadSlots(d);
    const warn = (xw > 1 ? '<div class="dl-wr">Only one exotic weapon can be equipped at a time.</div>' : '') + (xa > 1 ? '<div class="dl-wr">Only one exotic armor piece can be equipped at a time.</div>' : '');
    const pn = (cls, title, body, foot, dis) => `<div class="dl-pn ${cls}${dis ? ' dis' : ''}"><div class="dl-ph"><span>${title}</span></div><div class="dl-pb">${body}</div>${foot ? `<div class="dl-pf">${foot}</div>` : ''}</div>`;
    box.innerHTML = `<div class="dl-eb">
<div class="dl-ehd"><input id="dlen" class="dl-name" placeholder="${ed.build ? 'Build name' : 'Loadout name'}" maxlength="80" value="${esc(d.n)}"><select id="dlcls" title="Which class this loadout is for"><option value="3"${anyc ? ' selected' : ''}>Any class</option>${[0, 1, 2].map((c) => `<option value="${c}"${d.c === c ? ' selected' : ''}>${esc(CL[c])}</option>`).join('')}</select><span class="dl-sp"></span><button class="g" data-ed="undo"${ed.hist.length ? '' : ' disabled'} title="Undo">&#8630; Undo</button><button class="g" data-ed="redo"${ed.fut.length ? '' : ' disabled'} title="Redo">Redo &#8631;</button><button class="g" data-ed="x" title="Close without saving">&#10005;</button></div>
<div class="dl-ebody">${ed.build ? '<div class="dl-bhint">Making a build for the Builds tab. Pick any weapon or armor with <b>Any item</b>, even ones you do not own yet. Customize the subclass, mods and artifact, then press <b>Share to Builds</b>. The Builds page shows its picture, plus how to play it and strengths and weaknesses if you add them.</div>' : ''}<textarea id="dleo" class="dl-notes" placeholder="Notes (add #hashtags like #pvp or #raid to find this loadout fast)">${esc(d.o)}</textarea>
${warn}${ed.msg ? `<div class="dl-wr">${esc(ed.msg)}</div>` : ''}
${ed.wpk ? wperkHTML() : ''}${ed.pick ? `<div class="dl-es dl-pk"><div class="dl-eh">Choose ${esc(BN[ed.pick])} ${anyOK(ed.pick) && gt.bdItems ? `<span class="dl-src"><button class="g${ed.src === 'mine' ? ' on' : ''}" data-ed="src" data-v="mine">Your items</button><button class="g${ed.src === 'any' ? ' on' : ''}" data-ed="src" data-v="any" title="Every Legendary and Exotic in the game, for builds you do not own yet">Any item</button></span>` : ''}<button class="g" data-ed="pickx">Close</button></div><input id="dlpq" placeholder="${ed.src === 'any' && anyOK(ed.pick) ? 'Search by name or type (for example: hand cannon)' : 'Search (is:exotic, perk:..., or a name)'}" value="${esc(ed.pq)}" autocomplete="off"><div id="dlpl" class="dl-pl">${pickList()}</div></div>` : ''}
<div class="dl-panels">
${pn('dl-p-sub', 'Subclass', anyc ? '<span class="mute">Pick a class to add a subclass.</span>' : `<div class="dl-subrow">${row([SUB])}<div class="dl-subpl">${subPl.length ? plugIcons(subPl, 'big') : (subEn ? '<span class="mute">No abilities saved. Use Customize.</span>' : '')}</div></div>`, `<button class="g" data-ed="subcust"${subEn ? '' : ' disabled'}>Customize subclass</button>`, anyc)}
${pn('dl-p-wep', 'Weapons', `<div class="dl-er">${row(WB)}</div>`, `<label class="dl-ac"><input type="checkbox" id="dlmv"${d.mv ? ' checked' : ''}> Move other items away</label>`)}
${pn('dl-p-arm', 'Armor', `<div class="dl-er">${row(AB)}</div>`, '', anyc)}
${pn('dl-p-gen', 'General', `<div class="dl-er">${row(GB)}</div>`, '')}
${pn('dl-p-mod', 'Mods', modsBody(d), `<button class="b" data-ed="selmods" title="Pick mods from a list; each goes into a free socket it fits when the loadout is applied">Select mods</button><button class="g" data-ed="curmods">Use current mods</button>${mods.length ? '<button class="g" data-ed="clrmods">Clear</button>' : ''}`)}
${pn('dl-p-cos', 'Ornaments and shaders', `<div class="arow dl-coss">${cosRow}</div>`, `<button class="g" data-ed="curcos">Use current look</button>${coss.length ? '<button class="g" data-ed="clrcos">Clear</button>' : ''}`)}
${pn('dl-p-art', 'Artifact', `<div class="dl-artrow">${d.ai && d.ai.i ? `<span class="dl-ai"><img src="${esc(V.icon(d.ai.i))}" alt="" title="${esc(d.ai.n)}"></span>` : ''}<div class="arow">${d.a.length ? aRowL(d.a) : '<span class="mute">No artifact perks saved.</span>'}</div></div>`, `<button class="g" data-ed="artpick">Customize artifact</button><button class="g" data-ed="artcur">Use current</button>${d.a.length ? '<button class="g" data-ed="artclr">Clear</button>' : ''}`)}
</div>
<div class="dl-tools"><button class="g" data-ed="fill" data-m="eq">Fill in using equipped</button><button class="g" data-ed="fill" data-m="neq">Fill in using non-equipped</button><button class="g" data-ed="rand">Randomize</button>${AR === null ? `<span class="mute">Artifact unavailable${ARERR ? ': ' + esc(ARERR) : ''}</span>` : ''}</div>
</div>
<div class="dl-ef">${ed.build ? '<button class="b" data-ed="tobuild">Share to Builds</button><button class="g" data-ed="savenew">Save as a loadout</button>' : `<button class="b" data-ed="save">Save Changes</button><button class="g" data-ed="savenew">Save as New</button><button class="g" data-ed="share">Share</button>${ed.id ? '<button class="g dl-del" data-ed="del">Delete</button>' : ''}`}<span class="dl-sp"></span><button class="g" data-ed="x">Cancel</button></div></div>`;
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
  // Perks for a weapon in a build: every column the weapon can roll (from the item data), one pick per column.
  function wperkHTML() {
    const w = ed.wpk, en = ed.d.it.find((q) => q.b === w.b); if (!en) return '';
    const on = new Set((en.wp || []).map((p) => p[0]));
    const body = w.err ? `<p class="dl-wr">${esc(w.err)}</p>` : !w.cols ? '<p class="mute">Loading the perks...</p>' : w.cols.length ? w.cols.map((c, ci) => `<div class="dl-wpc"><small>${esc(c.label)}</small><div>${c.opts.map((o) => `<button class="dl-wpo${on.has(o.h) ? ' on' : ''}" data-ed="wpo" data-ci="${ci}" data-h="${o.h}" title="${esc(o.n + (o.d ? '\n\n' + o.d : ''))}"><img src="${esc(V.icon(o.i))}" alt=""><span>${esc(o.n)}</span></button>`).join('')}</div></div>`).join('') : '<p class="mute">This weapon has no perks to pick.</p>';
    return `<div class="dl-es dl-pk"><div class="dl-eh">Perks for ${esc(en.n)} <span class="mute" style="font-size:12px;letter-spacing:0;text-transform:none">One per column. Shown on the build; your own copy is not changed.</span> <button class="g" data-ed="wpkx">Done</button></div>${body}</div>`;
  }
  async function wperkOpen(b) {
    const en = ed.d.it.find((q) => q.b === b); if (!en) return;
    ed.pick = null; ed.wpk = { b, h: en.h, cols: null, err: '' }; ed.top = true; drawEd();
    try { const r = await gt.fdWeapon({ h: en.h }); if (ed && ed.wpk && ed.wpk.b === b) { ed.wpk.cols = (r.cols || []).filter((c) => !c.fixed || c.opts.length); drawEd(); } }
    catch (e) { if (ed && ed.wpk && ed.wpk.b === b) { ed.wpk.err = V.clean(e); drawEd(); } }
  }
  function edClickBuild(l) { mod = { t: 'bdpub', l, title: String(l.n || '').slice(0, 60), notes: String(l.o || '').slice(0, 1200), tags: [], str: [], weak: [], prio: [], cls: l.c < 3 ? l.c : '', msg: '' }; drawMod(); if (gt.pfaStatus) gt.pfaStatus().then((st) => { if (mod && mod.t === 'bdpub') { mod.signed = !!(st && st.on); if (!mod.signed) drawMod(); } }, () => {}); setTimeout(() => { const i = g('bdtitle'); if (i) i.focus(); }, 30); }
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
    else if (a === 'pick') { ed.wpk = null; ed.pick = b; ed.pq = ''; ed.top = true; drawEd(); const i = g('dlpq'); if (i) i.focus(); }
    else if (a === 'pickx') { ed.pick = null; drawEd(); }
    else if (a === 'choose') choose(t.dataset.id);
    else if (a === 'wperks') wperkOpen(b);
    else if (a === 'wpkx') { ed.wpk = null; drawEd(); }
    else if (a === 'wpo' && ed.wpk && ed.wpk.cols) {
      const col = ed.wpk.cols[+t.dataset.ci], o = col && col.opts.find((q) => String(q.h) === t.dataset.h), bk = ed.wpk.b; if (!o) return;
      mut((d) => { const en = d.it.find((q) => q.b === bk); if (!en) return; const inCol = new Set(col.opts.map((q) => q.h)), had = (en.wp || []).some((p) => p[0] === o.h); en.wp = (en.wp || []).filter((p) => !inCol.has(p[0])); if (!had) en.wp.push([o.h, o.n, rawIcon(o.i)]); const order = ed.wpk.cols.map((c) => new Set(c.opts.map((q) => q.h))); en.wp.sort((p, q) => order.findIndex((s2) => s2.has(p[0])) - order.findIndex((s2) => s2.has(q[0]))); });
    }
    else if (a === 'src') { ed.src = t.dataset.v === 'any' ? 'any' : 'mine'; ed.anyKey = ''; drawEd(); const i = g('dlpq'); if (i) i.focus(); }
    else if (a === 'chooseany') {
      const x = (ed.anyRes || []).find((q) => String(q.h) === t.dataset.h), bk = ed.pick; if (!x || !bk) return;
      mut((d) => { d.it = d.it.filter((q) => q.b !== bk); d.it.push({ id: '', h: x.h, b: bk, n: String(x.n).slice(0, 80), i: rawIcon(x.i), e: 1, m: [], cs: [] }); });
      ed.pick = null; drawEd();
    }
    else if (a === 'tobuild') {
      const d = clone(ed.d); d.n = String(d.n || '').trim();
      if (!d.it.length) { ed.msg = 'Add at least one item first.'; ed.top = true; drawEd(); return; }
      mod = { t: 'shmenu', l: d }; edClickBuild(d);
    }
    else if (a === 'rm') mut((d) => { d.it = d.it.filter((q) => q.b !== b); });
    else if (a === 'eqt') mut((d) => { const q = d.it.find((o) => o.b === b); if (q) q.e = q.e === 0 ? 1 : 0; });
    else if (a === 'fill') doFill(t.dataset.m);
    else if (a === 'rand') doRandom();
    else if (a === 'clrmods') mut((d) => { d.fm = []; d.it.forEach((q) => { if (AB.includes(q.b)) q.m = []; }); });
    else if (a === 'subcust') openSub();
    else if (a === 'modsock') openModPick(b, +t.dataset.si);
    else if (a === 'selmods') openModSel();
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

  // ---------------- choosing armor mods in the editor ----------------
  // Each armor piece shows its mod sockets. A socket with a saved mod shows that mod; the others are faded and keep whatever is in
  // them in the game. Click a socket to pick a mod for it (every mod that fits, from the game's own list for that socket).
  const SLOTC = {}, MOPC = {};
  const xOf = (d, en) => items().find((o) => o.id === en.id) || (resolve(d).find((q) => q.en === en) || {}).x;
  function loadSlots(d) {
    d.it.filter((q) => AB.includes(q.b)).forEach((en) => {
      const x = xOf(d, en); if (!x || !/^\d+$/.test(String(x.id)) || SLOTC[x.id]) return;
      SLOTC[x.id] = 'wait';
      Promise.resolve().then(() => gt.itemSlots({ id: x.id })).then((ss) => { SLOTC[x.id] = Array.isArray(ss) ? ss : []; }, () => { SLOTC[x.id] = 'err'; }).then(() => { if (ed) drawEd(); });
    });
  }
  const mIcon = (i) => (i ? `<img src="${esc(V.icon(i))}" alt="">` : '');
  function modsBody(d) {
    const ens = AB.map((b) => d.it.find((q) => q.b === b)).filter(Boolean), fm = d.fm || [];
    if (!ens.length && !fm.length) return '<span class="mute">Add armor to choose its mods.</span>';
    const rows = ens.map((en) => {
      const x = xOf(d, en), ss = x && SLOTC[x.id], saved = new Map((en.m || []).map((p) => [p[0], p]));
      let cells = '';
      if (Array.isArray(ss) && ss.length) {
        cells = ss.map((q, k) => {
          const p = saved.get(q.si), lab = esc(BN[en.b] || 'Armor') + ' mod ' + (k + 1);
          return p ? `<button class="ap md dl-ms" data-ed="modsock" data-b="${en.b}" data-si="${q.si}" title="${lab}: ${esc(p[3])}. Click to change it." aria-label="${lab}: ${esc(p[3])}">${mIcon(p[2])}</button>`
            : `<button class="ap md dl-ms asis" data-ed="modsock" data-b="${en.b}" data-si="${q.si}" title="${lab}: left as it is in the game${q.n ? ' (' + esc(q.n) + ')' : ''}. Click to choose a mod." aria-label="${lab}: left as it is">${mIcon(q.i)}</button>`;
        }).join('');
      } else {
        cells = (en.m || []).map((p) => `<span class="ap" title="${esc(p[3])}">${mIcon(p[2])}</span>`).join('')
          + `<span class="mute dl-mst">${!x ? 'This piece is not in your inventory, so its mods cannot be changed.' : ss === 'err' ? 'Could not read its mod sockets.' : ss === 'wait' || !ss ? 'Reading its mod sockets...' : 'No mod sockets.'}</span>`;
      }
      const dimHere = fm.filter((p) => +p[4] === en.b);
      return `<div class="dl-mpc"><span class="dl-mpi" title="${esc(en.n || (x && x.n) || '')}">${mIcon(en.i || (x && x.i))}</span><div class="dl-mps">${cells}${dimHere.length ? `<span class="dl-mdim" title="Picked mods: each goes into a free socket of this piece when the loadout is applied">${dimHere.map((p) => `<span class="ap" title="${esc(p[1])} (picked: goes into a free socket that fits)">${mIcon(p[2])}</span>`).join('')}</span>` : ''}</div></div>`;
    }).join('');
    const loose = fm.filter((p) => !AB.includes(+p[4]));
    const other = loose.length ? `<div class="dl-mpc"><span class="dl-mpl0">Any piece</span><div class="dl-mps" title="Picked mods: each goes into a free socket it fits when the loadout is applied">${loose.map((p) => `<span class="ap" title="${esc(p[1])} (picked: any piece it fits)">${mIcon(p[2])}</span>`).join('')}</div></div>` : '';
    return `<p class="mute dl-mhint">Click a socket to choose its mod. Faded sockets are left as they are in the game.</p><div class="dl-mgrid">${rows}${other}</div>`;
  }
  async function openModPick(b, si) {
    if (!ed) return; const d = ed.d, en = d.it.find((q) => q.b === b), x = en && xOf(d, en); if (!x) return;
    const ss = Array.isArray(SLOTC[x.id]) ? SLOTC[x.id] : [], sk = ss.find((q) => q.si === si), k = ss.indexOf(sk);
    mod = { t: 'modp', b, si, q: '', msg: '', name: (BN[b] || 'Armor') + ' mod ' + (k + 1), piece: en.n || x.n || '', opts: null }; drawMod();
    const key = x.h + ':' + si;
    try { if (!MOPC[key]) MOPC[key] = await gt.modOpts({ h: x.h, si, char: CH, cur: sk && sk.cur ? [[sk.cur, true]] : [] }); }
    catch (e) { if (mod && mod.t === 'modp') { mod.msg = 'Could not load the mods for this socket: ' + V.clean(e); drawMod(); } return; }
    if (!mod || mod.t !== 'modp' || mod.si !== si || mod.b !== b) return;
    const r = MOPC[key], seen = new Map();
    const old = (o) => /deprecated|legacy/i.test(o.t || '') || /^deprecated\b/i.test(o.n || '');
    ((r && r.opts) || []).forEach((o) => { if (old(o) && !(sk && sk.cur === o.h)) return; const nk = String(o.n || '').toLowerCase(), was = seen.get(nk); if (!was || (o.own && !was.own) || (o.ci && !was.ci)) seen.set(nk, o); });
    mod.known = !!(r && r.known);
    mod.opts = [...seen.values()].sort((p, q) => (q.em - p.em) || ((mod.known ? (q.own ? 1 : 0) - (p.own ? 1 : 0) : 0)) || String(p.n).localeCompare(String(q.n)));
    drawMod(); const i = g('dlmq'); if (i) i.focus();
  }
  function modpList() {
    if (!mod.opts) return `<p class="mute">${mod.msg ? esc(mod.msg) : 'Loading the mods...'}</p>`;
    const en = ed && ed.d.it.find((q) => q.b === mod.b), cur = en && (en.m || []).find((p) => p[0] === mod.si), qq = mod.q.trim().toLowerCase();
    const list = mod.opts.filter((o) => !qq || (o.n + ' ' + (o.d || '')).toLowerCase().includes(qq));
    return list.map((o) => {
      const lock = mod.known && !o.own && !o.em;
      return `<button class="dl-mo${cur && cur[1] === o.h ? ' on' : ''}${lock ? ' lock' : ''}" data-md="mpset" data-h="${o.h}" title="${esc(o.n + (o.d ? '\n' + o.d : '') + (lock ? '\nNot unlocked on this account yet' + (o.src ? ': ' + o.src : '.') : ''))}">${mIcon(o.i)}<span><b>${esc(o.em ? 'Empty socket (remove the mod)' : o.n)}</b>${o.d && !o.em ? `<small>${esc(String(o.d).slice(0, 110))}</small>` : ''}${lock ? '<small class="dl-mol">Not unlocked yet</small>' : ''}</span></button>`;
    }).join('') || '<p class="mute">No mods match.</p>';
  }
  function modpHTML() {
    return `<div class="dl-mc dl-modp"><h3>${esc(mod.name)}</h3><p class="mute">${esc(mod.piece)}. The mod you pick is put in when the loadout is applied.</p>
<input id="dlmq" type="search" placeholder="Search mods" value="${esc(mod.q)}" autocomplete="off" aria-label="Search mods">
<div class="dl-mpl" id="dlmpl">${modpList()}</div>
<div class="dl-bt"><button class="g" data-md="mpkeep">Leave it as it is in the game</button><span class="dl-sp"></span><button class="g" data-md="x">Close</button></div></div>`;
  }

  // ---------------- "Select mods": pick mods from a list, Pathfinder places them ----------------
  // Like DIM: the loadout keeps a list of mods (d.fm, [hash, name, icon, category, bucket]); when it is applied, each goes into a
  // free socket of its kind. Sockets set one by one in the Mods panel are kept as they are and not counted as free.
  const CATN = { 'enhancements.v2_head': 'Helmet', 'enhancements.v2_arms': 'Arms', 'enhancements.v2_chest': 'Chest', 'enhancements.v2_legs': 'Legs', 'enhancements.v2_class_item': 'Class item', 'enhancements.v2_general': 'General (any piece)', 'enhancements.artifice': 'Artifice' };
  const isMod = (p) => /enhancement/i.test(String(p[3] || ''));
  async function openModSel() {
    if (!ed) return; const d = ed.d;
    const ens = AB.map((b) => d.it.find((q) => q.b === b)).filter(Boolean);
    if (!ens.length) { toast('Add armor to the loadout first: the mods to choose from depend on it.'); return; }
    mod = { t: 'msel', q: '', msg: '', cats: null, pick: (d.fm || []).filter(isMod).map((p) => [...p]) }; drawMod();
    const socks = [];
    for (const en of ens) {
      const x = xOf(d, en); if (!x || !/^\d+$/.test(String(x.id))) continue;
      let ss = SLOTC[x.id]; if (!Array.isArray(ss)) { try { ss = await gt.itemSlots({ id: x.id }); SLOTC[x.id] = Array.isArray(ss) ? ss : []; } catch (e) { ss = []; } }
      const hand = new Set((en.m || []).map((p) => p[0]));
      (ss || []).forEach((q) => { if (q.cat) socks.push({ en, x, si: q.si, cur: q.cur, cat: q.cat, hand: hand.has(q.si) }); });
    }
    if (!mod || mod.t !== 'msel') return;
    if (!socks.length) { mod.msg = 'Could not read the mod sockets of the armor in this loadout (it has to be in your inventory).'; drawMod(); return; }
    const cats = new Map();
    for (const sk of socks) {
      const k = sk.cat, c = cats.get(k) || { k, name: CATN[k] || k.replace(/^enhancements\.(v2_)?/, '').replace(/_/g, ' '), slots: 0, hand: 0, b: 0, opts: new Map(), src: [] };
      c.slots++; if (sk.hand) c.hand++; c.src.push(sk); const bs = new Set(c.src.map((q) => q.en.b)); c.b = bs.size === 1 && !/general|artifice/.test(k) ? sk.en.b : 0; cats.set(k, c);
    }
    for (const c of cats.values()) {
      const sk = c.src[0], key = sk.x.h + ':' + sk.si;
      try { if (!MOPC[key]) MOPC[key] = await gt.modOpts({ h: sk.x.h, si: sk.si, char: CH, cur: sk.cur ? [[sk.cur, true]] : [] }); } catch (e) { continue; }
      const r = MOPC[key]; c.known = !!(r && r.known);
      ((r && r.opts) || []).forEach((o) => {
        if (o.em || /deprecated|legacy/i.test(o.t || '') || /^deprecated\b/i.test(o.n || '')) return;
        const nk = String(o.n || '').toLowerCase(), was = c.opts.get(nk); if (!was || (o.own && !was.own)) c.opts.set(nk, o);
      });
    }
    if (!mod || mod.t !== 'msel') return;
    const order = ['enhancements.v2_head', 'enhancements.v2_arms', 'enhancements.v2_chest', 'enhancements.v2_legs', 'enhancements.v2_class_item', 'enhancements.v2_general', 'enhancements.artifice'];
    mod.cats = [...cats.values()].sort((p, q) => ((order.indexOf(p.k) + 99) % 99) - ((order.indexOf(q.k) + 99) % 99));
    mod.cats.forEach((c) => { c.list = [...c.opts.values()].sort((p, q) => (c.known ? (q.own ? 1 : 0) - (p.own ? 1 : 0) : 0) || String(p.n).localeCompare(String(q.n))); });
    drawMod(); const i = g('dlmsq'); if (i) i.focus();
  }
  const mselHand = (c) => (mod.replace ? 0 : c.hand), mselFree = (c) => c.slots - mselHand(c) - mod.pick.filter((p) => p[3] === c.k).length;
  function mselList() {
    if (!mod.cats) return `<p class="mute">${mod.msg ? esc(mod.msg) : 'Loading the mods that fit this armor...'}</p>`;
    const qq = mod.q.trim().toLowerCase();
    return mod.cats.map((c) => {
      const list = c.list.filter((o) => !qq || (o.n + ' ' + (o.d || '')).toLowerCase().includes(qq)); if (!list.length) return '';
      const free = mselFree(c);
      return `<div class="dl-msg"><div class="dl-msh"><b>${esc(c.name)}</b><small>${free > 0 ? free + ' of ' + (c.slots - mselHand(c)) + ' free' : 'all ' + (c.slots - mselHand(c)) + ' taken'}${mselHand(c) ? ' &middot; ' + mselHand(c) + ' set one by one' : ''}</small></div><div class="dl-msgrid">${list.map((o) => {
        const lock = c.known && !o.own, n2 = mod.pick.filter((p) => p[0] === o.h && p[3] === c.k).length;
        return `<button class="dl-mso${n2 ? ' on' : ''}${lock ? ' lock' : ''}${free <= 0 ? ' full' : ''}" data-md="msadd" data-h="${o.h}" data-k="${esc(c.k)}" title="${esc(o.n + (o.d ? '\n' + o.d : '') + (lock ? '\nNot unlocked on this account yet' : ''))}">${mIcon(o.i)}${n2 ? `<em>${n2}</em>` : ''}<span>${esc(o.n)}</span></button>`;
      }).join('')}</div></div>`;
    }).join('') || '<p class="mute">No mods match.</p>';
  }
  function mselHTML() {
    const picked = mod.pick.map((p, k) => `<button class="dl-msp" data-md="msdel" data-k="${k}" title="${esc(p[1])}: click to take it off">${mIcon(p[2])}<span>${esc(p[1])}</span><i aria-hidden="true">&times;</i></button>`).join('');
    return `<div class="dl-mc dl-msel"><h3>Select mods</h3><p class="mute">Pick the mods this loadout should have; the same mod can be picked more than once. When the loadout is applied, each one goes into a free socket it fits. Sockets you set one by one in the Mods panel stay as they are.</p>
<div class="dl-mspk">${picked || '<span class="mute">No mods picked yet.</span>'}</div>
${mod.cats && !mod.replace && mod.cats.some((c) => c.hand) ? `<p class="dl-msr">${mod.cats.reduce((n, c) => n + c.hand, 0)} sockets are set one by one in the Mods panel, so they are not free here. <button class="g" data-md="msrepl">Use those sockets too</button><small>Their mods become picks here, which you can keep or take off.</small></p>` : ''}
${mod.msg && mod.cats ? `<p class="dl-msm">${esc(mod.msg)}</p>` : ''}
<input id="dlmsq" type="search" placeholder="Search mods" value="${esc(mod.q)}" autocomplete="off" aria-label="Search mods">
<div class="dl-msl" id="dlmsl">${mselList()}</div>
<div class="dl-bt"><button class="b" data-md="mssave"${mod.cats ? '' : ' disabled'}>Save mods</button>${mod.pick.length ? '<button class="g" data-md="msclr">Take them all off</button>' : ''}<span class="dl-sp"></span><button class="g" data-md="x">Cancel</button></div></div>`;
  }
  function mselClick(a, b) {
    if (a === 'msadd') {
      const c = (mod.cats || []).find((q) => q.k === b.dataset.k), o = c && c.list.find((q) => q.h === +b.dataset.h); if (!o) return;
      if (mselFree(c) <= 0) { mod.msg = `No free ${c.name.toLowerCase()} sockets left. Take one off first.`; drawMod(); return; }
      mod.pick.push([o.h, String(o.n || '').slice(0, 60), rawIcon(o.i), c.k, c.b]); mod.msg = '';
    } else if (a === 'msdel') { mod.pick.splice(+b.dataset.k, 1); mod.msg = ''; }
    else if (a === 'msclr') { mod.pick = []; mod.msg = ''; }
    else if (a === 'msrepl') {
      (mod.cats || []).forEach((c) => c.src.forEach((sk) => { if (!sk.hand) return; const p = (sk.en.m || []).find((m) => m[0] === sk.si); if (p && !/^empty/i.test(p[3] || '')) mod.pick.push([p[1], String(p[3] || '').slice(0, 60), p[2], c.k, c.b]); }));
      mod.replace = true; mod.msg = '';
    }
    else if (a === 'mssave') {
      const pick = mod.pick;
      const repl = mod.replace;
      mut((d) => { d.fm = [...(d.fm || []).filter((p) => !isMod(p)), ...pick]; if (repl) d.it.forEach((q) => { if (AB.includes(q.b)) q.m = []; }); });
      mod = null; drawMod(); return;
    }
    const sc = g('dlmsl') ? g('dlmsl').scrollTop : 0; drawMod(); if (g('dlmsl')) g('dlmsl').scrollTop = sc;
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
    if (!box) { box = document.createElement('div'); box.id = 'dlmod'; document.body.appendChild(box); box.onclick = modClick; box.onchange = modChange;
      // Import: a Pathfinder picture can be dropped on the window, or pasted
      box.addEventListener('dragover', (e) => { if (mod && mod.t === 'imp') { e.preventDefault(); box.classList.add('dl-drop'); } });
      box.addEventListener('dragleave', () => box.classList.remove('dl-drop'));
      box.addEventListener('drop', (e) => { box.classList.remove('dl-drop'); if (mod && mod.t === 'imp' && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) { e.preventDefault(); impPic(e.dataTransfer.files[0]); } });
      box.addEventListener('paste', (e) => { if (!mod || mod.t !== 'imp' || !e.clipboardData) return; const it = [...e.clipboardData.items].find((q) => q.kind === 'file' && /^image\//.test(q.type)); if (it) { e.preventDefault(); impPic(it.getAsFile(), true); } }); box.oninput = (e) => { if (mod && mod.t === 'modp' && e.target.id === 'dlmq') { mod.q = e.target.value; const l = g('dlmpl'); if (l) l.innerHTML = modpList(); } if (mod && mod.t === 'msel' && e.target.id === 'dlmsq') { mod.q = e.target.value; const l = g('dlmsl'); if (l) l.innerHTML = mselList(); } }; }
    const D = D0(); let h = '';
    if (mod.t === 'sub') h = subHTML();
    else if (mod.t === 'modp') h = modpHTML();
    else if (mod.t === 'msel') h = mselHTML();
    else if (mod.t === 'imp') {
      h = `<div class="dl-mc"><h3>Import loadout</h3><p class="mute">Paste a Pathfinder share link (d2pathfinder.com/...), a DIM loadout link (dim.gg/...) or a loadout code (GTL1:...), or choose or drop a picture made with Pathfinder. Items are matched to the closest ones you own.</p><textarea id="dlimp" placeholder="https://d2pathfinder.com/..." spellcheck="false">${esc(mod.text || '')}</textarea>${mod.msg ? `<div class="dl-wr">${esc(mod.msg)}</div>` : ''}<div class="dl-bt"><button class="g" data-md="paste">Paste from clipboard</button><button class="g" data-md="pickpic">Choose a picture</button><input type="file" id="dlimpf" accept="image/*" hidden><span class="dl-sp"></span><button class="b" data-md="doimp">Import</button><button class="g" data-md="x">Cancel</button></div></div>`;
    } else if (mod.t === 'shmenu') {
      h = `<div class="dl-mc dl-ig-pop"><h3>Share loadout</h3><p class="mute">A link opens the loadout for anyone, in Pathfinder or in a browser, like a dim.gg link. A picture is easy to post anywhere.</p>${mod.msg ? `<div class="dl-wr">${esc(mod.msg)}</div>` : ''}<div class="dl-bt dl-col"><button class="b" data-md="shlink">Copy share link</button><button class="g" data-md="shpic">Share as a picture</button>${gt.bdPub && window.__gtFlag && window.__gtFlag('tab-builds', true) === false ? '' : gt.bdPub ? '<button class="g" data-md="shbuild">Share to Builds (the community gallery)</button>' : ''}<button class="g" data-md="shcode">Copy loadout code</button>${navigator.share ? '<button class="g" data-md="shsend">Send the code...</button>' : ''}<button class="g" data-md="x">Close</button></div></div>`;
    } else if (mod.t === 'shlink') {
      h = `<div class="dl-mc dl-ig-pop"><h3>Share link</h3><p class="mute">${esc(mod.copied ? 'Copied. Paste it anywhere: Discord, a message, a forum post. It shows a preview card with the loadout picture.' : mod.copyFail ? 'Your browser blocked copying. The link below is selected: copy it with Ctrl+C, or press and hold it on a phone.' : 'Copy it and paste it anywhere: Discord, a message, a forum post. It shows a preview card with the loadout picture.')}</p><input id="dlurl" class="dl-url" readonly value="${esc(mod.url)}"><div class="dl-bt"><button class="b" data-md="lcopy">Copy link</button>${navigator.share ? '<button class="g" data-md="lsend">Share...</button>' : ''}<span class="dl-sp"></span><button class="g" data-md="x">Close</button></div></div>`;
    } else if (mod.t === 'bdpub') {
      const tg = (k, label) => `<label class="dl-bdt${mod.tags.includes(k) ? ' on' : ''}"><input type="checkbox" data-bdtag="${k}"${mod.tags.includes(k) ? ' checked' : ''}>${label}</label>`;
      h = `<div class="dl-mc dl-bdp"><h3>Share to Builds</h3><p class="mute">Your build goes in the Builds tab for everyone to see, vote on and import. People get the same subclass, weapons, armor, mods and artifact perks, matched to the gear they own.</p>${mod.signed === false ? '<div class="dl-wr">Sharing builds needs a Pathfinder account. Sign in at Settings &gt; Accounts first.</div>' : ''}${mod.msg ? `<div class="dl-wr">${esc(mod.msg)}</div>` : ''}
<label class="dl-bdl">Name<input id="bdtitle" maxlength="60" value="${esc(mod.title)}" placeholder="For example: Golden Gun GM build"></label>
${mod.l.c < 3 ? '' : `<label class="dl-bdl">Class<select id="bdcls"><option value="">Pick the class</option>${[0, 1, 2].map((c) => `<option value="${c}"${mod.cls === c ? ' selected' : ''}>${CL[c]}</option>`).join('')}</select></label>`}
<div class="dl-bdl">Good for (up to 4)<div class="dl-bdts">${tg('pve', 'PvE')}${tg('pvp', 'PvP')}${tg('raid', 'Raids')}${tg('dungeon', 'Dungeons')}${tg('gm', 'Grandmasters')}${tg('solo', 'Solo')}${tg('trials', 'Trials')}${tg('beginner', 'Beginners')}</div></div>
${(() => { const BD = window.__gtBD; if (!BD) return ''; const ch = (k, label, cls, on, data) => `<label class="dl-bdt ${cls}${on ? ' on' : ''}"><input type="checkbox" ${data}="${k}"${on ? ' checked' : ''}>${label}</label>`;
  return `<div class="dl-bdl">Strengths (optional, up to 8)<div class="dl-bdts">${Object.entries(BD.STR).map(([k, v]) => ch(k, esc(v), 'gd', mod.str.includes(k), 'data-bdstr')).join('')}</div></div>
<div class="dl-bdl">Weaknesses (optional, up to 6)<div class="dl-bdts">${Object.entries(BD.WEAK).map(([k, v]) => ch(k, esc(v), 'bd', mod.weak.includes(k), 'data-bdweak')).join('')}</div></div>
`; })()}
<label class="dl-bdl">How to play it (optional)<textarea id="bdnotes" maxlength="1200" rows="5" placeholder="What the build does, how to play it, what to swap.">${esc(mod.notes)}</textarea></label>
<div class="dl-bt"><button class="b" data-md="bdgo"${mod.busy ? ' disabled' : ''}>${mod.busy ? 'Sharing...' : 'Share to Builds'}</button><span class="dl-sp"></span><button class="g" data-md="x">Cancel</button></div></div>`;
    } else if (mod.t === 'bddone') {
      h = `<div class="dl-mc dl-ig-pop"><h3>Shared to Builds</h3><p class="mute">"${esc(mod.title)}" is in the Builds tab now. Every like and every import moves it up the popular list.</p><div class="dl-bt"><button class="b" data-md="bdopen">Open Builds</button><span class="dl-sp"></span><button class="g" data-md="x">Close</button></div></div>`;
    } else if (mod.t === 'shin') {
      h = shinHTML();
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
    if (e.target.id === 'dlimpf') { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) impPic(f); return; }
    if (e.target.id === 'dlnm') mod.nh = +e.target.value;
    if (e.target.dataset && (e.target.dataset.bdstr || e.target.dataset.bdweak || e.target.dataset.bdprio !== undefined) && mod.t === 'bdpub') {
      const ti = g('bdtitle'), no = g('bdnotes'); if (ti) mod.title = ti.value; if (no) mod.notes = no.value;
      const ds = e.target.dataset, [key, val, max] = ds.bdstr ? ['str', ds.bdstr, 8] : ds.bdweak ? ['weak', ds.bdweak, 6] : ['prio', +ds.bdprio, 6];
      if (e.target.checked) { if (mod[key].length >= max) { e.target.checked = false; mod.msg = 'Pick up to ' + max + '.'; drawMod(); return; } mod[key].push(val); } else mod[key] = mod[key].filter((t) => t !== val);
      mod.msg = ''; drawMod(); return;
    }
    if (e.target.dataset && e.target.dataset.bdtag && mod.t === 'bdpub') {
      const k = e.target.dataset.bdtag, ti = g('bdtitle'), no = g('bdnotes'); if (ti) mod.title = ti.value; if (no) mod.notes = no.value;
      if (e.target.checked) { if (mod.tags.length >= 4) { e.target.checked = false; mod.msg = 'Pick up to 4.'; drawMod(); return; } mod.tags.push(k); } else mod.tags = mod.tags.filter((t) => t !== k);
      mod.msg = ''; drawMod(); return;
    }
    else if (e.target.id === 'dlslot') { mod.i = +e.target.value; }
    else if (e.target.id === 'dlimp') mod.text = e.target.value;
  }
  function fromDim(r) {
    const l = norm({
      n: r.n, o: r.o, c: r.c, mv: r.mv, id: '', t: Date.now(), k: Date.now(),
      it: r.items.filter((q) => q.b).map((q) => ({ id: q.id, h: q.h, b: q.b, n: q.n, i: q.i, e: q.e, m: q.so })),
      a: r.art.map((p) => [p[0], p[1], p[2]]), fm: [...(r.mods || []), ...(r.mbk || [])].map((p) => [p[0], p[1], p[2], p[3], p[4] || 0]),
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
    if (e.target.id === 'dlmod') { if (mod.t === 'shin') { try { sessionStorage.removeItem('gt.share'); } catch (er) { /* storage off */ } } mod = null; drawMod(); return; }
    const sw = e.target.closest('[data-sw]'), ic = e.target.closest('[data-ic]');
    if ((sw || ic) && mod.t === 'ident') { if (sw) mod.ch = +sw.dataset.sw; else mod.ih = +ic.dataset.ic; const nm = g('dlnm'), sl = g('dlslot'); if (nm) mod.nh = +nm.value; if (sl) mod.i = +sl.value; drawMod(); return; }
    const b = e.target.closest('[data-md]'); if (!b) return;
    const a = b.dataset.md, D = D0();
    if (mod.t === 'msel' && /^ms/.test(a)) { mselClick(a, b); return; }
    if (mod.t === 'modp' && (a === 'mpset' || a === 'mpkeep')) {
      const { b: bk, si } = mod, o = a === 'mpset' && (mod.opts || []).find((q) => q.h === +b.dataset.h);
      if (a === 'mpset' && !o) return;
      mut((d) => { const en = d.it.find((q) => q.b === bk); if (!en) return; en.m = (en.m || []).filter((p) => p[0] !== si); if (o) { en.m.push([si, o.h, rawIcon(o.i), String(o.n || '').slice(0, 60)]); en.m.sort((p, q) => p[0] - q[0]); } });
      mod = null; drawMod(); return;
    }
    // Sharing Equipped: wait until its mods, subclass and artifact have been read.
    if (mod && mod.t === 'shmenu' && mod.wait && ['shlink', 'shpic', 'shcode', 'shsend', 'shbuild'].includes(a)) {
      const w = mod.wait, m0 = mod; m0.msg = 'Reading your mods, subclass and artifact...'; drawMod(); await w;
      if (mod !== m0) return; m0.msg = '';
    }
    if (a === 'x') { if (mod.t === 'shin') { try { sessionStorage.removeItem('gt.share'); } catch (er) { /* storage off */ } } mod = null; drawMod(); return; }
    if (mod.t === 'shmenu' && a === 'shlink') {
      const l = mod.l; mod.msg = 'Making the link...'; drawMod();
      try {
        const meta = shareMeta(l);
        const r = await gt.loShare({ c: codeOf(l), n: l.n || 'Loadout', t: meta.t, d: meta.d });
        // The preview picture is sent before the link is shown (up to 8 seconds), so the card is ready when it is pasted.
        if (mod && mod.t === 'shmenu') { mod.msg = 'Making the preview picture...'; drawMod(); }
        const pv = sharePreview(l, r.code).catch(() => false);
        await Promise.race([pv, new Promise((ok) => setTimeout(ok, 8000))]);
        mod = { t: 'shlink', url: r.url, copied: false }; drawMod();
        try { await gt.writeClipboard(r.url); if (!document.documentElement.classList.contains('gtweb')) { mod.copied = true; drawMod(); } } catch (er) { /* the Copy button is there */ }
      } catch (er) { if (mod && mod.t === 'shmenu') { mod.msg = V.clean(er); drawMod(); } }
      return;
    }
    if (mod.t === 'shlink') {
      if (a === 'lcopy') {
        const u = mod.url, done = () => { if (mod && mod.t === 'shlink') { mod.copied = true; drawMod(); } };
        const inp = g('dlurl'); if (inp) { inp.focus(); inp.select(); }
        const fail = () => { if (mod && mod.t === 'shlink') { mod.copyFail = true; drawMod(); const i2 = g('dlurl'); if (i2) { i2.focus(); i2.select(); } } };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, () => gt.writeClipboard(u).then(done, fail));
        else gt.writeClipboard(u).then(done, fail);
        return;
      }
      if (a === 'lsend' && navigator.share) { navigator.share({ url: mod.url, title: 'Pathfinder loadout' }).catch(() => {}); return; }
    }
    if (mod.t === 'shin' && a === 'shcopy') {
      const url = location.origin + location.pathname.replace(/[^/]*$/, '') + mod.code;
      try { await navigator.clipboard.writeText(url); toast('Link copied. Open Pathfinder from your home screen and paste it into Loadouts > Import loadout.'); }
      catch (er) { prompt('Copy this link:', url); }
      return;
    }
    if (mod.t === 'shin' && a === 'shadd' && mod.bid && gt.bdUse) gt.bdUse({ id: mod.bid }).catch(() => {}); // a Builds import counts towards its popularity
    if (mod.t === 'shin' && a === 'shadd') { const l = mod.l; if (!D0()) return; try { sessionStorage.removeItem('gt.share'); } catch (er) { /* storage off */ } mod = null; drawMod(); importLo(l); window.show && window.show('loadouts'); return; }
    if (mod.t === 'shmenu' && a === 'shbuild') {
      const l = mod.l; mod = { t: 'bdpub', l, title: /^equipped$/i.test(String(l.n || '').trim()) ? '' : String(l.n || '').slice(0, 60), notes: String(l.o || '').slice(0, 1200), tags: [], str: [], weak: [], prio: [], cls: l.c < 3 ? l.c : '', msg: '' }; drawMod();
      if (gt.pfaStatus) gt.pfaStatus().then((st) => { if (mod && mod.t === 'bdpub') { mod.signed = !!(st && st.on); if (!mod.signed) drawMod(); } }, () => {});
      setTimeout(() => { const i = g('bdtitle'); if (i) i.focus(); }, 30);
      return;
    }
    if (mod.t === 'bdpub' && a === 'bdgo') {
      const ti = g('bdtitle'), no = g('bdnotes'), cs = g('bdcls'); mod.title = ti ? ti.value : mod.title; mod.notes = no ? no.value : mod.notes; if (cs) mod.cls = cs.value === '' ? '' : +cs.value;
      if (mod.title.replace(/[^\p{L}\p{N}]/gu, '').length < 3) { mod.msg = 'Give the build a name of at least 3 letters.'; drawMod(); return; }
      if (mod.cls === '') { mod.msg = 'Pick the class this build is for.'; drawMod(); return; }
      const l = mod.l, m0 = mod; let ex = [];
      try { ex = resolve(l).filter((r) => r && r.x && r.x.r === 'Exotic').map((r) => r.en.h); } catch (er) { ex = []; }
      m0.busy = true; m0.msg = ''; drawMod();
      try {
        const lc = l.c < 3 ? l : { ...l, c: m0.cls };
        const bp = await buildPic({ ...lc, n: m0.title.trim() });
        await gt.bdPub({ title: m0.title.trim(), notes: m0.notes.trim(), tags: m0.tags, code: codeOf(lc), ex, cls: m0.cls, img: bp.img, info: bp.info || undefined, str: m0.str || [], weak: m0.weak || [], prio: m0.prio || [] });
        if (ed && ed.build) closeEd();
        if (mod === m0) { mod = { t: 'bddone', title: m0.title.trim() }; drawMod(); }
        if (window.__gtBuilds) window.__gtBuilds.refresh();
      } catch (er) { if (mod === m0) { m0.busy = false; m0.msg = V.clean(er); drawMod(); } }
      return;
    }
    if (mod.t === 'bddone' && a === 'bdopen') { mod = null; drawMod(); if (window.show) window.show('builds'); return; }
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
    if (a === 'pickpic') { const f = g('dlimpf'); if (f) f.click(); return; }
    if (a === 'paste') {
      let t = ''; try { t = ((await gt.readClipboard()) || '').trim(); } catch (er) { /* try for a picture */ }
      if (!t) { const pic = await clipPic(); if (pic) { mod.text = ''; mod.msg = ''; impPic(pic, true); return; } }
      mod.text = t || mod.text || ''; mod.msg = t ? '' : 'The clipboard is empty. Copy a share link, a loadout code or a Pathfinder loadout picture first.'; drawMod(); return;
    }
    if (a === 'doimp') {
      const ta = g('dlimp'); mod.text = ta ? ta.value : mod.text;
      try {
        let l;
        const sc = linkCode(mod.text);
        if (sc) { mod.msg = 'Getting the shared loadout...'; drawMod(); const r = await gt.loShareGet({ code: sc }); l = decode(r.c); if (!l.n && r.n) l.n = r.n; }
        else if (/GTL1:/.test(mod.text)) l = decode(mod.text);
        else {
          if (!/\S/.test(mod.text || '')) throw new Error('Paste a DIM link or a loadout code first.');
          mod.msg = 'Getting the loadout from DIM...'; drawMod();
          l = fromDim(await gt.dimFetch({ text: mod.text }));
        }
        mod = null; drawMod(); importLo(l);
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
      openEd(d, true); addMods(ed.d, ed.d.it.filter((q) => AB.includes(q.b) || q.b === SUB)); if (c === CH) artEd('artcur'); return;
    }
    if (a === 'igsh') {
      const d = fromChar(c, L.n || 'Loadout ' + (L.i + 1)); d.it = L.items.map((id) => items().find((x) => x.id === id)).filter(Boolean).map(entOf);
      const m0 = { t: 'shmenu', l: d };
      m0.wait = Promise.all([
        ...d.it.filter((q) => AB.includes(q.b) || q.b === SUB).map(async (en) => { const x = items().find((o) => o.id === en.id); const m = await capture(x); if (m) en.m = m; }),
        artFor(c).then((ar) => withArt(d, ar)), // in-game loadouts do not keep artifact perks, so the character's current artifact comes along
      ]).then(() => { m0.wait = null; }, () => { m0.wait = null; });
      mod = m0; drawMod(); return;
    }
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
    return `<div class="dl-stats" title="Armor stats of these pieces">${[1, 5, 3, 4, 2, 0].map((i) => `<span title="${STL[i][1]}">${STL[i][0]}<b>${t[i]}</b></span>`).join('')}<span class="dl-tot">Total <b>${t.reduce((s, v) => s + v, 0)}</b></span></div>`;
  };
  const tileOf = (r) => (r.x ? V.tile(r.x).replace(/ fade(?=[" ])/, '') : `<div class="vt dl-miss" title="Missing: ${esc(r.en.n || 'item')}">${r.en.i ? `<img src="${esc(V.icon(r.en.i))}" alt="">` : '?'}</div>`);
  const plugIcons = (m, big) => m.map((p) => `<span class="ap ${big ? 'md' : 'sm'}" data-ph="${int(p[1])}" title="${esc(p[3])}">${p[2] ? `<img src="${esc(V.icon(p[2]))}" alt="">` : ''}</span>`).join('');
  // Clicking a subclass ability, aspect, fragment, mod or artifact perk on a loadout shows what it does (like DIM).
  const PINFO = {};
  async function plugPop(el) {
    let m = g('dlpp'); if (m) { const same = m.dataset.ph === el.dataset.ph; m.remove(); if (same) return; }
    const h = int(el.dataset.ph), img = el.querySelector('img'), name = String(el.getAttribute('title') || '').split('\n')[0];
    m = document.createElement('div'); m.id = 'dlpp'; m.dataset.ph = String(h);
    const body = (inf) => `<div class="pph">${img ? `<img src="${esc(img.getAttribute('src'))}" alt="">` : ''}<div><b>${esc((inf && inf.n) || name || 'Unknown')}</b>${inf && inf.ty ? `<small>${esc(inf.ty)}</small>` : ''}</div></div>${inf ? (inf.d ? `<p>${esc(inf.d)}</p>` : '<p class="mute">No description from Bungie.</p>') : '<p class="mute">Loading...</p>'}`;
    m.innerHTML = body(PINFO[h]);
    document.body.appendChild(m);
    const r = el.getBoundingClientRect(), w = Math.min(320, innerWidth - 16);
    m.style.width = w + 'px'; m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
    const below = r.bottom + 6, hh = m.offsetHeight + 120; m.style.top = (below + hh > innerHeight ? Math.max(8, r.top - 6 - m.offsetHeight) : below) + 'px';
    const off = (e) => { if (!m.contains(e.target) && !e.target.closest('.ap[data-ph]')) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
    setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
    if (!PINFO[h] && h > 0 && gt.itemInfo) { try { PINFO[h] = await gt.itemInfo({ h }); } catch (e) { PINFO[h] = { n: name, d: '' }; } if (m.isConnected) m.innerHTML = body(PINFO[h]); }
  }
  function cardHTML(l) {
    const res = resolve(l), miss = res.filter((r) => !r.x).length, c = V.ent(CH);
    const grp = (label, bs) => {
      const a = res.filter((r) => bs.includes(r.en.b)).sort((p, q) => bs.indexOf(p.en.b) - bs.indexOf(q.en.b)); if (!a.length) return '';
      const sub = bs[0] === SUB;
      return `<div class="dl-g"><div class="dl-gl">${label}</div><div class="dl-tiles">${a.map((r) => `<div class="dl-tt${r.en.e === 0 ? ' dl-ne' : ''}">${tileOf(r)}${r.en.m.length && !sub && PLC[l.id] ? `<div class="dl-pm">${plugIcons(r.en.m)}</div>` : ''}</div>`).join('')}</div>${sub ? `<div class="dl-sp2">${a.map((r) => plugIcons(subOrd(r.en.m))).join('')}</div>` : ''}${label === 'Armor' ? statsOf(a.map((r) => r.x).filter(Boolean)) : ''}</div>`;
    };
    const mods = [...l.it.flatMap((q) => (AB.includes(q.b) ? q.m : [])), ...(l.fm || []).map((p) => [0, p[0], p[2], p[1] + ' (picked: goes into a free socket that fits)'])];
    return `<div class="card dl-card" id="dlc-${esc(l.id)}" data-id="${esc(l.id)}"><div class="dl-ch"><b class="dl-nm">${esc(l.n || 'Untitled')}</b><span class="dl-cl">${l.c < 3 ? esc(CL[l.c]) : 'Any class'}</span>${miss ? `<span class="dl-mc2" title="Items that are no longer in your inventory">${miss} missing</span>` : ''}<span class="dl-sp"></span><div class="dl-bt"><button class="b" data-dl="apply" data-id="${esc(l.id)}" title="Equip this on ${esc(c ? CL[c.cls] : 'this character')}">Apply</button><button class="g" data-dl="edit" data-id="${esc(l.id)}">Edit</button><button class="g" data-dl="copy" data-id="${esc(l.id)}">Edit Copy</button><button class="g" data-dl="share" data-id="${esc(l.id)}">Share</button><button class="g" data-dl="img" data-id="${esc(l.id)}" title="Make a picture of this loadout to post on Discord">Image</button>${window.__gth ? window.__gth.btn('lo', l.id, l.n || 'Loadout') : ''}<button class="g dl-del" data-dl="del" data-id="${esc(l.id)}" title="Delete this loadout">&#128465;</button></div></div>${l.o ? `<div class="dl-notes-v">${noteHTML(l.o)}</div>` : ''}<div class="dl-body">${SECS.map(([label, bs]) => grp(label, bs)).join('')}</div>${mods.length ? `<div class="dl-mrow"><span class="dl-gl">Mods</span>${plugIcons(mods, true)}<button class="g" data-dl="plc" data-id="${esc(l.id)}">${PLC[l.id] ? 'Hide' : 'Show'} Mod Placement</button></div>` : ''}${l.a.length ? `<div class="dl-mrow"><span class="dl-gl">Artifact${l.ai && l.ai.n ? ' &middot; ' + esc(l.ai.n) : ''}</span>${aRowL(l.a)}</div>` : ''}${l.mv ? '<div class="dl-fl">Moves other weapons and armor away when applied.</div>' : ''}</div>`;
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
    if (!ghostRun) setTimeout(fixGhosts, 1500); // once per session, in the background
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
  window.addEventListener('gtsub', () => { Object.keys(EQC).forEach((k) => delete EQC[k]); if (sec.classList.contains('on')) setTimeout(() => eqLive(CH), 400); });
  async function eqLive(cid) {
    const sub = eqOf(cid).find((x) => x.b === SUB), arm = eqOf(cid).filter((x) => AB.includes(x.b));
    const key = cid + ':' + [sub, ...arm].filter(Boolean).map((x) => x.id).join(',');
    const draw = (r) => { const el = g('dleqx'); if (!el || CH !== cid) return; el.innerHTML = (r.sub.length ? `<div class="dl-mrow dl-subrow" title="Click an ability, aspect or fragment to change it"><span class="dl-gl">Subclass</span>${plugIcons(subOrd(r.sub), 'big')}</div>` : '') + (r.mods.length ? `<div class="dl-mrow"><span class="dl-gl">Mods</span>${plugIcons(r.mods, 'big')}</div>` : ''); };
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
    // on a loadout card (or Equipped): items open their pop-up, abilities, mods and artifact perks show what they do
    if (e.target.closest('.dl-card') && !e.target.closest('[data-dl]')) {
      const ap = e.target.closest('.ap[data-ph]');
      // Equipped card: a subclass icon opens the subclass pop-up on that socket, where a click equips another option (like DIM)
      if (ap && ap.closest('.dl-subrow') && window.__gtx && window.__gtx.openHere) { const sb = eqOf(CH).find((x) => x.b === SUB); if (sb) { window.__gtx.openHere(sb.id, ap, int(ap.dataset.ph)); return; } }
      if (ap) { plugPop(ap); return; }
      const vt = e.target.closest('.vt[data-id]'); if (vt && window.__gtx && window.__gtx.openHere) { window.__gtx.openHere(vt.dataset.id, vt); return; }
    }
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
    else if (a === 'shareeq') { const m0 = { t: 'shmenu', l: fromChar(CH, 'Equipped') }; m0.wait = fullFromChar(CH, 'Equipped').then((d) => { m0.l = d; m0.wait = null; }, () => { m0.wait = null; }); mod = m0; drawMod(); }
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
.dl-cc.em{background-size:cover;background-position:left center;padding-left:56px}.dl-cc.on{opacity:1;border-color:#e6e7ea}.dl-cc b{text-transform:uppercase;letter-spacing:2px;font-size:15px}.dl-cc small{display:block;font-size:11px;color:#c9ccd2}.dl-cc span{margin-left:auto;font-size:18px;color:#f5dc7a}
.dl-srt{display:flex;align-items:center;gap:8px;font-size:12px;color:#aeb2b9}.dl-srt select{flex:1}
.dl-side button,#dled button,#dlmod button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:#23262b;padding:6px 12px;cursor:pointer;font-size:13px}
.dl-side button:hover,#dled button:hover,#dlmod button:hover,.dl-card button:hover{border-color:#cfd2d8;color:#fff}
.dl-side button.b,.dl-card button.b,#dled button.b,#dlmod button.b{background:var(--g-accent2,#3a6ea5);border-color:transparent;color:var(--g-on-accent,#fff)}
#dled button:disabled,#dlmod button:disabled{opacity:.4;cursor:default}
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
.dl-g{display:flex;flex-direction:column;gap:4px}.dl-gl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#8b8f97}
.dl-tiles{display:flex;gap:4px;flex-wrap:wrap}.dl-tt{display:flex;flex-direction:column;align-items:center;gap:3px}.dl-ne{opacity:.55}
.dl-miss{display:flex;align-items:center;justify-content:center;color:#ffb74d;font-size:20px;filter:grayscale(1) brightness(.6);border-color:#8a6d1d!important;cursor:default}
.dl-sp2{display:flex;gap:3px;flex-wrap:wrap;max-width:260px}
.dl-pm{display:flex;gap:2px;flex-wrap:wrap;justify-content:center;max-width:calc(var(--t) + 8px)}
.ap.sm{width:22px;height:22px;border-width:1px}
.dl-stats{display:flex;gap:6px;font-size:11px;color:#9aa0a8;flex-wrap:wrap}.dl-stats b{color:#fff;margin-left:2px}.dl-tot{margin-left:4px;color:#f5dc7a}
.dl-mrow{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:8px}.dl-mrow .dl-gl{margin-right:6px}
.dl-fl{font-size:11px;color:#8c9098;margin-top:6px}
.dl-eqc{border-color:#4a4d54!important}.dl-subrow .ap{cursor:pointer}.dl-subrow .ap:hover{outline:1px solid var(--g-accent,#7ab8e8);outline-offset:1px}
.dl-card .vt[data-id],.dl-card .ap[data-ph]{cursor:pointer}.dl-card .ap[data-ph]:hover{filter:brightness(1.25)}
#dlpp{position:fixed;z-index:9400;background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#3a3d43);box-shadow:0 10px 30px rgba(0,0,0,.55);padding:12px 14px;color:#d7dae0;font-size:13px;line-height:1.45}
#dlpp .pph{display:flex;gap:10px;align-items:center}#dlpp .pph img{width:44px;height:44px;border-radius:6px;background:#14161b}#dlpp b{color:#fff;font-size:14.5px;display:block}#dlpp small{color:#9aa0a8}#dlpp p{margin:8px 0 0;white-space:pre-line}
.dl-none{padding:14px 4px}
#dled{--t:var(--gt-t,44px);position:fixed;left:0;right:0;bottom:0;height:78vh;z-index:85;background:#14161a;border-top:1px solid #4a4d54;color:#e6e7ea;box-shadow:0 -8px 30px rgba(0,0,0,.65);display:flex;flex-direction:column}
.dl-eb{display:flex;flex-direction:column;height:100%;min-height:0}
.dl-ehd{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #2b2d31;flex-wrap:wrap}
#dled input:not([type=checkbox]),#dled textarea,#dlmod textarea,#dlmod select{background:#0e1013;border:1px solid #3a3d43;border-radius:3px;color:#fff;padding:7px 10px;font:inherit}
.dl-name{flex:1;min-width:200px;max-width:420px;font-size:16px!important}.dl-ac{display:flex;align-items:center;gap:6px;font-size:13px;color:#cfd2d8;white-space:nowrap}.dl-cls{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8c9098}
.dl-ebody{flex:1;overflow:auto;padding:10px 14px;display:flex;flex-direction:column;gap:10px}.dl-ebody>*{flex:none}
.dl-notes{width:100%;height:54px;resize:vertical}.dl-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dl-es{border-top:1px solid #23262b;padding-top:8px}.dl-es.dis{opacity:.45}.dl-eh{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#aeb2b9;margin-bottom:6px;display:flex;gap:10px;align-items:center}.dl-eh small{color:#6d7077;letter-spacing:0;text-transform:none}
.dl-er{display:flex;gap:12px;flex-wrap:wrap}.dl-slot{display:flex;flex-direction:column;gap:3px;align-items:center}.dl-sn{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#8b8f97}
.dl-tw{cursor:pointer}.dl-empty{width:var(--t);height:var(--t);border:1px dashed #4a4d54;display:flex;align-items:center;justify-content:center;color:#6d7077;font-size:22px}.dl-empty:hover{border-color:#fff;color:#fff}
.dl-sf{display:flex;gap:3px}.dl-sf button{padding:1px 6px!important;font-size:11px!important}
.dl-pk{background:#101216;padding:8px}.dl-pk input{width:100%;margin-bottom:8px}.dl-pl{display:flex;flex-wrap:wrap;gap:4px;max-height:30vh;overflow:auto}.dl-pi{cursor:pointer}.dl-pi.on .vt{outline:2px solid #6fd36f}
.dl-wr{color:#ffb74d;font-size:13px}
.dl-ef{display:flex;gap:8px;padding:10px 14px;border-top:1px solid #2b2d31;background:#0e1013;flex-wrap:wrap}
#dlmod .dl-url{width:100%;box-sizing:border-box;font:13px ui-monospace,Consolas,monospace;padding:9px 10px;background:#0e1013;border:1px solid #3a3d43;border-radius:3px;color:#fff}
.dl-wpk{display:flex;flex-wrap:wrap;align-items:center;gap:3px;margin-top:4px}.dl-wpk img{width:22px;height:22px;border-radius:50%;border:1px solid #3a3d43}.dl-wpk button{padding:2px 8px!important;font-size:11.5px!important}
.dl-wpc{margin:0 0 10px}.dl-wpc small{display:block;font-size:11.5px;color:#9aa0a8;margin:0 0 5px;letter-spacing:.04em}.dl-wpc>div{display:flex;flex-wrap:wrap;gap:5px}.dl-wpo{display:inline-flex!important;align-items:center;gap:6px;padding:4px 10px 4px 4px!important;border-radius:999px!important;font-size:12.5px!important}.dl-wpo img{width:26px;height:26px;border-radius:50%;display:block}.dl-wpo.on{border-color:var(--g-accent,#e8b84a)!important;background:color-mix(in srgb,var(--g-accent,#e8b84a) 20%,transparent)!important;color:#fff!important}
.dl-src{display:inline-flex;margin-left:10px;gap:0}.dl-src button{border-radius:0!important;padding:4px 10px!important}.dl-src button:first-child{border-radius:6px 0 0 6px!important}.dl-src button:last-child{border-radius:0 6px 6px 0!important}.dl-src button.on{background:var(--g-accent2,#3a6ea5)!important;color:#fff!important;border-color:transparent!important}
.dl-pa{display:grid;grid-template-columns:44px 1fr;grid-template-rows:auto auto;column-gap:10px;align-items:center;padding:6px;border:1px solid transparent;border-radius:8px;cursor:pointer;min-width:0}.dl-pa:hover,.dl-pa:focus-visible,.dl-pa.on{border-color:var(--g-accent,#e8b84a);background:rgba(255,255,255,.04);outline:0}.dl-pa span{grid-row:1/3;width:44px;height:44px;border:2px solid #3a3d43;border-radius:4px;overflow:hidden;background:#0d0f13}.dl-pa img{width:100%;height:100%;display:block}.dl-pa b{font-size:13px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dl-pa small{font-size:11.5px;color:#9aa0a8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#dlpl:has(.dl-pa){display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px}.dl-bhint{margin:0 0 10px;padding:9px 12px;border:1px solid color-mix(in srgb,var(--g-accent,#e8b84a) 45%,transparent);border-radius:8px;background:color-mix(in srgb,var(--g-accent,#e8b84a) 10%,transparent);font-size:13px;color:#e6e7ea}
.dl-shin{max-width:min(620px,94vw)}.dl-bdp{max-width:min(560px,94vw)}.dl-bdl{display:flex;flex-direction:column;gap:5px;margin:10px 0 0;font-size:12.5px;color:#cfd2d8}.dl-bdl input,.dl-bdl select,.dl-bdl textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px}.dl-bdl textarea{resize:vertical;min-height:84px}.dl-bdts{display:flex;flex-wrap:wrap;gap:6px}.dl-bdt{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid var(--g-line,#2b2e33);border-radius:999px;cursor:pointer;font-size:12.5px;color:#cfd2d8;user-select:none}.dl-bdt input{position:absolute;opacity:0;pointer-events:none}.dl-bdt.on{border-color:var(--g-accent,#e8b84a);color:#fff;background:color-mix(in srgb,var(--g-accent,#e8b84a) 18%,transparent)}.dl-bdt.gd.on{border-color:#3f9a64;background:rgba(63,154,100,.2)}.dl-bdt.bd.on{border-color:#a64b4b;background:rgba(166,75,75,.22)}.dl-bdt em{font-style:normal;font-weight:700;font-size:11px;min-width:16px;height:16px;border-radius:50%;display:inline-grid;place-items:center;background:var(--g-accent,#e8b84a);color:#111}.dl-bdp{max-height:88vh;overflow:auto}.dl-bdt:focus-within{outline:2px solid var(--g-accent,#e8b84a);outline-offset:2px}.dl-hst{margin:10px 0 0;font-size:12.5px;line-height:1.5}.dl-hst .g{margin-left:6px;padding:3px 10px;font-size:12px}.dl-shin h4{margin:6px 0 2px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b8f97}
.dl-shg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}.dl-shin .dl-bt{position:sticky;bottom:-16px;background:#1a1c20;padding:10px 0 4px;margin-bottom:-4px}.dl-shin .dl-wr{margin-top:4px}.dl-shi{display:flex;align-items:center;gap:8px;font-size:13px}.dl-shi{min-width:0}.dl-shi b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.dl-shi span{width:40px;height:40px;flex:none;background:#14161b;border:1px solid #3a3d43}.dl-shi img{width:100%;height:100%;display:block}.dl-shi.fade{opacity:.55}
#dlmod{position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;--t:var(--gt-t,44px)}
.dl-mc{background:#1a1c20;border:1px solid #4a4d54;border-radius:4px;padding:16px;min-width:300px;max-width:min(560px,92vw);max-height:86vh;overflow:auto;color:#e6e7ea;display:flex;flex-direction:column;gap:10px}
.dl-mc h3{margin:0;font-size:16px;letter-spacing:1px}.dl-mc textarea{width:100%;height:130px;font-family:monospace;font-size:12px}.dl-mc label{font-size:12px;color:#aeb2b9;display:flex;flex-direction:column;gap:4px}
.dl-ig-pop{min-width:340px}.dl-ipH{display:flex;align-items:center;gap:12px;padding:10px;background:#23262b center/cover no-repeat;border-radius:3px}.dl-ipH img{width:44px;height:44px}.dl-ipH h3{text-shadow:0 1px 3px #000}
.dl-ig-pop .dl-bt button{width:100%;text-align:left}
.dl-idm .lpk{display:grid;gap:4px}
#dlt{display:none;position:fixed;left:16px;bottom:16px;z-index:99;background:#1f3a24;border:1px solid #4caf50;color:#fff;padding:10px 14px;border-radius:3px;max-width:380px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.5)}
#loimg{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}#loimg .li{background:#17181b;border:1px solid #2f3238;padding:14px;max-width:100%;max-height:100%;box-sizing:border-box;display:flex;flex-direction:column;min-height:0}#loimg img{display:block;max-width:min(1000px,100%);max-height:calc(100vh - 140px);width:auto;height:auto;object-fit:contain;margin:0 auto;border:1px solid #2f3238;min-height:0}#loimg p{flex:none}#loimg p{margin:10px 0 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}#dlt .dl-undo{margin-top:8px}.dl-coss{display:flex;flex-wrap:wrap;gap:10px}.dl-cs{display:inline-flex;align-items:center;gap:3px;padding:2px 6px 2px 2px;border:1px solid #2f3238;border-radius:3px}.dl-csi{width:30px;height:30px;border:1px solid #3a3d43}#dlt .dl-undo{margin-top:8px;padding:4px 12px;font-size:12px}#dlt.bad{background:#3d2218;border-color:#d9772f}.dl-ti{display:flex;gap:3px;flex-wrap:wrap;margin-top:6px}.dl-ti img{width:28px;height:28px;border:1px solid #455565}.dl-tl{font-size:12px;margin-top:4px;color:#f1d6c8}
#dled{background:#0f1114}
.dl-panels{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}.dl-pn{flex:0 1 auto;max-width:100%}@media (max-width:760px){.dl-pn{flex:1 1 100%}}
.dl-ehd #dlen{width:auto;flex:1 1 220px}.dl-ehd #dlcls{width:auto;flex:none;background:#0e1013;border:1px solid #3a3d43;color:#fff;padding:7px 10px;border-radius:3px}
#dled .dl-notes{width:100%;box-sizing:border-box}
.dl-pn{background:#181a1e;border:1px solid #2e3136;display:flex;flex-direction:column}.dl-pn.dis{opacity:.45;pointer-events:none}
.dl-ph{padding:6px 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#cfd2d8;border-bottom:1px solid #2e3136;background:#1d2024}
.dl-pb{padding:10px;display:flex;flex-direction:column;gap:8px}.dl-pf{padding:8px 10px;border-top:1px solid #2e3136;display:flex;gap:6px;flex-wrap:wrap}
.dl-subrow{display:flex;gap:10px;align-items:flex-start}.dl-subpl{display:flex;gap:4px;flex-wrap:wrap}
.dl-mhint{margin:0 0 8px;font-size:12.5px}#dlmod.dl-drop .dl-mc{outline:2px dashed #6fd36f;outline-offset:4px}
.dl-msel{width:min(760px,96vw)}.dl-msr{margin:0;font-size:13px;color:#c9cdd4;display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}.dl-msr small{flex-basis:100%;color:#9aa0a8;font-size:12px}.dl-mspk{display:flex;flex-wrap:wrap;gap:6px;min-height:40px;align-items:center;padding:8px;border:1px solid #3a3d43;border-radius:4px;background:#0e1013}
#dlmod button.dl-msp{display:inline-flex;align-items:center;gap:6px;padding:3px 8px 3px 3px;border-radius:20px}#dlmod button.dl-msp img{width:26px;height:26px;border-radius:50%}#dlmod button.dl-msp span{font-size:12.5px;color:#e6e7ea}#dlmod button.dl-msp i{font-style:normal;color:#9aa0a8;font-size:15px}
#dlmod #dlmsq{background:#0e1013;border:1px solid #3a3d43;border-radius:3px;color:#fff;padding:8px 10px;font:inherit;width:100%;box-sizing:border-box}
.dl-msl{max-height:min(50vh,480px);overflow:auto;padding-right:2px;display:flex;flex-direction:column;gap:12px}.dl-msm{color:#e0b25a;margin:0;font-size:13px}
.dl-msh{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}.dl-msh b{font-size:13.5px;color:#fff}.dl-msh small{color:#9aa0a8;font-size:12px}
.dl-msgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px}
#dlmod button.dl-mso{position:relative;display:flex;align-items:center;gap:8px;text-align:left;padding:5px 7px;min-height:42px}#dlmod button.dl-mso img{width:30px;height:30px;flex:none;border-radius:50%;background:#0e1013}
#dlmod button.dl-mso span{font-size:12.5px;line-height:1.25;color:#e6e7ea}#dlmod button.dl-mso em{position:absolute;top:2px;left:28px;min-width:15px;height:15px;border-radius:8px;background:#6fd36f;color:#0b0c0e;font:700 10.5px/15px system-ui;text-align:center;font-style:normal}
#dlmod button.dl-mso.on{border-color:#6fd36f;background:rgba(111,211,111,.10)}#dlmod button.dl-mso.lock{opacity:.6}#dlmod button.dl-mso.full:not(.on){opacity:.45}.dl-mdim{display:inline-flex;gap:4px;padding-left:8px;margin-left:4px;border-left:1px solid #3a3d43}.dl-mgrid{display:flex;flex-direction:column;gap:6px}
.dl-mpc{display:flex;align-items:center;gap:10px;min-width:0}.dl-mpi{width:40px;height:40px;flex:none;border-radius:3px;overflow:hidden;background:#0e1013;border:1px solid #3a3d43}.dl-mpi img{width:100%;height:100%;display:block}
.dl-mpl0{width:40px;flex:none;font-size:10.5px;line-height:1.2;color:#9aa0a8;text-align:center}
.dl-mps{display:flex;gap:4px;flex-wrap:wrap;align-items:center;min-width:0}.dl-mst{font-size:12.5px}
#dled button.dl-ms{padding:0;width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#0e1013;cursor:pointer;overflow:hidden}
#dled button.dl-ms img{width:100%;height:100%;display:block}#dled button.dl-ms.asis{opacity:.45;border-style:dashed}#dled button.dl-ms:hover,#dled button.dl-ms:focus-visible{opacity:1;border-color:#fff}
.dl-modp{width:min(560px,94vw)}#dlmod #dlmq{background:#0e1013;border:1px solid #3a3d43;border-radius:3px;color:#fff;padding:8px 10px;font:inherit;width:100%;box-sizing:border-box}
.dl-mpl{display:flex;flex-direction:column;gap:4px;max-height:min(52vh,460px);overflow:auto;padding-right:2px}
#dlmod button.dl-mo{display:flex;align-items:center;gap:10px;text-align:left;padding:6px 8px;width:100%;box-sizing:border-box}
#dlmod button.dl-mo img{width:34px;height:34px;flex:none;border-radius:50%;background:#0e1013}#dlmod button.dl-mo span{display:flex;flex-direction:column;min-width:0}
#dlmod button.dl-mo b{font-size:13.5px;color:#fff;font-weight:600}#dlmod button.dl-mo small{font-size:12px;color:#9aa0a8;line-height:1.35}
#dlmod button.dl-mo.on{border-color:#6fd36f;background:rgba(111,211,111,.10)}#dlmod button.dl-mo.lock{opacity:.6}#dlmod button.dl-mo .dl-mol{color:#e0b25a}
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
