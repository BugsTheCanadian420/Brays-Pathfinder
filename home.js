/* global openGuide, GD */
// Home: one page with what matters right now (characters, resets, play time, inventory) plus anything you pinned
// with "+ Home" elsewhere in the app: vendors, items, loadouts, activity pages, Hub sites and guides.
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec || !window.gt) return;
  const V = () => window.__gtv || {}, A = () => window.__gta || {};
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off */ } };
  const num = (n) => Number(n || 0).toLocaleString('en-US');
  const img = (p) => { p = String(p || ''); return /^\/[\w./%-]*$/.test(p) ? 'https://www.bungie.net' + p : ''; };
  const clean = (e) => String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, '');

  // ---------- pins ("+ Home" buttons anywhere in the app) ----------
  // New installs start with these three on Home; after that the list is whatever you pin and unpin.
  const DEF_PINS = [{ t: 'act', id: 'clr', n: 'Raids and dungeons' }, { t: 'act', id: 'rec', n: 'Recap' }, { t: 'act', id: 'pb', n: 'Personal bests' }];
  const PINS = () => { const a = lsGet('gt.home.pins', null) || DEF_PINS; return Array.isArray(a) ? a.filter((p) => p && p.t && p.id !== undefined) : []; };
  const has = (t, id) => PINS().some((p) => p.t === t && String(p.id) === String(id));
  const PIN_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5"/></svg>';
  function btn(t, id, label, kind) {
    const on = has(t, id), tip = on ? 'On your Home page. Click to remove it.' : 'Add this to your Home page';
    if (kind === 'side') return `<button class="${on ? 'on' : ''}" data-hpin="${esc(t)}" data-hid="${esc(id)}" data-hn="${esc(label || '')}" title="${tip}"><span class="ic">${PIN_SVG}</span><span class="lbl">${on ? 'On Home' : 'Add to Home'}</span></button>`;
    return `<button class="g hmpin${on ? ' on' : ''}" data-hpin="${esc(t)}" data-hid="${esc(id)}" data-hn="${esc(label || '')}" title="${tip}">${PIN_SVG}<span>${on ? 'On Home' : '+ Home'}</span></button>`;
  }
  function toggle(t, id, label) {
    let a = PINS();
    if (a.some((p) => p.t === t && String(p.id) === String(id))) a = a.filter((p) => !(p.t === t && String(p.id) === String(id)));
    else a.push({ t, id: String(id), n: String(label || '').slice(0, 80), at: Date.now() });
    lsSet('gt.home.pins', a.slice(-40));
  }
  window.__gth = { btn, has, toggle };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-hpin]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    toggle(b.dataset.hpin, b.dataset.hid, b.dataset.hn);
    const on = has(b.dataset.hpin, b.dataset.hid);
    document.querySelectorAll(`[data-hpin="${CSS.escape(b.dataset.hpin)}"][data-hid="${CSS.escape(b.dataset.hid)}"]`).forEach((x) => {
      x.classList.toggle('on', on); x.title = on ? 'On your Home page. Click to remove it.' : 'Add this to your Home page';
      const l = x.querySelector('.lbl') || x.querySelector('span:last-child'); if (l) l.textContent = x.querySelector('.lbl') ? (on ? 'On Home' : 'Add to Home') : (on ? 'On Home' : '+ Home');
    });
    if (s.classList.contains('on')) draw();
  }, true);

  const s = document.createElement('section'); s.id = 'home'; s.className = 'gdark'; vsec.parentNode.insertBefore(s, vsec);
  const b = document.createElement('button'); b.textContent = 'Home'; b.dataset.t = 'home'; nav.insertBefore(b, nav.firstChild);

  const ICON = {
    clock: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8.5"/>', star: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    tag: '<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.3"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>', pin: '<path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    shop: '<path d="M4 9h16l-1.5 11h-13zM8 9V7a4 4 0 0 1 8 0v2"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  };
  const ic = (k) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ICON.pin}</svg>`;

  const css = document.createElement('style');
  css.textContent = `
