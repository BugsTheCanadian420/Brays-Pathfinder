// Target farming: pick a weapon with the perks you want, or an armor set with the stats you want.
// Anything in your vault that matches gets the wish list thumbs up, the search word is:target finds it,
// and you get a pop-up when a new match drops. Targets are saved on this computer only.
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec) return;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gt = () => window.gt;
  const V = () => window.__gtv || {};
  const img = (p) => { p = String(p || ''); return /^\/[\w./%-]*$/.test(p) ? 'https://www.bungie.net' + p : ''; };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const uid = () => 't' + Math.random().toString(36).slice(2, 10);
  const STAT = ['Weapons', 'Health', 'Class', 'Grenade', 'Super', 'Melee'];
  const CLS = ['Titan', 'Hunter', 'Warlock'];
  const clean = (er) => String((er && er.message) || er).replace(/^Error invoking remote method '[^']*': (Error: )?/, '');

  let T = [];                       // saved targets
  let L = null, LERR = '';          // weapon + armor-group lists from the game data
  let seen = lsGet('gt.tf.seen', {});
  let ver = 0, loaded = false;
  const SLOTS = [[3448274439, 'Helmet'], [3551918588, 'Gauntlets'], [14239492, 'Chest'], [20886954, 'Legs'], [1585787867, 'Class item']];
  const st = { add: '', q: '', type: '', pick: null, perks: null, sel: [], armor: { gk: '', gq: '', cls: -1, min: [0, 0, 0, 0, 0, 0], tot: 0, sl: [] }, msg: '', busy: false, open: {} };

  // ---- matching ----
  const isW = (x) => V().WEAPON && V().WEAPON().has(x.b);
  const isA = (x) => V().ARMOR && V().ARMOR().has(x.b);
  function matches(t, x) {
    if (!t || t.on === false || !x) return false;
    if (t.k === 'w') {
      if (!isW(x) || String(x.n).toLowerCase() !== String(t.name).toLowerCase()) return false;
      if (!t.cols || !t.cols.length) return true;
      if (!x.pk) return false;
      const P = new Set(x.pk);
      return t.cols.every((alts) => alts.some((h) => P.has(h)));
    }
    if (!isA(x) || !x.st) return false;
    if (!t.hs || !(t._hs || (t._hs = new Set(t.hs))).has(x.h)) return false;
    if (t.cls >= 0 && x.c !== t.cls && x.c !== 3) return false;
    if (t.sl && t.sl.length && !t.sl.includes(x.b)) return false;
    for (let i = 0; i < 6; i++) if ((t.min[i] || 0) > (x.st[i] || 0)) return false;
    if (t.tot && x.st.reduce((a, b) => a + b, 0) < t.tot) return false;
    return true;
  }
  let hc = new WeakMap(), hcv = -1;
  function hit(x) {
    if (!T.length) return null;
    if (hcv !== ver) { hc = new WeakMap(); hcv = ver; }
    if (hc.has(x)) return hc.get(x);
    let r = null;
    for (const t of T) {
      if (!matches(t, x)) continue;
      r = r || { name: [], perks: new Set(), ids: [] };
      r.name.push(t.name); r.ids.push(t.id);
      if (t.k === 'w' && x.pk) { const P = new Set(x.pk); (t.cols || []).forEach((alts) => alts.forEach((h) => { if (P.has(h)) r.perks.add(h); })); }
    }
    if (r) r.name = [...new Set(r.name)].join(' / ');
    hc.set(x, r); return r;
  }
  const hitBy = (x, id) => T.some((t) => t.id.toLowerCase() === id && matches(t, x));
  const items = () => { const d = V().D && V().D(); return (d && d.items) || []; };
  const hitsOf = (t) => items().filter((x) => matches(t, x));
  window.__gtt = { get ver() { return ver; }, hit, hitBy, count: () => T.length };

  // ---- persistence ----
  const bump = () => { ver++; if (window.__gtRender) window.__gtRender(); };
  async function persist() {
    try { T = await gt().tfSet({ t: T }); st.msg = ''; } catch (e) { st.msg = clean(e); }
    bump(); draw();
  }
  async function load() {
    try { T = (await gt().tfGet()) || []; } catch (e) { T = []; }
    T.forEach((t) => { t.id = String(t.id).toLowerCase(); });
    loaded = true; bump(); draw();
  }

  // ---- UI ----
  const s = document.createElement('section'); s.id = 'targets'; s.className = 'gdark'; vsec.parentNode.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Farming'; b.dataset.t = 'targets';
  const anchor = nav.querySelector('[data-t=activity]') || nav.querySelector('[data-t=triumphs]'); nav.insertBefore(b, anchor ? anchor.nextSibling : null);
  const css = document.createElement('style');
  css.textContent = `
:root[data-gsec="targets"] main > #targets{max-width:none!important;margin:0!important;zoom:1!important;padding:0 12px}
#targets .tbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 0}
#targets .tbar h2{margin:0 12px 0 0;font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8;font-weight:600}
#targets button.tb{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn,#202226);padding:6px 14px;cursor:pointer;letter-spacing:1px;font-size:12px;text-transform:uppercase}
#targets button.tb:hover{border-color:#8fb3d9;color:#fff}
#targets button.tb.pri{background:var(--g-accent2,#2b4a6b);border-color:#8fb3d9;color:var(--g-on-accent,#fff)}
#targets button.tb.sm{padding:3px 9px;letter-spacing:0;text-transform:none}
#targets input,#targets select{background:var(--g-inp,#0f1114);color:#e6e7ea;border:1px solid #3a3d43;padding:6px 9px;font:inherit;font-size:13px;border-radius:2px}
#targets #tfq,#targets #tfg,#targets #tfn{width:380px;max-width:100%;box-sizing:border-box}
#targets #tfc,#targets #tft{width:auto}
#targets .tpn{background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:3px;padding:12px 14px;margin:0 0 12px}
#targets .tpn h3{margin:0 0 8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#cfd2d8}
#targets .mute,#targets .note{color:var(--mute,#9aa0a8);font-size:12px}
#targets .msg{padding:22px;text-align:center;color:var(--mute,#9aa0a8)}
#targets .err{color:#e8a0a0;font-size:13px;margin:6px 0}
#targets .tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:10px}
#targets .tcard{background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:3px;padding:12px 14px}
#targets .tcard.hit{border-color:#2f6b3a}
#targets .tcard.off{opacity:.55}
#targets .tth{display:flex;gap:10px;align-items:center}
#targets .tth img{width:48px;height:48px;border:1px solid #3a3d43;background:#0d0f12;object-fit:contain;flex:none}
#targets .tth>div:nth-child(2){flex:1;min-width:0}
#targets .tth b{color:#fff;font-weight:600;display:block}
#targets .tth small{color:var(--mute,#9aa0a8);display:block;font-size:12px}
#targets .tth .sp{margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
#targets .crit{margin:8px 0 0;font-size:12.5px;color:#cfd2d8;line-height:1.5}
#targets .crit span{display:inline-block;border:1px solid #3a3d43;border-radius:9px;padding:1px 8px;margin:2px 4px 0 0;color:#b9bec6}
#targets .thits{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#targets .thits .ht{position:relative;width:46px;height:46px;border:1px solid #3a3d43;background:#0d0f12;cursor:pointer}
#targets .thits .ht img{width:100%;height:100%;object-fit:cover;display:block}
#targets .thits .ht i{position:absolute;right:1px;bottom:0;font-size:10px;font-style:normal;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000}
#targets .thits .ht.new{outline:2px solid #e0b64a}
#targets .cnt{color:#7fd08a;font-size:12px}
#targets .plist{max-height:62vh;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(290px,100%),1fr));gap:8px;margin-top:10px}
#targets .pit,:root #targets button.pit{display:flex;gap:12px;align-items:center;padding:8px 10px!important;border:1px solid #2b2e33;background:#14161a;cursor:pointer;border-radius:6px!important;text-align:left;color:#e6e7ea;font:inherit;font-size:15px!important;letter-spacing:0!important;text-transform:none!important;height:auto!important;min-height:72px}
#targets .pit:hover{border-color:#8fb3d9}
#targets .pit img{width:56px;height:56px;object-fit:contain;flex:none;background:#0d0f12;border-radius:4px}
#targets .pit span{min-width:0;line-height:1.25;font-weight:600}
#targets .pit small{color:var(--mute,#9aa0a8);display:block;font-size:12.5px;font-weight:400;margin-top:3px}
#targets .tfcols{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start;margin-top:8px}
#targets .tfcol{flex:1 1 200px;min-width:180px;max-width:300px}
#targets .tfcol h4{margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--mute,#9aa0a8);font-weight:600}
#targets .tperk,:root #targets button.tperk{display:flex;gap:9px;align-items:center;width:100%;padding:6px 8px!important;margin:0 0 5px;border:1px solid #2b2e33;background:#14161a;cursor:pointer;border-radius:6px!important;color:#cfd2d8;font:inherit;font-size:14px!important;letter-spacing:0!important;text-transform:none!important;height:auto!important;text-align:left}
#targets .tperk img{width:38px;height:38px;border-radius:50%;background:#0d0f12;flex:none}
#targets .tperk:hover{border-color:#8fb3d9}
#targets .tperk.on{border-color:#4caf50;background:#18301d;color:#fff}
#targets .trow{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}
#targets .tslots .tperk{width:auto;margin:0}
#targets .tstats{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:8px}
#targets .tstats label{display:flex;flex-direction:column;gap:3px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--mute,#9aa0a8)}
#targets .tstats input{width:100%;box-sizing:border-box}
#tftoast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9998;background:#1b3a22;border:1px solid #4caf50;color:#fff;padding:10px 16px;border-radius:4px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.5);max-width:80vw;font-size:14px}
#tftoast[hidden]{display:none}
`;
  document.head.appendChild(css);

  const sum = (t) => {
    if (t.k === 'w') return (t.cn && t.cn.length ? t.cn.map((n) => `<span>${esc(n)}</span>`).join('') : '<span>Any roll</span>');
    const sls = t.sl && t.sl.length ? t.sl.map((h) => `<span>${(SLOTS.find((q) => q[0] === h) || [0, '?'])[1]}</span>`).join('') : '';
    const mins = STAT.map((n, i) => (t.min[i] ? `<span>${n} ${t.min[i]}+</span>` : '')).join('');
    return `<span>${esc(t.cls >= 0 ? CLS[t.cls] : 'Any class')}</span>${sls}${mins}${t.tot ? `<span>Total ${t.tot}+</span>` : ''}${mins || t.tot ? '' : '<span>Any stats</span>'}`;
  };
  const card = (t) => {
    const h = t.on === false ? [] : hitsOf(t), sd = new Set(seen[t.id] || []), open = st.open[t.id];
    const tiles = h.slice(0, open ? 60 : 14).map((x) => `<div class="ht${sd.has(x.id) ? '' : ' new'}" data-go="${esc(x.id)}" title="${esc(x.n)}${x.p ? ' - ' + x.p : ''}${sd.has(x.id) ? '' : ' (new)'}"><img src="${esc(img(x.i))}" alt="">${x.p ? `<i>${x.p}</i>` : ''}</div>`).join('');
    return `<div class="tcard${h.length ? ' hit' : ''}${t.on === false ? ' off' : ''}" data-id="${esc(t.id)}"><div class="tth">${t.i ? `<img src="${esc(img(t.i))}" alt="">` : '<img alt="">'}<div><b>${esc(t.name)}</b><small>${t.k === 'w' ? 'Weapon target' : 'Armor target &middot; ' + esc(t.group || '')}</small></div><div class="sp">${t.on === false ? '' : `<span class="cnt">${h.length ? h.length + ' in your vault' : 'none yet'}</span>`}${h.length ? `<button class="tb sm" data-a="show">Show</button>` : ''}<button class="tb sm" data-a="pause">${t.on === false ? 'Resume' : 'Pause'}</button><button class="tb sm" data-a="del">Remove</button></div></div><div class="crit">${sum(t)}</div>${tiles ? `<div class="thits">${tiles}${h.length > (open ? 60 : 14) ? `<button class="tb sm" data-a="more">+${h.length - (open ? 60 : 14)} more</button>` : ''}</div>` : ''}</div>`;
  };

  function weaponPicker() {
    const q = st.q.toLowerCase();
    const types = [...new Set(L.weapons.map((w) => w.t))].sort();
    if (st.pick) return perkPicker();
    const ws = L.weapons.filter((w) => (!st.type || w.t === st.type) && (!q || w.n.toLowerCase().includes(q)));
    return `<div class="tpn"><h3>Pick a weapon</h3><div class="trow"><input id="tfq" type="search" placeholder="Search weapons (for example: Yeartide Apex)" value="${esc(st.q)}"><select id="tft"><option value="">All types</option>${types.map((t) => `<option${t === st.type ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select><span class="mute">${ws.length} weapons</span><button class="tb" data-a="cancel">Cancel</button></div><div class="plist">${ws.slice(0, 150).map((w, i) => `<button class="pit" data-pk="${L.weapons.indexOf(w)}"><img src="${esc(img(w.i))}" alt=""><span>${esc(w.n)}<small>${esc(w.r)} ${esc(w.t)}</small></span></button>`).join('')}</div>${ws.length > 150 ? '<p class="note">Showing the first 150. Type more of the name to narrow it down.</p>' : ''}</div>`;
  }
  function perkPicker() {
    const w = st.pick;
    const cols = st.perks;
    let body;
    if (cols === null) body = '<div class="msg">Loading perks...</div>';
    else if (!cols.length) body = '<p class="note">This weapon has no random perk columns. The target will match any copy of it.</p>';
    else body = `<div class="tfcols">${cols.map((c, ci) => `<div class="tfcol"><h4>Column ${ci + 1}</h4>${c.map((o, oi) => `<button class="tperk${(st.sel[ci] || []).includes(oi) ? ' on' : ''}" data-c="${ci}" data-o="${oi}" title="${esc(o.d)}"><img src="${esc(img(o.i))}" alt="">${esc(o.n)}</button>`).join('')}</div>`).join('')}</div>`;
    const chosen = cols ? cols.map((c, ci) => (st.sel[ci] || []).map((oi) => c[oi].n).join(' or ')).filter(Boolean) : [];
    return `<div class="tpn"><h3>${esc(w.n)}</h3><p class="note">Click the perks you want. Pick more than one in a column to accept either. Leave a column empty if you do not care about it. Enhanced and normal versions of a perk both count.</p>${body}<div class="trow" style="margin-top:12px"><b>${chosen.length ? esc(chosen.join(' + ')) : 'Any roll'}</b></div><div class="trow"><input id="tfn" placeholder="Note (optional)" maxlength="120" value="${esc(st.note || '')}"><button class="tb pri" data-a="savew"${cols === null ? ' disabled' : ''}>Save target</button><button class="tb" data-a="back">Back</button><button class="tb" data-a="cancel">Cancel</button></div></div>`;
  }
  function armorPicker() {
    const A = st.armor, q = A.gq.toLowerCase();
    const gs = L.groups.filter((g) => !q || g.n.toLowerCase().includes(q));
    const cur = L.groups.find((g) => g.k === A.gk);
    return `<div class="tpn"><h3>Pick an armor set</h3><div class="trow"><input id="tfg" type="search" placeholder="Search sets and raids (for example: Vault of Glass)" value="${esc(A.gq)}"><span class="mute">${gs.length} sets</span><button class="tb" data-a="cancel">Cancel</button></div><div class="plist">${gs.slice(0, 120).map((g) => `<button class="pit" data-gk="${esc(g.k)}" style="${g.k === A.gk ? 'border-color:#4caf50;background:#18301d' : ''}"><span>${esc(g.n)}<small>${g.kind === 'Set' ? 'Armor set' : 'From this activity'} &middot; ${g.hs.length} pieces</small></span></button>`).join('')}</div>
    <h3 style="margin-top:14px">${cur ? esc(cur.n) : 'Then set what you want on it'}</h3>
    <div class="trow"><select id="tfc"><option value="-1">Any class</option>${CLS.map((c, i) => `<option value="${i}"${A.cls === i ? ' selected' : ''}>${c}</option>`).join('')}</select><span class="mute">Minimum stat values. Leave 0 for stats you do not care about.</span></div>
    <div class="trow tslots"><span class="mute">Pieces:</span>${SLOTS.map(([h, n]) => `<button class="tperk${A.sl.includes(h) ? ' on' : ''}" data-sl="${h}">${n}</button>`).join('')}<span class="mute">${A.sl.length ? '' : 'None picked means every piece.'}</span></div>
    <div class="tstats">${STAT.map((n, i) => `<label>${n}<input type="number" min="0" max="200" data-s="${i}" value="${A.min[i] || ''}" placeholder="0"></label>`).join('')}<label>Total (all stats)<input type="number" min="0" max="1000" data-s="t" value="${A.tot || ''}" placeholder="0"></label></div>
    <div class="trow" style="margin-top:12px"><button class="tb pri" data-a="savea"${cur ? '' : ' disabled'}>Save target</button></div></div>`;
  }

  function draw() {
    if (!s.classList.contains('on') && !s.dataset.drawn) { s.dataset.drawn = '1'; }
    const head = `<div class="tbar"><h2>Farming</h2><button class="tb pri" data-a="addw">+ Weapon target</button><button class="tb pri" data-a="adda">+ Armor target</button><span class="mute">Matches get the thumbs up in your vault. Search <code>is:target</code> to find them.</span></div>${st.msg ? `<div class="err">${esc(st.msg)}</div>` : ''}`;
    let picker = '';
    if (st.add) {
      if (!L) picker = `<div class="tpn"><div class="msg">${LERR ? esc(LERR) : 'Loading the weapon and armor lists...'}</div><div class="trow"><button class="tb" data-a="cancel">Cancel</button></div></div>`;
      else picker = st.add === 'w' ? weaponPicker() : armorPicker();
    }
    const list = !loaded ? '<div class="msg">Loading...</div>' : T.length ? `<div class="tgrid">${T.map(card).join('')}</div>` : (st.add ? '' : '<div class="msg">No targets yet. Add a weapon with the perks you want, or an armor set with the stats you want. When one drops, it gets the thumbs up in your vault.</div>');
    const fx = document.activeElement && document.activeElement.id, pos = document.activeElement && document.activeElement.selectionStart;
    s.innerHTML = head + picker + list;
    if (fx) { const el = document.getElementById(fx); if (el && el.tagName === 'INPUT') { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* not text */ } } }
  }

  async function ensureLists() {
    if (L) return;
    try { L = await gt().tfLists(); LERR = ''; refreshHs(); } catch (e) { LERR = 'Could not load the list: ' + clean(e); }
    draw();
  }
  // Keep armor targets current when new pieces are added to a set.
  function refreshHs() {
    if (!L) return; let ch = false;
    T.forEach((t) => { if (t.k !== 'a') return; const g = L.groups.find((q) => q.k === t.src); if (g && g.hs.length !== (t.hs || []).length) { t.hs = g.hs.slice(0, 900); delete t._hs; ch = true; } });
    if (ch) persist();
  }
  const snapshot = (t) => { seen[t.id] = hitsOf(t).map((x) => x.id); lsSet('gt.tf.seen', seen); };

  async function pickWeapon(i) {
    const w = L.weapons[i]; if (!w) return;
    st.pick = w; st.perks = null; st.sel = []; st.note = ''; draw();
    try { st.perks = await gt().tfPerks({ hs: w.hs }); } catch (e) { st.perks = []; st.msg = clean(e); }
    draw();
  }
  function saveWeapon() {
    const w = st.pick, cols = [], cn = [];
    (st.perks || []).forEach((c, ci) => { const sl = (st.sel[ci] || []).filter((oi) => c[oi]); if (!sl.length) return; cols.push([...new Set(sl.flatMap((oi) => c[oi].hs))].slice(0, 4)); cn.push(sl.map((oi) => c[oi].n).join(' or ')); });
    const n = document.getElementById('tfn'); const note = n ? n.value.slice(0, 180) : '';
    const t = { id: uid(), k: 'w', name: w.n, i: w.i, on: true, at: Date.now(), note, cols, cn };
    T.push(t); st.add = ''; st.pick = null; st.perks = null; st.sel = [];
    persist().then(() => { const tt = T.find((q) => q.id === t.id); if (tt) { snapshot(tt); draw(); } });
  }
  function saveArmor() {
    const A = st.armor, g = L.groups.find((q) => q.k === A.gk); if (!g) return;
    const t = { id: uid(), k: 'a', name: g.n + ' armor', i: '', on: true, at: Date.now(), note: '', src: g.k, group: g.n, hs: g.hs.slice(0, 900), cls: A.cls, min: A.min.slice(), tot: A.tot, sl: A.sl.slice() };
    // pick an icon from a piece the set contains
    const df = items().find((x) => g.hs.includes(x.h)); if (df) t.i = df.i;
    T.push(t); st.add = ''; st.armor = { gk: '', gq: '', cls: -1, min: [0, 0, 0, 0, 0, 0], tot: 0, sl: [] };
    persist().then(() => { const tt = T.find((q) => q.id === t.id); if (tt) { snapshot(tt); draw(); } });
  }

  s.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'tfq') { st.q = t.value; draw(); }
    else if (t.id === 'tfg') { st.armor.gq = t.value; draw(); }
    else if (t.dataset && t.dataset.s !== undefined) { const v = Math.max(0, Math.min(t.dataset.s === 't' ? 1000 : 200, parseInt(t.value, 10) || 0)); if (t.dataset.s === 't') st.armor.tot = v; else st.armor.min[+t.dataset.s] = v; }
  });
  s.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'tft') { st.type = t.value; draw(); }
    else if (t.id === 'tfc') st.armor.cls = +t.value;
  });
  s.addEventListener('click', (e) => {
    const f = e.target.closest('[data-a],[data-pk],[data-gk],[data-c],[data-go],[data-sl]'); if (!f || !s.contains(f)) return;
    if (f.dataset.pk !== undefined) return void pickWeapon(+f.dataset.pk);
    if (f.dataset.gk !== undefined) { st.armor.gk = f.dataset.gk; return void draw(); }
    if (f.dataset.sl !== undefined) { const h = +f.dataset.sl, a = st.armor.sl; st.armor.sl = a.includes(h) ? a.filter((x) => x !== h) : [...a, h]; return void draw(); }
    if (f.dataset.c !== undefined) {
      const ci = +f.dataset.c, oi = +f.dataset.o, a = (st.sel[ci] = st.sel[ci] || []), i = a.indexOf(oi);
      if (i >= 0) a.splice(i, 1); else a.push(oi);
      const n = document.getElementById('tfn'); if (n) st.note = n.value;
      return void draw();
    }
    if (f.dataset.go !== undefined) { if (window.show) window.show('vault'); setTimeout(() => { try { V().open(f.dataset.go); } catch (er) { /* item not shown */ } }, 60); return; }
    const a = f.dataset.a, id = (f.closest('.tcard') || {}).dataset && f.closest('.tcard').dataset.id, t = id && T.find((q) => q.id === id);
    if (a === 'addw') { st.add = 'w'; st.pick = null; st.perks = null; st.q = ''; st.msg = ''; draw(); ensureLists(); }
    else if (a === 'adda') { st.add = 'a'; st.msg = ''; draw(); ensureLists(); }
    else if (a === 'cancel') { st.add = ''; st.pick = null; st.perks = null; st.sel = []; draw(); }
    else if (a === 'back') { st.pick = null; st.perks = null; st.sel = []; draw(); }
    else if (a === 'savew') saveWeapon();
    else if (a === 'savea') saveArmor();
    else if (a === 'pause' && t) { t.on = t.on === false; persist().then(() => { if (t.on !== false) snapshot(t); draw(); }); }
    else if (a === 'del' && t) { T = T.filter((q) => q !== t); delete seen[t.id]; lsSet('gt.tf.seen', seen); persist(); }
    else if (a === 'more' && t) { st.open[t.id] = true; draw(); }
    else if (a === 'show' && t) {
      if (window.show) window.show('vault');
      setTimeout(() => { const qb = document.getElementById('vq'); if (qb) { qb.value = 'target:' + t.id; qb.dispatchEvent(new Event('input', { bubbles: true })); } }, 60);
    }
  });
  b.onclick = () => { if (window.show) window.show('targets'); draw(); markSeen(); };

  // ---- new match pop-up ----
  const toast = document.createElement('div'); toast.id = 'tftoast'; toast.hidden = true; toast.setAttribute('role', 'status'); document.body.appendChild(toast);
  let tt = 0;
  toast.onclick = () => { toast.hidden = true; b.click(); };
  function markSeen() {
    let ch = false;
    T.forEach((t) => { const ids = hitsOf(t).map((x) => x.id); const old = new Set(seen[t.id] || []); if (ids.some((i) => !old.has(i)) || ids.length !== old.size) { seen[t.id] = ids; ch = true; } });
    if (ch) lsSet('gt.tf.seen', seen);
  }
  function check() {
    if (!T.length || !items().length) return;
    const fresh = [];
    for (const t of T) {
      if (t.on === false) continue;
      const ids = hitsOf(t).map((x) => x.id);
      if (!seen[t.id]) { seen[t.id] = ids; lsSet('gt.tf.seen', seen); continue; } // first sight of this target: do not announce what you already own
      const old = new Set(seen[t.id]), nw = ids.filter((i) => !old.has(i));
      if (nw.length) fresh.push(t.name + (nw.length > 1 ? ' (' + nw.length + ')' : ''));
      if (nw.length || ids.length !== old.size) { seen[t.id] = s.classList.contains('on') ? ids : [...old, ...nw].filter((i) => ids.includes(i)); lsSet('gt.tf.seen', seen); }
    }
    if (fresh.length) {
      toast.textContent = 'Target match: ' + fresh.slice(0, 3).join(', ') + (fresh.length > 3 ? ' and more' : '') + '. Click to see it.';
      toast.hidden = false; clearTimeout(tt); tt = setTimeout(() => { toast.hidden = true; }, 12000);
      if (s.classList.contains('on')) draw();
    }
  }
  // Run after every vault draw (features.js calls __gtf.after at the end of each one).
  const F = window.__gtf;
  if (F && typeof F.after === 'function') { const prev = F.after; F.after = function () { const r = prev.apply(this, arguments); try { check(); if (s.classList.contains('on') && !st.add) draw(); } catch (e) { console.error('targets: ' + (e && e.stack || e)); } return r; }; }

  // Roll Tracker entries from older versions move into Farming (same job, now for armor too).
  async function migrateRT() {
    const old = lsGet('gt_wish', []); if (!Array.isArray(old) || !old.length || lsGet('gt.rt.moved', false)) return;
    try {
      const lists = await gt().tfLists(); if (!lists || !Array.isArray(lists.weapons)) return;
      const bp = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\benhanced\b/g, '').trim();
      let added = 0;
      for (const w of old) {
        const wp = lists.weapons.find((q) => String(q.n).toLowerCase() === String(w.n || '').toLowerCase());
        if (!wp || T.some((t) => t.k === 'w' && String(t.name).toLowerCase() === String(wp.n).toLowerCase())) continue;
        let cols = [], cn = [];
        try {
          const pc = await gt().tfPerks({ hs: wp.hs }), want = new Set((w.pk || []).map(bp));
          (pc || []).forEach((c) => { const sl = c.filter((o) => want.has(bp(o.n))); if (!sl.length) return; cols.push([...new Set(sl.flatMap((o) => o.hs))].slice(0, 4)); cn.push(sl.map((o) => o.n).join(' or ')); });
        } catch (e) { cols = []; cn = []; }
        T.push({ id: uid(), k: 'w', name: wp.n, i: wp.i, on: true, at: Date.now(), note: String(w.note || w.t || '').slice(0, 180), cols, cn }); added++;
      }
      lsSet('gt.rt.moved', true);
      if (added) await persist();
    } catch (e) { /* try again next start */ }
  }
  if (gt() && gt().tfGet) load().then(migrateRT); else { loaded = true; draw(); }
  draw();
})();
