// Developer tabs: "God rolls" (the god roll finder as its own page) and "Wish list maker" (build wish list rolls for any
// weapon in the game). Both are for developer accounts only until the admin page opens them up:
//   switch "godroll-tab" / "wishmaker-tab": none or Dev = developers only, On = everyone, Off = nobody.
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec || !window.gt) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = (p) => (p ? (/^https?:/.test(p) ? p : 'https://www.bungie.net' + p) : '');
  const V = () => window.__gtv;
  const SW = { godrolls: 'godroll-tab', wishmaker: 'wishmaker-tab' };
  window.__gtDevFeatureNames = Object.values(SW); // listed in Settings > Developer even before the admin page has them
  const allowed = (id) => !!(window.__gtDevFeature && window.__gtDevFeature(SW[id]));
  window.__gtTabLocked = (id) => !!SW[id] && !allowed(id);

  const mk = (id, label) => {
    const s = document.createElement('section'); s.id = id; s.className = 'gdark'; vsec.parentNode.appendChild(s);
    const b = document.createElement('button'); b.textContent = label; b.dataset.t = id;
    const anchor = nav.querySelector('[data-t=optimizer]') || nav.querySelector('[data-t=organizer]');
    nav.insertBefore(b, anchor ? anchor.nextSibling : null);
    return { s, b };
  };
  const gr = mk('godrolls', 'God rolls'), wm = mk('wishmaker', 'Wish list maker');

  // Locked again (switch changed, signed out of the developer account): leave the page and refit the tab bar.
  function applyLock() {
    for (const id of Object.keys(SW)) {
      const ok = allowed(id), b = id === 'godrolls' ? gr.b : wm.b, s = id === 'godrolls' ? gr.s : wm.s;
      b.classList.toggle('gthide', !ok);
      if (!ok && s.classList.contains('on') && window.show) window.show('vault');
    }
    window.dispatchEvent(new Event('resize'));
  }
  window.addEventListener('gtflags', applyLock);
  setTimeout(applyLock, 0);

  // ---------- God rolls ----------
  const drawGr = () => {
    if (!allowed('godrolls')) { window.show('vault'); return; }
    if (window.__gtGrfInto) window.__gtGrfInto(gr.s);
    if (!(V() && V().D && V().D())) setTimeout(() => { if (gr.s.classList.contains('on')) drawGr(); }, 800); // vault still loading
  };
  gr.b.onclick = () => { if (!allowed('godrolls')) return; window.show('godrolls'); drawGr(); };
  window.addEventListener('gtwl', () => { if (gr.s.classList.contains('on')) drawGr(); });

  // ---------- Wish list maker ----------
  // Pick any weapon, pick the perks you want in each column (more than one in a column = any of them), add it as a wish list
  // or trash roll. Rolls go into "My wish list", like the maker in a weapon's pop-up.
  const st = { q: '', res: [], busy: false, pool: null, poolErr: '', sel: {}, note: '', tags: new Set(), msg: '', mine: {} };
  let qT = 0, qN = 0;
  const TAGS = [['pve', 'PvE'], ['pvp', 'PvP'], ['mkb', 'Mouse and keyboard'], ['controller', 'Controller']];
  const owned = () => { const D = V() && V().D && V().D(); const c = {}; if (D) D.items.forEach((x) => { c[x.h] = (c[x.h] || 0) + 1; }); return c; };
  const combos = () => {
    if (!st.pool) return [];
    const cols = st.pool.cols.map((c, i) => [...(st.sel[i] || [])]).filter((a) => a.length);
    if (!cols.length) return [];
    let out = [[]];
    for (const a of cols) { const nx = []; for (const pre of out) for (const h of a) nx.push(pre.concat(h)); out = nx; if (out.length > 64) break; }
    return out;
  };
  // Your rolls for every version of this weapon, shown once each (the same roll is saved for each version of the gun).
  function mineRows() {
    const P = st.pool; if (!P) return [];
    const pn = {}; P.cols.forEach((c) => c.opts.forEach((o) => { pn[o.h] = o.n; Object.values(o.hm || {}).forEach((x) => { pn[x] = o.n; }); }));
    const rows = [], by = {};
    (P.hs || [P.h]).forEach((vh) => (st.mine[vh] || []).forEach((r, i) => {
      const names = r[0].map((h) => pn[h] || '#' + h).join(' + '), key = names + '|' + (r[2] ? 1 : 0) + '|' + (r[1] || '') + '|' + (r[3] || '');
      let row = by[key]; if (!row) { row = by[key] = { names, trash: !!r[2], note: r[1] || '', tags: r[3] || '', at: [] }; rows.push(row); }
      row.at.push([vh, i]);
    }));
    return rows;
  }
  async function loadMine() { try { st.mine = (await gt.wlMine()).rolls || {}; } catch (e) { st.mine = {}; } }

  function drawWm() {
    if (!allowed('wishmaker')) { window.show('vault'); return; }
    const own = owned(), P = st.pool;
    const ownN = (w) => (w.hs || [w.h]).reduce((a, x) => a + (own[x] || 0), 0);
    const results = st.res.map((w) => `<div class="wmr${P && P.h === w.h ? ' on' : ''}" data-wh="${w.h}" role="button" tabindex="0"><span class="wmi">${w.i ? `<img src="${esc(ICON(w.i))}" alt="" loading="lazy">` : ''}${w.wm ? `<img class="wmw" src="${esc(ICON(w.wm))}" alt="">` : ''}</span><span><b>${esc(w.n)}</b><small>${esc(w.t)}${w.r === 'Exotic' ? ' &middot; Exotic' : ''}${ownN(w) ? ` &middot; you own ${ownN(w)}` : ''}</small></span></div>`).join('');
    const mine = mineRows();
    const n = combos().length;
    const right = !P ? `<div class="wmempty">${st.poolErr ? esc(st.poolErr) : 'Search for a weapon on the left, then pick its perks here.'}</div>` : `
      <div class="wmh">${P.i ? `<img src="${esc(ICON(P.i))}" alt="">` : ''}<div><b>${esc(P.n)}</b><small>${esc(P.t)}${ownN(P) ? ` &middot; you own ${ownN(P)}` : ''}</small></div></div>
      <p class="mute">Pick the perks that make this roll. Pick more than one in a column to accept any of them; leave a column empty if it does not matter.</p>
      <div class="wmcols" style="--wmn:${P.cols.length}">${P.cols.map((c, ci) => `<div class="wmcol"><div class="wmcl">${esc(c.label)}${(st.sel[ci] && st.sel[ci].size) ? ` <button class="wmclr" data-wclr="${ci}" type="button">Clear</button>` : ''}</div>${c.opts.map((o) => `<div class="wmp${st.sel[ci] && st.sel[ci].has(o.h) ? ' on' : ''}" data-wc="${ci}" data-wp="${o.h}" role="checkbox" aria-checked="${!!(st.sel[ci] && st.sel[ci].has(o.h))}" tabindex="0" title="${esc(o.d)}">${o.i ? `<img src="${esc(ICON(o.i))}" alt="">` : ''}<span>${esc(o.n)}</span></div>`).join('')}</div>`).join('') || '<p class="mute">This weapon has no random perks to pick.</p>'}</div>
      <div class="wmf"><input type="text" id="wmnote" maxlength="200" placeholder="Note (optional), e.g. PvE add clear" value="${esc(st.note)}">
        <div class="wmt">${TAGS.map(([k, l]) => `<label><input type="checkbox" data-wt="${k}"${st.tags.has(k) ? ' checked' : ''}> ${l}</label>`).join('')}</div>
        <div class="wmb"><button class="b" data-wadd="0" type="button"${n ? '' : ' disabled'}>&#128077; Add as wish list roll</button><button class="g" data-wadd="1" type="button"${n ? '' : ' disabled'}>&#128078; Add as trash roll</button>
        <span class="mute">${n ? (n > 64 ? 'Too many combinations (more than 64): pick fewer perks.' : `Adds ${n} roll${n === 1 ? '' : 's'}.`) : 'Pick at least one perk.'}</span></div>
        ${st.msg ? `<div class="wmmsg${/^Could not/.test(st.msg) ? ' bad' : ''}">${esc(st.msg)}</div>` : ''}</div>
      <div class="wmmine"><div class="wmcl">Your rolls for this weapon (${mine.length})</div>${mine.map((r, i) => `<div class="wmmr"><span>${r.trash ? '&#128078;' : '&#128077;'} ${esc(r.names)}${r.note ? ` <small>${esc(r.note)}</small>` : ''}${r.tags ? ` <small>${esc(r.tags)}</small>` : ''}</span><button class="g" data-wdel="${i}" type="button">Remove</button></div>`).join('') || '<p class="mute">None yet.</p>'}</div>`;
    wm.s.innerHTML = `<div class="wmw2"><div class="wml"><div class="wmcl">Weapon</div><input type="search" id="wmq" placeholder="Search every weapon, e.g. fatebringer or pulse rifle" value="${esc(st.q)}" autocomplete="off">
      <div class="wmres">${st.busy ? '<p class="mute">Searching…</p>' : results || (st.q.length >= 2 ? '<p class="mute">No weapons found.</p>' : '<p class="mute">Type at least 2 letters.</p>')}</div></div><div class="wmrt">${right}</div></div>`;
  }
  async function search(q) {
    const my = ++qN; st.busy = true; drawKeepFocus();
    let r = []; try { r = await gt.wmFind({ q }); } catch (e) { r = []; }
    if (my !== qN) return; st.res = r; st.busy = false; drawKeepFocus();
  }
  function drawKeepFocus() {
    const a = document.activeElement, id = a && a.id, pos = a && a.selectionStart;
    drawWm();
    if (id) { const el = document.getElementById(id); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* not text */ } } }
  }
  async function pick(h) {
    const w = st.res.find((x) => x.h === h), hs = (w && w.hs) || [h];
    st.pool = null; st.poolErr = ''; st.sel = {}; st.msg = ''; drawWm();
    try { st.pool = await gt.wmPool({ h, hs }); } catch (e) { st.poolErr = 'Could not load that weapon: ' + String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''); }
    await loadMine(); drawWm();
  }
  async function add(trash) {
    const cs = combos(); if (!cs.length || cs.length > 64 || !st.pool) return;
    const tags = [...st.tags].join(',');
    try {
      // Save the roll for every version of the weapon, with that version's own perk hashes.
      const byH = {}; st.pool.cols.forEach((c) => c.opts.forEach((o) => { byH[o.h] = o; }));
      for (const vh of (st.pool.hs || [st.pool.h])) {
        for (const combo of cs) {
          const perks = combo.map((x) => { const o = byH[x]; return o && o.hm ? o.hm[vh] : (vh === st.pool.h ? x : 0); });
          if (perks.some((x) => !x)) continue; // that version cannot roll one of these perks
          await gt.wlAddRoll({ h: vh, perks, note: st.note, tags, trash: !!trash, name: st.pool.n });
        }
      }
      st.msg = `Added ${cs.length} ${trash ? 'trash' : 'wish list'} roll${cs.length === 1 ? '' : 's'} to My wish list.`;
      if (V() && V().wlReload) V().wlReload(); window.dispatchEvent(new Event('gtwl'));
    } catch (e) { st.msg = 'Could not add: ' + String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''); }
    await loadMine(); drawWm();
  }
  wm.b.onclick = () => { if (!allowed('wishmaker')) return; window.show('wishmaker'); loadMine().then(drawWm); drawWm(); setTimeout(() => { const q = document.getElementById('wmq'); if (q && !st.pool) q.focus(); }, 30); };
  wm.s.addEventListener('input', (e) => {
    if (e.target.id === 'wmq') { st.q = e.target.value; clearTimeout(qT); if (st.q.trim().length < 2) { st.res = []; qN++; st.busy = false; drawKeepFocus(); return; } qT = setTimeout(() => search(st.q.trim()), 220); }
    if (e.target.id === 'wmnote') st.note = e.target.value;
  });
  wm.s.addEventListener('change', (e) => { const t = e.target.closest('[data-wt]'); if (t) { if (t.checked) st.tags.add(t.dataset.wt); else st.tags.delete(t.dataset.wt); } });
  const act = (e) => {
    const r = e.target.closest('[data-wh]'); if (r) { pick(+r.dataset.wh); return true; }
    const p = e.target.closest('[data-wp]'); if (p) { const ci = +p.dataset.wc, h = +p.dataset.wp; const set = st.sel[ci] || (st.sel[ci] = new Set()); if (set.has(h)) set.delete(h); else set.add(h); st.msg = ''; drawWm(); return true; }
    const c = e.target.closest('[data-wclr]'); if (c) { delete st.sel[+c.dataset.wclr]; drawWm(); return true; }
    const a = e.target.closest('[data-wadd]'); if (a) { add(a.dataset.wadd === '1'); return true; }
    const d = e.target.closest('[data-wdel]'); if (d && st.pool) { const row = mineRows()[+d.dataset.wdel]; if (!row) return true;
      // Remove the copy saved for each version, highest index first so the others do not shift.
      row.at.slice().sort((a, b) => b[1] - a[1]).reduce((pr, [vh, i]) => pr.then(() => gt.wlDelRoll({ h: vh, i })), Promise.resolve()).then(async () => { if (V() && V().wlReload) V().wlReload(); window.dispatchEvent(new Event('gtwl')); await loadMine(); drawWm(); }).catch(() => {}); return true; }
    return false;
  };
  wm.s.addEventListener('click', act);
  wm.s.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-wh],[data-wp]')) { e.preventDefault(); act(e); } });

  const css = document.createElement('style');
  css.textContent = `
#godrolls,#wishmaker{padding:14px 16px 40px}
#wishmaker .wmw2{display:grid;grid-template-columns:320px minmax(0,1fr);gap:16px;max-width:1240px;margin:0 auto;align-items:start}
#wishmaker .wml,#wishmaker .wmrt{background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:12px;padding:14px}
#wishmaker .wml{position:sticky;top:64px;max-height:calc(100vh - 90px);display:flex;flex-direction:column}
#wishmaker .wmcl{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute,#9aa1ab);margin:0 0 8px;display:flex;align-items:center;gap:8px}
#wishmaker #wmq{width:100%;box-sizing:border-box;margin-bottom:10px}
#wishmaker .wmres{overflow:auto;min-height:0;display:flex;flex-direction:column;gap:3px}
#wishmaker .wmr{display:flex;gap:10px;align-items:center;padding:5px;border-radius:8px;cursor:pointer;border:1px solid transparent}
#wishmaker .wmr:hover{background:rgba(255,255,255,.05)}#wishmaker .wmr.on{border-color:var(--g-accent,#7ab8e8);background:rgba(255,255,255,.06)}
#wishmaker .wmr b{display:block;font-size:13.5px;color:#fff}#wishmaker .wmr small{color:#aab0b9;font-size:12px}
#wishmaker .wmi{position:relative;width:40px;height:40px;flex:none;border-radius:4px;overflow:hidden;background:#111}
#wishmaker .wmi img{width:100%;height:100%;display:block}#wishmaker .wmi .wmw{position:absolute;inset:0}
#wishmaker .wmempty{color:var(--mute,#9aa1ab);padding:40px 10px;text-align:center}
#wishmaker .wmh{display:flex;gap:12px;align-items:center;margin-bottom:6px}#wishmaker .wmh img{width:56px;height:56px;border-radius:4px}
#wishmaker .wmh b{font-size:18px;color:#fff;display:block}#wishmaker .wmh small{color:#aab0b9}
#wishmaker .wmcols{display:grid;grid-template-columns:repeat(var(--wmn,4),minmax(150px,1fr));gap:12px;margin:10px 0 14px;overflow-x:auto;padding-bottom:4px}
#wishmaker .wmcol{display:flex;flex-direction:column;gap:4px}
#wishmaker .wmp{display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid var(--g-line,#2b2e33);border-radius:8px;cursor:pointer;font-size:13px;user-select:none}
#wishmaker .wmp img{width:26px;height:26px;border-radius:50%;flex:none}
#wishmaker .wmp:hover{background:rgba(255,255,255,.05)}
#wishmaker .wmp.on{border-color:var(--g-accent,#7ab8e8);background:var(--g-accent-soft,rgba(122,184,232,.16));color:#fff}
#wishmaker .wmp:focus-visible,#wishmaker .wmr:focus-visible{outline:2px solid var(--g-accent,#7ab8e8);outline-offset:1px}
#wishmaker .wmclr{font-size:11px;padding:1px 8px;text-transform:none;letter-spacing:0}
#wishmaker .wmf{border-top:1px solid var(--g-line,#2b2e33);padding-top:12px;display:flex;flex-direction:column;gap:10px}
#wishmaker #wmnote{width:100%;box-sizing:border-box}
#wishmaker .wmt{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:13px}#wishmaker .wmt label{display:flex!important;gap:6px;align-items:center;cursor:pointer;white-space:nowrap;width:auto!important;margin:0!important;padding:0!important;flex:none}#wishmaker .wmt input{width:16px!important;height:16px;margin:0!important;flex:none}
#wishmaker .wmb{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#wishmaker .wmb button[disabled]{opacity:.45;pointer-events:none}
#wishmaker .wmmsg{font-size:13px;color:#8fd19e}#wishmaker .wmmsg.bad{color:#ff8a8a}
#wishmaker .wmmine{margin-top:16px;border-top:1px solid var(--g-line,#2b2e33);padding-top:12px}
#wishmaker .wmmr{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px}
#wishmaker .wmmr small{color:#aab0b9;margin-left:6px}
@media (max-width:760px){#wishmaker .wmw2{grid-template-columns:1fr}#wishmaker .wml{position:static;max-height:none}#wishmaker .wmres{max-height:300px}}
`;
  document.head.appendChild(css);
})();
