/* global GD, FULL, BUILT, thumbOf, esc, openGuide:writable */
/* Helpful tab (beta). Renders the researched guides in window.GT_GUIDES (guides-data.js):
   hub grid with Bungie's own activity art, and each guide as a route of encounters with steps,
   damage and wipe notes, hidden chests, loot from Bungie's collections and the community maps in app/g.
   Older entries that have no researched guide (secret triumph tips) still open in the old renderer. */
(function () {
  const GG = window.GT_GUIDES || [];
  if (!GG.length || !document.getElementById('guides')) return;
  const $ = (id) => document.getElementById(id);
  const E = typeof esc === 'function' ? esc : (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const B = (p) => (p ? (/^https?:/.test(p) ? p : 'https://www.bungie.net' + p) : '');
  const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const CAT = { Raid: ['Raids', '--cr'], Dungeon: ['Dungeons', '--cd'], 'Exotic mission': ['Exotic missions', '--cx'], 'Secret triumph': ['Secret triumphs', '--cs'] };
  const ORDER = ['Raid', 'Dungeon', 'Exotic mission', 'Secret triumph'];
  const gd = () => { try { return Array.isArray(GD) ? GD : []; } catch (e) { return []; } };
  const full = (n) => { try { return FULL[n]; } catch (e) { return null; } };
  const built = (k) => { try { return BUILT[k]; } catch (e) { return ''; } };
  // Old guides with no researched page (secret triumph tips, anything new in GD later).
  const extras = () => gd().filter((g) => !GG.some((x) => x.b === g[1] || norm(x.n) === norm(g[1])));
  const ART = { img: {}, loot: {}, own: null, state: 'idle' };
  let cat = 'All';
  const oldOpen = typeof openGuide === 'function' ? openGuide : null;

  // Fresh copies of the list and page drop the old renderer's listeners.
  const swap = (id) => { const o = $(id); if (!o) return null; const n = o.cloneNode(false); o.replaceWith(n); return n; };
  const list = swap('glist'), page = swap('gpage');
  page.classList.add('gx-page');
  const card0 = document.querySelector('#ghub>.card');
  if (card0) card0.outerHTML = '<div class="gx-top"><h2>Helpful</h2><input id="gsearch" type="search" placeholder="Search raids, dungeons, missions, bosses" autocomplete="off" aria-label="Search guides"></div><div id="gchips" class="gx-seg" role="tablist" aria-label="Guide categories"></div>';
  let lb = $('gx-lb');
  if (!lb) { lb = document.createElement('div'); lb.id = 'gx-lb'; lb.hidden = true; lb.innerHTML = '<img alt=""><p></p>'; document.body.appendChild(lb); lb.onclick = () => { lb.hidden = true; }; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) lb.hidden = true; });

  const art = (g) => ART.img[g.id] || (g.b && typeof thumbOf === 'function' ? thumbOf(g.b) : '') || '';
  const catVar = (t) => `var(${(CAT[t] || CAT.Raid)[1]})`;
  const blurb = (g) => E([g.players ? g.players + ' players' : '', g.enc.filter((e) => e.kind === 'enc').length + ' encounters'].filter(Boolean).join(' · ')) + `<i class="gx-loc"> · ${E(g.loc.split('(')[0].trim())}</i>`;

  // ---------- Hub ----------
  function cardHTML(g) {
    const a = art(g);
    return `<div class="gx-card" role="button" tabindex="0" data-g="${E(g.id)}" style="--cat:${catVar(g.type)}"><div class="gx-art${a ? '' : ' ph'}"${a ? ` style="background-image:url('${E(B(a))}')"` : ''}></div><div class="gx-ct"><b>${E(g.n)}</b><span>${blurb(g)}</span></div></div>`;
  }
  const oldCard = (g) => `<div class="gx-card gx-plain" role="button" tabindex="0" data-old="${E(g[1])}" style="--cat:${catVar(g[0])}"><div class="gx-ct"><b>${E(g[1])}</b><span>${E(String(g[2] || ''))}</span></div></div>`;
  function draw() {
    const q = norm(($('gsearch') || {}).value || '');
    const ex = extras();
    const count = (t) => GG.filter((g) => g.type === t).length + ex.filter((g) => g[0] === t).length;
    const cats = ORDER.filter((t) => count(t));
    $('gchips').innerHTML = ['All', ...cats].map((t) => `<button role="tab" aria-selected="${cat === t}" class="${cat === t ? 'on' : ''}" data-c="${E(t)}">${t === 'All' ? 'All' : CAT[t][0]}<small>${t === 'All' ? GG.length + ex.length : count(t)}</small></button>`).join('');
    const hit = (g) => !q || norm([g.n, g.loc, g.intro, ...g.enc.map((e) => e.n)].join(' ')).includes(q);
    const hitO = (g) => !q || norm(g[1] + ' ' + g[2] + ' ' + (g[3] || []).join(' ')).includes(q);
    let h = '';
    for (const t of cats) {
      if (!q && cat !== 'All' && cat !== t) continue;
      const a = GG.filter((g) => g.type === t && hit(g)), b = ex.filter((g) => g[0] === t && hitO(g));
      if (!a.length && !b.length) continue;
      h += `<div class="gx-group"><h3>${CAT[t][0]} <small>${a.length + b.length}</small></h3><div class="gx-grid">${a.map(cardHTML).join('')}${b.map(oldCard).join('')}</div></div>`;
    }
    list.className = 'gx-hub';
    list.innerHTML = h || `<div class="gx-empty">Nothing matches “${E(($('gsearch') || {}).value || '')}”. Try a boss or activity name.</div>`;
  }
  $('gchips').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; draw(); } };
  $('gsearch').oninput = draw;
  page.onkeydown = (e) => { const t = e.target.closest('.gx-shot'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); t.click(); } };
  list.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.gx-card')) { e.preventDefault(); e.target.closest('.gx-card').click(); } };
  list.onclick = (e) => { const c = e.target.closest('[data-g],[data-old]'); if (!c) return; if (c.dataset.g) show(c.dataset.g); else if (oldOpen) { oldOpen(c.dataset.old); page.classList.remove('in'); } };

  // ---------- Community maps from app/g, placed with the encounter they belong to ----------
  const STOP = new Set(['encounter', 'first', 'second', 'third', 'fourth', 'final', 'the', 'and', 'screenshots', 'maps', 'loot', 'overview', 'other', 'still', 'needs', 'secret', 'chests', 'chest', 'collectibles', 'section', 'sections', 'traversal']);
  const words = (s) => norm(s).split(' ').filter((w) => w.length > 3 && !STOP.has(w));
  function shots(g) {
    const F = g.b && full(g.b); const out = { by: {}, loot: [], chest: [], rest: [] };
    if (!F || !F.sections) return out;
    F.sections.forEach((s, i) => {
      if (/still needs maps/i.test(s.t || '')) return;
      const ims = (s.img || []).map((cap, j) => ({ u: built(g.b + '|' + i + '_' + j), cap, sec: s.t })).filter((x) => x.u);
      if (!ims.length) return;
      if (/overview|loot/i.test(s.t)) { out.loot.push(...ims); return; }
      if (/chest/i.test(s.t)) { out.chest.push(...ims); return; }
      const w = words(s.t); let best = -1, bs = 0;
      g.enc.forEach((e, k) => { const ew = new Set(words(e.n)); const sc = w.filter((x) => ew.has(x)).length; if (sc > bs) { bs = sc; best = k; } });
      if (best >= 0) (out.by[best] = out.by[best] || []).push(...ims); else out.rest.push(...ims);
    });
    return out;
  }
  const shotHTML = (L) => (L && L.length ? `<div class="gx-shots">${L.map((x) => `<div class="gx-shot" role="button" tabindex="0" data-full="${E(x.u)}" data-cap="${E(x.cap)}"><img src="${E(x.u)}" alt="${E(x.cap)}" loading="lazy"><span>${E(x.cap)}</span></div>`).join('')}</div>` : '');

  // ---------- Guide page ----------
  const ul = (L) => `<ul>${L.map((t) => `<li>${E(t)}</li>`).join('')}</ul>`;
  const lootFor = (g, encName) => {
    if (!g.loot) return null;
    const k = Object.keys(g.loot).find((x) => norm(x) === norm(encName) || norm(encName).includes(norm(x)) || norm(x).includes(norm(encName)));
    return k ? g.loot[k] : null;
  };
  function wpHTML(g, e, i, S) {
    const isE = e.kind === 'enc', L = lootFor(g, e.n);
    let h = `<article class="gx-wp ${isE ? 'e' : 't'}" id="gx-e${i}" style="--i:${i}"><div class="gx-in"><div class="gx-wh"><h4>${E(e.n)}</h4><small>${isE ? 'Encounter' : 'Traversal'}</small></div>`;
    if (e.goal) h += `<p class="gx-goal">${E(e.goal)}</p>`;
    if (e.roles && e.roles.length) h += `<ul class="gx-roles" aria-label="Roles">${e.roles.map((r) => `<li>${E(r)}</li>`).join('')}</ul>`;
    if (e.steps && e.steps.length) h += `<ol class="gx-steps">${e.steps.map((s) => `<li>${E(s)}</li>`).join('')}</ol>`;
    if (e.dps) h += `<div class="gx-call gx-dps"><b>Damage phase</b>${E(e.dps)}</div>`;
    if (e.wipes && e.wipes.length) h += `<div class="gx-call gx-wipe"><b>The team wipes or you die if</b>${ul(e.wipes)}</div>`;
    if (e.tips && e.tips.length) h += `<div class="gx-call gx-tip"><b>Tips</b>${ul(e.tips)}</div>`;
    if (e.chal) h += `<div class="gx-call gx-chal"><b>Challenge: ${E(e.chal.n)}</b>${E(e.chal.d)}</div>`;
    if (L) h += `<div class="gx-drops"><b>Drops</b>${L.map((n) => chip(g, n)).join('')}</div>`;
    h += shotHTML(S.by[i]);
    return h + '</div></article>';
  }
  // A loot name, with its Bungie icon when the collections data has the same item.
  function chip(g, n) {
    const base = String(n).replace(/\s*\(.*\)$/, '');
    const it = (ART.loot[g.id] || []).find((x) => norm(x.n) === norm(base));
    return `<span class="gx-chip">${it ? `<img src="${E(B(it.i))}" alt="" loading="lazy">` : ''}${E(n)}</span>`;
  }
  const ARMOR = new Set([3448274439, 3551918588, 14239492, 20886954, 1585787867]);
  const CLS = ['Titan', 'Hunter', 'Warlock'];
  function lootHTML(g) {
    let h = '';
    const L = ART.loot[g.id] || [], own = ART.own;
    if (L.length) {
      const skip = (x) => /\((adept|timelost|harrowed)\)$/i.test(x.n);
      const W = L.filter((x) => !ARMOR.has(x.b) && !skip(x)).sort((a, b) => (b.r === 'Exotic') - (a.r === 'Exotic') || a.n.localeCompare(b.n));
      const A = L.filter((x) => ARMOR.has(x.b));
      const have = own ? W.concat(A).filter((x) => own.has(x.h)).length : -1;
      if (W.length) h += `<div class="gx-loot">${W.map((x) => `<div class="gx-item${x.r === 'Exotic' ? ' ex' : ''}" title="${E(x.n)}"><img src="${E(B(x.i))}" alt="" loading="lazy"><div style="min-width:0"><b>${E(x.n)}</b><small>${E(x.r === 'Exotic' ? 'Exotic ' + x.t.toLowerCase() : x.t)}${own && own.has(x.h) ? ' · <span class="own" title="In your collections">✓ owned</span>' : ''}</small></div></div>`).join('')}</div>`;
      if (A.length) {
        const by = [0, 1, 2].map((c) => A.filter((x) => x.c === c)).filter((l) => l.length);
        h += `<p class="gx-note" style="margin-top:12px"><b>Armor</b> · ${by.map((l) => `${CLS[l[0].c]} ${l.length}`).join(' · ')} pieces</p><div class="gx-armor">${A.map((x) => `<img src="${E(B(x.i))}" alt="${E(x.n)}" title="${E(x.n)} (${E(CLS[x.c] || 'Any class')})" loading="lazy" class="${own && own.has(x.h) ? 'own' : ''}">`).join('')}</div>`;
      }
      h += `<p class="gx-note">Every item Bungie's collections list for this activity, read live from the game's own data${have >= 0 ? ` · you own ${have} of ${W.length + A.length}` : ''}.</p>`;
    } else if (ART.state === 'loading') h += '<div class="gx-wait">Loading the official loot list from Bungie…</div>';
    if (g.loot) h += `<table class="gx-table" style="margin-top:12px"><caption class="gx-note" style="text-align:left;caption-side:top;margin:0 0 6px">Drops by encounter</caption>${Object.keys(g.loot).map((k) => `<tr><th scope="row">${E(k)}</th><td>${g.loot[k].map((n) => chip(g, n)).join('')}</td></tr>`).join('')}</table>`;
    else if (!L.length && g.lootAll) h += `<div class="gx-drops">${g.lootAll.map((n) => chip(g, n)).join('')}</div>`;
    if (g.lootNote) h += `<p class="gx-note">${E(g.lootNote)}</p>`;
    return h;
  }
  let cur = null;
  function render(id, fresh) {
    const g = GG.find((x) => x.id === id); if (!g) return;
    cur = id; page.dataset.cur = g.b || g.n;
    const a = art(g), S = shots(g), save = window.__gth && window.__gth.btn ? window.__gth.btn('guide', g.b || g.n, g.n) : '';
    let h = `<button class="g gx-back" id="gback">← All guides</button>`;
    h += `<div class="gx-hero${a ? '' : ' ph'}" style="--cat:${catVar(g.type)}${a ? `;background-image:url('${E(B(a))}')` : ''}"><div class="gx-hc"><span class="gx-kind">${E(g.type)}</span><h2>${E(g.n)}</h2><div class="gx-facts"><div><small>Fireteam</small>${E(g.players)} players</div><div><small>Location</small>${E(g.loc)}</div><div><small>Released</small>${E(g.rel)}</div></div></div>${save ? `<span class="gx-save">${save}</span>` : ''}</div>`;
    h += `<p class="gx-intro">${E(g.intro)}</p>`;
    if (g.basics && g.basics.length) h += `<div class="gx-sec" style="--cat:${catVar(g.type)}"><h3>Before you start</h3><ul class="gx-basics">${g.basics.map((b) => `<li>${E(b)}</li>`).join('')}</ul></div>`;
    h += `<div class="gx-toc" role="navigation" aria-label="Jump to">${g.enc.map((e, i) => `<a href="#gx-e${i}" data-jump="${i}" class="${e.kind === 'enc' ? 'e' : ''}"><i></i>${E(e.n)}</a>`).join('')}${g.chests && g.chests.length ? '<a href="#gx-chests" data-jump="chests">Hidden chests</a>' : ''}<a href="#gx-loot" data-jump="loot">Loot</a></div>`;
    h += `<div class="gx-sec" style="--cat:${catVar(g.type)}"><h3>The route</h3><div class="gx-route">${g.enc.map((e, i) => wpHTML(g, e, i, S)).join('')}</div></div>`;
    if (g.chests && g.chests.length) h += `<div class="gx-sec" id="gx-chests" style="--cat:${catVar(g.type)}"><h3>Hidden chests</h3><ul class="gx-list">${g.chests.map((c) => `<li>${E(c)}</li>`).join('')}</ul>${shotHTML(S.chest)}</div>`;
    if (g.extra) h += `<div class="gx-sec" style="--cat:${catVar(g.type)}"><h3>${E(g.extra.t)}</h3><ul class="gx-list">${g.extra.b.map((c) => `<li>${E(c)}</li>`).join('')}</ul></div>`;
    h += `<div class="gx-sec" id="gx-loot" style="--cat:${catVar(g.type)}"><h3>Loot</h3><div id="gx-lootbox">${lootHTML(g)}</div>${shotHTML(S.loot)}</div>`;
    if (S.rest.length) h += `<div class="gx-sec" style="--cat:${catVar(g.type)}"><h3>More maps and cheat sheets</h3>${shotHTML(S.rest)}</div>`;
    if (S.loot.length || S.rest.length || Object.keys(S.by).length) h += '<p class="gx-note">Maps and cheat sheets are community-made; the creator credit is on each image. Tap one to enlarge it.</p>';
    h += `<div class="gx-sec" style="--cat:${catVar(g.type)}"><h3>Sources</h3><ol class="gx-src">${g.src.map((s) => `<li><a href="${E(s[1])}" target="_blank" rel="noopener">${E(s[0])}</a></li>`).join('')}</ol><p class="gx-note">Every step above was checked against these sources. Where they disagreed, the guide only says what they agree on.</p></div>`;
    page.innerHTML = h;
    if (fresh) { page.classList.remove('in'); void page.offsetWidth; page.classList.add('in'); }
  }
  function show(id) {
    const hub = $('ghub'); if (hub) hub.hidden = true; page.hidden = false;
    render(id, true); window.scrollTo(0, 0); loadArt();
  }
  page.onclick = (e) => {
    const t = e.target;
    if (t.closest('#gback')) { page.hidden = true; page.classList.remove('in'); const hub = $('ghub'); if (hub) hub.hidden = false; cur = null; window.scrollTo(0, 0); return; }
    const j = t.closest('[data-jump]');
    if (j) { e.preventDefault(); const el = $(j.dataset.jump === 'chests' ? 'gx-chests' : j.dataset.jump === 'loot' ? 'gx-loot' : 'gx-e' + j.dataset.jump); if (el) el.scrollIntoView({ behavior: document.documentElement.dataset.anim === 'off' ? 'auto' : 'smooth', block: 'start' }); return; }
    const s = t.closest('.gx-shot');
    if (s) { lb.querySelector('img').src = s.dataset.full; lb.querySelector('img').alt = s.dataset.cap; lb.querySelector('p').textContent = s.dataset.cap; lb.hidden = false; }
  };

  // Old callers (Home shortcuts, Activity "guide" buttons, the featured strip) pass old guide names.
  const find = (name) => GG.find((g) => g.id === name || g.b === name || g.n === name) || GG.find((g) => norm(g.n) === norm(name) || norm(g.b) === norm(name) || g.k.some((k) => norm(k) === norm(name)));
  const newOpen = function (name) {
    const g = find(name);
    if (g) { if ($('ghub')) $('ghub').hidden = true; show(g.id); return; }
    if (oldOpen) { oldOpen(name); page.classList.remove('in'); }
  };
  try { openGuide = newOpen; } catch (e) { /* not writable */ }
  window.openGuide = newOpen;

  // ---------- Official art and loot (main process: guide:art, guide:owned) ----------
  async function loadArt() {
    if (ART.state !== 'idle' || !window.gt || !window.gt.guideArt) return;
    ART.state = 'loading';
    if (cur) { const lbx = $('gx-lootbox'), g = GG.find((x) => x.id === cur); if (lbx && g) lbx.innerHTML = lootHTML(g); }
    try {
      const r = await window.gt.guideArt(GG.map((g) => ({ n: g.id, k: g.k })));
      ART.img = (r && r.img) || {}; ART.loot = (r && r.loot) || {}; ART.state = 'done';
    } catch (e) { ART.state = 'failed'; }
    if (window.gt.guideOwned) { try { const o = await window.gt.guideOwned(); if (Array.isArray(o) && o.length) ART.own = new Set(o); } catch (e) { /* signed out */ } }
    if (!page.hidden && cur) { const y = window.scrollY; render(cur, false); window.scrollTo(0, y); }
    else draw();
  }
  draw();
  const nb = document.querySelector('nav button[data-t=guides]');
  if (nb) nb.addEventListener('click', () => setTimeout(loadArt, 400));
  if (document.querySelector('#guides.on')) setTimeout(loadArt, 800);
})();
