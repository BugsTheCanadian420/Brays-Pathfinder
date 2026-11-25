// Builds tab: the community build gallery. Players share a loadout from the Loadouts tab (Share > Share to Builds); here
// everyone can browse them by class, subclass and what they are good for, sort by popular, newest, most liked or most
// imported, like or dislike (with a Pathfinder account), and import a build into their own loadouts. Popular = likes -
// dislikes + imports / 2, counted by the token service (/builds/*, see token-service/worker.js).
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec || !window.gt || !window.gt.bdList) return;
  const gt = window.gt;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = (p) => (/^\/[\w./%-]{1,300}$/.test(String(p || '')) ? 'https://www.bungie.net' + p : '');
  const clean = (e) => String((e && e.message) || e || 'unknown error').replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '').slice(0, 220);
  const CL = ['Titan', 'Hunter', 'Warlock'];
  const ELS = [['solar', 'Solar', '#ff9a3c'], ['arc', 'Arc', '#7bd0ff'], ['void', 'Void', '#b98cff'], ['stasis', 'Stasis', '#6fa8ff'], ['strand', 'Strand', '#4ee08c'], ['prismatic', 'Prismatic', '#f08cd8']];
  const SUBN = { // what each element's subclass is called for each class
    0: { solar: 'Sunbreaker', arc: 'Striker', void: 'Sentinel', stasis: 'Behemoth', strand: 'Berserker', prismatic: 'Prismatic' },
    1: { solar: 'Gunslinger', arc: 'Arcstrider', void: 'Nightstalker', stasis: 'Revenant', strand: 'Threadrunner', prismatic: 'Prismatic' },
    2: { solar: 'Dawnblade', arc: 'Stormcaller', void: 'Voidwalker', stasis: 'Shadebinder', strand: 'Broodweaver', prismatic: 'Prismatic' },
  };
  const TAGS = [['pve', 'PvE'], ['pvp', 'PvP'], ['raid', 'Raids'], ['dungeon', 'Dungeons'], ['gm', 'Grandmasters'], ['solo', 'Solo'], ['trials', 'Trials'], ['beginner', 'Beginners']];
  const TAGN = Object.fromEntries(TAGS);
  const SORTS = [['popular', 'Popular'], ['new', 'Newest'], ['liked', 'Most liked'], ['used', 'Most imported']];
  const elOf = (k) => ELS.find((e) => e[0] === k) || ['', '', '#8e939b'];
  const ago = (t) => { const s = (Date.now() - t) / 1000; if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; if (s < 86400 * 30) return Math.round(s / 86400) + ' d ago'; return new Date(t).toLocaleDateString(); };

  const s = document.createElement('section'); s.id = 'builds'; s.className = 'gdark'; vsec.parentNode.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Builds'; b.dataset.t = 'builds';
  const after = nav.querySelector('[data-t=loadouts]'); nav.insertBefore(b, after ? after.nextSibling : null);
  b.onclick = () => { window.show('builds'); };

  const css = document.createElement('style');
  css.textContent = `
:root[data-gsec="builds"] main > #builds{max-width:none!important;margin:0!important;zoom:1!important;padding:12px 16px 28px}
#builds{color:#e6e7ea}
#builds .bdw{max-width:1360px;margin:0 auto 32px}
#builds .bdh{display:flex;flex-direction:column;gap:12px;padding:22px 24px;border:1px solid var(--g-line,#2b2e33);border-radius:16px;background:radial-gradient(60% 140% at 100% 0,color-mix(in srgb,var(--g-accent,#e8b84a) 13%,transparent),transparent 70%),var(--g-panel,#16181d)}
#builds .bdh h2{margin:0!important;padding:0!important;border:0!important;font-size:30px;line-height:1.1;color:#fff;letter-spacing:-.01em;text-transform:none}
#builds .bdh p{margin:0;color:#aeb4bd;font-size:14px;max-width:72ch}
#builds .bdrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#builds .bdseg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--g-line,#2b2e33);border-radius:12px;overflow:hidden}
#builds .bdseg button{border:0!important;border-radius:0!important;background:transparent;color:#cfd2d8;padding:8px 13px;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
#builds .bdseg button+button{border-left:1px solid var(--g-line,#2b2e33)!important}
#builds .bdseg button.on{background:color-mix(in srgb,var(--g-accent,#e8b84a) 22%,transparent);color:#fff}
#builds .bdseg i{width:9px;height:9px;border-radius:50%;display:inline-block}
#builds .bdq{flex:1 1 240px;min-width:0;height:38px;margin:0!important;border-radius:10px!important;padding:0 12px!important;box-sizing:border-box;font-size:14px}
#builds .bdrow select{width:auto!important;flex:none;height:38px;margin:0!important;border-radius:10px;padding:0 30px 0 12px;font-size:13.5px}
#builds .bdv svg{display:block;flex:none}
#builds .bdmine{flex:none;margin:0!important;height:38px;border-radius:10px;padding:0 13px;cursor:pointer}
#builds .bdmine.on{border-color:var(--g-accent,#e8b84a)!important;color:#fff}
#builds .bdst{margin:14px 2px 10px;color:#9aa0a8;font-size:13px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#builds .bdst .bderr{color:#ffb4a8}
#builds .bdg{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}
#builds .bdc{position:relative;display:flex;flex-direction:column;border:1px solid var(--g-line,#2b2e33);border-radius:14px;background:var(--g-panel,#16181d);overflow:hidden;cursor:pointer;transition:border-color .15s}
#builds .bdc:hover,#builds .bdc:focus-visible{border-color:color-mix(in srgb,var(--el) 70%,#fff 0%)}
#builds .bdc:focus-visible{outline:2px solid var(--el);outline-offset:2px}
#builds .bdtop{display:flex;align-items:center;gap:12px;padding:14px 14px 12px;background:linear-gradient(100deg,color-mix(in srgb,var(--el) 26%,transparent),transparent 75%);border-bottom:1px solid color-mix(in srgb,var(--el) 30%,var(--g-line,#2b2e33))}
#builds .bdsi{width:44px;height:44px;flex:none;border-radius:10px;background:color-mix(in srgb,var(--el) 18%,#0d0f13);display:grid;place-items:center;overflow:hidden}
#builds .bdsi img{width:40px;height:40px;display:block}
#builds .bdtt{min-width:0}
#builds .bdtt b{display:block;font-size:16px;color:#fff;line-height:1.25;overflow-wrap:anywhere}
#builds .bdtt small{display:block;margin-top:2px;font-size:12px;color:color-mix(in srgb,var(--el) 70%,#fff)}
#builds .bdbody{display:flex;flex-direction:column;gap:10px;padding:12px 14px 12px;flex:1}
#builds .bdgear{display:flex;flex-wrap:wrap;gap:6px}
#builds .bdgear span{width:44px;height:44px;border-radius:6px;overflow:hidden;border:1px solid #3a3f48;background:#0d0f13}
#builds .bdgear span.x{border-color:#e8c25a;box-shadow:0 0 0 1px rgba(232,194,90,.35)}
#builds .bdgear img{width:100%;height:100%;display:block}
#builds .bdtags{display:flex;flex-wrap:wrap;gap:5px}
#builds .bdtags em{font-style:normal;font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid var(--g-line,#2b2e33);color:#cfd2d8}
#builds .bdby{font-size:12px;color:#8e939b}
#builds .bdft{display:flex;align-items:center;gap:6px;padding:10px 12px;border-top:1px solid var(--g-line,#2b2e33)}
#builds .bdv{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border-radius:999px;font-size:13px;cursor:pointer;color:#cfd2d8;background:transparent}
#builds .bdv.on.bvu{color:#7be3a0;border-color:#3f8a5c!important;background:rgba(63,138,92,.16)}
#builds .bdv.on.bvd{color:#ffb4a8;border-color:#8a4a3f!important;background:rgba(138,74,63,.16)}
#builds .bdv[disabled]{opacity:.5;cursor:default}
#builds .bdu{font-size:12px;color:#8e939b;margin-left:4px}
#builds .bdimp{margin-left:auto;height:30px;border-radius:999px;padding:0 14px;cursor:pointer;font-weight:600}
#builds .bdmore{display:block;margin:16px auto 0;height:38px;padding:0 18px;border-radius:10px;cursor:pointer}
#builds .bdempty{padding:34px 20px;text-align:center;border:1px dashed var(--g-line,#2b2e33);border-radius:14px;color:#aeb4bd}
#builds .bdempty b{display:block;color:#fff;font-size:16px;margin-bottom:6px}
#bdm{position:fixed;inset:0;z-index:9100;background:rgba(4,6,10,.72);display:flex;align-items:flex-start;justify-content:center;padding:max(5vh,env(safe-area-inset-top)) 12px 24px;overflow:auto}
#bdm .bdmc{width:min(var(--bdw,680px),100%);border:1px solid var(--g-line,#2b2e33);border-radius:16px;background:var(--g-panel,#16181d);box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden;color:#e6e7ea}
#bdm .bdtop{display:flex;align-items:center;gap:14px;padding:18px 18px 14px;background:linear-gradient(100deg,color-mix(in srgb,var(--el) 28%,transparent),transparent 75%)}
#bdm .bdsi{width:56px;height:56px;flex:none;border-radius:12px;background:color-mix(in srgb,var(--el) 18%,#0d0f13);display:grid;place-items:center;overflow:hidden}#bdm .bdsi img{width:52px;height:52px}
#bdm h3{margin:0;font-size:22px;color:#fff;overflow-wrap:anywhere}
#bdm .bdsub{font-size:13px;color:color-mix(in srgb,var(--el) 70%,#fff);margin-top:3px}
#bdm .bdx{margin-left:auto;align-self:flex-start;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;line-height:28px;padding:0}
#bdm .bdin{padding:4px 18px 16px;display:flex;flex-direction:column;gap:12px}
#bdm .bdpic{display:block;width:100%;padding:0!important;margin:0;border:1px solid var(--g-line,#2b2e33)!important;border-radius:12px!important;overflow:hidden;background:#0c0d11;cursor:zoom-in;line-height:0}
#bdm .bdmc.big .bdpic{cursor:zoom-out}
#bdm .bdpic img{display:block;width:100%;height:auto}
#bdm .bdpic:focus-visible{outline:2px solid var(--el);outline-offset:2px}
#bdm .bdaddpic{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px dashed var(--g-line,#2b2e33);border-radius:10px;font-size:13px;color:#cfd2d8}
#bdm .bdaddpic span{flex:1 1 220px}
#bdm h4{margin:6px 0 0;font-size:11px;letter-spacing:.08em;color:#8e939b;font-weight:600}
#bdm .bdlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px}
#bdm .bdit{display:flex;align-items:center;gap:9px;font-size:13px;color:#dfe2e6;min-width:0}
#bdm .bdit span{width:38px;height:38px;flex:none;border-radius:6px;overflow:hidden;border:1px solid #3a3f48}#bdm .bdit span.x{border-color:#e8c25a}#bdm .bdit img{width:100%;height:100%;display:block}
#bdm .bdit b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bdm .bdnotes{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.55;color:#d6d9de;background:rgba(0,0,0,.18);border:1px solid var(--g-line,#2b2e33);border-radius:10px;padding:10px 12px}
#bdm .bdft{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 18px 18px;border-top:1px solid var(--g-line,#2b2e33)}
#bdm .bdmsg{flex-basis:100%;font-size:13px;color:#ffb4a8}
#bdm .bdv{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px;border-radius:999px;font-size:13.5px;cursor:pointer}
#bdm .bdv.on.bvu{color:#7be3a0;border-color:#3f8a5c!important;background:rgba(63,138,92,.16)}#bdm .bdv.on.bvd{color:#ffb4a8;border-color:#8a4a3f!important;background:rgba(138,74,63,.16)}
#bdm .bdimp{margin-left:auto;height:36px;padding:0 16px;border-radius:999px;font-weight:600;cursor:pointer}
@media (max-width:640px){#builds .bdseg{flex-wrap:nowrap;overflow-x:auto;max-width:100%;scrollbar-width:none}#builds .bdseg button{flex:none;white-space:nowrap}#builds .bdrow select{flex:1 1 40%}#builds .bdh{padding:16px}#builds .bdh h2{font-size:24px}#builds .bdg{grid-template-columns:1fr}}
`;
  document.head.appendChild(css);

  const st = { sort: 'popular', cls: '', el: '', tag: '', q: '', mine: false, p: 0, list: [], more: false, busy: false, err: '', signed: 0, loaded: false };
  const SV_UP = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11H3V10h4zM7 10l4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7"/></svg>';
  const SV_DN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="transform:scaleY(-1)"><path d="M7 10v11H3V10h4zM7 10l4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7"/></svg>';
  const subName = (x) => (x.cls >= 0 && x.cls <= 2 && SUBN[x.cls][x.el] ? SUBN[x.cls][x.el] + (x.el === 'prismatic' ? ' ' + CL[x.cls] : '') : x.sub || '');
  const gearIcons = (x, n) => [...((x.sum && x.sum.w) || []), ...(((x.sum && x.sum.a) || []).filter((q) => q.x))].slice(0, n || 5).map((q) => `<span class="${q.x ? 'x' : ''}" title="${esc(q.n)}">${img(q.i) ? `<img src="${esc(img(q.i))}" alt="${esc(q.n)}" loading="lazy">` : ''}</span>`).join('');
  const votes = (x, big) => `<button type="button" class="bdv bvu${x.vote === 1 ? ' on' : ''}" data-bv="1" data-id="${esc(x.id)}" title="${x.mine ? 'Your build' : 'I like this build'}" aria-label="Like, ${x.likes}"${x.mine ? ' disabled' : ''}>${SV_UP}${x.likes}</button><button type="button" class="bdv bvd${x.vote === -1 ? ' on' : ''}" data-bv="-1" data-id="${esc(x.id)}" title="${x.mine ? 'Your build' : 'Not for me'}" aria-label="Dislike, ${x.dislikes}"${x.mine ? ' disabled' : ''}>${SV_DN}${x.dislikes}</button>${big ? '' : `<span class="bdu" title="Times it was added to someone's loadouts">${x.uses} import${x.uses === 1 ? '' : 's'}</span>`}`;
  const card = (x) => {
    const e = elOf(x.el), si = img(x.sum && x.sum.si);
    return `<article class="bdc" tabindex="0" data-open="${esc(x.id)}" style="--el:${e[2]}" aria-label="${esc(x.title)}"><div class="bdtop"><div class="bdsi">${si ? `<img src="${esc(si)}" alt="" loading="lazy">` : ''}</div><div class="bdtt"><b>${esc(x.title)}</b><small>${esc([CL[x.cls], subName(x)].filter(Boolean).join(' · '))}</small></div></div>
<div class="bdbody"><div class="bdgear">${gearIcons(x)}</div>${x.tags.length ? `<div class="bdtags">${x.tags.map((t) => `<em>${esc(TAGN[t] || t)}</em>`).join('')}</div>` : ''}<div class="bdby">by ${esc(x.by)} · ${esc(ago(x.at))}${x.mine ? ' · your build' : ''}</div></div>
<div class="bdft">${votes(x)}<button type="button" class="bdimp b" data-imp="${esc(x.id)}">Import</button></div></article>`;
  };
  const elSeg = () => {
    const nm = (k, l) => (st.cls !== '' && SUBN[st.cls][k] ? SUBN[st.cls][k] : l);
    return `<div class="bdseg" role="group" aria-label="Subclass"><button type="button" data-el="" class="${st.el ? '' : 'on'}">All subclasses</button>${ELS.map(([k, l, c]) => `<button type="button" data-el="${k}" class="${st.el === k ? 'on' : ''}"><i style="background:${c}"></i>${esc(nm(k, l))}</button>`).join('')}</div>`;
  };
  function draw() {
    const qf = document.activeElement && document.activeElement.id === 'bdq';
    s.innerHTML = `<div class="bdw"><div class="bdh"><div><h2>Builds</h2><p>Builds from the Pathfinder community. Import one straight into your loadouts, and like the ones that work. Share your own from Loadouts: open a loadout's Share menu and pick Share to Builds.</p></div>
<div class="bdrow"><div class="bdseg" role="group" aria-label="Class"><button type="button" data-cls="" class="${st.cls === '' ? 'on' : ''}">All classes</button>${CL.map((c, i) => `<button type="button" data-cls="${i}" class="${st.cls === i ? 'on' : ''}">${c}</button>`).join('')}</div>${elSeg()}</div>
<div class="bdrow"><input id="bdq" class="bdq" type="search" placeholder="Search builds, exotics, weapons or players" value="${esc(st.q)}" aria-label="Search builds" autocomplete="off" spellcheck="false"><select id="bdtag" aria-label="Good for"><option value="">Good for anything</option>${TAGS.map(([k, l]) => `<option value="${k}"${st.tag === k ? ' selected' : ''}>${l}</option>`).join('')}</select><select id="bdsort" aria-label="Sort">${SORTS.map(([k, l]) => `<option value="${k}"${st.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select><button type="button" class="bdmine${st.mine ? ' on' : ''}" data-mine="1" aria-pressed="${st.mine}">My builds</button></div></div>
<div class="bdst" aria-live="polite">${st.err ? `<span class="bderr">${esc(st.err)}</span>` : st.busy && !st.list.length ? 'Loading builds...' : st.loaded ? `${st.list.length}${st.more ? '+' : ''} build${st.list.length === 1 ? '' : 's'}` : ''}</div>
${st.loaded && !st.list.length && !st.err ? `<div class="bdempty"><b>${st.mine ? 'You have not shared a build yet' : st.cls !== '' || st.el || st.tag || st.q ? 'No builds match' : 'No builds yet'}</b>${st.cls !== '' || st.el || st.tag || st.q ? 'Try fewer filters, or be the first to share one like it.' : 'Be the first: in Loadouts, open a loadout’s Share menu and pick Share to Builds.'}<p><button type="button" class="b" data-golo="1">Go to Loadouts</button></p></div>` : `<div class="bdg">${st.list.map(card).join('')}</div>`}
${st.more ? `<button type="button" class="bdmore" data-more="1"${st.busy ? ' disabled' : ''}>${st.busy ? 'Loading...' : 'Show more builds'}</button>` : ''}</div>`;
    if (qf) { const q = document.getElementById('bdq'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  }
  let seq = 0;
  async function load(append) {
    const my = ++seq; st.busy = true; st.err = ''; if (!append) st.p = 0; draw();
    try {
      const r = await gt.bdList({ sort: st.sort, cls: st.cls === '' ? '' : st.cls, el: st.el, tag: st.tag, q: st.q, mine: st.mine, p: st.p });
      if (my !== seq) return;
      st.list = append ? st.list.concat(r.builds || []) : r.builds || []; st.more = !!r.more; st.signed = r.signed || 0;
    } catch (er) { if (my !== seq) return; st.err = clean(er); if (!append) st.list = []; st.more = false; }
    st.busy = false; st.loaded = true; draw();
  }
  const byId = (id) => st.list.find((x) => x.id === id);
  async function vote(id, v, el) {
    const x = byId(id) || (OPEN && OPEN.id === id ? OPEN : null); if (!x || x.mine) return;
    const nv = x.vote === v ? 0 : v;
    try {
      const r = await gt.bdVote({ id, v: nv });
      [byId(id), OPEN && OPEN.id === id ? OPEN : null].forEach((o) => { if (o) Object.assign(o, { vote: nv, likes: r.likes, dislikes: r.dislikes, uses: r.uses }); });
      draw(); if (OPEN && OPEN.id === id) drawOpen();
    } catch (er) { const m = clean(er); if (OPEN && OPEN.id === id) { OPEN.msg = m; drawOpen(); } else { st.err = m; draw(); } }
  }
  async function imp(id) {
    try {
      const full = await gt.bdGet({ id });
      if (!window.__gtlo || !window.__gtlo.openBuild) throw new Error('Open the Loadouts tab once, then try again.');
      closeOpen(); window.__gtlo.openBuild(full.code, { id: full.id, title: full.title, by: full.by });
    } catch (er) { const m = clean(er); if (OPEN) { OPEN.msg = m; drawOpen(); } else { st.err = m; draw(); } }
  }

  // ---- one build, bigger: everything in it, how to play it, vote, import ----
  let OPEN = null;
  const closeOpen = () => { OPEN = null; const m = document.getElementById('bdm'); if (m) m.remove(); };
  function drawOpen() {
    if (!OPEN) return; let m = document.getElementById('bdm');
    if (!m) { m = document.createElement('div'); m.id = 'bdm'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); m.onclick = openClick; }
    const x = OPEN, e = elOf(x.el), si = img(x.sum && x.sum.si), it = (q) => `<div class="bdit"><span class="${q.x ? 'x' : ''}">${img(q.i) ? `<img src="${esc(img(q.i))}" alt="">` : ''}</span><b title="${esc(q.n)}">${esc(q.n)}</b></div>`;
    m.innerHTML = `<div class="bdmc${x.big ? ' big' : ''}" style="--el:${e[2]};--bdw:${x.img ? (x.big ? '1240px' : '860px') : '680px'}"><div class="bdtop"><div class="bdsi">${si ? `<img src="${esc(si)}" alt="">` : ''}</div><div><h3>${esc(x.title)}</h3><div class="bdsub">${esc([CL[x.cls], subName(x)].filter(Boolean).join(' · '))} · by ${esc(x.by)} · ${esc(ago(x.at))}</div></div><button type="button" class="bdx g" data-bx="1" aria-label="Close">&times;</button></div>
<div class="bdin">${x.tags.length ? `<div class="bdtags" style="display:flex;gap:5px;flex-wrap:wrap">${x.tags.map((t) => `<em style="font-style:normal;font-size:12px;padding:2px 9px;border-radius:999px;border:1px solid var(--g-line,#2b2e33)">${esc(TAGN[t] || t)}</em>`).join('')}</div>` : ''}
${x.img ? `<button type="button" class="bdpic" data-bzoom="1" title="${x.big ? 'Make smaller' : 'Show bigger'}" aria-label="Loadout picture, ${x.big ? 'make smaller' : 'show bigger'}"><img src="${esc(x.img)}" alt="The loadout: weapons, stats, armor, subclass and artifact"></button>` : !x.full ? '' : `${x.mine && window.__gtlo && window.__gtlo.buildPic ? `<div class="bdaddpic"><span>Builds now show the full loadout picture. Add one to this build.</span><button type="button" class="b" data-bpic="1"${x.picBusy ? ' disabled' : ''}>${x.picBusy ? 'Making the picture...' : 'Add picture'}</button></div>` : ''}${x.sum && x.sum.w && x.sum.w.length ? `<h4>WEAPONS</h4><div class="bdlist">${x.sum.w.map(it).join('')}</div>` : ''}${x.sum && x.sum.a && x.sum.a.length ? `<h4>ARMOR</h4><div class="bdlist">${x.sum.a.map(it).join('')}</div>` : ''}`}
${x.notes ? `<h4>HOW TO PLAY IT</h4><div class="bdnotes">${esc(x.notes)}</div>` : x.full ? '' : '<p class="mute">Loading...</p>'}</div>
<div class="bdft">${votes(x, true)}<span class="bdu" style="font-size:12.5px;color:#8e939b">${x.uses} import${x.uses === 1 ? '' : 's'}</span>${x.mine || x.staff ? `<button type="button" class="g" data-bdel="${esc(x.id)}">${x.mine ? 'Delete my build' : 'Take down'}</button>` : ''}<button type="button" class="b bdimp" data-imp="${esc(x.id)}">Import to my loadouts</button>${x.msg ? `<div class="bdmsg">${esc(x.msg)}</div>` : ''}</div></div>`;
  }
  async function open(id) {
    const x = byId(id); if (!x) return;
    OPEN = { ...x, notes: '', full: false, msg: '' }; drawOpen();
    try { const full = await gt.bdGet({ id }); if (OPEN && OPEN.id === id) { Object.assign(OPEN, full, { full: true }); drawOpen(); } } catch (er) { if (OPEN && OPEN.id === id) { OPEN.msg = clean(er); OPEN.full = true; drawOpen(); } }
  }
  async function openClick(e) {
    if (e.target.id === 'bdm' || e.target.closest('[data-bx]')) { closeOpen(); return; }
    const v = e.target.closest('[data-bv]'); if (v) { vote(v.dataset.id, +v.dataset.bv, v); return; }
    const i = e.target.closest('[data-imp]'); if (i) { imp(i.dataset.imp); return; }
    if (e.target.closest('[data-bzoom]') && OPEN) { OPEN.big = !OPEN.big; drawOpen(); return; }
    if (e.target.closest('[data-bpic]') && OPEN && !OPEN.picBusy) {
      const o = OPEN; o.picBusy = true; o.msg = ''; drawOpen();
      try {
        const img = await window.__gtlo.buildPic(o.code, o.title);
        if (!img) throw new Error('The picture could not be made. Open the Loadouts tab once so your gear is loaded, then try again.');
        await gt.bdPic({ id: o.id, img }); o.img = img;
      } catch (er) { o.msg = clean(er); }
      o.picBusy = false; if (OPEN === o) drawOpen(); return;
    }
    const d = e.target.closest('[data-bdel]');
    if (d && OPEN) {
      if (!OPEN.sure) { OPEN.sure = true; OPEN.msg = 'Click again to ' + (OPEN.mine ? 'delete it for good.' : 'take it down.'); drawOpen(); return; }
      try { await gt.bdDel({ id: OPEN.id }); st.list = st.list.filter((x) => x.id !== OPEN.id); closeOpen(); draw(); } catch (er) { OPEN.msg = clean(er); drawOpen(); }
    }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && OPEN) closeOpen(); });
  new MutationObserver(() => { if (OPEN && document.documentElement.dataset.gsec !== 'builds') closeOpen(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-gsec'] });

  // ---- the tab's own controls ----
  s.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cls]'); if (c) { st.cls = c.dataset.cls === '' ? '' : +c.dataset.cls; load(); return; }
    const el = e.target.closest('[data-el]'); if (el) { st.el = el.dataset.el; load(); return; }
    if (e.target.closest('[data-mine]')) { st.mine = !st.mine; load(); return; }
    if (e.target.closest('[data-more]')) { st.p++; load(true); return; }
    if (e.target.closest('[data-golo]')) { window.show('loadouts'); return; }
    const v = e.target.closest('[data-bv]'); if (v) { e.stopPropagation(); vote(v.dataset.id, +v.dataset.bv, v); return; }
    const i = e.target.closest('[data-imp]'); if (i) { e.stopPropagation(); imp(i.dataset.imp); return; }
    const o = e.target.closest('[data-open]'); if (o) open(o.dataset.open);
  });
  s.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.bdc')) { e.preventDefault(); open(e.target.dataset.open); } });
  s.addEventListener('change', (e) => { if (e.target.id === 'bdtag') { st.tag = e.target.value; load(); } else if (e.target.id === 'bdsort') { st.sort = e.target.value; load(); } });
  let qt = 0; s.addEventListener('input', (e) => { if (e.target.id === 'bdq') { st.q = e.target.value; clearTimeout(qt); qt = setTimeout(() => load(), 300); } });

  window.__gtBuilds = { refresh: () => { if (st.loaded) load(); } };
  new MutationObserver(() => { if (s.classList.contains('on') && !st.loaded && !st.busy) load(); }).observe(s, { attributes: true, attributeFilter: ['class'] });
  if (s.classList.contains('on')) load(); else draw();
})();