:root[data-gsec="home"] main > #home{max-width:none!important;margin:0!important;zoom:1!important;padding:12px 16px 24px}
#home .hm-g{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}
#home .hm-c{grid-column:span 4;position:relative;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,0) 60px),var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:6px;padding:14px 16px;cursor:pointer;overflow:hidden;min-height:150px;transition:border-color .15s,transform .15s,box-shadow .15s}
#home .hm-c::before{content:'';position:absolute;left:0;top:0;right:0;height:2px;background:var(--hc,var(--g-accent,#6aa6e0));opacity:.85}
#home .hm-c:hover{border-color:rgba(255,255,255,.28);transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.35)}
#home .hm-c.w12{grid-column:span 12}#home .hm-c.w6{grid-column:span 6}#home .hm-c.w8{grid-column:span 8}#home .hm-c.w3{grid-column:span 3}#home .hm-c.w4{grid-column:span 4}
#home .hm-h{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:11.5px;letter-spacing:2.5px;text-transform:uppercase;color:#aeb2b9;font-weight:600}
#home .hm-h svg{color:var(--hc,var(--g-accent,#6aa6e0))}
#home .hm-h .ct{margin-left:auto;letter-spacing:0;text-transform:none;color:#8b8f97;font-weight:400;font-size:12px}
#home .hm-h .x{margin-left:6px;background:none;border:0;color:#7c7f86;cursor:pointer;font-size:16px;padding:0 4px;line-height:1}#home .hm-h .x:hover{color:#fff}
#home .hm-big{font-size:30px;color:#fff;line-height:1.1;font-weight:600;font-variant-numeric:tabular-nums}
#home .hm-big small{font-size:13px;color:#9aa0a8;font-weight:400;letter-spacing:.5px}
#home .hm-sub{color:#9aa0a8;font-size:12.5px;margin-top:4px}
#home .hm-tb{display:flex;height:10px;border-radius:3px;overflow:hidden;background:#2b2e33;margin-top:10px;gap:2px}#home .hm-tb i{display:block;height:100%;min-width:2px}
#home .hm-tl{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:12px;color:#cfd2d8}#home .hm-tl i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;vertical-align:-1px}
#home .hm-kv{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:#9aa0a8;margin-top:8px;border-top:1px solid #2b2e33;padding-top:6px}#home .hm-kv b{color:#fff;font-weight:600}
#home .hm-bar{height:6px;background:#2b2e33;border-radius:3px;overflow:hidden;margin-top:8px}#home .hm-bar i{display:block;height:100%;background:var(--hc,#6aa6e0);border-radius:3px}
#home .hm-row{display:flex;gap:10px;align-items:center;margin-top:8px;min-width:0}
#home .hm-row>img{width:40px;height:40px;border:1px solid #3a3d43;flex:none;background:#0d0f12;border-radius:2px}
#home .hm-row b{color:#fff;font-weight:600;font-size:13.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#home .hm-row span{color:#9aa0a8;font-size:12px}
#home .hm-row .r{margin-left:auto;text-align:right;flex:none}
#home .hm-row>div{min-width:0}
#home .hm-row.lnk{margin:6px -8px 0;padding:3px 8px;border-radius:4px;transition:background .12s}#home .hm-row.lnk:hover{background:rgba(255,255,255,.07)}#home .hm-row.lnk:hover b{color:var(--g-accent,#fff)}
#home .hm-rs{display:flex;flex-direction:column;gap:10px}
#home .hm-rs .rs b{display:flex;justify-content:space-between;color:#fff;font-size:17px;font-variant-numeric:tabular-nums;font-weight:600}
#home .hm-rs .hm-when{display:block;color:#7c7f86;font-size:11.5px;margin-top:3px}#home .hm-rs .rs b span{color:#9aa0a8;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;align-self:center}
#home .hm-chs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
#home .hm-ch{position:relative;background:#111316 center/cover no-repeat;border:1px solid #2b2e33;border-radius:4px;padding:14px 16px;min-height:92px;display:flex;flex-direction:column;justify-content:flex-end}
#home .hm-ch b{color:#fff;font-size:20px;text-shadow:0 1px 4px #000;display:flex;align-items:baseline;gap:10px}
#home .hm-ch b span{color:#e5c158;font-size:22px;margin-left:auto}
#home .hm-ch small{display:block;color:#ddd;font-size:12px;margin-top:2px;text-shadow:0 1px 3px #000}
#home .hm-ch .pm{height:4px;background:rgba(0,0,0,.5);border-radius:2px;margin-top:8px;overflow:hidden}#home .hm-ch .pm i{display:block;height:100%;background:#6aa6e0}
#home .hm-ch .hm-pt{color:#cfe3ff;font-weight:600;letter-spacing:.3px}
#home .hm-ch.warn .pm i{background:#e8a53a}#home .hm-ch.warn small{color:#f3c27a}
#home .hm-hd{display:flex;align-items:center;gap:12px;margin:0 0 12px}
#home .hm-hd h2{margin:0;font-size:16px;letter-spacing:3px;text-transform:uppercase;color:#fff;font-weight:600}
#home .hm-hd label{margin-left:auto;color:#9aa0a8;font-size:12.5px;display:flex;align-items:center;gap:6px}
#home .hm-hd label input{width:auto;margin:0}
#home .hm-hd button{padding:4px 10px}
#home .hm-sec{grid-column:1/-1;display:flex;align-items:center;gap:10px;margin:8px 0 -2px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8;font-weight:600}
#home .hm-sec::after{content:'';flex:1;height:1px;background:var(--g-line,#2b2e33)}
#home .gob{display:grid;grid-template-columns:minmax(0,1fr) 70px auto;gap:6px;align-items:center;font-size:11.5px;color:#b9bec6;margin-top:2px}
#home .gob span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#home .gob i{height:5px;background:#2c2f34;border-radius:3px;overflow:hidden}#home .gob i b{display:block;height:100%;background:#5d93c9}
#home .hm-tiles{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}#home .hm-tiles img{width:44px;height:44px;border:1px solid #3a3d43;border-radius:2px;background:#0d0f12}#home .hm-tiles img.w1{border-color:#4caf50;box-shadow:0 0 0 1px #4caf50}
#home .hm-empty{grid-column:1/-1;border:1px dashed #3a3d43;border-radius:6px;padding:18px;color:#9aa0a8;font-size:13px;text-align:center}
#home .hm-c[data-go]:not([data-go='']){padding-bottom:30px}#home .hm-c .go{position:absolute;right:12px;bottom:9px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#7c7f86}
#home .hm-c:hover .go{color:#cfd2d8}
#home .hm-c .apply{margin-top:10px;padding:4px 12px}
.hmpin{display:inline-flex!important;align-items:center;gap:5px;padding:3px 9px!important;font-size:11.5px!important;letter-spacing:.5px!important;text-transform:none!important;white-space:nowrap}
.hmpin.on{color:#e5c158!important;border-color:#8a6a2a!important}
@media (max-width:1250px){#home .hm-c,#home .hm-c.w3,#home .hm-c.w4{grid-column:span 6}#home .hm-c.w8{grid-column:span 12}}
@media (max-width:760px){#home .hm-g{grid-template-columns:1fr}#home .hm-c,#home .hm-c.w3,#home .hm-c.w6,#home .hm-c.w8,#home .hm-c.w12{grid-column:1/-1}#home .hm-chs{grid-template-columns:1fr}}
`;
  document.head.appendChild(css);

  const H = { err: {}, act: {}, ven: {} };
  let busy = false;
  const rsF = () => {
    const L = typeof lastReset === 'function' ? lastReset : null; if (!L) return null;
    const n = Date.now(), d = L(false) + 864e5, w = L(true) + 6048e5, fri = L(true) + 3 * 864e5;
    return { n, d, w, fri };
  };
  const rs = (k) => {
    const f = typeof fmt === 'function' ? fmt : null, r = rsF(); if (!f || !r) return '';
    return k === 'd' ? f(r.d - r.n) : k === 'w' ? f(r.w - r.n) : r.n >= r.fri ? f(r.w - r.n) : f(r.fri - r.n);
  };
  const rsPct = (k) => { const r = rsF(); if (!r) return 0; return k === 'd' ? 1 - (r.d - r.n) / 864e5 : k === 'w' ? 1 - (r.w - r.n) / 6048e5 : r.n >= r.fri ? 1 - (r.w - r.n) / (4 * 864e5) : 1 - (r.fri - r.n) / (3 * 864e5); };
  setInterval(() => { if (!s.classList.contains('on')) return; s.querySelectorAll('[data-hrs]').forEach((n) => { n.textContent = rs(n.dataset.hrs); }); s.querySelectorAll('[data-rsp]').forEach((n) => { n.style.width = Math.round(rsPct(n.dataset.rsp) * 100) + '%'; }); }, 1000);

  const card = (o, inner) => `<div class="hm-c ${o.w || ''}" style="--hc:${o.c || 'var(--g-accent,#6aa6e0)'}" data-go="${esc(o.go || '')}"${o.pin ? ` data-pt="${esc(o.pin.t)}" data-pid="${esc(o.pin.id)}"` : ''}><div class="hm-h">${ic(o.i)}<span>${o.h}</span>${o.ct ? `<span class="ct">${o.ct}</span>` : ''}${o.pin ? `<button class="x" data-unpin="1" title="Remove from Home">&times;</button>` : ''}</div>${inner}${o.go ? '<span class="go">Open &rsaquo;</span>' : ''}</div>`;
  const msgSub = (k, t) => `<div class="hm-sub">${H.err[k] ? esc(H.err[k]) : t || 'Loading...'}</div>`;

  function charsCard(D) {
    const CL = (V().CL && V().CL()) || [], cs = (V().chars && V().chars()) || D.chars || [], thr = lsGet('gt.pmwarn', 18);
    return card({ w: 'w12', i: 'user', h: 'Characters', go: 'vault', c: '#e5c158' }, `<div class="hm-chs">${cs.map((c) => {
      const pm = D.items.filter((x) => x.loc === c.id && x.pm).length, warn = thr > 0 && pm >= thr;
      return `<div class="hm-ch${warn ? ' warn' : ''}" style="${c.em ? `background-image:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.12)),url('${esc(img(c.em))}')` : ''}"><b>${esc(CL[c.cls] || 'Guardian')}<span>&#9670; ${num(c.light)}</span></b><small>${c.tt ? esc(c.tt) + ' &middot; ' : ''}Postmaster ${pm}/21${warn ? ' (almost full)' : ''}</small>${ptRow(c.id) ? `<small class="hm-pt">${esc(hm(ptRow(c.id).act))} active</small>` : ''}<div class="pm"><i style="width:${Math.round(pm / 21 * 100)}%"></i></div></div>`;
    }).join('')}</div>`);
  }
  // Each reset with its countdown and the local day and time it happens. On Mondays the daily and weekly resets are the same moment
  // (and Xûr leaves then too), so the card says so instead of showing three identical timers with no explanation.
  const resetsCard = () => {
    const r = rsF(), when = (t) => new Date(t).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    const same = r && r.d === r.w, here = r && r.n >= r.fri;
    const rows = [['d', same ? 'Daily + weekly' : 'Daily', r ? when(r.d) : ''], ...(same ? [] : [['w', 'Weekly', r ? when(r.w) : '']]), ['x', here ? 'X&ucirc;r leaves' : 'X&ucirc;r arrives', r ? when(here ? r.w : r.fri) + (here && same ? ' (with the reset)' : '') : '']];
    return card({ w: 'w4', i: 'clock', h: 'Resets', go: 'activity:rot', c: '#7fb6e8' }, `<div class="hm-rs">${rows.map(([k, l, w]) => `<div class="rs"><b><em data-hrs="${k}" style="font-style:normal">${esc(rs(k))}</em><span>${l}</span></b><div class="hm-bar"><i data-rsp="${k === 'd' && same ? 'w' : k}" style="width:${Math.round(rsPct(k === 'd' && same ? 'w' : k) * 100)}%"></i></div><small class="hm-when">${esc(w)}</small></div>`).join('')}</div>`);
  };
  // Play time, as Time Wasted on Destiny counts it: active time is time inside activities; AFK and idle (orbit, menus, loading, AFK) is left out.
  const PT_COL = ['#5b9bd5', '#6cc07a', '#e3a33b', '#b07fe0', '#e8706a', '#46c2b8', '#c9b458', '#8f96a0', '#7d8be0']; // the same colours, in the same order, as Activity > Play time
  const hm = (s) => num(Math.floor(s / 3600)) + 'h ' + String(Math.floor((s % 3600) / 60)).padStart(2, '0') + 'm';
  const ptData = () => H.time || H.act.time || null;
  const ptRow = (id) => { const r = ptData(); return r && r.rows ? r.rows.find((q) => q.id === id) : null; };
  function ptBody() {
    const r = ptData();
    if (!r) return msgSub('time');
    const types = (r.types || []).slice().sort((a, b) => b.s - a.s), den = Math.max(r.acts || 0, types.reduce((t, q) => t + q.s, 0)) || 1, pc = (v) => Math.round(v / den * 100) + '%';
    return `<div class="hm-big">${esc(hm(r.acts))} <small>active time</small></div>${types.length ? `<div class="hm-tb">${types.map((q, i) => `<i title="${esc(q.n + ' ' + pc(q.s))}" style="width:${(q.s / den * 100).toFixed(2)}%;background:${PT_COL[i % PT_COL.length]}"></i>`).join('')}</div><div class="hm-tl">${types.slice(0, 4).map((q, i) => `<span><i style="background:${PT_COL[i % PT_COL.length]}"></i>${esc(q.n)} ${pc(q.s)}</span>`).join('')}</div>` : ''}<div class="hm-kv"><span>AFK and idle (not counted)</span><b>${esc(hm(r.idle))}</b></div><div class="hm-kv"><span>Platform total</span><b>${esc(hm(r.total))}</b></div>`;
  }
  const timeCard = () => card({ w: 'w4', i: 'clock', h: 'Play time', go: 'activity:time', c: '#7fb6e8' }, ptBody());
  function invCard(D) {
    const vault = D.items.filter((x) => x.loc === 'vault' && !x.pm).length, cap = 1300; // same vault size the Inventory page shows
    return card({ w: 'w4', i: 'box', h: 'Inventory', go: 'vault', c: '#6fbf73' }, `<div class="hm-big">${num(vault)} <small>items in the vault</small></div><div class="hm-bar"><i style="width:${Math.min(100, Math.round(vault / cap * 100))}%"></i></div><div class="hm-sub">${num(vault)} of ${num(cap)} vault slots used</div>`);
  }

  // ---------- pinned cards ----------
  const ACT = { cru: ['Crucible', 'flag'], rot: ['Rotations', 'cal'], bnt: ['Bounties', 'flag'], xur: ['X&ucirc;r', 'shop'], clr: ['Raids and dungeons', 'star'], pb: ['Personal bests', 'star'], rec: ['Recap', 'clock'], time: ['Play time', 'clock'], wep: ['Weapon stats', 'tag'] };
  function actBody(k) {
    const r = H.act[k]; if (!r) return `<div class="hm-sub">${H.err['a' + k] ? esc(H.err['a' + k]) : 'Loading...'}</div>`;
    const row = (i, t, sub, right) => `<div class="hm-row">${i ? `<img src="${esc(img(i))}" alt="" loading="lazy">` : ''}<div style="flex:1"><b>${esc(t)}</b>${sub ? `<span>${sub}</span>` : ''}</div>${right ? `<span class="r">${right}</span>` : ''}</div>`;
    if (k === 'rot') { const l = r.feat || []; return l.length ? l.slice(0, 4).map((x) => row(x.img, x.n, esc(x.k || '') + ' this week')).join('') : '<div class="hm-sub">No featured activities listed yet.</div>'; }
    if (k === 'bnt') { const l = r.bounties || [], done = l.filter((a) => a.obj.length && a.obj.every((o) => o.c)).length; return `<div class="hm-big">${done}/${l.length} <small>bounties complete</small></div>` + l.filter((a) => !(a.obj.length && a.obj.every((o) => o.c))).slice(0, 3).map((a) => row(a.i, a.n, '')).join(''); }
    if (k === 'xur') { const v = r.vendors || []; return v.length ? v.map((x) => row('', x.n, x.where === 'dares' ? 'Dares of Eternity' : 'Tower')).join('') : '<div class="hm-sub">X&ucirc;r is not around right now.</div>'; }
    if (k === 'clr') { const l = (r.rows || []).slice().sort((a, b) => b.c - a.c).slice(0, 4); return l.map((x) => row(x.img, x.n, x.t === 'raid' ? 'Raid' : 'Dungeon', num(x.c) + ' clears').replace('<div class="hm-row">', `<div class="hm-row lnk" data-go="${esc('activity:clr:' + x.t + '|' + x.n)}" title="See every run">`)).join('') || '<div class="hm-sub">No clears yet.</div>'; }
    if (k === 'pb') { return (r.rows || []).slice(0, 4).map((x) => row(x.img, x.label, esc(x.n), esc(x.txt))).join('') || '<div class="hm-sub">No records yet.</div>'; }
    if (k === 'rec') { const day = (r.acts || []).filter((a) => Date.now() - a.at < 864e5), kills = day.reduce((t, a) => t + (a.k || 0), 0); return `<div class="hm-big">${day.length} <small>activities in 24h</small></div><div class="hm-sub">${num(kills)} kills</div>` + (r.acts || []).slice(0, 2).map((a) => row(a.img, a.n, a.ok ? 'Completed' : '')).join(''); }
    if (k === 'cru') { const T = r.total || {}; return `<div class="hm-big">${T.m ? (Math.round(T.kd * 100) / 100).toFixed(2) : '-'} <small>K/D</small></div><div class="hm-sub">${num(T.m || 0)} matches &middot; ${T.m ? Math.round(T.wr * 100) : 0}% wins &middot; KDA ${T.m ? (Math.round(T.kda * 100) / 100).toFixed(2) : '-'}</div>` + (r.recent || []).slice(0, 3).map((a) => row(a.img, a.n, (a.w === 1 ? 'Victory' : a.w === 0 ? 'Defeat' : '') + ' &middot; ' + esc(a.mode), a.k + '/' + a.d + '/' + a.a)).join(''); }
    if (k === 'time') return ptBody();
    if (k === 'wep') { return (r.weapons || []).slice().sort((a, b) => b.k - a.k).slice(0, 4).map((w) => row(w.i, w.n, esc(w.t || ''), num(w.k) + ' kills')).join('') || '<div class="hm-sub">No weapon stats yet.</div>'; }
    return '';
  }
  function pinCard(p, D) {
    const pin = { t: p.t, id: p.id };
    if (p.t === 'act' && p.id === 'week') return ''; // the old This week pin (that page is gone)
    if (p.t === 'act' && p.id === 'deal') return ''; // the old Vendor deals pin (that page is gone)
    if (p.t === 'act' && ACT[p.id]) return card({ i: ACT[p.id][1], h: ACT[p.id][0], go: 'activity:' + p.id, pin, c: '#9fc4ee' }, actBody(p.id));
    if (p.t === 'vendor') {
      const r = H.ven[p.id], items = r && r.items ? r.items : null, W = A().wishOf;
      const tiles = items ? items.filter((x) => x.i).slice(0, 16).map((x, i) => { const w = W ? W(x, i) : { v: 0 }; return `<img src="${esc(img(x.i))}" alt="" title="${esc(x.n)}" loading="lazy"${w.v === 1 ? ' class="w1"' : ''}>`; }).join('') : '';
      return card({ i: 'shop', h: esc(p.n || (r && r.name) || 'Vendor'), ct: items ? items.length + ' item' + (items.length === 1 ? '' : 's') : '', go: 'vendor:' + p.id, pin, c: '#e5c158' }, items ? (items.length ? `<div class="hm-tiles">${tiles}</div>` : '<div class="hm-sub">Not selling anything right now.</div>') : `<div class="hm-sub">${H.err['v' + p.id] ? esc(H.err['v' + p.id]) : 'Loading...'}</div>`);
    }
    if (p.t === 'item') {
      const x = V().byId ? V().byId(p.id) : null, CL = (V().CL && V().CL()) || [];
      if (!x) return card({ i: 'box', h: esc(p.n || 'Item'), pin, c: '#6fbf73' }, '<div class="hm-sub">This item is not in your inventory any more.</div>');
      const where = x.loc === 'vault' ? 'Vault' : (CL[((D.chars.find((c) => c.id === x.loc)) || {}).cls] || 'Character') + (x.e ? ' (equipped)' : '');
      return card({ i: 'box', h: esc(x.t || 'Item'), go: 'item:' + x.id, pin, c: x.r === 'Exotic' ? '#ceae33' : '#9a6ad0' }, `<div class="hm-row"><span class="mtile" style="--t:56px">${V().tile ? V().tile(x).replace(' draggable="true"', '') : ''}</span><div><b style="font-size:16px">${esc(x.n)}</b><span>${x.p ? '&#9670; ' + num(x.p) + ' &middot; ' : ''}${esc(where)}</span></div></div>`);
    }
    if (p.t === 'lo') {
      const L = window.__gtl && window.__gtl.get ? window.__gtl.get(p.id) : null;
      if (!L) return card({ i: 'user', h: esc(p.n || 'Loadout'), pin, c: '#7fb6e8' }, '<div class="hm-sub">This loadout was deleted.</div>');
      return card({ i: 'user', h: 'Loadout', go: 'lo:' + p.id, pin, c: '#7fb6e8' }, `<div class="hm-row" style="margin-top:0"><div><b style="font-size:16px">${esc(L.n || 'Loadout')}</b><span>${esc(L.cls)}</span></div></div><div class="hm-tiles">${L.icons.slice(0, 9).map((i) => `<img src="${esc(i)}" alt="" loading="lazy">`).join('')}</div><button class="b apply" data-lapply="${esc(p.id)}">Apply</button>`);
    }
    if (p.t === 'hub') return card({ i: 'link', h: 'Hub', go: 'hub:' + p.id, pin, c: '#9fc4ee' }, `<div class="hm-big" style="font-size:22px">${esc(p.n || p.id)}</div><div class="hm-sub">Opens inside Pathfinder's Hub.</div>`);
    if (p.t === 'guide') return card({ i: 'book', h: 'Guide', go: 'guide:' + p.id, pin, c: '#e8a53a' }, `<div class="hm-big" style="font-size:22px">${esc(p.n || p.id)}</div><div class="hm-sub">Your guide in Helpful.</div>`);
    return '';
  }

  function draw() {
    const D = V().D && V().D();
    if (!D) { s.innerHTML = '<div class="hm-g"><div class="hm-c w12"><div class="hm-h">Home</div><div class="hm-sub">Sign in on the Inventory tab to fill this page.</div></div></div>'; return; }
    const pins = PINS();
    s.innerHTML = `<div class="hm-hd"><h2>Home</h2><button class="g" data-hx="refresh">&#8635; Refresh</button><label><input type="checkbox" id="hstart"${lsGet('gt.home.start', false) ? ' checked' : ''}> Open the app on this page</label></div>
<div class="hm-g">${charsCard(D)}${resetsCard()}${timeCard()}${invCard(D)}
<div class="hm-sec">Your pins</div>${pins.length ? pins.map((p) => pinCard(p, D)).join('') : '<div class="hm-empty">Use <b>+ Home</b> on vendors, items, loadouts, Activity pages, Hub sites and guides to add them here.</div>'}</div>`;
  }
  async function load(force) {
    if (busy) return; busy = true; draw();
    const redraw = () => { if (s.classList.contains('on')) draw(); };
    const get = async (k) => { try { if (A().fetch) { H[k] = await A().fetch(k, force); H.err[k] = ''; } } catch (e) { H.err[k] = clean(e); } redraw(); };
    const pins = PINS();
    const jobs = [get('time')];
    pins.filter((p) => p.t === 'act' && ACT[p.id]).forEach((p) => jobs.push((async () => { try { H.act[p.id] = await A().fetch(p.id, force); H.err['a' + p.id] = ''; } catch (e) { H.err['a' + p.id] = clean(e); } redraw(); })()));
    pins.filter((p) => p.t === 'vendor').forEach((p) => jobs.push((async () => { try { H.ven[p.id] = await A().vendor(+p.id, force); H.err['v' + p.id] = ''; } catch (e) { H.err['v' + p.id] = clean(e); } redraw(); })()));
    await Promise.all(jobs);
    busy = false; redraw();
  }
  s.addEventListener('click', (e) => {
    if (e.target.closest('[data-hx=refresh]')) { load(true); return; }
    const un = e.target.closest('[data-unpin]'); if (un) { const c = un.closest('[data-pt]'); if (c) { toggle(c.dataset.pt, c.dataset.pid); draw(); } return; }
    const ap = e.target.closest('[data-lapply]'); if (ap) { if (window.__gtl && window.__gtl.apply) window.__gtl.apply(ap.dataset.lapply); return; }
    const c = e.target.closest('[data-go]'); if (!c || !c.dataset.go) return;
    const i = c.dataset.go.indexOf(':'), t = i < 0 ? c.dataset.go : c.dataset.go.slice(0, i), sub = i < 0 ? '' : c.dataset.go.slice(i + 1);
    if (t === 'activity' && A().open) { A().open(sub); return; }
    if (t === 'vendor' && A().openVendor) { A().openVendor(sub); return; }
    if (t === 'item') { const nb = nav.querySelector('button[data-t=vault]'); if (nb) nb.click(); setTimeout(() => { if (V().open) V().open(sub); }, 60); return; }
    if (t === 'lo') { if (window.__gtl && window.__gtl.go) window.__gtl.go(sub); return; }
    if (t === 'hub' && window.__gthub && window.__gthub.web) { const u = window.__gthub.url(sub); if (u) { window.open(u, '_blank', 'noopener'); return; } }
    if (t === 'hub') { const nb = nav.querySelector('button[data-t=hub]'); if (nb) nb.click(); setTimeout(() => { const h = document.querySelector('#hub .hbar [data-h="' + CSS.escape(sub) + '"]'); if (h) h.click(); }, 60); return; }
    if (t === 'guide') { const nb = nav.querySelector('button[data-t=guides]'); if (nb) nb.click(); setTimeout(() => { if (typeof openGuide === 'function') openGuide(sub); }, 60); return; }
    const nb = nav.querySelector('button[data-t="' + t + '"]'); if (nb) nb.click(); else show(t);
  });
  s.addEventListener('change', (e) => { if (e.target.id === 'hstart') lsSet('gt.home.start', e.target.checked); });
  // Helpful: this week's featured raid and dungeon, with your guide for each, on top of the guide list.
  // Every guide at a glance under the categories, grouped by category.
  function allGuides(gd, hub) {
    let box = document.getElementById('gall');
    if (!gd.length) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'gall'; hub.appendChild(box); box.onclick = (e) => { const c = e.target.closest('[data-gf]'); if (c && typeof openGuide === 'function') openGuide(c.dataset.gf); }; }
    const cats = []; gd.forEach((g) => { let c = cats.find((k) => k.n === g[0]); if (!c) cats.push(c = { n: g[0], l: [] }); c.l.push(g); });
    box.innerHTML = `<h3>All guides</h3>${cats.map((c) => `<div class="gac"><h4>${esc(c.n)} <small>${c.l.length}</small></h4><div class="gal">${c.l.map((g) => `<button class="gai" data-gf="${esc(g[1])}"><b>${esc(g[1])}</b><span>${esc(String(g[2] || '').slice(0, 110))}</span></button>`).join('')}</div></div>`).join('')}`;
  }
  async function guideFeat() {
    const hub = document.getElementById('ghub'), list = document.getElementById('glist'); if (!hub || !list) return;
    let r = {}; try { if (A().fetch) r = await A().fetch('rot', false); } catch (e) { r = {}; }
    let gd = []; try { gd = typeof GD !== 'undefined' && Array.isArray(GD) ? GD : []; } catch (e) { gd = []; }
    const norm = (t) => String(t || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const feat = (r.feat || []).map((x) => ({ x, g: gd.find((g) => { const a = norm(g[1]), b2 = norm(x.n); return a && b2 && (a === b2 || a.includes(b2) || b2.includes(a)); }) })).filter((o) => o.g);
    let box = document.getElementById('gfeat');
    allGuides(gd, hub);
    if (!feat.length) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'gfeat'; hub.insertBefore(box, list); }
    box.innerHTML = `<h3>Featured this week</h3><div class="gfl">${feat.map((o) => `<div class="gfc" data-gf="${esc(o.g[1])}" style="${o.x.img ? `background-image:url('${esc(img(o.x.img))}')` : ''}"><small>${esc(o.x.k || '')} &middot; featured</small><b>${esc(o.g[1])}</b></div>`).join('')}</div>`;
    box.onclick = (e) => { const c = e.target.closest('[data-gf]'); if (c && typeof openGuide === 'function') openGuide(c.dataset.gf); };
  }
  { const gb = () => nav.querySelector('button[data-t=guides]'); const t = setInterval(() => { const g = gb(); if (g) { clearInterval(t); g.addEventListener('click', () => setTimeout(guideFeat, 0)); } }, 300); setTimeout(() => clearInterval(t), 20000); }
  // Helpful: square, even cards (the theme's pill buttons made these look like bubbles).
  { const hs = document.createElement('style'); hs.id = 'gtq-help';
    hs.textContent = `
:root #guides .cat,:root #guides .gcard,:root #guides .gfc,:root #gall .gai,:root #guides .back,:root #guides #gback{border-radius:6px!important}
:root #guides .cat{min-height:176px;overflow:hidden}
:root #guides #glist:not(.hubgrid){display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:14px;align-items:stretch}
:root #guides #glist:not(.hubgrid)>.gcard{display:flex;flex-direction:column;height:100%;margin:0;padding:0 0 14px;overflow:hidden;border:1px solid var(--g-line,#2b2e33);border-top:3px solid var(--mute,#8b8f97);background:var(--g-panel,#1a1c20);text-align:left;transition:border-color .15s,box-shadow .15s}
:root #guides #glist:not(.hubgrid)>.gcard[data-cat="Raid"]{border-top-color:var(--cr,#c77dff)}:root #guides #glist:not(.hubgrid)>.gcard[data-cat="Dungeon"]{border-top-color:var(--cd,#4aa3df)}:root #guides #glist:not(.hubgrid)>.gcard[data-cat="Exotic mission"]{border-top-color:var(--cx,#e0b64a)}:root #guides #glist:not(.hubgrid)>.gcard[data-cat="Secret triumph"]{border-top-color:var(--cs,#5fcf8a)}
:root #guides #glist:not(.hubgrid)>.gcard:hover{transform:none;border-color:var(--g-accent,#7ab8e8);box-shadow:0 0 0 1px var(--g-accent,#7ab8e8),0 10px 24px rgba(0,0,0,.4)}
:root #guides #glist:not(.hubgrid)>.gcard .thumb{width:100%;margin:0 0 12px;aspect-ratio:16/9;object-fit:cover;border-radius:0!important}
:root #guides #glist:not(.hubgrid)>.gcard>b{display:block;margin:0 14px;font-size:17px;line-height:1.25}
:root #guides #glist:not(.hubgrid)>.gcard .gm{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:6px 14px 8px}
:root #guides #glist:not(.hubgrid)>.gcard .gm small{display:inline;margin:0}:root #guides #glist:not(.hubgrid)>.gcard .gm .tag{margin:0}
:root #guides #glist:not(.hubgrid)>.gcard>.mute{margin:0 14px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
:root #guides .gfl{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:12px}
:root #guides .gfc{min-height:84px}
:root #guides #glist:not(.hubgrid)~#gall{display:none}
`; document.head.appendChild(hs); }
  b.onclick = () => { show('home'); load(false); };
  if (lsGet('gt.home.start', false)) {
    let n = 0; const t = setInterval(() => { const D = V().D && V().D(); if (D || ++n > 60) { clearInterval(t); if (D) { show('home'); load(false); } } }, 500);
  }
})();
