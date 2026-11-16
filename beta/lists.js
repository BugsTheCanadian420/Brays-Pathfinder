// Checklist and Roll Tracker, rebuilt.
// Checklist: your own sections, daily / weekly / never resets, optional tick per character, rename, reorder.
// Roll Tracker: rolls you are hunting, matched against the weapons in your vault so you can see which copies have which perks.
(() => {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const V = () => window.__gtv || {};
  const img = (p) => { p = String(p || ''); return /^\/[\w./%-]*$/.test(p) ? 'https://www.bungie.net' + p : ''; };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const CLN = ['Titan', 'Hunter', 'Warlock'];
  const chars = () => { try { return (V().chars && V().chars()) || []; } catch (e) { return []; } };
  const lastReset = (weekly) => { const n = new Date(); let r = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 17); if (r > n) r -= 864e5; if (weekly) { while (new Date(r).getUTCDay() !== 2) r -= 864e5; } return r; };
  const left = (ms) => { const m = Math.max(0, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d ? `${d}d ${h}h` : `${h}h ${m % 60}m`; };

  const css = document.createElement('style');
  css.textContent = `
#check>.card:not(.gl),#wish>.card:not(.gl),#wish>#wsearch,#wish>#wlist{display:none!important}
#wish.on{display:block!important}
.gl{background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:3px;padding:12px 14px;margin:0 0 12px;color:#e6e7ea}
.gl h2{margin:0;font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8}
.gl .mute{color:var(--mute,#9aa0a8);font-size:12px}
.gl input,.gl select,.gl textarea{background:var(--g-inp,#0f1114);color:#e6e7ea;border:1px solid #3a3d43;padding:6px 9px;font:inherit;font-size:13px;border-radius:2px;box-sizing:border-box}
.gl button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn,#202226);padding:5px 12px;cursor:pointer;font-size:12px}
.gl button:hover{border-color:#8fb3d9;color:#fff}.gl button.pri{background:var(--g-accent2,#2b4a6b);border-color:#8fb3d9;color:var(--g-on-accent,#fff)}
.gl button.ic{padding:2px 7px;font-size:12px;line-height:1.2}
.gl button{white-space:nowrap;width:auto;margin:0}.gl select{width:auto}.gl input[type=checkbox]{width:auto}
.ck-add input[type=text]{width:auto}.ck-sh select{padding:3px 6px;font-size:12px}
.gl .hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}.gl .hd .sp{margin-left:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ck-sec{margin:0 0 12px}.ck-sh{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #2b2e33;margin-bottom:6px}
.ck-sh b{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#cfd2d8}.ck-sh .sp{margin-left:auto;display:flex;gap:6px;align-items:center}
.ck-pb{height:4px;background:#0d0f12;border-radius:2px;overflow:hidden;flex:1;max-width:220px}.ck-pb i{display:block;height:100%;background:#4caf50}
.ck-row{display:flex;align-items:center;gap:10px;padding:6px 8px;border:1px solid transparent;border-radius:3px;background:rgba(0,0,0,.18);margin-bottom:4px}
.ck-row:hover{border-color:#3a3d43}.ck-row.done .ck-t{color:#7d8088;text-decoration:line-through}
.ck-row.drag{opacity:.4}.ck-row.over{border-color:#8fb3d9}
.ck-h{cursor:grab;color:#6d7077;user-select:none;font-size:14px}
.ck-t{flex:1;min-width:0;cursor:text}.ck-t small{color:#8b8f97;margin-left:6px}
.ck-n{color:#8b8f97;font-size:12px;display:block;margin-top:2px;white-space:pre-wrap}
.ck-cb{display:flex;gap:6px}.ck-cb label{display:flex;align-items:center;gap:3px;font-size:11px;color:#9aa0a8;cursor:pointer}
.ck-cb input{width:16px;height:16px;accent-color:#4caf50;margin:0}
.ck-add{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}.ck-add input[type=text]{flex:1;min-width:200px}
.ck-row .ck-x{opacity:0}.ck-row:hover .ck-x{opacity:1}
.rt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:10px}
.rt-card{background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:3px;padding:12px 14px}
.rt-card.hit{border-color:#2f6b3a}.rt-card.full{border-color:#e0b64a}
.rt-h{display:flex;gap:10px;align-items:center}.rt-h img{width:44px;height:44px;border:1px solid #3a3d43;background:#0d0f12}
.rt-h b{color:#fff;font-weight:600;display:block}.rt-h small{color:#9aa0a8;font-size:12px}.rt-h .sp{margin-left:auto;display:flex;gap:6px}
.rt-pk{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}.rt-pk span{font-size:12px;border:1px solid #3a3d43;border-radius:9px;padding:1px 8px;color:#cfd2d8}
.rt-pk span.have{border-color:#4caf50;color:#9fe0a8;background:rgba(76,175,80,.12)}
.rt-note{color:#9aa0a8;font-size:12px;margin-top:6px;white-space:pre-wrap}
.rt-copies{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.rt-copy{display:flex;align-items:center;gap:8px;padding:4px 6px;background:rgba(0,0,0,.25);border:1px solid #2b2e33;border-radius:2px;cursor:pointer}
.rt-copy:hover{border-color:#8fb3d9}.rt-copy img{width:32px;height:32px;border:1px solid #3a3d43}
.rt-copy .m{font-size:12px;color:#9aa0a8}.rt-copy .m b{color:#7be08c}.rt-copy.best{border-color:#e0b64a}
.rt-copy .pp{display:flex;flex-wrap:wrap;gap:3px;flex:1}.rt-copy .pp i{font-style:normal;font-size:11px;color:#8b8f97}.rt-copy .pp i.have{color:#9fe0a8}
.rt-form{display:grid;grid-template-columns:2fr 1fr;gap:8px}.rt-form label{display:flex;flex-direction:column;gap:3px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9aa0a8}
.rt-perks{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;max-height:180px;overflow:auto}
.rt-perks button{font-size:12px;padding:2px 8px;border-radius:10px}
#wish .rt-perks button.on,#wish .rt-col button.on{background:#18301d;border-color:#4caf50;color:#fff}
.rt-sgs{display:flex;flex-direction:column;gap:3px;margin-top:6px;max-height:300px;overflow:auto}
.rt-sg{display:flex;align-items:center;gap:8px;padding:4px 6px;background:rgba(0,0,0,.25);border:1px solid #2b2e33;border-radius:2px;cursor:pointer}
.rt-sg:hover{border-color:#8fb3d9}.rt-sg img{width:32px;height:32px;border:1px solid #3a3d43;background:#0d0f12}.rt-sg b{display:block;color:#fff;font-weight:600;font-size:13px}.rt-sg small{color:#9aa0a8;font-size:11px}.rt-sg em{margin-left:auto;font-style:normal;font-size:11px;color:#7be08c}
.rt-sel{display:flex;align-items:center;gap:10px;margin-top:8px}.rt-sel img{width:44px;height:44px;border:1px solid #3a3d43;background:#0d0f12}.rt-sel b{color:#fff;display:block}.rt-sel small{color:#9aa0a8;font-size:12px}
.rt-cols{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;align-items:flex-start}.rt-col{display:flex;flex-direction:column;gap:3px;min-width:150px}
.rt-col button{display:flex;align-items:center;gap:6px;text-align:left;font-size:12px;padding:3px 8px;border-radius:3px}.rt-col button img{width:20px;height:20px;flex:none}
`;
  document.head.appendChild(css);

  // ======================= Checklist =======================
  const csec = document.getElementById('check');
  const DEF = () => ({
    secs: [{ id: 'd', n: 'Daily', r: 'd' }, { id: 'w', n: 'Weekly', r: 'w' }, { id: 'o', n: 'Goals', r: 'n' }],
    items: [['Daily Heroic Strike / Vanguard playlist', 'd'], ['Complete bounties', 'd'], ['Spend Glimmer and shards', 'd'], ['Weekly Nightfall', 'w'], ['Weekly raid or dungeon', 'w'], ['Pinnacle challenges', 'w'], ['Clan engrams', 'w'], ['Check Xûr', 'w']].map(([t, s]) => ({ id: uid(), t, s, pc: 0, x: {} })),
    dr: lastReset(false), wr: lastReset(true),
  });
  let C = lsGet('gt_chk2', null);
  if (!C) {
    C = DEF();
    const old = lsGet('gt_chk', null);
    if (old && Array.isArray(old.items) && old.items.length) C.items = old.items.filter((i) => i && i.t).map((i) => ({ id: uid(), t: String(i.t).slice(0, 120), s: i.k === 'w' ? 'w' : 'd', pc: 0, x: i.x ? { all: 1 } : {} }));
    lsSet('gt_chk2', C);
  }
  const cs = { edit: '', addS: '', drag: '' };
  const saveC = () => lsSet('gt_chk2', C);
  function rollover() {
    const d = lastReset(false), w = lastReset(true); let ch = 0;
    const clear = (r) => C.items.forEach((i) => { const s = C.secs.find((q) => q.id === i.s); if (s && s.r === r) i.x = {}; });
    if (C.dr < d) { clear('d'); C.dr = d; ch = 1; }
    if (C.wr < w) { clear('w'); C.wr = w; ch = 1; }
    if (ch) saveC();
  }
  const keys = (it) => (it.pc ? chars().map((c) => c.id) : ['all']);
  const isDone = (it) => { const k = keys(it); return k.length > 0 && k.every((q) => it.x[q]); };
  function drawC() {
    if (!csec) return;
    rollover();
    let box = csec.querySelector('.gl'); if (!box) { box = document.createElement('div'); box.className = 'gl'; csec.appendChild(box); }
    const ch = chars(), now = Date.now();
    const rl = (r) => (r === 'd' ? 'Resets in ' + left(lastReset(false) + 864e5 - now) : r === 'w' ? 'Resets in ' + left(lastReset(true) + 6048e5 - now) : 'Never resets');
    const row = (it) => {
      const done = isDone(it);
      const boxes = it.pc && ch.length ? `<span class="ck-cb">${ch.map((c) => `<label title="${esc(CLN[c.cls] || 'Character')}"><input type="checkbox" data-ck="${it.id}" data-c="${esc(c.id)}"${it.x[c.id] ? ' checked' : ''}>${esc((CLN[c.cls] || '?')[0])}</label>`).join('')}</span>` : `<span class="ck-cb"><input type="checkbox" data-ck="${it.id}" data-c="all"${it.x.all ? ' checked' : ''}></span>`;
      const text = cs.edit === it.id
        ? `<span class="ck-t"><input type="text" id="ckin" value="${esc(it.t)}" maxlength="120" style="width:100%"><input type="text" id="ckno" value="${esc(it.n || '')}" maxlength="200" placeholder="Note (optional)" style="width:100%;margin-top:4px"></span><button class="ic pri" data-ca="ok" data-id="${it.id}">Save</button>`
        : `<span class="ck-t" data-ca="edit" data-id="${it.id}" title="Click to rename">${esc(it.t)}${it.pc ? '<small>per character</small>' : ''}${it.n ? `<span class="ck-n">${esc(it.n)}</span>` : ''}</span>`;
      return `<div class="ck-row${done ? ' done' : ''}" draggable="true" data-row="${it.id}"><span class="ck-h" title="Drag to reorder">&#8942;&#8942;</span>${boxes}${text}<button class="ic" data-ca="pc" data-id="${it.id}" title="${it.pc ? 'Track once for the account' : 'Track on each character'}">${it.pc ? 'Account' : 'Per char'}</button><button class="ic ck-x" data-ca="del" data-id="${it.id}" title="Remove">&#10005;</button></div>`;
    };
    const secs = C.secs.map((s) => {
      const its = C.items.filter((i) => i.s === s.id), dn = its.filter(isDone).length;
      return `<div class="ck-sec" data-sec="${s.id}"><div class="ck-sh"><b>${esc(s.n)}</b><span class="mute">${dn}/${its.length} &middot; ${rl(s.r)}</span><div class="ck-pb"><i style="width:${its.length ? Math.round(dn / its.length * 100) : 0}%"></i></div><span class="sp"><select data-sr="${s.id}" title="When this section clears">${[['d', 'Daily'], ['w', 'Weekly'], ['n', 'Never']].map(([k, l]) => `<option value="${k}"${s.r === k ? ' selected' : ''}>${l}</option>`).join('')}</select><button class="ic" data-ca="clr" data-s="${s.id}" title="Untick everything here">Untick all</button>${['d', 'w'].includes(s.id) ? '' : `<button class="ic" data-ca="dels" data-s="${s.id}" title="Delete this section">&#10005;</button>`}</span></div>${its.map(row).join('') || '<div class="mute" style="padding:4px 8px">Nothing here. Add something below or drag an item in.</div>'}</div>`;
    }).join('');
    box.innerHTML = `<div class="hd"><h2>Checklist</h2><span class="mute">Click an item to rename it, drag the handle to reorder, or track it on each character.</span><span class="sp"><input type="text" id="cknews" placeholder="New section name" maxlength="40" style="width:170px"><button data-ca="adds">Add section</button><button data-ca="defaults" title="Bring back the default items">Restore defaults</button></span></div>${secs}
<div class="ck-add"><input type="text" id="cknew" placeholder="Add an item (for example: Farm Ascendant Shards)" maxlength="120"><select id="cksec">${C.secs.map((s) => `<option value="${s.id}">${esc(s.n)}</option>`).join('')}</select><label class="mute" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="ckpc"> Per character</label><button class="pri" data-ca="add">Add</button></div>`;
    const ci = box.querySelector('#ckin'); if (ci) { ci.focus(); ci.setSelectionRange(ci.value.length, ci.value.length); }
  }
  if (csec) {
    csec.addEventListener('click', (e) => {
      const t = e.target.closest('[data-ca]'); if (!t || !csec.contains(t)) return;
      const a = t.dataset.ca, it = C.items.find((i) => i.id === t.dataset.id);
      if (a === 'edit' && it) { cs.edit = it.id; }
      else if (a === 'ok' && it) { const v = (csec.querySelector('#ckin') || {}).value, n = (csec.querySelector('#ckno') || {}).value; if (v && v.trim()) it.t = v.trim().slice(0, 120); it.n = String(n || '').trim().slice(0, 200); cs.edit = ''; }
      else if (a === 'pc' && it) { it.pc = it.pc ? 0 : 1; it.x = {}; }
      else if (a === 'del' && it) C.items = C.items.filter((i) => i !== it);
      else if (a === 'clr') C.items.forEach((i) => { if (i.s === t.dataset.s) i.x = {}; });
      else if (a === 'dels') { const sid = t.dataset.s; C.items.forEach((i) => { if (i.s === sid) i.s = 'o'; }); C.secs = C.secs.filter((q) => q.id !== sid); if (!C.secs.some((q) => q.id === 'o')) C.secs.push({ id: 'o', n: 'Goals', r: 'n' }); }
      else if (a === 'adds') { const n = (csec.querySelector('#cknews') || {}).value; if (!n || !n.trim()) return; C.secs.push({ id: uid(), n: n.trim().slice(0, 40), r: 'n' }); }
      else if (a === 'add') { const n = (csec.querySelector('#cknew') || {}).value; if (!n || !n.trim()) return; C.items.push({ id: uid(), t: n.trim().slice(0, 120), s: csec.querySelector('#cksec').value, pc: csec.querySelector('#ckpc').checked ? 1 : 0, x: {} }); }
      else if (a === 'defaults') { const d = DEF(); d.items.forEach((i) => { if (!C.items.some((q) => q.t === i.t)) C.items.push(i); }); d.secs.forEach((s) => { if (!C.secs.some((q) => q.id === s.id)) C.secs.push(s); }); }
      else return;
      saveC(); drawC();
    });
    csec.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.ck) { const it = C.items.find((i) => i.id === t.dataset.ck); if (!it) return; if (t.checked) it.x[t.dataset.c] = 1; else delete it.x[t.dataset.c]; saveC(); drawC(); }
      else if (t.dataset.sr) { const s = C.secs.find((q) => q.id === t.dataset.sr); if (s) { s.r = t.value; saveC(); drawC(); } }
    });
    csec.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      if (e.target.id === 'ckin' || e.target.id === 'ckno') { const b = csec.querySelector('[data-ca=ok]'); if (b) b.click(); }
      else if (e.target.id === 'cknew') csec.querySelector('[data-ca=add]').click();
      else if (e.target.id === 'cknews') csec.querySelector('[data-ca=adds]').click();
    });
    // drag to reorder, also between sections
    csec.addEventListener('dragstart', (e) => { const r = e.target.closest && e.target.closest('.ck-row'); if (!r) return; cs.drag = r.dataset.row; r.classList.add('drag'); try { e.dataTransfer.setData('text/plain', cs.drag); e.dataTransfer.effectAllowed = 'move'; } catch (er) { /* old engine */ } });
    csec.addEventListener('dragover', (e) => { if (!cs.drag) return; const r = e.target.closest('.ck-row,.ck-sec'); if (!r) return; e.preventDefault(); csec.querySelectorAll('.over').forEach((n) => n.classList.remove('over')); if (r.classList.contains('ck-row')) r.classList.add('over'); });
    csec.addEventListener('drop', (e) => {
      if (!cs.drag) return; e.preventDefault();
      const it = C.items.find((i) => i.id === cs.drag); cs.drag = ''; if (!it) return drawC();
      const r = e.target.closest('.ck-row'), sec = e.target.closest('.ck-sec');
      C.items = C.items.filter((i) => i !== it);
      if (r && r.dataset.row !== it.id) { const tgt = C.items.find((i) => i.id === r.dataset.row); it.s = tgt.s; C.items.splice(C.items.indexOf(tgt), 0, it); }
      else { if (sec) it.s = sec.dataset.sec; C.items.push(it); }
      saveC(); drawC();
    });
    csec.addEventListener('dragend', () => { cs.drag = ''; drawC(); });
    drawC(); setInterval(() => { if (csec.classList.contains('on') && !cs.edit) drawC(); }, 60000);
    new MutationObserver(() => { if (csec.classList.contains('on')) drawC(); }).observe(csec, { attributes: true, attributeFilter: ['class'] });
  }

  // ======================= Roll Tracker =======================
  // Any weapon in the game can be tracked (owned or not): search it, tick the perks you want, and every copy that lands in your vault is checked against them.
  const wsec = document.getElementById('wish');
  let W = lsGet('gt_wish', []); if (!Array.isArray(W)) W = [];
  W.forEach((w) => { if (!w.id) w.id = uid(); if (!Array.isArray(w.pk)) w.pk = []; });
  const saveW = () => lsSet('gt_wish', W);
  const B2T = { 1498876634: 'Kinetic', 2465295065: 'Energy', 953998645: 'Power' };
  const ws = { q: '', name: '', type: 'Kinetic', note: '', pk: [], sel: null, cols: null, edit: '', tm: 0, sg: [] };
  let WL = null, wlBusy = false, wlAt = 0; const colCache = {};
  const items = () => { const d = V().D && V().D(); return (d && d.items) || []; };
  const perkNames = (x) => { const pn = (V().pn && V().pn()) || {}; return [...new Set((x.pk || []).map((h) => pn[h]).filter(Boolean))]; };
  const norm = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const baseP = (n) => norm(n).replace(/\benhanced\b/g, '').trim();
  const copiesOf = (name) => { const k = norm(name); return k ? items().filter((x) => norm(x.n) === k && x.pk) : []; };
  const loc = (x) => { if (x.loc === 'vault') return 'Vault'; const c = chars().find((q) => q.id === x.loc); return c ? CLN[c.cls] || 'Character' : ''; };
  const okIcon = (p) => (/^\/[\w./%-]{1,300}$/.test(String(p || '')) ? p : '');
  // Every weapon in the game (from the item data); until that loads, only the weapons you own.
  const ownW = () => { const m = {}; items().forEach((x) => { if (x.pk && x.pk.length && (V().WEAPON ? V().WEAPON().has(x.b) : true) && !m[norm(x.n)]) m[norm(x.n)] = { n: x.n, i: x.i, t: '', b: x.b, hs: [] }; }); return Object.values(m); };
  const cat = () => WL || ownW();
  const findW = (n) => { const k = norm(n); return k ? (cat().find((w) => norm(w.n) === k) || null) : null; };
  function ensureWL() {
    if (WL || wlBusy || Date.now() - wlAt < 20000 || !window.gt || !window.gt.tfLists) return;
    wlBusy = true; wlAt = Date.now();
    window.gt.tfLists().then((o) => { WL = o && Array.isArray(o.weapons) && o.weapons.length ? o.weapons : null; }).catch(() => { /* retry later */ }).then(() => { wlBusy = false; if (WL && wsec.classList.contains('on')) drawW(); });
  }
  function pickW(w, keep) {
    ws.sel = w; ws.name = w.n; ws.cols = null; if (B2T[w.b]) ws.type = B2T[w.b]; if (!keep) ws.pk = [];
    const key = (w.hs || []).join(',');
    if (!key || !window.gt || !window.gt.tfPerks) { drawW(); return; }
    if (colCache[key]) { ws.cols = colCache[key]; drawW(); return; }
    ws.cols = 'load'; drawW();
    // The cosmetic tracker column (Kill Tracker and the Memento Trackers) is not a perk, so it is left out.
    window.gt.tfPerks({ hs: w.hs }).then((c) => { colCache[key] = Array.isArray(c) ? c.map((col) => col.filter((o) => !/tracker/i.test(o.n))).filter((col) => col.length > 1) : []; }).catch(() => { colCache[key] = []; }).then(() => { if (ws.sel === w) { ws.cols = colCache[key]; drawW(); } });
  }
  const resetForm = () => { ws.name = ''; ws.note = ''; ws.pk = []; ws.sel = null; ws.cols = null; ws.edit = ''; ws.sg = []; };
  function drawW() {
    if (!wsec) return;
    ensureWL();
    let box = wsec.querySelector('.gl'); if (!box) { box = document.createElement('div'); box.className = 'gl'; wsec.appendChild(box); }
    const sel = ws.sel && norm(ws.sel.n) === norm(ws.name) ? ws.sel : null, nq = norm(ws.name);
    const fc = copiesOf(ws.name), pool = [...new Set(fc.flatMap(perkNames))].sort();
    ws.sg = !sel && nq.length >= 2 ? cat().filter((w) => norm(w.n).includes(nq)).sort((a, b) => (norm(a.n).startsWith(nq) ? 0 : 1) - (norm(b.n).startsWith(nq) ? 0 : 1) || a.n.localeCompare(b.n)).slice(0, 10) : [];
    const sgHTML = ws.sg.length ? `<div class="rt-sgs">${ws.sg.map((w, i) => `<div class="rt-sg" data-pick="${i}">${w.i ? `<img src="${esc(img(w.i))}" alt="">` : '<img alt="">'}<span><b>${esc(w.n)}</b><small>${esc([w.t, w.r].filter(Boolean).join(' · '))}</small></span>${copiesOf(w.n).length ? '<em>owned</em>' : ''}</div>`).join('')}</div>` : (!sel && nq.length >= 2 && !WL && wlBusy ? '<div class="mute" style="margin-top:6px">Loading every weapon in the game...</div>' : '');
    const on = (n) => ws.pk.some((p) => baseP(p) === baseP(n));
    const cols = Array.isArray(ws.cols) ? ws.cols : [];
    const colsHTML = ws.cols === 'load' ? '<div class="mute" style="margin-top:8px">Loading perks...</div>'
      : cols.length ? `<div class="mute" style="margin-top:8px">Click the perks you want. Normal and enhanced versions count as the same perk.</div><div class="rt-cols">${cols.map((c) => `<div class="rt-col">${c.map((o) => `<button data-wp="${esc(o.n)}" title="${esc(o.d || '')}" class="${on(o.n) ? 'on' : ''}">${o.i ? `<img src="${esc(img(o.i))}" alt="">` : ''}<span>${esc(o.n)}</span></button>`).join('')}</div>`).join('')}</div>`
      : pool.length ? `<div class="mute" style="margin-top:8px">Perks seen on your copies (click the ones you want):</div><div class="rt-perks">${pool.map((p) => `<button data-wp="${esc(p)}" class="${on(p) ? 'on' : ''}">${esc(p)}</button>`).join('')}</div>`
      : ws.name.trim() && !ws.sg.length ? '<div class="mute" style="margin-top:8px">No perk list found for this name. Pick a weapon from the suggestions, or type the perks you want in the notes.</div>' : '';
    const picked = ws.pk.length ? `<div class="rt-pk" style="margin-top:8px">${ws.pk.map((p) => `<span class="have">${esc(p)}</span>`).join('')}</div>` : '';
    const selHTML = sel ? `<div class="rt-sel">${sel.i ? `<img src="${esc(img(sel.i))}" alt="">` : ''}<div><b>${esc(sel.n)}</b><small>${esc([sel.t, sel.r].filter(Boolean).join(' · '))} &middot; ${fc.length ? 'You own ' + fc.length + (fc.length > 1 ? ' copies' : ' copy') : 'You do not own this yet'}</small></div></div>` : '';
    const form = `<div class="hd"><h2>Roll Tracker</h2><span class="mute">Track the rolls you are hunting, for any weapon in the game, owned or not. Every copy you own is checked against the perks you want.</span></div>
<div class="rt-form"><label>Weapon<input type="text" id="rtn" value="${esc(ws.name)}" placeholder="Search any weapon, for example Fatebringer" autocomplete="off"></label><label>Slot<select id="rtt">${['Kinetic', 'Energy', 'Power'].map((t) => `<option${ws.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>
${sgHTML}${selHTML}${colsHTML}${picked}
<label class="mute" style="display:block;margin-top:6px">Notes<textarea id="rtp" rows="2" style="width:100%">${esc(ws.note)}</textarea></label>
<div style="display:flex;gap:8px;margin-top:8px;align-items:center"><button class="pri" data-wa="add">${ws.edit ? 'Save changes' : 'Add to Roll Tracker'}</button>${ws.edit ? '<button data-wa="cancel">Cancel</button>' : ''}<input type="search" id="rtq" placeholder="Search your list" value="${esc(ws.q)}" style="margin-left:auto;width:240px"></div>`;
    const q = ws.q.toLowerCase();
    const cards = W.filter((w) => !q || (w.n + ' ' + (w.p || '') + ' ' + w.pk.join(' ')).toLowerCase().includes(q)).map((w) => {
      const want = w.pk.length ? w.pk : [], cps = copiesOf(w.n).map((x) => { const have = perkNames(x).map(baseP); const hit = want.filter((p) => have.includes(baseP(p))); return { x, hit }; }).sort((a, b) => b.hit.length - a.hit.length);
      const best = cps.length ? cps[0].hit.length : 0, full = want.length && best === want.length;
      const ic = cps[0] ? cps[0].x.i : w.ic;
      return `<div class="rt-card${full ? ' full' : cps.length ? ' hit' : ''}" data-w="${esc(w.id)}"><div class="rt-h">${ic ? `<img src="${esc(img(ic))}" alt="">` : '<img alt="">'}<div><b>${esc(w.n)}</b><small>${esc(w.t || '')} &middot; ${cps.length ? cps.length + ' cop' + (cps.length > 1 ? 'ies' : 'y') + ' owned' + (want.length ? ' &middot; best has ' + best + '/' + want.length + ' perks' : '') : 'Not in your vault yet'}</small></div><div class="sp">${full ? '<span style="color:#e0b64a;font-size:12px">&#9733; God roll owned</span>' : ''}<button class="ic" data-wa="edit" data-id="${esc(w.id)}">Edit</button><button class="ic" data-wa="rm" data-id="${esc(w.id)}">Remove</button></div></div>
${want.length ? `<div class="rt-pk">${want.map((p) => `<span class="${cps.some((c) => c.hit.includes(p)) ? 'have' : ''}">${esc(p)}</span>`).join('')}</div>` : ''}${w.p ? `<div class="rt-note">${esc(w.p)}</div>` : ''}
${cps.length ? `<div class="rt-copies">${cps.slice(0, 8).map((c, i) => `<div class="rt-copy${i === 0 && want.length && c.hit.length ? ' best' : ''}" data-go="${esc(c.x.id)}" title="Open in inventory"><img src="${esc(img(c.x.i))}" alt=""><span class="m">${esc(c.x.p || '')} &middot; ${esc(loc(c.x))}${want.length ? ` &middot; <b>${c.hit.length}/${want.length}</b>` : ''}</span><span class="pp">${perkNames(c.x).slice(0, 8).map((p) => `<i class="${want.some((wp) => baseP(wp) === baseP(p)) ? 'have' : ''}">${esc(p)}</i>`).join(' &middot; ')}</span></div>`).join('')}</div>` : (want.length ? '<div class="rt-note">Waiting for a copy. It lights up here as soon as one lands in your vault.</div>' : '')}</div>`;
    }).join('');
    const ae = document.activeElement, keep = ae && box.contains(ae) && ae.id ? [ae.id, ae.selectionStart] : null;
    box.innerHTML = form;
    let list = wsec.querySelector('.gl.rt'); if (!list) { list = document.createElement('div'); list.className = 'gl rt'; wsec.appendChild(list); }
    list.innerHTML = W.length ? `<div class="rt-grid">${cards || '<div class="mute">Nothing matches.</div>'}</div>` : '<div class="mute">Nothing saved yet.</div>';
    if (keep) { const n = document.getElementById(keep[0]); if (n) { n.focus(); try { n.setSelectionRange(keep[1], keep[1]); } catch (er) { /* select */ } } }
  }
  if (wsec) {
    wsec.addEventListener('click', (e) => {
      const go = e.target.closest('[data-go]'); if (go) { if (window.show) window.show('vault'); setTimeout(() => { try { V().open(go.dataset.go); } catch (er) { /* not shown */ } }, 60); return; }
      const pk = e.target.closest('[data-pick]'); if (pk) { const w = ws.sg[+pk.dataset.pick]; if (w) pickW(w); return; }
      const p = e.target.closest('[data-wp]'); if (p) { const v = p.dataset.wp, i = ws.pk.findIndex((x) => baseP(x) === baseP(v)); if (i >= 0) ws.pk.splice(i, 1); else ws.pk.push(v); drawW(); return; }
      const b = e.target.closest('[data-wa]'); if (!b) return;
      const a = b.dataset.wa;
      if (a === 'add') {
        const n = ws.name.trim(); if (!n) return;
        const sel = ws.sel || findW(n);
        const rec = { n: (sel ? sel.n : n).slice(0, 80), t: ws.type, p: ws.note.slice(0, 400), pk: ws.pk.slice(0, 16), ic: sel ? okIcon(sel.i) : '' };
        const old = ws.edit && W.find((w) => w.id === ws.edit);
        if (old) Object.assign(old, rec); else W.unshift({ id: uid(), ...rec });
        resetForm(); saveW(); drawW();
      } else if (a === 'rm') { W = W.filter((w) => w.id !== b.dataset.id); if (ws.edit === b.dataset.id) resetForm(); saveW(); drawW(); }
      else if (a === 'cancel') { resetForm(); drawW(); }
      else if (a === 'edit') {
        const w = W.find((q) => q.id === b.dataset.id); if (!w) return;
        ws.edit = w.id; ws.name = w.n; ws.type = w.t || 'Kinetic'; ws.note = w.p || ''; ws.pk = w.pk.slice(); ws.sel = null; ws.cols = null;
        const m = findW(w.n); if (m) pickW(m, true); else drawW();
        try { wsec.querySelector('.gl').scrollIntoView({ block: 'start' }); } catch (er) { /* old engine */ }
      }
    });
    wsec.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'rtn') {
        ws.name = t.value;
        if (ws.sel && norm(ws.sel.n) !== norm(ws.name)) { ws.sel = null; ws.cols = null; ws.pk = []; }
        clearTimeout(ws.tm); ws.tm = setTimeout(() => { const m = !ws.sel && findW(ws.name); if (m) pickW(m); else drawW(); }, 250);
      }
      else if (t.id === 'rtp') ws.note = t.value;
      else if (t.id === 'rtq') { ws.q = t.value; clearTimeout(ws.tm); ws.tm = setTimeout(drawW, 200); }
    });
    wsec.addEventListener('change', (e) => { if (e.target.id === 'rtt') ws.type = e.target.value; });
    drawW();
    new MutationObserver(() => { if (wsec.classList.contains('on')) drawW(); }).observe(wsec, { attributes: true, attributeFilter: ['class'] });
  }
})();
