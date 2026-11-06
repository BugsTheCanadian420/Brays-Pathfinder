/* global openGuide, GD */
// Activity tab: rotations, bounty planner, vendors (with wish list check), weapon stats, raid and dungeon clears,
// session recap and fireteam. Read-only: it never changes anything in the game.
(() => {
  const nav = document.getElementById('nav'), vsec = document.getElementById('vault');
  if (!nav || !vsec) return;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gt = () => window.gt;
  const V = () => window.__gtv || {};
  const img = (p) => { p = String(p || ''); return /^\/[\w./%-]*$/.test(p) ? 'https://www.bungie.net' + p : ''; };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const num = (n) => Number(n || 0).toLocaleString('en-US');
  const dur = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
  const clock = (ms) => { const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0'); };
  const cap = (t) => String(t).replace(/\b\w/g, (c) => c.toUpperCase());

  const TABS = [['rot', 'Rotations'], ['week', 'This week'], ['xur', 'X&ucirc;r'], ['bnt', 'Bounties'], ['ven', 'Vendors'], ['wep', 'Weapon stats'], ['clr', 'Raids and dungeons'], ['cru', 'Crucible'], ['pb', 'Personal bests'], ['rec', 'Recap']];
  const st = { vopen: new Set(), tab: 'rot', vh: 0, vq: '', char: '', cache: {}, wf: 'All', wq: '', sort: 'kills', busy: 0 };

  const s = document.createElement('section'); s.id = 'activity'; s.className = 'gdark'; vsec.parentNode.appendChild(s);
  const b = document.createElement('button'); b.textContent = 'Activity'; b.dataset.t = 'activity';
  const anchor = nav.querySelector('[data-t=triumphs]'); nav.insertBefore(b, anchor ? anchor.nextSibling : null);

  const css = document.createElement('style');
  css.textContent = `
#activity .deal .dst{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-top:8px;font-size:13px;color:#fff;text-align:center}#activity .deal .dst i{display:block;font-style:normal;font-size:9.5px;color:#8b8f97;letter-spacing:.3px}#activity .deal .dst .tt{color:#f0d58a}#activity .tg.wl{border-color:#2f6b3a;color:#7be08c}#activity .dnote{font-style:italic;margin-top:4px}#activity .dctl{align-items:center;gap:18px}#activity .dctl label{display:flex;align-items:center;gap:6px;color:#cfd2d8;font-size:13px;white-space:nowrap;margin:0}#activity .dctl input{width:auto!important;margin:0;padding:3px 6px;min-height:0;height:auto}nav button[data-t=activity].hasnew::after{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#e8a53a;margin-left:6px;vertical-align:middle}
#activity .agrid>.rdet{grid-column:1/-1;margin:0 0 4px}#activity .wkt td.wk{text-align:center;width:120px;color:#cfd2d8}#activity .wkt td.ok{color:#4caf50;font-weight:700;font-size:16px}#activity .wkt td.todo{color:#8b8f97}#activity .wkt td.na{color:#555}#activity .wkp{display:inline-block;width:46px;height:5px;background:#2b2e33;border-radius:3px;overflow:hidden;margin-right:6px;vertical-align:middle}#activity .wkp i{display:block;height:100%;background:#e0b64a}#activity .pbc{cursor:pointer}#activity .pbc:hover{border-color:#8fb3d9}
#activity .vlink{cursor:pointer}#activity .vlink:hover,#activity .vlink.open{border-color:#e5c158}#activity .vopen{font-size:11.5px;color:#e5c158;margin-top:4px;letter-spacing:.5px}#activity .vsub{border-left:3px solid #e5c158;padding:4px 0 6px 12px;margin:8px 0 12px;background:linear-gradient(90deg,rgba(229,193,88,.06),transparent 40%)}#activity .vsubh{display:flex;align-items:center;gap:10px;margin:4px 0}#activity .vsubh b{color:#fff;font-size:14px}#activity .vsubh button{margin-left:auto;padding:3px 10px!important;font-size:12px!important;letter-spacing:0!important;text-transform:none!important}#activity .vhd{display:flex;align-items:center;gap:10px;margin:0 0 6px}#activity .xsec{color:#e5c158}
#activity .crow{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}#activity .crow .big small{font-size:13px}#activity .big.pos{color:#7be08c}#activity .ctrend{position:relative;display:flex;align-items:flex-end;gap:3px;height:120px;padding:8px;background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:3px}#activity .ctrend i{flex:1;min-width:4px;border-radius:2px 2px 0 0;background:#4caf50;opacity:.85}#activity .ctrend i.l{background:#d9534f}#activity .ctrend .one{position:absolute;left:8px;right:8px;height:1px;border-top:1px dashed rgba(255,255,255,.35);pointer-events:none}#activity .ctbl td.pos{color:#7be08c}#activity .cwr{display:inline-block;width:60px;height:5px;background:#2b2e33;border-radius:3px;overflow:hidden;margin-right:8px;vertical-align:middle}#activity .cwr i{display:block;height:100%;background:#6aa6e0}
#activity .xsub{margin:14px 0 4px;font-size:14px;font-weight:600;color:#fff;letter-spacing:.5px}#activity .xurc:hover{border-color:#e5c158}
#activity .rdet{background:#14161a;border:1px solid #2b2e33;border-top:0;padding:10px 12px;margin:-4px 0 8px;overflow:auto}#activity .pgt{width:100%;border-collapse:collapse;font-size:12.5px;color:#cfd2d8}#activity .pgt th{text-align:left;font-weight:600;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9aa0a8;padding:3px 8px}#activity .pgt td{padding:5px 8px;border-top:1px solid #23262b;vertical-align:top}#activity .pgt tr.me td{background:#1b2a1f}#activity .pgt b small{display:inline!important;color:#9aa0a8;font-weight:400;margin-left:2px}#activity .pgt td small{display:block;color:#9aa0a8}#activity .pgw span{display:inline-block;margin:0 6px 2px 0;white-space:nowrap}#activity .pgw i{font-style:normal;color:#e5c653}
:root[data-gsec="activity"] main > #activity{max-width:none!important;margin:0!important;zoom:1!important;padding:0 12px}
#activity .abar{display:flex;align-items:center;gap:6px;padding:8px 0;flex-wrap:wrap}
#activity .abar button,#activity .chipb button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn,#202226);padding:6px 14px;cursor:pointer;letter-spacing:2px;text-transform:uppercase;font-size:12px}
#activity .abar button.on,#activity .chipb button.on{background:var(--g-accent2,#2b4a6b);color:var(--g-on-accent,#fff);border-color:#8fb3d9}
#activity .abar .sp{margin-left:auto;display:flex;gap:6px;align-items:center}
#activity .abar .sp button{letter-spacing:0;text-transform:none;padding:4px 10px}
#activity select,#activity input[type=search]{background:var(--g-inp,#0f1114);color:#e6e7ea;border:1px solid #3a3d43;padding:5px 8px;font:inherit;font-size:13px;border-radius:2px;width:auto}
#activity .chipb{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px}
#activity .chipb button{letter-spacing:1px;padding:4px 11px}
#activity .msg{padding:26px;text-align:center;color:var(--mute,#9aa0a8)}
#activity .msg.err{color:#e8a0a0}
#activity .note{color:var(--mute,#9aa0a8);font-size:12px;margin:10px 0}
#activity h3.sec{margin:16px 0 8px;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#cfd2d8;font-weight:600}
#activity .agrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}#activity .agrid.fit{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}#activity .agrid.fit .acard.bg{min-height:130px;display:flex;flex-direction:column;justify-content:flex-end}#activity .agrid.fit .acard.bg b{font-size:18px}#activity .agrid.fit .acard .abgi{opacity:.42}
#activity .acard{position:relative;background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-radius:3px;padding:12px 14px;overflow:hidden}
#activity .acard.bg{min-height:96px}
#activity .acard .abgi{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.28;pointer-events:none;mask-image:linear-gradient(90deg,transparent,#000 70%);-webkit-mask-image:linear-gradient(90deg,transparent,#000 70%)}
#activity .acard>*:not(.abgi){position:relative}
#activity .acard b{color:#fff;font-weight:600}
#activity .acard .sub{color:var(--mute,#9aa0a8);font-size:12px;margin-top:2px}
#activity .acard .big{font-size:22px;margin-top:6px;color:#fff}
#activity .acard.ok{border-color:#2f6b3a}
#activity .acard .gdl{margin-top:auto;padding-top:6px;color:var(--g-accent,#7ab8e8);font-size:11.5px;letter-spacing:.04em;opacity:.85}#activity .acard.clk:hover .gdl{opacity:1}
#activity .acard.clk{cursor:pointer;transition:border-color .15s,transform .15s,box-shadow .15s}#activity .acard.clk:hover{border-color:var(--g-accent,#7ab8e8);box-shadow:0 0 0 1px var(--g-accent-soft,rgba(122,184,232,.2)),0 8px 22px rgba(0,0,0,.35);transform:translateY(-1px)}#activity .acard.clk:hover .abgi{opacity:.42}
#activity .cdhd{margin:2px 0 10px}
#activity .cdban{position:relative;overflow:hidden;border:1px solid var(--g-line,#2b2e33);border-radius:4px;min-height:clamp(110px,14vw,190px);display:flex;align-items:flex-end;background:#0d0f12;margin-bottom:12px}
#activity .cdbg{position:absolute;inset:0;background:center/cover no-repeat;opacity:.75}#activity .cdban::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,9,12,.92),rgba(8,9,12,.15) 70%)}
#activity .cdt{position:relative;z-index:1;padding:16px 20px}#activity .cdt small{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--g-accent,#cfd2d8)}#activity .cdt h2{margin:2px 0 4px;font-size:clamp(22px,2.2vw,34px);color:#fff;letter-spacing:.02em}#activity .cdt span{color:#c6cad1;font-size:13px}
#activity .cdcols{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px 24px;margin:4px 0 8px}
#activity .cdbar{display:grid;grid-template-columns:minmax(80px,180px) 1fr 44px;gap:10px;align-items:center;margin:6px 0;font-size:13px;color:#cfd2d8}#activity .cdbar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#activity .cdbar i{height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden;display:block}#activity .cdbar i b{display:block;height:100%;background:var(--g-accent,#7ab8e8);border-radius:4px}#activity .cdbar em{font-style:normal;text-align:right;color:#fff;font-variant-numeric:tabular-nums}
#activity .cdf button.on{background:var(--g-accent2,#4c7290)!important;color:var(--g-on-accent,#fff)!important;border-color:transparent!important}
#activity .cdrh{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:16px 0 8px}#activity .cdf{display:flex;gap:6px;flex-wrap:wrap}#activity .cdf small{opacity:.7;margin-left:4px}
#activity .ract .sub .feat{margin-left:6px;font-size:10.5px;padding:1px 7px}
#activity .acard.off{opacity:.55}
#activity .chipb input[type=search]{margin-left:auto}
#activity .tick{color:#4caf50;font-weight:700;margin-left:6px}
#activity .abar2{height:6px;background:#0d0f12;border-radius:3px;overflow:hidden;margin-top:6px}
#activity .abar2 i{display:block;height:100%;background:#6aa6e0}
#activity .abar2.g i{background:#4caf50}
#activity .tg{display:inline-block;font-size:11px;border:1px solid #3a3d43;color:#b9bec6;padding:1px 7px;border-radius:9px;margin:4px 4px 0 0}
#activity .plan{border-top:3px solid #e0b64a}
#activity .plan ul{margin:6px 0 0;padding-left:18px;color:#cfd2d8;font-size:13px}
#activity .vit{display:flex;gap:10px;align-items:center}
#activity .vit img{width:52px;height:52px;border:1px solid #3a3d43;background:#0d0f12;flex:none;object-fit:contain}
#activity .vit.wide{flex-direction:column;align-items:stretch}
#activity .vit.wide img{width:100%;height:auto;max-width:100%;max-height:none;align-self:stretch}
#activity .vit.w1{border-color:#2f6b3a}
#activity .badge{display:inline-block;font-size:11px;padding:1px 7px;border-radius:3px;margin-top:4px}
#activity .badge.good{background:#173d20;color:#7be08c;border:1px solid #2f6b3a}
#activity .badge.bad{background:#3d2d14;color:#e8b860;border:1px solid #6b5020}
#activity .tbl{width:100%;border-collapse:collapse;font-size:13px}
#activity .tbl th{text-align:left;color:var(--mute,#9aa0a8);font-weight:500;padding:6px 8px;border-bottom:1px solid #2b2e33;cursor:pointer;white-space:nowrap}
#activity .tbl td{padding:5px 8px;border-bottom:1px solid #202226}
#activity .tbl td.n{display:flex;align-items:center;gap:8px}
#activity .tbl td.n img{width:28px;height:28px;border:1px solid #3a3d43}
#activity .tbl .rb{height:5px;background:#0d0f12;border-radius:2px;min-width:80px}
#activity .tbl .rb i{display:block;height:100%;background:#6aa6e0;border-radius:2px}
#activity .stat{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--mute,#9aa0a8)}
#activity .row3{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
#activity .pos{color:#7be08c}
#activity .tg{border-color:#34506e;background:rgba(58,110,165,.14);color:#a9c8ea}
#activity .bty .bimg{width:56px;height:56px;flex:none;border:1px solid #4a4d54;background:#0d0f12;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);display:block;overflow:hidden}
#activity .bty .bimg img{width:100%;height:100%;object-fit:cover;display:block;border:0}
#activity .bty .vit{align-items:flex-start}
#activity .bty .vit{margin-bottom:6px}
#activity .vitem .vimg{width:52px;height:52px;flex:none;border:2px solid var(--rc);background:#0d0f12;display:block;overflow:hidden}
#activity .vitem .vimg img{width:100%;height:100%;object-fit:cover;border:0;display:block}
#activity .vitem .vit.wide .vimg{width:100%;height:auto;border-width:1px;align-self:stretch}
#activity .vitem .vit.wide .vimg img{width:100%;height:auto;max-width:100%;max-height:none;object-fit:contain;display:block;background:transparent}
#activity .vitem{border-top:2px solid var(--rc)}
#activity .vcost{display:flex;flex-wrap:wrap;gap:8px;margin-top:5px;font-size:12px;color:#e6e7ea}
#activity .vcost span{display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,.35);padding:1px 6px 1px 2px;border-radius:3px}
#activity .vcost img{width:16px;height:16px;border:0}
#activity .whub{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
#activity .wcard{cursor:pointer;min-height:150px;transition:border-color .15s}
#activity .wcard:hover{border-color:#cfd2d8}
#activity .wcard .abgi{opacity:.22;background-size:contain;background-repeat:no-repeat;background-position:right center}
#activity .wtop{display:flex;gap:4px;margin-top:8px}
#activity .wtop img{width:34px;height:34px;border:1px solid #3a3d43;display:block}
#activity .wbest{margin-top:6px}
#activity .whd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px}
#activity .whd button{border-radius:3px;border:1px solid #3a3d43;color:#cfd2d8;background:var(--g-btn,#202226);padding:5px 12px;cursor:pointer}
#activity .feats{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#activity .feat{font-size:11px;padding:2px 8px;border-radius:10px;border:1px solid #3a3d43;color:#8b8f97;background:rgba(0,0,0,.4)}
#activity .feat b{color:#cfd2d8;margin-left:2px}
#activity .feat.on.fs{border-color:#4aa3df;color:#9fd0f2}
#activity .feat.on.ff{border-color:#e0b64a;color:#f0d58a}
#activity .feat.on.fsf{border-color:#c77dff;color:#e2bdff;background:rgba(120,60,170,.25)}
#activity .acard.sfl{border-color:#7a4fa8}
#activity .rlist{display:flex;flex-direction:column;gap:4px}
#activity .ract{display:grid;grid-template-columns:120px minmax(160px,1fr) 110px minmax(220px,auto) 90px;align-items:center;gap:12px;background:var(--g-panel,#1a1c20);border:1px solid var(--g-line,#2b2e33);border-left:3px solid #555;min-height:56px;padding-right:12px}
#activity .ract.win{border-left-color:#4caf50}#activity .ract.loss{border-left-color:#d9534f}#activity .ract.mid{border-left-color:#8b8f97}
#activity .ract .rimg{align-self:stretch;background:#0d0f12 center/cover no-repeat}
#activity .ract b{color:#fff;font-weight:600}
#activity .ract .rres{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#cfd2d8}
#activity .ract.win .rres{color:#7be08c}#activity .ract.loss .rres{color:#ef8a8a}
#activity .ract .rst{display:flex;gap:14px;font-size:14px;color:#fff}
#activity .ract .rst i{font-style:normal;font-size:10px;color:#8b8f97;margin-right:4px;letter-spacing:1px}
#activity .ract .rtime{text-align:right;font-size:13px;color:#cfd2d8;display:flex;flex-direction:column}
#activity .ract .rtime small{color:#8b8f97;font-size:11px}
@media (max-width:900px){#activity .ract{grid-template-columns:80px 1fr auto}#activity .ract .rst,#activity .ract .rres{display:none}}
`;
  document.head.appendChild(css);

  const noteCard = (t) => `<p class="note">${t}</p>`;
  // "+ Home" buttons come from home.js (loaded later), so they are looked up when drawn.
  const homeBtn = (t, id, n) => (window.__gth ? window.__gth.btn(t, id, n) : '');
  const msg = (t, err) => `<div class="msg${err ? ' err' : ''}">${esc(t)}</div>`;
  const body = () => s.querySelector('#abody');
  const fetchCached = async (key, fn, force) => {
    const c = st.cache[key];
    if (!force && c && Date.now() - c.at < 60000) return c.v;
    const v = await fn(); st.cache[key] = { at: Date.now(), v }; return v;
  };
  const chars = () => { const d = V().D && V().D(); return (d && d.chars) || []; };
  const charArg = () => (st.char ? { char: st.char } : {});

  const PINNABLE = { week: 'Left this week', cru: 'Crucible', rot: 'Rotations', bnt: 'Bounties', xur: 'Xûr', clr: 'Raids and dungeons', pb: 'Personal bests', rec: 'Recap', wep: 'Weapon stats' };
  function frame() {
    const cs = chars(), CL = (V().CL && V().CL()) || {};
    const showChar = ['bnt', 'ven', 'xur'].includes(st.tab) && cs.length > 1;
    s.innerHTML = `<div class="abar">${TABS.map(([k, n]) => `<button data-a="${k}" class="${st.tab === k ? 'on' : ''}">${n}</button>`).join('')}<span class="sp">${showChar ? `<select id="achar">${cs.map((c) => `<option value="${esc(c.id)}"${st.char === c.id ? ' selected' : ''}>${esc((CL[c.cls] || 'Guardian') + ' ' + (c.light || ''))}</option>`).join('')}</select>` : ''}${PINNABLE[st.tab] ? homeBtn('act', st.tab, PINNABLE[st.tab]) : ''}<button data-ax="refresh">Refresh</button></span></div><div id="abody"></div>`;
  }
  async function load(force) {
    // Until a character is picked the page used to show the most recently played one while the list said the first one, so the list lied. Start on the most recently played, and say so.
    if (!st.char) { const cs = chars(); if (cs.length) st.char = cs.reduce((a, b) => ((b.dp || 0) > (a.dp || 0) ? b : a)).id; }
    frame();
    const box = body(); box.innerHTML = msg('Loading...');
    const tab = st.tab, ch = st.char;
    try {
      const html = await (RENDER[tab])(force);
      if (st.tab === tab && st.char === ch && body()) body().innerHTML = html;
    } catch (e) {
      if (st.tab === tab && st.char === ch && body()) body().innerHTML = msg(String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''), 1) + '<div class="msg"><button data-ax="refresh" class="b">Try again</button></div>';
    }
  }

  // ---- rotations ----
  const RENDER = {};
  // Weekly reset is Tuesday 17:00 UTC.
  const resetIn = () => { const n = new Date(), t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 17); let d = (2 - n.getUTCDay() + 7) % 7; let x = t + d * 86400000; if (x <= n.getTime()) x += 7 * 86400000; const m = Math.round((x - n.getTime()) / 60000); return m < 90 ? m + ' minutes' : m < 2880 ? Math.round(m / 60) + ' hours' : Math.round(m / 1440) + ' days'; };
  // Daily / weekly reset and Xûr countdowns, the first category of the rotations page (they tick every second).
  const rsText = (k) => {
    const L = typeof lastReset === 'function' ? lastReset : null, f = typeof fmt === 'function' ? fmt : null; if (!L || !f) return '';
    const n = Date.now(), d = L(false) + 864e5, w = L(true) + 6048e5, fri = L(true) + 3 * 864e5;
    return k === 'd' ? f(d - n) : k === 'w' ? f(w - n) : n >= fri ? 'Here now: leaves in ' + f(w - n) : 'Arrives in ' + f(fri - n);
  };
  const rsCards = () => {
    const L = typeof lastReset === 'function' ? lastReset : null; if (!L) return '';
    const dl = new Date(L(false) + 864e5).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const c = (k, t, sub) => `<div class="acard plan"><b>${t}</b><div class="big" data-rs="${k}">${esc(rsText(k))}</div><div class="sub">${sub}</div></div>`;
    return `<h3 class="sec">Resets</h3><div class="agrid fit">${c('d', 'Daily reset', 'Every day at 17:00 UTC (' + esc(dl) + ' your time)' + (L(false) + 864e5 === L(true) + 6048e5 ? '. The next one is also the weekly reset.' : ''))}${c('w', 'Weekly reset', 'Tuesdays at 17:00 UTC. New Nightfall, raid and dungeon rotators.')}${c('x', 'X&ucirc;r', 'Arrives Friday reset and leaves at the next weekly reset. Click to see what he is selling.').replace('class="acard plan"', 'class="acard plan xurc" data-a="xur" title="See what Xûr is selling" style="cursor:pointer"')}</div>`;
  };
  setInterval(() => { if (!s.classList.contains('on')) return; s.querySelectorAll('[data-rs]').forEach((n) => { n.textContent = rsText(n.dataset.rs); }); }, 1000); // only this page's timers (Home has its own)
  // A rotation card opens that activity's page in Helpful. Pantheon bosses open the raid they come from; anything without a guide opens Helpful searched for its name.
  const GALIAS = { 'consecrated mind': 'Garden of Salvation', 'sanctified mind': 'Garden of Salvation', 'atraks': 'Deep Stone Crypt', 'taniks': 'Deep Stone Crypt', 'kalli': 'Last Wish', 'shuro chi': 'Last Wish', 'morgeth': 'Last Wish', 'riven': 'Last Wish', 'nezarec': 'Root of Nightmares', 'akelous': 'Vow of the Disciple', 'caretaker': 'Vow of the Disciple', 'rhulk': 'Vow of the Disciple', 'oryx': 'King\u2019s Fall', 'golgoroth': 'King\u2019s Fall', 'warpriest': 'King\u2019s Fall', 'ir yut': 'Crota\u2019s End', 'crota': 'Crota\u2019s End', 'atheon': 'Vault of Glass', 'templar': 'Vault of Glass', 'gorgons': 'Vault of Glass', 'the witness': 'Salvation\u2019s Edge', 'verity': 'Salvation\u2019s Edge', 'epoptes': 'Desert Perpetual', 'iatros': 'Desert Perpetual', 'agraios': 'Desert Perpetual', 'koregos': 'Desert Perpetual' };
  const gnorm = (t) => String(t || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
  function guideFor(n) {
    let gd = []; try { gd = typeof GD !== 'undefined' && Array.isArray(GD) ? GD : []; } catch (e) { gd = []; }
    const a = gnorm(n); if (!a) return '';
    let hit = gd.find((g) => gnorm(g[1]) === a) || gd.find((g) => { const b = gnorm(g[1]); return b && (b.includes(a) || a.includes(b)); });
    if (!hit) { const k = Object.keys(GALIAS).find((q) => a.includes(q)); if (k) hit = gd.find((g) => g[1] === GALIAS[k]); }
    return hit ? hit[1] : '';
  }
  function openHelp(name) {
    const nb = document.querySelector('nav button[data-t=guides]'); if (nb) nb.click();
    window.scrollTo(0, 0);
    setTimeout(() => {
      const g = guideFor(name);
      if (g && typeof openGuide === 'function') openGuide(g);
      else { const gp = document.getElementById('gpage'), bk = document.getElementById('gback'); if (gp && !gp.hidden && bk) bk.click(); const q = document.getElementById('gsearch'); if (q) { q.value = name; q.dispatchEvent(new Event('input', { bubbles: true })); } }
    }, 90);
  }
  RENDER.rot = async (force) => {
    const r = await fetchCached('rot' + st.char, () => gt().actRot(charArg()), force);
    const part = (k, title) => { const l = (r.feat || []).filter((x) => x.k === k); return l.length ? `<h3 class="sec">${title}</h3><div class="agrid fit">${l.map((x) => `<div class="acard bg plan clk" data-gd="${esc(x.n)}" title="Open the ${esc(x.n)} guide in Helpful">${x.img ? `<div class="abgi" style="background-image:url('${esc(img(x.img))}')"></div>` : ''}<b>${esc(x.n)}</b><div class="sub">${k === 'Pantheon' ? 'Featured ' + esc(x.s || 'Pantheon') : 'Weekly ' + k.toLowerCase() + ' challenge'}</div><div class="sub">Ends in ${esc(resetIn())}</div><div class="sub gdl">Open the guide &rsaquo;</div></div>`).join('')}</div>` : ''; };
    const feat = rsCards() + part('Raid', 'Featured raids this week') + part('Dungeon', 'Featured dungeons this week') + part('Pantheon', 'Featured Pantheon this week');
    return feat || msg('No featured raids or dungeons found yet. Try Refresh in a moment.');
  };

  // ---- bounty planner ----
  const frac = (a) => { const m = a.obj.reduce((t, o) => t + o.m, 0) || 1, p = a.obj.reduce((t, o) => t + Math.min(o.p, o.m), 0); return p / m; };
  const eta = (t) => { if (!t) return ''; const m = Math.round((t - Date.now()) / 60000); return m <= 0 ? 'expired' : m < 90 ? m + ' min' : m < 2880 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' days'; };
  RENDER.bnt = async (force) => {
    const r = await fetchCached('bnt' + st.char, () => gt().actBounties(charArg()), force);
    const all = r.bounties; if (!all.length) return msg('No bounties on this character. Pick some up from the vendors in the Tower.');
    const open = all.filter((a) => !a.obj.length || a.obj.some((o) => !o.c));
    const g = {}; open.forEach((a) => a.tags.forEach((t) => { (g[t] = g[t] || []).push(a); }));
    const groups = Object.keys(g).filter((t) => g[t].length >= 2).map((t) => ({ t, list: g[t] })).sort((a, b) => b.list.length - a.list.length || a.t.localeCompare(b.t)).slice(0, 8);
    const plan = groups.length ? `<h3 class="sec">Best plays: overlapping bounties</h3><div class="agrid">${groups.map((x) => `<div class="acard plan"><b>${esc(cap(x.t))}</b><div class="sub">Helps ${x.list.length} bounties at once</div><ul>${x.list.map((a) => `<li>${esc(a.n)}</li>`).join('')}</ul></div>`).join('')}</div>` : (open.length ? noteCard('No two bounties share an obvious weapon, element or activity right now.') : '');
    const rows = open.slice().sort((a, b) => frac(b) - frac(a)).concat(all.filter((a) => !open.includes(a)));
    const done = all.length - open.length, exp = all.filter((a) => a.e).map((a) => a.e), soon = exp.length ? eta(Math.min(...exp)) : 'n/a';
    return `<div class="row3"><div class="acard"><div class="stat">Bounties</div><div class="big">${all.length}</div></div><div class="acard"><div class="stat">Complete</div><div class="big">${done}</div></div><div class="acard"><div class="stat">Expiring soonest</div><div class="big">${esc(soon)}</div></div></div>` + plan + `<h3 class="sec">All bounties</h3><div class="agrid">${rows.map((a) => {
      const f = frac(a), fin = a.obj.length && a.obj.every((o) => o.c);
      return `<div class="acard bty${fin ? ' ok' : ''}"><div class="vit bi">${a.i ? `<span class="bimg"><img src="${esc(img(a.i))}" alt="" loading="lazy"></span>` : '<span class="bimg"></span>'}<div><b>${esc(a.n)}</b>${fin ? '<span class="tick">&#10003;</span>' : ''}<div class="sub">${esc(a.d)}</div></div></div>${a.obj.map((o) => `<div class="sub">${esc(o.t || 'Progress')}: ${num(o.p)} / ${num(o.m)}</div>`).join('')}<div class="abar2${fin ? ' g' : ''}"><i style="width:${Math.round(f * 100)}%"></i></div>${a.tags.map((t) => `<span class="tg">${esc(t)}</span>`).join('')}${a.e ? `<div class="sub">Expires in ${esc(eta(a.e))}</div>` : ''}</div>`;
    }).join('')}</div>`;
  };

  // ---- vendors ----
  const wishOf = (x, i) => { const w = V().wish; if (!w) return { v: 0 }; try { return w({ id: 'v' + x.h + '_' + i + '_' + (x.pk[0] || 0), h: x.h, pk: x.pk }); } catch (e) { return { v: 0 }; } };
  const PIN = [/^xûr|^xur/i, /banshee/i, /ada-1/i, /zavala/i, /shaxx/i, /drifter/i, /saint/i, /rahool/i, /hawthorne|eris|devrim|failsafe/i];
  const VGROUPS = [['npc', 'Vendors'], ['arch', 'Exotic archives'], ['focus', 'Focusing and attunement'], ['other', 'Other']];
  const TIER = { Exotic: '#ceae33', Legendary: '#522f65', Rare: '#5076a3', Uncommon: '#366f42', Common: '#6a6e75' };
  const vcard = (x, i) => {
      const w = wishOf(x, i);
      const op = x.pv && st.vopen.has(x.pv);
      return `<div class="acard vitem${x.x ? ' off' : ''}${x.pv ? ' vlink' + (op ? ' open' : '') : ''}" style="--rc:${TIER[x.r] || '#3a3d43'}"${x.pv ? ` data-vs="${x.pv}" title="${op ? 'Hide' : 'Show'} what is inside"` : ''}><div class="vit${w.v === 1 ? ' w1' : ''}">${x.i ? `<span class="vimg"><img src="${esc(img(x.i))}" alt="" loading="lazy"></span>` : ''}<div><b>${esc(x.n)}</b>${x.q > 1 ? ` <span class="mute">x${num(x.q)}</span>` : ''}<div class="sub">${esc(x.r)} ${esc(x.t)}</div>${w.v === 1 ? '<span class="badge good">&#10003; On your wish list</span>' : w.v === -1 ? '<span class="badge bad">Marked as trash</span>' : ''}${x.costs.length ? `<div class="vcost">${x.costs.map((k) => `<span title="${esc(k.n)}">${k.i ? `<img src="${esc(img(k.i))}" alt="">` : ''}${esc(num(k.q))}${k.i ? '' : ' ' + esc(k.n)}</span>`).join('')}</div>` : ''}${x.x ? `<div class="sub">${esc(x.x)}</div>` : ''}${x.pv ? `<div class="vopen">${op ? '&#9662; Hide items' : '&#9656; Show items'}</div>` : ''}</div></div></div>`;
  };
  // Vendor items grouped the way the game groups them. Tiles that are really another vendor ("Strange Gear Offers" and so on)
  // open that vendor's items right below, like in the game.
  const vendOf = (h, force) => fetchCached('ven' + h + st.char, () => gt().actVendor({ h, ...charArg() }), force);
  async function catsHTML(r, force, depth, q) {
    const items = r.items.map((x, i) => ({ x, i })).filter(({ x }) => !q || x.pv || (x.n + ' ' + x.t + ' ' + x.c).toLowerCase().includes(q));
    const cats = []; items.forEach((o) => { let c = cats.find((k) => k.n === o.x.c); if (!c) cats.push(c = { n: o.x.c, l: [] }); c.l.push(o); });
    let out = '';
    for (const c of cats) {
      out += `<h3 class="sec">${esc(c.n)} <small class="mute">${c.l.length}</small></h3><div class="agrid">${c.l.map(({ x, i }) => vcard(x, i)).join('')}</div>`;
      if (depth > 1) continue;
      for (const { x } of c.l) {
        if (!x.pv || !st.vopen.has(x.pv)) continue;
        let sr; try { sr = await vendOf(x.pv, force); } catch (e) { sr = { items: [], err: String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, '') }; }
        out += `<div class="vsub"><div class="vsubh"><b>${esc(x.n)}</b><span class="mute">${sr.items.length} item${sr.items.length === 1 ? '' : 's'}</span><button class="g" data-vs="${x.pv}">Close</button></div>${sr.items.length ? await catsHTML(sr, force, depth + 1, q) : noteCard(sr.err ? 'Could not load: ' + esc(sr.err) : 'Nothing for sale here right now.')}</div>`;
      }
    }
    return out;
  }
  // ---- Xûr: the weekly Xûr in the Tower, and his offers in the Dares of Eternity, each with everything they sell ----
  RENDER.xur = async (force) => {
    const L = await fetchCached('xur' + st.char, () => gt().actXur(charArg()), force);
    const vs = (L && L.vendors) || [];
    const got = await Promise.all(vs.map(async (v) => { try { return { v, r: await vendOf(v.h, force) }; } catch (e) { return { v, err: String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, '') }; } }));
    // vendors that only exist as a tile inside another Xûr vendor are shown inside that tile, not on their own
    const subs = new Set(); got.forEach((g) => ((g.r && g.r.items) || []).forEach((x) => { if (x.pv) subs.add(x.pv); }));
    const head = (v) => `<h4 class="xsub">${esc(v.n)}${v.sub && v.sub !== v.n ? ` <small class="mute">${esc(v.sub)}</small>` : ''}</h4>`;
    const block = async (where, title, none) => {
      const list = got.filter((g) => g.v.where === where && !subs.has(g.v.h));
      if (!list.length) return `<h3 class="sec xsec">${title}</h3>` + noteCard(none);
      let out = `<h3 class="sec xsec">${title}</h3>`;
      for (const g of list) {
        if (g.err) { out += head(g.v) + noteCard('Could not load: ' + esc(g.err)); continue; }
        if (g.r.off || !g.r.items.length) { out += head(g.v) + noteCard(esc(g.v.n) + ' is not selling anything right now.'); continue; }
        out += head(g.v) + await catsHTML(g.r, force, 0, '');
      }
      return out;
    };
    const tower = await block('tower', 'X&ucirc;r &middot; Tower (weekly)', 'Xûr is not in the Tower right now. He arrives at Friday reset and leaves at the weekly reset on Tuesday.');
    const dares = await block('dares', 'X&ucirc;r &middot; Dares of Eternity', 'Bungie is not listing Xûr\'s Dares of Eternity offers for this character right now.');
    return tower + dares;
  };
  RENDER.ven = async (force) => {
    const L = await fetchCached('vlist' + st.char, () => gt().actVendors(charArg()), force);
    const list = L.vendors.slice().sort((a, b) => { const pa = PIN.findIndex((r) => r.test(a.n)), pb = PIN.findIndex((r) => r.test(b.n)); return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.n.localeCompare(b.n); });
    if (!list.length) return msg('Bungie did not list any vendors for this character right now.');
    if (!list.some((v) => v.h === st.vh)) st.vh = (list.find((v) => /^xûr|^xur/i.test(v.n)) || list[0]).h;
    const pins = list.filter((v) => PIN.some((r) => r.test(v.n))).slice(0, 10), rest = list.filter((v) => !pins.includes(v));
    const chips = `<div class="chipb">${pins.map((v) => `<button data-v="${v.h}" class="${st.vh === v.h ? 'on' : ''}">${esc(v.n)}</button>`).join('')}${rest.length ? `<select id="avsel"><option value="">More vendors...</option>${VGROUPS.map(([k, label]) => { const g = rest.filter((v) => (v.k || 'npc') === k).sort((x, y) => x.n.localeCompare(y.n)); return g.length ? `<optgroup label="${esc(label)}">${g.map((v) => `<option value="${v.h}"${st.vh === v.h ? ' selected' : ''}>${esc(v.n)}${v.sub ? ' - ' + esc(v.sub) : ''}</option>`).join('')}</optgroup>` : ''; }).join('')}</select>` : ''}<input type="search" id="avq" placeholder="Search this vendor" value="${esc(st.vq)}"></div>`;
    const r = await vendOf(st.vh, force);
    const cur = list.find((v) => v.h === st.vh);
    if (r.off || !r.items.length) return chips + msg(r.name + ' is not selling anything right now.' + (/^xûr|^xur/i.test(r.name) ? ' Xûr arrives at Friday reset.' : ''));
    const q = (st.vq || '').toLowerCase();
    const body = await catsHTML(r, force, 0, q);
    return chips + `<div class="vhd"><span class="stat">${esc(cur ? cur.n : r.name)} &middot; ${num(r.items.length)} items</span>${homeBtn('vendor', st.vh, cur ? cur.n : r.name)}</div>` + (body || msg('Nothing matches that search.')) + noteCard('This is the vendor\'s full inventory as Bungie reports it. Wish list checks use the perks the vendor is selling. Tiles like "Strange Gear Offers" open to show what is inside.');
  };

  // ---- deals: god rolls and high-stat armor on sale at any vendor, for every character ----
  const STN = [[392767087, 'Health'], [4244567218, 'Melee'], [1735777505, 'Grenade'], [144602215, 'Super'], [1943323491, 'Class'], [2996146975, 'Weapons']]; // the game's order
  const dealThr = () => Math.max(0, Math.min(200, +lsGet('gt.dealArmor', 65) || 0));
  const dealKey = (x) => x.v + ':' + x.h + ':' + (x.it === 2 ? x.c + ':' + x.tot : x.pk.slice().sort().join(','));
  function dealFind(r) {
    const thr = dealThr(), w = [], a = [];
    ((r && r.items) || []).forEach((x, i) => {
      if (x.x) return; // you cannot buy it right now
      if (x.it === 3) { const o = wishOf(x, 'd' + i); if (o.v === 1) w.push({ x, o }); }
      else if (x.it === 2 && thr && x.tot >= thr) a.push({ x });
    });
    a.sort((p, q) => q.x.tot - p.x.tot);
    return { w, a };
  }
  const dealCard = ({ x, o }) => {
    const CL = (V().CL && V().CL()) || {}, pn = (V().pn && V().pn()) || {};
    const who = x.it === 2 ? (CL[x.cl] || '') : '';
    const perks = o ? x.pk.filter((h) => o.perks && o.perks.has(h)).map((h) => pn[h]).filter(Boolean) : [];
    const stats = x.it === 2 ? `<div class="dst">${STN.map(([h, n]) => `<span><i>${n}</i>${x.st[h] || 0}</span>`).join('')}<span class="tt"><i>Total</i>${x.tot}</span></div>` : '';
    return `<div class="acard vitem deal" style="--rc:${TIER[x.r] || '#3a3d43'}"><div class="vit${o ? ' w1' : ''}">${x.i ? `<span class="vimg"><img src="${esc(img(x.i))}" alt="" loading="lazy"></span>` : ''}<div><b>${esc(x.n)}</b><div class="sub">${esc(x.t)}${who ? ' &middot; ' + esc(who) : ''}</div><div class="sub">Sold by <b>${esc(x.vn)}</b></div>${perks.length ? `<div>${perks.map((n) => `<span class="tg wl">${esc(n)}</span>`).join('')}</div>` : ''}${o && o.notes && o.notes[0] ? `<div class="sub dnote">${esc(o.notes[0])}</div>` : ''}</div></div>${stats}</div>`;
  };
  RENDER.deal = async (force) => {
    const r = await fetchCached('deal', () => gt().actDeals(), force);
    st.dealR = r; dealSeen(r);
    const { w, a } = dealFind(r), haveWL = !!(V().wlOn && V().wlOn());
    const ctl = `<div class="chipb dctl"><label>Armor alert at stat total <input type="number" id="dthr" min="0" max="200" value="${dealThr()}" style="width:64px"></label><label><input type="checkbox" id="dnot"${lsGet('gt.dealNotify', true) ? ' checked' : ''}> Desktop alert when something new shows up</label></div>`;
    const wsec = `<h3 class="sec">Wish list rolls on sale <small class="mute">${w.length}</small></h3>` + (w.length ? `<div class="agrid">${w.map(dealCard).join('')}</div>` : noteCard(haveWL ? 'No vendor is selling a roll from your wish lists right now.' : 'No vendor is selling a roll from your wish lists right now. Add a wish list in Settings to get thumbs up here.'));
    const asec = `<h3 class="sec">High-stat armor <small class="mute">${a.length}</small></h3>` + (dealThr() ? (a.length ? `<div class="agrid">${a.map(dealCard).join('')}</div>` : noteCard('No armor at a stat total of ' + dealThr() + ' or more is on sale right now.')) : noteCard('Armor alerts are off (stat total 0).'));
    return ctl + wsec + asec + noteCard('Checks every vendor for all of your characters. Armor is shown for the character that can buy it. Updated ' + new Date(r.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '; the app checks again on its own every few hours.');
  };
  // Remembers what was already seen, so alerts are only for new deals.
  function dealSeen(r) {
    const { w, a } = dealFind(r), keys = [...w, ...a].map((o) => dealKey(o.x));
    const old = new Set(lsGet('gt.dealSeen', [])), fresh = [...w, ...a].filter((o) => !old.has(dealKey(o.x)));
    lsSet('gt.dealSeen', keys.slice(0, 400));
    return fresh;
  }
  async function dealAlert() {
    if (!gt().actDeals) return;
    try {
      const r = await gt().actDeals(); st.cache.deal = { at: Date.now(), v: r };
      const fresh = dealSeen(r);
      b.classList.toggle('hasnew', fresh.length > 0 && st.tab !== 'deal');
      if (fresh.length && lsGet('gt.dealNotify', true)) {
        const wl = fresh.filter((o) => o.x.it === 3);
        await gt().notify({ title: wl.length ? 'A vendor is selling a wish list roll' : 'High-stat armor on sale', body: fresh.slice(0, 3).map((o) => o.x.n + ' (' + o.x.vn + ')').join(', ').slice(0, 190) });
      }
    } catch (e) { /* not signed in, or Bungie is busy */ }
  }

  // ---- this week: what each character still has left (raid encounters, pinnacles, weekly milestones) ----
  // Season pass and artifact, with an estimate of your rank when the season ends (from how fast you have been ranking up lately).
  async function seasonHTML(force) {
    if (!gt().actSeason) return '';
    let r; try { r = await fetchCached('season', () => gt().actSeason(), force); } catch (e) { return ''; }
    if (!r || !r.pass) return '';
    const P = r.pass, Q = r.pre, per = (Q && Q.next) || P.next || 100000;
    const rank = P.lvl + (Q ? Q.lvl : 0), tot = (P.tot || 0) + ((Q && Q.tot) || 0), now = Date.now();
    // remember a reading every few hours to measure your pace
    let hist = lsGet('gt.season.hist', []); if (!Array.isArray(hist) || (hist[0] && hist[0].s !== r.name)) hist = [];
    if (!hist.length || now - hist[hist.length - 1].t > 3 * 3600e3) { hist.push({ s: r.name, t: now, x: tot }); hist = hist.slice(-120); lsSet('gt.season.hist', hist); }
    const old = hist.find((h) => now - h.t < 14 * 864e5) || hist[0];
    const days = old ? (now - old.t) / 864e5 : 0, rate = days >= 0.9 ? Math.max(0, (tot - old.x) / days) : 0;
    // Some "seasons" (like the Monument of Triumph pass) have no real end date (Bungie says 2099), so no countdown for those.
    const left0 = r.end ? Math.max(0, (r.end - now) / 864e5) : 0, hasEnd = !!r.end && left0 < 400, left = hasEnd ? left0 : 0;
    const perDay = rate / per, proj = rate && hasEnd ? Math.floor((tot + rate * left) / per) : 0;
    const paceTxt = rate ? `${num(Math.round(perDay * 10) / 10)} rank${Math.round(perDay * 10) === 10 ? '' : 's'} a day lately` : 'Your pace shows up after a day or two of play.';
    const bar = (cur, next) => `<div class="abar2"><i style="width:${next ? Math.round(cur / next * 100) : 0}%"></i></div>`;
    const useP = P.lvl < P.cap || !Q, cur = useP ? P.cur : Q.cur, next = useP ? P.next : Q.next;
    const endC = hasEnd ? `<div class="acard"><div class="stat">Season ends</div><div class="big">${left >= 1 ? num(Math.floor(left)) + ' <small class="mute">days left</small>' : 'Today'}</div><div class="sub">${esc(new Date(r.end).toLocaleDateString())}</div>${proj ? `<div class="sub">At this pace you will reach about <b>rank ${num(Math.max(rank, proj))}</b> by the end.</div>` : ''}</div>` : '';
    const paceC = `<div class="acard"><div class="stat">Your pace</div><div class="big">${rate ? num(Math.round(perDay * 7 * 10) / 10) + ' <small class="mute">ranks a week</small>' : '&ndash;'}</div><div class="sub">${paceTxt}</div>${P.wkL ? `<div class="sub">Weekly bonus XP: ${num(P.wk)} / ${num(P.wkL)}</div>` : ''}</div>`;
    return `<h3 class="sec">${esc(r.name || 'Season')}</h3><div class="row3"><div class="acard plan"><div class="stat">Rank</div><div class="big">${num(rank)}</div>${bar(cur, next)}<div class="sub">${num(cur)} / ${num(next)} XP to the next rank</div></div>${paceC}${endC}</div>`;
  }
  RENDER.week = async (force) => {
    const sea = await seasonHTML(force);
    const r = await fetchCached('week', () => gt().actLockouts(), force);
    const CL = (V().CL && V().CL()) || ['Titan', 'Hunter', 'Warlock'];
    if (!r.rows.length) return sea + msg('Bungie is not listing any weekly milestones for your characters right now.');
    const cell = (o) => {
      if (!o) return '<td class="wk na">-</td>';
      if (o.done) return `<td class="wk ok" title="${o.gone ? 'Done (Bungie no longer lists it for this character)' : 'Done'}">&#10003;</td>`;
      return o.t ? `<td class="wk" title="${o.p} of ${o.t} ${esc(o.kind)}"><span class="wkp"><i style="width:${Math.round(o.p / o.t * 100)}%"></i></span>${o.p}/${o.t}</td>` : '<td class="wk todo" title="Not done yet">&#9675;</td>';
    };
    const left = r.chars.map((c) => r.rows.filter((x) => x.per[c.id] && !x.per[c.id].done).length);
    const head = `<div class="row3">${r.chars.map((c, i) => `<div class="acard"><div class="stat">${esc(CL[c.cls] || 'Guardian')} ${c.light}</div><div class="big ${left[i] ? '' : 'pos'}">${left[i] ? left[i] + ' <small class="mute">left this week</small>' : 'All done'}</div></div>`).join('')}</div>`;
    const table = (list, title) => list.length ? `<h3 class="sec">${title}</h3><table class="tbl wkt"><thead><tr><th>Milestone</th>${r.chars.map((c) => `<th>${esc(CL[c.cls] || 'Guardian')}</th>`).join('')}</tr></thead><tbody>${list.map((x) => `<tr><td class="n" title="${esc(x.d)}">${x.i ? `<img src="${esc(img(x.i))}" alt="">` : ''}<span>${esc(x.n)}</span></td>${r.chars.map((c) => cell(x.per[c.id])).join('')}</tr>`).join('')}</tbody></table>` : '';
    return sea + `<h3 class="sec">Weekly progress</h3>` + head + table(r.rows.filter((x) => x.raid), 'Raid and dungeon encounters') + table(r.rows.filter((x) => !x.raid), 'Weekly milestones') + noteCard('Resets ' + esc(resetIn()) + ' from now. Encounters show how many you have cleared this week; a tick means the reward is claimed.');
  };
  // ---- personal bests ----
  RENDER.pb = async (force) => {
    const r = await fetchCached('pb', () => gt().actPbs(), force);
    const clr = await fetchCached('clr', () => gt().actClears(), false).catch(() => null);
    const CL = (V().CL && V().CL()) || [];
    const chCls = (id) => { const c = chars().find((k) => k.id === id); return c ? CL[c.cls] || '' : ''; };
    const card = (x) => `<div class="acard bg${x.id ? ' pbc" data-pg="' + esc(x.id) : ''}">${x.img ? `<div class="abgi" style="background-image:url('${esc(img(x.img))}')"></div>` : ''}<div class="stat">${esc(x.label)}</div><div class="big">${esc(x.txt)}</div><div class="sub">${esc(x.n)}${chCls(x.c) ? ' &middot; ' + esc(chCls(x.c)) : ''}${x.at ? ' &middot; ' + esc(new Date(x.at).toLocaleDateString()) : ''}</div></div>`;
    const fast = ((clr && clr.rows) || []).filter((x) => x.f).sort((a, b) => a.f - b.f);
    const fastH = fast.length ? `<h3 class="sec">Fastest clears</h3><div class="agrid">${fast.map((x) => `<div class="acard bg">${x.img ? `<div class="abgi" style="background-image:url('${esc(img(x.img))}')"></div>` : ''}<div class="stat">${esc(x.t === 'raid' ? 'Raid' : 'Dungeon')}</div><b>${esc(x.n)}</b><div class="big">${esc(clock(x.f))}</div></div>`).join('')}</div>` : '';
    const g = r.games || {};
    const groups = ['Overall', 'PvE', 'Crucible'].map((gname) => [gname, r.rows.filter((x) => (x.g || 'PvE') === gname)]).filter((q) => q[1].length);
    return (r.rows.length ? groups.map(([gname, l]) => `<h3 class="sec">${esc(gname)}</h3><div class="agrid fit">${l.map(card).join('')}</div>`).join('') : msg('No activity history yet.')) + fastH
      + noteCard(`From your last ${num(g.pve || 0)} PvE activities and ${num(g.pvp || 0)} Crucible matches${g.pvp ? ' (' + num(g.wins || 0) + ' wins)' : ''}. Click a record to see who was there.`);
  };

  // ---- Crucible: totals, win rate, K/D, KDA, playlists, maps, recent matches and a trend of the last 40 matches ----
  const pct = (v) => Math.round(v * 100) + '%', f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  RENDER.cru = async (force) => {
    const r = await fetchCached('cru', () => gt().actCrucible({ force: !!force }), force);
    const T = r.total;
    if (!T.m) return msg('No Crucible matches found in your history.');
    const tile = (l, v, sub, c) => `<div class="acard"><div class="stat">${l}</div><div class="big ${c || ''}">${v}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
    const W = r.week, R = r.last25;
    const head = `<div class="crow">${tile('Matches', num(T.m), num(T.w) + ' wins &middot; ' + num(T.m - T.w) + ' losses')}${tile('Win rate', pct(T.wr), 'Last 25: ' + pct(R.wr), T.wr >= .5 ? 'pos' : '')}${tile('K/D', f2(T.kd), 'Last 25: ' + f2(R.kd), T.kd >= 1 ? 'pos' : '')}${tile('KDA', f2(T.kda), num(T.k) + ' kills &middot; ' + num(T.a) + ' assists')}${tile('This week', num(W.m) + ' <small class="mute">matches</small>', W.m ? pct(W.wr) + ' wins &middot; ' + f2(W.kd) + ' K/D' : 'No matches yet this week')}${tile('Win streak', num(r.streak), 'Current streak')}</div>`;
    const mx = Math.max(2, ...r.trend.map((t) => t.kd));
    const trend = r.trend.length ? `<h3 class="sec">Last ${r.trend.length} matches <small class="mute">K/D per match, oldest to newest · green won, red lost · dashed line is 1.0 K/D</small></h3><div class="ctrend">${r.trend.map((t) => `<i class="${t.w ? 'w' : 'l'}" style="height:${Math.max(4, Math.round(Math.min(t.kd, mx) / mx * 100))}%" title="${f2(t.kd)} K/D &middot; ${t.w ? 'Victory' : 'Defeat'}"></i>`).join('')}<span class="one" style="bottom:${Math.round(1 / mx * 100)}%" title="1.00 K/D"></span></div>` : '';
    const tbl = (list, title, first) => list.length ? `<h3 class="sec">${title}</h3><table class="tbl ctbl"><thead><tr><th>${first}</th><th>Matches</th><th>Win rate</th><th>K/D</th><th>KDA</th><th>Kills</th></tr></thead><tbody>${list.map((o) => `<tr><td class="n">${o.img ? `<img src="${esc(img(o.img))}" alt="">` : ''}<span>${esc(o.n)}</span></td><td>${num(o.m)}</td><td><span class="cwr"><i style="width:${Math.round(o.wr * 100)}%"></i></span>${pct(o.wr)}</td><td class="${o.kd >= 1 ? 'pos' : ''}">${f2(o.kd)}</td><td>${f2(o.kda)}</td><td>${num(o.k)}</td></tr>`).join('')}</tbody></table>` : '';
    const CLn = ['Titan', 'Hunter', 'Warlock'];
    const recent = r.recent.length ? `<h3 class="sec">Recent matches</h3><div class="rlist">${r.recent.map((a) => `<div class="ract ${a.w === 1 ? 'win' : a.w === 0 ? 'loss' : 'mid'}" data-pg="${esc(a.id)}" title="Click to see everyone in the match" style="cursor:pointer">${a.img ? `<div class="rimg" style="background-image:url('${esc(img(a.img))}')"></div>` : '<div class="rimg"></div>'}<div class="rmain"><b>${esc(a.n)}</b><div class="sub">${esc(a.mode)}${(() => { const c = chars().find((k) => k.id === a.c); return c ? ' &middot; ' + (CLn[c.cls] || '') : ''; })()}</div></div><div class="rres">${a.w === 1 ? 'Victory' : a.w === 0 ? 'Defeat' : ''}</div><div class="rst"><span><i>K</i>${a.k}</span><span><i>D</i>${a.d}</span><span><i>A</i>${a.a}</span><span><i>K/D</i>${f2(a.d ? a.k / a.d : a.k)}</span></div><div class="rtime">${esc(new Date(a.at).toLocaleDateString())}<small>${esc(new Date(a.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}</small></div></div>`).join('')}</div>` : '';
    return head + trend + tbl(r.playlists, 'By playlist', 'Playlist') + tbl(r.maps.slice(0, 12), 'By map', 'Map') + recent + noteCard('From your last ' + num(T.m) + ' Crucible matches across all characters. Bungie adds a match to your history a few minutes after it ends.');
  };

  // ---- weapon stats: a hub of weapon types, click one to see its weapons ----
  // Bungie only lists exotic weapons itself, so legendary weapons are counted from each run's report in the background.
  let wsBusy = false;
  async function wsLoop() {
    if (wsBusy || !gt().actWScan) return; wsBusy = true;
    try {
      for (let n = 0; n < 150; n++) {
        const f = await gt().actWScan(); st.ws = f; st.wsErr = '';
        if (st.tab === 'wep' && body() && !(document.activeElement && document.activeElement.id === 'awq')) { st.cache.wep = null; const html = await RENDER.wep(false); if (st.tab === 'wep' && body()) body().innerHTML = html; }
        if (!f.left) break;
      }
    } catch (e) { st.wsErr = String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''); }
    wsBusy = false;
  }
  RENDER.wep = async (force) => {
    const r = await fetchCached('wep', () => gt().actWeapons(), force);
    if (!st.ws && !wsBusy) setTimeout(wsLoop, 0);
    const wnote = !gt().actWScan ? '' : st.wsErr ? noteCard('Could not count your legendary weapons yet: ' + esc(st.wsErr)) : !st.ws ? noteCard('Counting every weapon you have used from your run reports. The first time this can take a few minutes, and it keeps going in the background.') : st.ws.left ? noteCard('Counting every weapon from your run reports... ' + num(st.ws.scanned) + ' of ' + num(st.ws.total) + ' done. New weapons appear here as they are counted.') : '';
    if (!r.weapons.length) return wnote + msg('No weapon kill data yet.');
    const top = Math.max(1, ...r.weapons.map((w) => w.k));
    const types = {}; r.weapons.forEach((w) => { const t = w.t || 'Other'; (types[t] = types[t] || []).push(w); });
    const search = `<div class="abar" style="padding-top:0"><input type="search" id="awq" placeholder="Search all weapons" value="${esc(st.wq)}"></div>`;
    const table = (list, title) => {
      const key = { kills: (w) => w.k, precision: (w) => (w.k ? w.p / w.k : 0), name: (w) => w.n.toLowerCase() }[st.sort];
      list = list.slice().sort((a, b) => (st.sort === 'name' ? (key(a) < key(b) ? -1 : 1) : key(b) - key(a)));
      const tk = list.reduce((t, w) => t + w.k, 0), tp = list.reduce((t, w) => t + w.p, 0);
      return `<div class="whd"><button data-wf="All" class="g">&#8592; All weapon types</button><h3 class="sec" style="margin:0">${esc(title)}</h3><span class="stat">${num(list.length)} weapons &middot; ${num(tk)} kills &middot; ${tk ? Math.round(tp / tk * 100) : 0}% precision</span></div>
<table class="tbl"><thead><tr><th>#</th><th data-sort="name">Weapon</th><th data-sort="kills">Kills</th><th></th><th data-sort="precision">Precision</th></tr></thead><tbody>${list.map((w, i) => `<tr><td>${i + 1}</td><td class="n">${w.i ? `<img src="${esc(img(w.i))}" alt="">` : ''}<span>${esc(w.n)} <small class="mute">${esc(w.t)}</small></span></td><td>${num(w.k)}</td><td style="width:22%"><div class="rb"><i style="width:${Math.round(w.k / top * 100)}%"></i></div></td><td>${w.k ? Math.round(w.p / w.k * 100) : 0}%</td></tr>`).join('')}</tbody></table>`;
    };
    if (st.wq) return wnote + search + table(r.weapons.filter((w) => w.n.toLowerCase().includes(st.wq.toLowerCase())), 'Search results');
    if (st.wf !== 'All' && types[st.wf]) return wnote + search + table(types[st.wf], st.wf);
    const tot = r.weapons.reduce((t, w) => t + w.k, 0);
    const cards = Object.keys(types).map((t) => ({ t, l: types[t], k: types[t].reduce((a, w) => a + w.k, 0), p: types[t].reduce((a, w) => a + w.p, 0) })).sort((a, b) => b.k - a.k);
    return wnote + search + `<div class="whub">${cards.map((c) => { const best = c.l.slice().sort((a, b) => b.k - a.k); return `<div class="acard wcard" data-wf="${esc(c.t)}">${best[0] && best[0].i ? `<div class="abgi" style="background-image:url('${esc(img(best[0].i))}')"></div>` : ''}<div class="stat">${esc(c.t)}</div><div class="big">${num(c.k)} <small class="mute">kills</small></div><div class="sub">${num(c.l.length)} weapons &middot; ${c.k ? Math.round(c.p / c.k * 100) : 0}% precision &middot; ${tot ? Math.round(c.k / tot * 100) : 0}% of all kills</div><div class="wtop">${best.slice(0, 5).map((w) => `<span title="${esc(w.n)}: ${num(w.k)} kills">${w.i ? `<img src="${esc(img(w.i))}" alt="">` : ''}</span>`).join('')}</div><div class="sub wbest">Most used: <b>${esc(best[0].n)}</b> (${num(best[0].k)})</div></div>`; }).join('')}</div>` + noteCard('Totals are across all your characters. Exotic weapons are lifetime totals from Bungie. Other weapons are counted from your run reports (your most recent activities on each character). Click a weapon type to see every weapon in it.');
  };

  // ---- raids and dungeons, with solo / flawless / solo flawless counts ----
  let featBusy = false;
  async function featLoop() {
    if (featBusy) return; featBusy = true;
    try {
      for (let n = 0; n < 40; n++) {
        const f = await gt().actFeats(); st.feats = f;
        if (st.tab === 'clr' && body()) { const html = await RENDER.clr(false); if (st.tab === 'clr' && body()) body().innerHTML = html; }
        if (!f.todo) break;
      }
    } catch (e) { st.featErr = String((e && e.message) || e).replace(/^Error invoking remote method '[^']*': (Error: )?/, ''); if (st.tab === 'clr' && body()) { const html = await RENDER.clr(false); body().innerHTML = html; } }
    featBusy = false;
  }
  // One raid or dungeon, opened by clicking its card: summary, clears per character and version, and every run (click a run for its report).
  async function clrDetail(force) {
    const [t, ...rest] = st.clrOpen.split('|'), n = rest.join('|'), key = 'clrd' + st.clrOpen;
    const r = await fetchCached(key, () => gt().actClrRuns({ n, t, force: !!force }), force);
    if (!st.feats && !featBusy) setTimeout(featLoop, 0);
    const F = ((st.feats && st.feats.rows) || []).find((x) => x.t === t && x.n === n) || null;
    const CLn = ['Titan', 'Hunter', 'Warlock'], cs = chars();
    const back = `<div class="cdhd"><button class="g" data-clb="1">&#8592; All raids and dungeons</button></div>`;
    const banner = `<div class="cdban">${r.img ? `<div class="cdbg" style="background-image:url('${esc(img(r.img))}')"></div>` : ''}<div class="cdt"><small>${t === 'raid' ? 'Raid' : 'Dungeon'}</small><h2>${esc(n)}</h2><span>${r.last ? 'Last cleared ' + esc(new Date(r.last).toLocaleDateString()) : 'Not cleared yet'}${r.first ? ' &middot; first clear in your history ' + esc(new Date(r.first).toLocaleDateString()) : ''}</span></div></div>`;
    const tile = (l, v, sub, c) => `<div class="acard"><div class="stat">${l}</div><div class="big ${c || ''}">${v}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
    const tiles = `<div class="crow">${tile('Clears', num(r.clears), num(r.total) + ' runs started &middot; ' + (r.total ? Math.round(r.clears / r.total * 100) : 0) + '% finished', 'pos')}${tile('Fastest clear', r.fastest ? esc(dur(r.fastest)) : '-', 'From your activity history')}${tile('Average clear', r.avg ? esc(dur(r.avg)) : '-', r.clears ? 'Across ' + num(r.clears) + ' clears' : '')}${tile('Time spent', esc(dur(r.time)), num(r.kills) + ' kills &middot; ' + num(r.deaths) + ' deaths')}${tile('Solo', F ? num(F.s) : '&hellip;', F ? num(F.sf) + ' solo flawless' : 'Still checking', F && F.s ? 'pos' : '')}${tile('Flawless', F ? num(F.fl) : '&hellip;', 'Nobody died, fresh start', F && F.fl ? 'pos' : '')}</div>`;
    const maxC = Math.max(1, ...Object.values(r.byChar || {}));
    const perChar = cs.length ? `<div class="cdcol"><h3 class="sec">Clears by character</h3>${cs.map((c) => { const v = (r.byChar || {})[c.id] || 0; return `<div class="cdbar"><span>${esc(CLn[c.cls] || 'Guardian')}</span><i><b style="width:${Math.round(v / maxC * 100)}%"></b></i><em>${num(v)}</em></div>`; }).join('')}</div>` : '';
    const maxV = Math.max(1, ...(r.byVer || []).map((o) => o.c));
    const perVer = (r.byVer || []).length ? `<div class="cdcol"><h3 class="sec">Clears by version</h3>${r.byVer.map((o) => `<div class="cdbar"><span title="${esc(o.n)}">${esc(o.n.replace(n, '').replace(/^\s*[:\-–]\s*/, '') || 'Standard')}</span><i><b style="width:${Math.round(o.c / maxV * 100)}%"></b></i><em>${num(o.c)}</em></div>`).join('')}</div>` : '';
    const f = st.clrF || 'all', list = r.runs.filter((x) => f === 'all' || (f === 'ok' ? x.ok : !x.ok));
    const badge = (x) => x.f < 0 ? '' : [x.f === 3 ? '<span class="feat on fsf">Solo flawless</span>' : '', x.f === 1 ? '<span class="feat on fs">Solo</span>' : '', x.f === 2 ? '<span class="feat on ff">Flawless</span>' : ''].join('');
    const rows = list.map((x) => { const c = cs.find((k) => k.id === x.c); return `<div class="ract ${x.ok ? 'win' : 'mid'}" data-pg="${esc(x.id)}" title="Click to see who was there" style="cursor:pointer">${x.img ? `<div class="rimg" style="background-image:url('${esc(img(x.img))}')"></div>` : '<div class="rimg"></div>'}<div class="rmain"><b>${esc(x.v)}</b><div class="sub">${[c ? CLn[c.cls] : '', x.pc === 1 ? 'Solo run' : x.pc > 1 ? x.pc + ' players' : ''].filter(Boolean).join(' &middot; ')} ${badge(x)}</div></div><div class="rres">${x.ok ? 'Cleared' : 'Not finished'}</div><div class="rst"><span><i>K</i>${num(x.k)}</span><span><i>D</i>${num(x.d)}</span><span><i>A</i>${num(x.a)}</span><span><i>Time</i>${esc(dur(x.dur))}</span></div><div class="rtime">${esc(new Date(x.at).toLocaleDateString())}<small>${esc(new Date(x.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}</small></div></div>`; }).join('');
    const fb = (k, l, c) => `<button class="g${f === k ? ' on' : ''}" data-clf="${k}">${l} <small>${num(c)}</small></button>`;
    const runs = `<div class="cdrh"><h3 class="sec" style="margin:0">Runs</h3><div class="cdf">${fb('all', 'All', r.runs.length)}${fb('ok', 'Cleared', r.runs.filter((x) => x.ok).length)}${fb('no', 'Not finished', r.runs.filter((x) => !x.ok).length)}</div></div><div class="rlist">${rows || msg('No runs here.')}</div>`;
    return back + banner + tiles + `<div class="cdcols">${perChar}${perVer}</div>` + runs + noteCard('From your activity history across all characters' + (r.total >= 250 ? ' (the newest 250 runs are listed)' : '') + '. Click a run to see the fireteam and stats.');
  }
  RENDER.clr = async (force) => {
    if (st.clrOpen) return clrDetail(force);
    const r = await fetchCached('clr', () => gt().actClears(), force);
    if (!r.rows.length) return msg('No raid or dungeon clears found yet.');
    if (!st.feats && !featBusy) setTimeout(featLoop, 0);
    const F = {}; ((st.feats && st.feats.rows) || []).forEach((x) => { F[x.t + '|' + x.n] = x; });
    const chip = (v, l, c) => `<span class="feat${v ? ' on' : ''} ${c}" title="${l}">${l} <b>${st.feats ? num(v) : '&hellip;'}</b></span>`;
    const part = (t, title) => { const l = r.rows.filter((x) => x.t === t); return l.length ? `<h3 class="sec">${title}</h3><div class="agrid">${l.map((x) => { const f = F[x.t + '|' + x.n] || { s: 0, fl: 0, sf: 0 }; return `<div class="acard bg clk${f.sf ? ' sfl' : ''}" data-cl="${esc(x.t + '|' + x.n)}" title="See every ${x.t === 'raid' ? 'raid' : 'dungeon'} run">${x.img ? `<div class="abgi" style="background-image:url('${esc(img(x.img))}')"></div>` : ''}<b>${esc(x.n)}</b><div class="big">${num(x.c)} <small class="mute">clears</small></div><div class="sub">${x.mc ? num(x.mc) + ' on master &middot; ' : ''}${x.f ? 'Fastest ' + esc(clock(x.f)) : 'No fastest time recorded'}</div><div class="feats">${chip(f.s, 'Solo', 'fs')}${chip(f.fl, 'Flawless', 'ff')}${chip(f.sf, 'Solo flawless', 'fsf')}</div></div>`; }).join('')}</div>` : ''; };
    const prog = st.featErr ? noteCard('Could not check solo and flawless runs: ' + esc(st.featErr)) : !st.feats ? noteCard('Checking your runs for solo and flawless clears. The first time this reads every run report, so it can take a few minutes.') : st.feats.todo ? noteCard('Checking your runs for solo and flawless clears... ' + num(st.feats.todo) + ' run reports left.') : '';
    return prog + part('raid', 'Raids') + part('dungeon', 'Dungeons') + noteCard('Solo means you were the only player and started from the beginning. Flawless means nobody in the fireteam died and the run started from the beginning. Counted from your activity history, like raid.report.');
  };

  // ---- recap: what you did lately, like an activity feed ----
  const startT = Date.now();
  let base = null;
  async function pollTotals(force) {
    try {
      const t = await gt().actTotals();
      if (!base) base = t;
      lsSet('gt.recap.last', t); st.cache.tot = { at: Date.now(), v: t };
      return t;
    } catch (e) { return null; }
  }
  const prevSession = lsGet('gt.recap.last', null);
  const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  const PVP = new Set([5, 10, 12, 15, 19, 25, 31, 37, 38, 39, 41, 42, 43, 44, 45, 48, 49, 50, 59, 60, 61, 62, 65, 71, 72, 73, 74, 80, 81, 84, 89, 90, 91]);
  RENDER.rec = async (force) => {
    const t = (force || !st.cache.tot) ? await pollTotals() : st.cache.tot.v;
    if (!t) throw new Error('Could not read your stats. Sign in on the Vault tab first.');
    if (!base) base = t;
    const R = await fetchCached('recent', () => gt().actRecent(), force);
    const CL = ['Titan', 'Hunter', 'Warlock'];
    const day = R.acts.filter((a) => Date.now() - a.at < 86400000);
    const sum = (l, k) => l.reduce((x, a) => x + (a[k] || 0), 0);
    const dk = sum(day, 'k'), dd = sum(day, 'd');
    const tile = (l, v, c) => `<div class="acard"><div class="stat">${l}</div><div class="big ${c || ''}">${v}</div></div>`;
    const d = { k: t.kills - base.kills, d: t.deaths - base.deaths, c: t.cleared - base.cleared };
    const head = `<div class="row3">${tile('Last 24 hours', day.length + ' <small class="mute">activities</small>')}${tile('Time played (24h)', esc(dur(sum(day, 's'))))}${tile('Kills (24h)', num(dk), dk ? 'pos' : '')}${tile('K/D (24h)', dd ? (dk / dd).toFixed(2) : dk ? dk.toFixed(2) : '0.00')}${tile('This session', '+' + num(d.k) + ' <small class="mute">kills</small>')}${tile('App open for', esc(dur((Date.now() - startT) / 1000)))}</div>`;
    const rows = R.acts.map((a) => {
      const pvp = PVP.has(a.md), res = pvp ? (a.st === 0 ? ['Victory', 'win'] : ['Defeat', 'loss']) : a.ok ? ['Completed', 'win'] : ['Not finished', 'mid'];
      return `<div class="ract ${res[1]}" data-pg="${esc(a.id)}" title="Click to see who was there" style="cursor:pointer">${a.img ? `<div class="rimg" style="background-image:url('${esc(img(a.img))}')"></div>` : '<div class="rimg"></div>'}<div class="rmain"><b>${esc(a.n)}</b><div class="sub">${[esc(a.tn || ''), a.cz ? 'Custom difficulty' : '', a.cls !== undefined && CL[a.cls] ? CL[a.cls] : '', a.pc > 1 ? a.pc + ' players' : a.pc === 1 ? 'solo' : ''].filter(Boolean).join(' &middot; ')}</div></div><div class="rres">${res[0]}</div><div class="rst"><span><i>K</i>${num(a.k)}</span><span><i>D</i>${num(a.d)}</span><span><i>A</i>${num(a.a)}</span><span><i>K/D</i>${(a.kd || 0).toFixed(2)}</span></div><div class="rtime">${esc(dur(a.s))}<small>${esc(ago(a.at))}</small></div></div>`;
    }).join('');
    const since = prevSession && prevSession.kills != null ? noteCard(`Since you last opened the app: +${num(t.kills - prevSession.kills)} kills, +${num(t.deaths - prevSession.deaths)} deaths, +${num(t.cleared - prevSession.cleared)} activities cleared.`) : '';
    return head + since + `<h3 class="sec">Recent activity</h3><div class="rlist">${rows || msg('No recent activities.')}</div>` + noteCard('Bungie updates activity history a few minutes after each activity ends. Press Refresh to check again.');
  };

  // ---- fireteam ----
  RENDER.ft = async (force) => {
    const r = await fetchCached('ft', () => gt().actFireteam(), force);
    const party = r.party.length ? `<h3 class="sec">Your fireteam${r.cur ? ' &middot; ' + esc(r.cur) : ''}</h3><div class="agrid">${r.party.map((p) => `<div class="acard"><b>${esc(p.name)}</b></div>`).join('')}</div>` : msg('You are not in a fireteam right now.');
    const fr = r.friends == null ? noteCard('Your friends list is not available with this sign-in, so online status cannot be shown.') : `<h3 class="sec">Friends &middot; ${num(r.friends.filter((f) => f.on).length)} online</h3><div class="agrid">${r.friends.map((f) => `<div class="acard${f.on ? ' ok' : ''}"><b>${esc(f.name)}</b><div class="sub">${f.on ? 'Online' : 'Offline'}</div></div>`).join('') || msg('No friends to show.')}</div>`;
    return party + fr + noteCard('Bungie does not share other players\' loadouts or vaults, so only names and online status can be shown.');
  };

  const clean = (er) => String((er && er.message) || er).replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
  const PG = {};
  const pgHTML = (o) => {
    if (!o.ents.length) return '<p class="mute">No players listed for this activity.</p>';
    const CLN = { Titan: 'Titan', Hunter: 'Hunter', Warlock: 'Warlock' };
    return `<table class="pgt"><thead><tr><th>Guardian</th><th>Kills</th><th>Deaths</th><th>Assists</th><th>Precision</th><th>K/D</th><th>Time</th><th>Top weapons</th></tr></thead><tbody>${o.ents.map((p) => `<tr${p.me ? ' class="me"' : ''}><td><b>${esc(p.name)}${p.code ? '<small>#' + esc(p.code) + '</small>' : ''}</b><small>${esc(CLN[p.cls] || p.cls)}${p.pw ? ' &middot; ' + p.pw : ''}${p.ok ? '' : ' &middot; did not finish'}</small></td><td>${num(p.k)}</td><td>${num(p.d)}</td><td>${num(p.a)}</td><td>${num(p.pk)}</td><td>${(p.kd || (p.d ? p.k / p.d : p.k) || 0).toFixed(2)}</td><td>${esc(dur(p.s))}</td><td class="pgw">${p.wep.map((w) => `<span>${esc(w.n)} <i>${num(w.k)}</i></span>`).join('') || '<small>-</small>'}</td></tr>`).join('')}</tbody></table><p class="mute" style="margin:6px 0 0">Bungie does not record how much damage each player did to bosses, so only kills, deaths, assists, precision kills, weapons and time are shown.</p>`;
  };
  async function togglePg(row) {
    const nx = row.nextElementSibling;
    if (nx && nx.classList.contains('rdet')) { nx.remove(); return; }
    const box = document.createElement('div'); box.className = 'rdet'; box.innerHTML = '<p class="mute">Loading...</p>'; row.after(box);
    const id = row.dataset.pg;
    try { PG[id] = PG[id] || await gt().actPgcr({ id }); box.innerHTML = pgHTML(PG[id]); }
    catch (er) { box.innerHTML = `<p class="mute">Could not load this activity: ${esc(clean(er))}</p>`; }
  }
  s.addEventListener('click', (e) => {
    const pgr = e.target.closest('.ract[data-pg], .pbc[data-pg]'); if (pgr) { togglePg(pgr); return; }
    const gdc = e.target.closest('[data-gd]'); if (gdc) { openHelp(gdc.dataset.gd); return; }
    const cl = e.target.closest('[data-cl]'); if (cl && !e.target.closest('[data-hpin]')) { st.clrOpen = cl.dataset.cl; st.clrF = 'all'; load(); s.scrollTop = 0; window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-clb]')) { st.clrOpen = ''; load(); return; }
    const cf = e.target.closest('[data-clf]'); if (cf) { st.clrF = cf.dataset.clf; load(); return; }
    const t = e.target.closest('[data-a],[data-ax],[data-vs],[data-v],[data-wf],[data-sort]'); if (!t) return;
    if (t.dataset.a) { if (t.dataset.a === 'clr' && st.tab === 'clr') st.clrOpen = ''; st.tab = t.dataset.a; if (st.tab === 'deal') b.classList.remove('hasnew'); load(); return; }
    if (t.dataset.ax === 'refresh') { load(true); return; }
    if (t.dataset.vs) { const h = +t.dataset.vs; if (st.vopen.has(h)) st.vopen.delete(h); else st.vopen.add(h); load(); return; }
    if (t.dataset.v) { st.vh = +t.dataset.v; st.vq = ''; load(); return; }
    if (t.dataset.wf) { st.wf = t.dataset.wf; load(); return; }
    if (t.dataset.sort) { st.sort = t.dataset.sort; load(); }
  });
  s.addEventListener('change', (e) => { if (e.target.id === 'dthr') { lsSet('gt.dealArmor', Math.max(0, Math.min(200, parseInt(e.target.value, 10) || 0))); load(); return; } if (e.target.id === 'dnot') { lsSet('gt.dealNotify', e.target.checked); return; } if (e.target.id === 'achar') { st.char = e.target.value; load(); } else if (e.target.id === 'avsel' && e.target.value) { st.vh = +e.target.value; st.vq = ''; load(); } });
  s.addEventListener('input', (e) => {
    const id = e.target.id; if (id !== 'awq' && id !== 'avq') return;
    if (id === 'awq') st.wq = e.target.value; else st.vq = e.target.value;
    const p = e.target.selectionStart;
    clearTimeout(st.wt); st.wt = setTimeout(async () => { await load(); const i = s.querySelector('#' + id); if (i) { i.focus(); try { i.setSelectionRange(p, p); } catch (er) { /* ignore */ } } }, 200);
  });
  // Some vendor icons are wide banners, not squares. Show those at their real shape.
  s.addEventListener('load', (e) => {
    const im = e.target; if (!im || im.tagName !== 'IMG' || !im.naturalWidth) return;
    const v = im.closest('.vit'); if (v && !v.classList.contains('bi') && im.closest('.vimg') && im.naturalWidth / im.naturalHeight > 1.4) v.classList.add('wide');
  }, true);
  b.onclick = () => { show('activity'); load(); };
  // For the Home page: the same cached data, and a way to jump straight to one of these pages.
  window.__gta = {
    fetch: (k, force) => {
      const F = { deal: ['deal', () => gt().actDeals()], season: ['season', () => gt().actSeason()], week: ['week', () => gt().actLockouts()], rot: ['rot' + st.char, () => gt().actRot(charArg())], bnt: ['bnt' + st.char, () => gt().actBounties(charArg())], xur: ['xur' + st.char, () => gt().actXur(charArg())], clr: ['clr', () => gt().actClears()], pb: ['pb', () => gt().actPbs()], rec: ['recent', () => gt().actRecent()], wep: ['wep', () => gt().actWeapons()], cru: ['cru', () => gt().actCrucible({})] }[k];
      return F ? fetchCached(F[0], F[1], force) : Promise.reject(new Error('unknown'));
    },
    vendor: (h, force) => fetchCached('ven' + h + st.char, () => gt().actVendor({ h, ...charArg() }), force),
    wishOf: (x, i) => wishOf(x, i),
    openVendor: (h) => { st.tab = 'ven'; st.vh = +h; st.vq = ''; show('activity'); load(); },
    dealFind: (r) => dealFind(r),
    open: (t) => { if (t && t.startsWith('clr:')) { st.tab = 'clr'; st.clrOpen = t.slice(4); st.clrF = 'all'; t = 'clr'; } else if (t === 'clr') st.clrOpen = ''; if (t && RENDER[t]) st.tab = t; if (t === 'deal') b.classList.remove('hasnew'); show('activity'); load(); },
  };

  // Background work once you are signed in: vendor deal alerts and the recap baseline.
  let tries = 0;
  const boot = async () => {
    if (!window.gt || !window.gt.actTotals) return;
    const d = V().D && V().D();
    if (!d) { if (tries++ < 20) setTimeout(boot, 3000); return; }
    await pollTotals();
    setInterval(() => { pollTotals(); }, 300000);
  };
  setTimeout(boot, 6000);
})();
